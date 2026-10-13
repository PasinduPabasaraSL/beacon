import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TimesheetStatus } from '@prisma/client';
import { LOGGING_ROLES, REVIEWER_ROLES } from '../common/roles';
import { UserSummary, userSummarySelect } from '../common/user-summary';
import {
  addDays,
  addWeeks,
  isoDay,
  parseDay,
  startOfIsoWeek,
  startOfUtcDay,
} from '../common/week';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateRowDto,
  LogTimeDto,
  MAX_DAILY_HOURS,
  ReviewTimesheetDto,
  SetDayDto,
  UpdateRowDto,
} from './dto/timesheet.dto';
import {
  emptyTimesheet,
  round2,
  rowSelect,
  timesheetSelect,
  toRowResponse,
  toTimesheetResponse,
  weekDays,
} from './timesheet-response';

const DAY_FORMAT = /^\d{4}-\d{2}-\d{2}$/;

type Tx = Prisma.TransactionClient;

const ownRowSelect = {
  id: true,
  taskId: true,
  description: true,
  timesheet: {
    select: { id: true, userId: true, status: true, weekStart: true },
  },
} satisfies Prisma.ContributionEntrySelect;

type OwnRow = Prisma.ContributionEntryGetPayload<{
  select: typeof ownRowSelect;
}>;

/**
 * The latest day hours can be logged for. One day past UTC "today", so users in time zones
 * ahead of UTC can log their own today.
 */
function latestLoggableDay(now: Date): Date {
  return addDays(startOfUtcDay(now), 1);
}

@Injectable()
export class TimesheetsService {
  constructor(private readonly prisma: PrismaService) {}

  async week(projectId: string, date: Date) {
    const weekStart = startOfIsoWeek(date);
    const project = await this.getProject(projectId);
    const timesheets = await this.prisma.timesheet.findMany({
      where: { projectId, weekStart },
      select: timesheetSelect,
    });

    const members = project.members.map(({ user, role }) => {
      const timesheet = timesheets.find((t) => t.userId === user.id);
      return {
        user,
        role,
        canLog: LOGGING_ROLES.includes(role),
        timesheet: timesheet
          ? toTimesheetResponse(timesheet, project.key)
          : emptyTimesheet(weekStart),
      };
    });

    return {
      weekStart,
      weekEnd: new Date(addWeeks(weekStart, 1).getTime() - 1),
      days: weekDays(weekStart),
      totalHours: round2(
        members.reduce((sum, m) => sum + m.timesheet.totalHours, 0),
      ),
      members,
    };
  }

  async addRow(projectId: string, user: UserSummary, dto: CreateRowDto) {
    const project = await this.getProject(projectId);
    this.assertLogger(project, user.id);
    const weekStart = this.loggableWeek(dto.week);
    await this.assertRowFields(projectId, dto.taskId, dto.description);

    const row = await this.prisma.$transaction(async (tx) => {
      const timesheet = await this.ensureTimesheet(
        tx,
        projectId,
        user.id,
        weekStart,
      );
      this.assertEditable(timesheet.status);
      return tx.contributionEntry.create({
        data: {
          timesheetId: timesheet.id,
          type: dto.type,
          taskId: dto.taskId ?? null,
          description: dto.description ?? '',
        },
        select: rowSelect,
      });
    });
    return toRowResponse(row, project.key);
  }

  async updateRow(
    projectId: string,
    rowId: string,
    user: UserSummary,
    dto: UpdateRowDto,
  ) {
    const project = await this.getProject(projectId);
    const row = await this.getOwnRow(projectId, rowId, user);
    this.assertEditable(row.timesheet.status);
    await this.assertRowFields(
      projectId,
      dto.taskId !== undefined ? dto.taskId : row.taskId,
      dto.description ?? row.description,
    );

    const updated = await this.prisma.contributionEntry.update({
      where: { id: rowId },
      data: {
        type: dto.type,
        taskId: dto.taskId,
        description: dto.description,
      },
      select: rowSelect,
    });
    return toRowResponse(updated, project.key);
  }

  async removeRow(projectId: string, rowId: string, user: UserSummary) {
    const row = await this.getOwnRow(projectId, rowId, user);
    this.assertEditable(row.timesheet.status);
    await this.prisma.contributionEntry.delete({ where: { id: rowId } });
  }

  async setDay(
    projectId: string,
    rowId: string,
    day: string,
    user: UserSummary,
    dto: SetDayDto,
  ) {
    const project = await this.getProject(projectId);
    const row = await this.getOwnRow(projectId, rowId, user);
    this.assertEditable(row.timesheet.status);
    const date = this.dayInWeek(day, row.timesheet.weekStart);

    const updated = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.contributionDay.findUnique({
        where: { entryId_date: { entryId: rowId, date } },
        select: { note: true },
      });
      const note =
        dto.note !== undefined ? dto.note || null : (existing?.note ?? null);

      if (dto.hours === 0 && !note) {
        if (existing) {
          await tx.contributionDay.delete({
            where: { entryId_date: { entryId: rowId, date } },
          });
        }
      } else {
        await this.assertDailyLimit(
          tx,
          row.timesheet.id,
          rowId,
          date,
          dto.hours,
        );
        await tx.contributionDay.upsert({
          where: { entryId_date: { entryId: rowId, date } },
          create: { entryId: rowId, date, hours: dto.hours, note },
          update: { hours: dto.hours, note },
        });
      }
      return this.syncRowHours(tx, rowId);
    });
    return toRowResponse(updated, project.key);
  }

  /** Adds time to a day, reusing the matching row or starting a new one. */
  async logTime(projectId: string, user: UserSummary, dto: LogTimeDto) {
    const project = await this.getProject(projectId);
    this.assertLogger(project, user.id);
    const date = this.loggableDay(dto.date);
    const weekStart = startOfIsoWeek(date);
    const taskId = dto.taskId ?? null;
    if (taskId) await this.assertTaskInProject(projectId, taskId);

    const row = await this.prisma.$transaction(async (tx) => {
      const timesheet = await this.ensureTimesheet(
        tx,
        projectId,
        user.id,
        weekStart,
      );
      this.assertEditable(timesheet.status);

      // Rows without a task are told apart by what the work was.
      const match = await tx.contributionEntry.findFirst({
        where: {
          timesheetId: timesheet.id,
          type: dto.type,
          taskId,
          ...(taskId ? {} : { description: dto.note }),
        },
        orderBy: { createdAt: 'asc' },
        select: { id: true },
      });
      const rowId =
        match?.id ??
        (
          await tx.contributionEntry.create({
            data: {
              timesheetId: timesheet.id,
              type: dto.type,
              taskId,
              description: taskId ? '' : dto.note,
            },
            select: { id: true },
          })
        ).id;

      const existing = await tx.contributionDay.findUnique({
        where: { entryId_date: { entryId: rowId, date } },
        select: { hours: true, note: true },
      });
      const hours = round2(Number(existing?.hours ?? 0) + dto.hours);
      await this.assertDailyLimit(tx, timesheet.id, rowId, date, hours);
      const note = taskId
        ? [existing?.note, dto.note].filter(Boolean).join('\n')
        : (existing?.note ?? null);
      await tx.contributionDay.upsert({
        where: { entryId_date: { entryId: rowId, date } },
        create: { entryId: rowId, date, hours, note: note || null },
        update: { hours, note: note || null },
      });
      return this.syncRowHours(tx, rowId);
    });
    return { weekStart, row: toRowResponse(row, project.key) };
  }

  async submit(projectId: string, user: UserSummary, week: string) {
    const project = await this.getProject(projectId);
    this.assertLogger(project, user.id);
    const weekStart = this.loggableWeek(week);
    const timesheet = await this.prisma.timesheet.findUnique({
      where: {
        projectId_userId_weekStart: { projectId, userId: user.id, weekStart },
      },
      select: { id: true, status: true },
    });
    const nothingLogged = new BadRequestException(
      'Log some hours before submitting this week',
    );
    if (!timesheet) throw nothingLogged;
    if (timesheet.status === TimesheetStatus.SUBMITTED) {
      throw new ConflictException('This week is already submitted');
    }
    if (timesheet.status === TimesheetStatus.APPROVED) {
      throw new ConflictException('This week is already approved');
    }

    const submitted = await this.prisma.$transaction(async (tx) => {
      const { _sum } = await tx.contributionEntry.aggregate({
        where: { timesheetId: timesheet.id },
        _sum: { hours: true },
      });
      if (Number(_sum.hours ?? 0) === 0) throw nothingLogged;
      return tx.timesheet.update({
        where: { id: timesheet.id },
        data: { status: TimesheetStatus.SUBMITTED, submittedAt: new Date() },
        select: timesheetSelect,
      });
    });
    return toTimesheetResponse(submitted, project.key);
  }

  async recall(projectId: string, user: UserSummary, week: string) {
    const project = await this.getProject(projectId);
    const weekStart = startOfIsoWeek(parseDay(week));
    const timesheet = await this.prisma.timesheet.findUnique({
      where: {
        projectId_userId_weekStart: { projectId, userId: user.id, weekStart },
      },
      select: { id: true, status: true },
    });
    if (timesheet?.status !== TimesheetStatus.SUBMITTED) {
      throw new ConflictException('Only a submitted week can be recalled');
    }
    const recalled = await this.prisma.timesheet.update({
      where: { id: timesheet.id },
      data: { status: TimesheetStatus.DRAFT, submittedAt: null },
      select: timesheetSelect,
    });
    return toTimesheetResponse(recalled, project.key);
  }

  async review(
    projectId: string,
    timesheetId: string,
    user: UserSummary,
    dto: ReviewTimesheetDto,
  ) {
    const project = await this.getProject(projectId);
    const role = this.roleOf(project, user.id);
    if (!role || !REVIEWER_ROLES.includes(role)) {
      throw new ForbiddenException(
        'Only supervisors and project owners can review timesheets',
      );
    }
    const timesheet = await this.prisma.timesheet.findFirst({
      where: { id: timesheetId, projectId },
      select: { userId: true, status: true },
    });
    if (!timesheet) {
      throw new NotFoundException(`Timesheet ${timesheetId} not found`);
    }
    if (timesheet.userId === user.id) {
      throw new ForbiddenException('You cannot review your own timesheet');
    }
    // Approved weeks can be reopened with feedback, but not approved twice.
    const reopening =
      timesheet.status === TimesheetStatus.APPROVED &&
      dto.status === TimesheetStatus.CHANGES_REQUESTED;
    if (timesheet.status !== TimesheetStatus.SUBMITTED && !reopening) {
      throw new ConflictException('Only submitted timesheets can be reviewed');
    }

    const reviewed = await this.prisma.timesheet.update({
      where: { id: timesheetId },
      data: {
        status: dto.status,
        reviewedById: user.id,
        reviewedAt: new Date(),
        reviewComment:
          dto.status === TimesheetStatus.APPROVED ? null : dto.comment,
      },
      select: timesheetSelect,
    });
    return toTimesheetResponse(reviewed, project.key);
  }

  private async syncRowHours(tx: Tx, rowId: string) {
    const { _sum } = await tx.contributionDay.aggregate({
      where: { entryId: rowId },
      _sum: { hours: true },
    });
    return tx.contributionEntry.update({
      where: { id: rowId },
      data: { hours: _sum.hours ?? 0 },
      select: rowSelect,
    });
  }

  private async dayTotal(
    tx: Tx,
    timesheetId: string,
    excludeRowId: string,
    date: Date,
  ): Promise<number> {
    const { _sum } = await tx.contributionDay.aggregate({
      where: { date, entryId: { not: excludeRowId }, entry: { timesheetId } },
      _sum: { hours: true },
    });
    return Number(_sum.hours ?? 0);
  }

  private async assertDailyLimit(
    tx: Tx,
    timesheetId: string,
    rowId: string,
    date: Date,
    hours: number,
  ) {
    const total = round2(
      (await this.dayTotal(tx, timesheetId, rowId, date)) + hours,
    );
    if (total > MAX_DAILY_HOURS) {
      throw new BadRequestException(
        `That would bring ${isoDay(date)} to ${total}h; a day has at most ${MAX_DAILY_HOURS}h`,
      );
    }
  }

  private ensureTimesheet(
    tx: Tx,
    projectId: string,
    userId: string,
    weekStart: Date,
  ) {
    return tx.timesheet.upsert({
      where: {
        projectId_userId_weekStart: { projectId, userId, weekStart },
      },
      create: { projectId, userId, weekStart },
      update: {},
      select: { id: true, status: true },
    });
  }

  private async getProject(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: {
        key: true,
        members: {
          select: { role: true, user: { select: userSummarySelect } },
          orderBy: { joinedAt: 'asc' },
        },
      },
    });
    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }
    return project;
  }

  private roleOf(
    project: Awaited<ReturnType<TimesheetsService['getProject']>>,
    userId: string,
  ) {
    return project.members.find((m) => m.user.id === userId)?.role;
  }

  private assertLogger(
    project: Awaited<ReturnType<TimesheetsService['getProject']>>,
    userId: string,
  ) {
    const role = this.roleOf(project, userId);
    if (!role || !LOGGING_ROLES.includes(role)) {
      throw new ForbiddenException(
        'Only project owners and members can log hours',
      );
    }
  }

  private async getOwnRow(
    projectId: string,
    rowId: string,
    user: UserSummary,
  ): Promise<OwnRow> {
    const row = await this.prisma.contributionEntry.findFirst({
      where: { id: rowId, timesheet: { projectId } },
      select: ownRowSelect,
    });
    if (!row) {
      throw new NotFoundException(`Timesheet row ${rowId} not found`);
    }
    if (row.timesheet.userId !== user.id) {
      throw new ForbiddenException('You can only change your own timesheet');
    }
    return row;
  }

  private assertEditable(status: TimesheetStatus) {
    if (status === TimesheetStatus.APPROVED) {
      throw new ConflictException('This week is approved and locked');
    }
    if (status === TimesheetStatus.SUBMITTED) {
      throw new ConflictException(
        'This week is submitted; recall it before making changes',
      );
    }
  }

  private async assertRowFields(
    projectId: string,
    taskId: string | null | undefined,
    description: string | undefined,
  ) {
    if (taskId) {
      await this.assertTaskInProject(projectId, taskId);
    } else if (!description) {
      throw new BadRequestException('Pick a task or describe the work');
    }
  }

  private async assertTaskInProject(projectId: string, taskId: string) {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, projectId },
      select: { id: true },
    });
    if (!task) {
      throw new BadRequestException('The task does not belong to this project');
    }
  }

  private loggableWeek(week: string): Date {
    const weekStart = startOfIsoWeek(parseDay(week));
    if (weekStart > latestLoggableDay(new Date())) {
      throw new BadRequestException('You cannot log hours for a future week');
    }
    return weekStart;
  }

  private loggableDay(day: string): Date {
    if (!DAY_FORMAT.test(day) || Number.isNaN(parseDay(day).getTime())) {
      throw new BadRequestException('Use a YYYY-MM-DD date');
    }
    const date = parseDay(day);
    if (date > latestLoggableDay(new Date())) {
      throw new BadRequestException('You cannot log hours for a future day');
    }
    return date;
  }

  private dayInWeek(day: string, weekStart: Date): Date {
    const date = this.loggableDay(day);
    if (date < weekStart || date > addDays(weekStart, 6)) {
      throw new BadRequestException('That day is not in this timesheet week');
    }
    return date;
  }
}

import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  MeetingRecordStatus,
  ProjectRole,
  StatusCategory,
  TimesheetStatus,
} from '@prisma/client';
import { LOGGING_ROLES, REVIEWER_ROLES } from '../common/roles';
import {
  academicWeekOf,
  semesterSelect,
  toSemesterResponse,
} from '../common/semester';
import { assertSignatureImage } from '../common/signature-image';
import { UserSummary, userSummarySelect } from '../common/user-summary';
import { addWeeks, startOfIsoWeek } from '../common/week';
import {
  milestoneSelect,
  toMilestoneResponse,
} from '../milestones/milestones.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  meetingSelect,
  toMeetingResponse,
} from '../record-book/meeting-response';
import {
  round2,
  timesheetSelect,
  toTimesheetResponse,
} from '../timesheets/timesheet-response';
import { SaveSignatureDto } from './dto/save-signature.dto';

const UPCOMING_MILESTONE_LIMIT = 5;

const signatureSelect = { image: true, method: true, updatedAt: true } as const;

const projectSummarySelect = { id: true, key: true, name: true } as const;

const timesheetWithProjectSelect = {
  ...timesheetSelect,
  user: { select: userSummarySelect },
  project: { select: projectSummarySelect },
} as const;

@Injectable()
export class MeService {
  constructor(private readonly prisma: PrismaService) {}

  async profile(user: UserSummary) {
    const [workspaces, projects] = await Promise.all([
      this.prisma.workspaceMember.findMany({
        where: { userId: user.id },
        orderBy: { joinedAt: 'asc' },
        select: { role: true, workspace: { select: { id: true, name: true } } },
      }),
      this.projectMemberships(user.id),
    ]);
    const roles = projects.map((p) => p.role);

    return {
      user,
      workspaces: workspaces.map((w) => ({ ...w.workspace, role: w.role })),
      projects: projects.map(({ role, project }) => ({
        id: project.id,
        key: project.key,
        name: project.name,
        role,
      })),
      isStudent: roles.some((r) => LOGGING_ROLES.includes(r)),
      canReview: roles.some((r) => REVIEWER_ROLES.includes(r)),
    };
  }

  async week(user: UserSummary, now = new Date()) {
    const weekStart = startOfIsoWeek(now);
    const memberships = await this.projectMemberships(user.id);
    const projectIds = memberships.map((m) => m.project.id);
    const reviewProjectIds = memberships
      .filter((m) => REVIEWER_ROLES.includes(m.role))
      .map((m) => m.project.id);

    const [weekSheets, tasks, changesRequested, milestones, pendingReviews] =
      await Promise.all([
        this.prisma.timesheet.findMany({
          where: { userId: user.id, weekStart, projectId: { in: projectIds } },
          select: {
            projectId: true,
            status: true,
            entries: { select: { hours: true } },
          },
        }),
        this.prisma.task.findMany({
          where: {
            projectId: { in: projectIds },
            assignees: { some: { userId: user.id } },
            status: { category: { not: StatusCategory.DONE } },
          },
          orderBy: [
            { dueDate: { sort: 'asc', nulls: 'last' } },
            { priority: 'desc' },
            { number: 'asc' },
          ],
          select: {
            id: true,
            number: true,
            title: true,
            priority: true,
            dueDate: true,
            project: { select: projectSummarySelect },
            status: { select: { name: true, category: true } },
            blockedBy: {
              select: {
                blockingTask: {
                  select: {
                    number: true,
                    status: { select: { category: true } },
                  },
                },
              },
            },
          },
        }),
        this.prisma.timesheet.findMany({
          where: {
            userId: user.id,
            projectId: { in: projectIds },
            status: TimesheetStatus.CHANGES_REQUESTED,
          },
          orderBy: { weekStart: 'desc' },
          select: timesheetWithProjectSelect,
        }),
        this.prisma.milestone.findMany({
          where: { projectId: { in: projectIds } },
          orderBy: { dueDate: 'asc' },
          select: {
            ...milestoneSelect,
            project: { select: projectSummarySelect },
          },
        }),
        this.prisma.timesheet.count({
          where: {
            projectId: { in: reviewProjectIds },
            status: TimesheetStatus.SUBMITTED,
            userId: { not: user.id },
          },
        }),
      ]);

    const semesterOf = (projectId: string) => {
      const membership = memberships.find((m) => m.project.id === projectId);
      return membership
        ? toSemesterResponse(membership.project.workspace, now)
        : null;
    };

    const projects = memberships.map(({ role, project }) => {
      const sheet = weekSheets.find((s) => s.projectId === project.id);
      const own = sheet?.entries ?? [];
      const semester = semesterOf(project.id);
      return {
        id: project.id,
        key: project.key,
        name: project.name,
        workspace: { id: project.workspace.id, name: project.workspace.name },
        role,
        canLog: LOGGING_ROLES.includes(role),
        hours: round2(own.reduce((sum, e) => sum + Number(e.hours), 0)),
        rowCount: own.length,
        timesheetStatus: sheet?.status ?? TimesheetStatus.DRAFT,
        semesterName: semester?.name ?? null,
        teachingWeeks: semester?.teachingWeeks ?? null,
        academicWeek: academicWeekOf(semester, weekStart),
      };
    });

    return {
      weekStart,
      weekEnd: new Date(addWeeks(weekStart, 1).getTime() - 1),
      totalHours: round2(projects.reduce((sum, p) => sum + p.hours, 0)),
      projects,
      tasks: tasks.map((task) => ({
        id: task.id,
        key: `${task.project.key}-${task.number}`,
        title: task.title,
        priority: task.priority,
        dueDate: task.dueDate,
        project: task.project,
        status: task.status,
        openBlockers: task.blockedBy
          .filter((d) => d.blockingTask.status.category !== StatusCategory.DONE)
          .map((d) => `${task.project.key}-${d.blockingTask.number}`),
      })),
      changesRequested: changesRequested.map((timesheet) => ({
        ...toTimesheetResponse(timesheet, timesheet.project.key),
        project: timesheet.project,
        academicWeek: academicWeekOf(
          semesterOf(timesheet.project.id),
          timesheet.weekStart,
        ),
      })),
      milestones: milestones
        .map((m) => ({
          ...toMilestoneResponse(m, m.project.key, now),
          project: m.project,
        }))
        .filter((m) => m.status !== 'COMPLETE')
        .slice(0, UPCOMING_MILESTONE_LIMIT),
      pendingReviews,
    };
  }

  async reviewQueue(user: UserSummary, now = new Date()) {
    const memberships = (await this.projectMemberships(user.id)).filter((m) =>
      REVIEWER_ROLES.includes(m.role),
    );
    const timesheets = await this.prisma.timesheet.findMany({
      where: {
        projectId: { in: memberships.map((m) => m.project.id) },
        status: TimesheetStatus.SUBMITTED,
        userId: { not: user.id },
      },
      orderBy: [{ weekStart: 'asc' }, { submittedAt: 'asc' }],
      select: timesheetWithProjectSelect,
    });

    const supervisedProjectIds = memberships
      .filter((m) => m.role === ProjectRole.SUPERVISOR)
      .map((m) => m.project.id);
    const meetings = await this.prisma.meetingRecord.findMany({
      where: {
        projectId: { in: supervisedProjectIds },
        status: MeetingRecordStatus.SUBMITTED,
      },
      orderBy: [{ meetingDate: 'asc' }, { number: 'asc' }],
      select: { ...meetingSelect, project: { select: projectSummarySelect } },
    });

    const semesters = new Map(
      memberships.map(({ project }) => [
        project.id,
        toSemesterResponse(project.workspace, now),
      ]),
    );

    return {
      projects: memberships.map(({ role, project }) => ({
        id: project.id,
        key: project.key,
        name: project.name,
        role,
        teachingWeeks: semesters.get(project.id)?.teachingWeeks ?? null,
      })),
      timesheets: timesheets.map((timesheet) => ({
        ...toTimesheetResponse(timesheet, timesheet.project.key),
        user: timesheet.user,
        submittedAt: timesheet.submittedAt,
        project: timesheet.project,
        academicWeek: academicWeekOf(
          semesters.get(timesheet.project.id) ?? null,
          timesheet.weekStart,
        ),
      })),
      meetings: meetings.map(({ project, ...meeting }) => ({
        ...toMeetingResponse(meeting),
        project,
      })),
    };
  }

  async approve(user: UserSummary, timesheetIds: string[]) {
    const timesheets = await this.prisma.timesheet.findMany({
      where: { id: { in: timesheetIds } },
      select: {
        id: true,
        userId: true,
        project: {
          select: {
            members: { where: { userId: user.id }, select: { role: true } },
          },
        },
      },
    });
    if (timesheets.length !== timesheetIds.length) {
      throw new NotFoundException('Some timesheets no longer exist');
    }
    for (const timesheet of timesheets) {
      const role = timesheet.project.members[0]?.role;
      if (!role || !REVIEWER_ROLES.includes(role)) {
        throw new ForbiddenException(
          'Only supervisors and project owners can review timesheets',
        );
      }
      if (timesheet.userId === user.id) {
        throw new ForbiddenException('You cannot review your own timesheet');
      }
    }

    // Weeks recalled or already decided since the queue loaded are left alone.
    const { count } = await this.prisma.timesheet.updateMany({
      where: { id: { in: timesheetIds }, status: TimesheetStatus.SUBMITTED },
      data: {
        status: TimesheetStatus.APPROVED,
        reviewComment: null,
        reviewedById: user.id,
        reviewedAt: new Date(),
      },
    });
    return { approved: count };
  }

  getSignature(user: UserSummary) {
    return this.prisma.userSignature.findUnique({
      where: { userId: user.id },
      select: signatureSelect,
    });
  }

  saveSignature(user: UserSummary, dto: SaveSignatureDto) {
    assertSignatureImage(dto.image);
    return this.prisma.userSignature.upsert({
      where: { userId: user.id },
      create: { userId: user.id, image: dto.image, method: dto.method },
      update: { image: dto.image, method: dto.method },
      select: signatureSelect,
    });
  }

  async deleteSignature(user: UserSummary) {
    await this.prisma.userSignature.deleteMany({ where: { userId: user.id } });
  }

  private projectMemberships(userId: string) {
    return this.prisma.projectMember.findMany({
      where: { userId, project: { archivedAt: null } },
      orderBy: { joinedAt: 'asc' },
      select: {
        role: true,
        project: {
          select: {
            ...projectSummarySelect,
            workspace: { select: { id: true, name: true, ...semesterSelect } },
          },
        },
      },
    });
  }
}

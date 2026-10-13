import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ContributionReviewStatus, ProjectRole } from '@prisma/client';
import { LOGGING_ROLES, REVIEWER_ROLES } from '../common/roles';
import { UserSummary, userSummarySelect } from '../common/user-summary';
import { addWeeks, startOfIsoWeek } from '../common/week';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateContributionDto,
  MAX_WEEKLY_HOURS,
  ReviewContributionDto,
  UpdateContributionDto,
} from './dto/contribution-entry.dto';
import {
  entrySelect,
  round2,
  toEntryResponse as toResponse,
} from './entry-response';

function parseWeek(week: string): Date {
  return startOfIsoWeek(new Date(`${week}T00:00:00Z`));
}

@Injectable()
export class ContributionsService {
  constructor(private readonly prisma: PrismaService) {}

  async listForWeek(projectId: string, week: Date) {
    const weekStart = startOfIsoWeek(week);
    const project = await this.getProject(projectId);

    const entries = await this.prisma.contributionEntry.findMany({
      where: { projectId, weekStart },
      orderBy: [{ createdAt: 'asc' }],
      select: entrySelect,
    });
    const mapped = entries.map((entry) => toResponse(entry, project.key));

    const members = project.members.map(({ user, role }) => {
      const own = mapped.filter((e) => e.user.id === user.id);
      return {
        user,
        role,
        entryCount: own.length,
        hours: round2(own.reduce((sum, e) => sum + e.hours, 0)),
      };
    });

    return {
      weekStart,
      weekEnd: new Date(addWeeks(weekStart, 1).getTime() - 1),
      totalHours: round2(mapped.reduce((sum, e) => sum + e.hours, 0)),
      members,
      entries: mapped,
    };
  }

  async create(
    projectId: string,
    user: UserSummary,
    dto: CreateContributionDto,
  ) {
    const project = await this.getProject(projectId);
    const role = this.roleOf(project, user.id);
    if (!role || !LOGGING_ROLES.includes(role)) {
      throw new ForbiddenException(
        'Only project owners and members can log contributions',
      );
    }

    const weekStart = this.assertLoggableWeek(dto.week);
    if (dto.taskId) await this.assertTaskInProject(projectId, dto.taskId);
    await this.assertWeeklyLimit(projectId, user.id, weekStart, dto.hours);

    const entry = await this.prisma.contributionEntry.create({
      data: {
        projectId,
        userId: user.id,
        weekStart,
        hours: dto.hours,
        type: dto.type,
        taskId: dto.taskId ?? null,
        description: dto.description,
      },
      select: entrySelect,
    });
    return toResponse(entry, project.key);
  }

  async update(
    projectId: string,
    entryId: string,
    user: UserSummary,
    dto: UpdateContributionDto,
  ) {
    const project = await this.getProject(projectId);
    const existing = await this.getOwnEditableEntry(projectId, entryId, user);

    const weekStart =
      dto.week !== undefined
        ? this.assertLoggableWeek(dto.week)
        : existing.weekStart;
    if (dto.taskId) await this.assertTaskInProject(projectId, dto.taskId);
    await this.assertWeeklyLimit(
      projectId,
      user.id,
      weekStart,
      dto.hours ?? Number(existing.hours),
      entryId,
    );

    const entry = await this.prisma.contributionEntry.update({
      where: { id: entryId },
      data: {
        weekStart,
        hours: dto.hours,
        type: dto.type,
        taskId: dto.taskId,
        description: dto.description,
        // Edits after "changes requested" go back to the reviewer.
        reviewStatus: ContributionReviewStatus.PENDING,
      },
      select: entrySelect,
    });
    return toResponse(entry, project.key);
  }

  async remove(projectId: string, entryId: string, user: UserSummary) {
    await this.getOwnEditableEntry(projectId, entryId, user);
    await this.prisma.contributionEntry.delete({ where: { id: entryId } });
  }

  async review(
    projectId: string,
    entryId: string,
    user: UserSummary,
    dto: ReviewContributionDto,
  ) {
    const project = await this.getProject(projectId);
    const role = this.roleOf(project, user.id);
    if (!role || !REVIEWER_ROLES.includes(role)) {
      throw new ForbiddenException(
        'Only supervisors and project owners can review contributions',
      );
    }

    const existing = await this.getEntry(projectId, entryId);
    if (existing.userId === user.id) {
      throw new ForbiddenException('You cannot review your own contribution');
    }

    const entry = await this.prisma.contributionEntry.update({
      where: { id: entryId },
      data: {
        reviewStatus: dto.status,
        reviewComment: dto.comment || null,
        reviewedById: user.id,
        reviewedAt: new Date(),
      },
      select: entrySelect,
    });
    return toResponse(entry, project.key);
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
    project: Awaited<ReturnType<ContributionsService['getProject']>>,
    userId: string,
  ): ProjectRole | undefined {
    return project.members.find((m) => m.user.id === userId)?.role;
  }

  private async getEntry(projectId: string, entryId: string) {
    const entry = await this.prisma.contributionEntry.findFirst({
      where: { id: entryId, projectId },
      select: {
        userId: true,
        weekStart: true,
        hours: true,
        reviewStatus: true,
      },
    });
    if (!entry) {
      throw new NotFoundException(`Contribution ${entryId} not found`);
    }
    return entry;
  }

  private async getOwnEditableEntry(
    projectId: string,
    entryId: string,
    user: UserSummary,
  ) {
    const entry = await this.getEntry(projectId, entryId);
    if (entry.userId !== user.id) {
      throw new ForbiddenException('You can only change your own entries');
    }
    if (entry.reviewStatus === ContributionReviewStatus.APPROVED) {
      throw new ConflictException('Approved entries can no longer be changed');
    }
    return entry;
  }

  private assertLoggableWeek(week: string): Date {
    const weekStart = parseWeek(week);
    if (weekStart > startOfIsoWeek(new Date())) {
      throw new BadRequestException('You cannot log hours for a future week');
    }
    return weekStart;
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

  private async assertWeeklyLimit(
    projectId: string,
    userId: string,
    weekStart: Date,
    hours: number,
    excludeEntryId?: string,
  ) {
    const { _sum } = await this.prisma.contributionEntry.aggregate({
      where: {
        projectId,
        userId,
        weekStart,
        id: excludeEntryId ? { not: excludeEntryId } : undefined,
      },
      _sum: { hours: true },
    });
    const logged = Number(_sum.hours ?? 0);
    if (logged + hours > MAX_WEEKLY_HOURS) {
      throw new BadRequestException(
        `That would bring this week to ${round2(logged + hours)}h; a week has at most ${MAX_WEEKLY_HOURS}h`,
      );
    }
  }
}

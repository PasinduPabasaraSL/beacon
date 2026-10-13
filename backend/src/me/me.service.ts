import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ContributionReviewStatus,
  MeetingRecordStatus,
  ProjectRole,
  StatusCategory,
} from '@prisma/client';
import { LOGGING_ROLES, REVIEWER_ROLES } from '../common/roles';
import {
  academicWeekOf,
  semesterSelect,
  toSemesterResponse,
} from '../common/semester';
import { assertSignatureImage } from '../common/signature-image';
import { UserSummary } from '../common/user-summary';
import { addWeeks, startOfIsoWeek } from '../common/week';
import {
  entrySelect,
  round2,
  toEntryResponse,
} from '../contributions/entry-response';
import {
  milestoneSelect,
  toMilestoneResponse,
} from '../milestones/milestones.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  meetingSelect,
  toMeetingResponse,
} from '../record-book/meeting-response';
import { SaveSignatureDto } from './dto/save-signature.dto';

const UPCOMING_MILESTONE_LIMIT = 5;

const signatureSelect = { image: true, method: true, updatedAt: true } as const;

const projectSummarySelect = { id: true, key: true, name: true } as const;

const entryWithProjectSelect = {
  ...entrySelect,
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

    const [weekEntries, tasks, changesRequested, milestones, pendingReviews] =
      await Promise.all([
        this.prisma.contributionEntry.findMany({
          where: { userId: user.id, weekStart, projectId: { in: projectIds } },
          select: { projectId: true, hours: true },
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
        this.prisma.contributionEntry.findMany({
          where: {
            userId: user.id,
            projectId: { in: projectIds },
            reviewStatus: ContributionReviewStatus.CHANGES_REQUESTED,
          },
          orderBy: [{ weekStart: 'desc' }, { createdAt: 'asc' }],
          select: entryWithProjectSelect,
        }),
        this.prisma.milestone.findMany({
          where: { projectId: { in: projectIds } },
          orderBy: { dueDate: 'asc' },
          select: {
            ...milestoneSelect,
            project: { select: projectSummarySelect },
          },
        }),
        this.prisma.contributionEntry.count({
          where: {
            projectId: { in: reviewProjectIds },
            reviewStatus: ContributionReviewStatus.PENDING,
            userId: { not: user.id },
          },
        }),
      ]);

    const projects = memberships.map(({ role, project }) => {
      const own = weekEntries.filter((e) => e.projectId === project.id);
      const semester = toSemesterResponse(project.workspace, now);
      return {
        id: project.id,
        key: project.key,
        name: project.name,
        workspace: { id: project.workspace.id, name: project.workspace.name },
        role,
        canLog: LOGGING_ROLES.includes(role),
        hours: round2(own.reduce((sum, e) => sum + Number(e.hours), 0)),
        entryCount: own.length,
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
      changesRequested: changesRequested.map((entry) => ({
        ...toEntryResponse(entry, entry.project.key),
        project: entry.project,
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
    const entries = await this.prisma.contributionEntry.findMany({
      where: {
        projectId: { in: memberships.map((m) => m.project.id) },
        reviewStatus: ContributionReviewStatus.PENDING,
        userId: { not: user.id },
      },
      orderBy: [{ weekStart: 'asc' }, { createdAt: 'asc' }],
      select: { ...entryWithProjectSelect, projectId: true },
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
      entries: entries.map(({ projectId, ...entry }) => ({
        ...toEntryResponse(entry, entry.project.key),
        project: entry.project,
        academicWeek: academicWeekOf(
          semesters.get(projectId) ?? null,
          entry.weekStart,
        ),
      })),
      meetings: meetings.map(({ project, ...meeting }) => ({
        ...toMeetingResponse(meeting),
        project,
      })),
    };
  }

  async approve(user: UserSummary, entryIds: string[]) {
    const entries = await this.prisma.contributionEntry.findMany({
      where: { id: { in: entryIds } },
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
    if (entries.length !== entryIds.length) {
      throw new NotFoundException('Some contributions no longer exist');
    }
    for (const entry of entries) {
      const role = entry.project.members[0]?.role;
      if (!role || !REVIEWER_ROLES.includes(role)) {
        throw new ForbiddenException(
          'Only supervisors and project owners can review contributions',
        );
      }
      if (entry.userId === user.id) {
        throw new ForbiddenException('You cannot review your own contribution');
      }
    }

    const { count } = await this.prisma.contributionEntry.updateMany({
      where: {
        id: { in: entryIds },
        reviewStatus: { not: ContributionReviewStatus.APPROVED },
      },
      data: {
        reviewStatus: ContributionReviewStatus.APPROVED,
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

import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ProjectRole, SprintStatus, StatusCategory } from '@prisma/client';
import { assertLogoImage } from '../common/signature-image';
import { type UserSummary, userSummarySelect } from '../common/user-summary';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProjectProfileDto } from './dto/update-profile.dto';

export type CategoryCounts = Record<StatusCategory, number>;

export function emptyCategoryCounts(): CategoryCounts {
  return {
    BACKLOG: 0,
    TODO: 0,
    IN_PROGRESS: 0,
    IN_REVIEW: 0,
    DONE: 0,
  };
}

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const projects = await this.prisma.project.findMany({
      where: { archivedAt: null },
      orderBy: { createdAt: 'asc' },
      include: {
        workspace: { select: { id: true, name: true, slug: true } },
        recordBook: { select: { groupName: true } },
        members: {
          select: { role: true, user: { select: userSummarySelect } },
          orderBy: { joinedAt: 'asc' },
        },
        statuses: {
          select: { category: true, _count: { select: { tasks: true } } },
        },
        sprints: {
          where: { status: SprintStatus.ACTIVE },
          select: { id: true, name: true, startDate: true, endDate: true },
          orderBy: { startDate: 'desc' },
          take: 1,
        },
      },
    });

    return projects.map((project) => {
      const byCategory = emptyCategoryCounts();
      for (const status of project.statuses) {
        byCategory[status.category] += status._count.tasks;
      }
      const total = Object.values(byCategory).reduce((a, b) => a + b, 0);

      return {
        id: project.id,
        key: project.key,
        name: project.name,
        description: project.description,
        logo: project.logo,
        isPublic: project.isPublic,
        teamName: project.recordBook?.groupName ?? null,
        workspace: project.workspace,
        members: project.members.map((m) => ({ ...m.user, role: m.role })),
        taskCounts: { total, done: byCategory.DONE, byCategory },
        activeSprint: project.sprints[0] ?? null,
      };
    });
  }

  async get(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        workspace: { select: { id: true, name: true, slug: true } },
        recordBook: { select: { groupName: true } },
        members: {
          select: { role: true, user: { select: userSummarySelect } },
          orderBy: { joinedAt: 'asc' },
        },
        statuses: {
          select: { id: true, name: true, category: true, color: true },
          orderBy: { position: 'asc' },
        },
        sprints: {
          select: {
            id: true,
            name: true,
            goal: true,
            status: true,
            startDate: true,
            endDate: true,
          },
          orderBy: { startDate: 'asc' },
        },
      },
    });
    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }

    return {
      id: project.id,
      key: project.key,
      name: project.name,
      description: project.description,
      logo: project.logo,
      isPublic: project.isPublic,
      teamName: project.recordBook?.groupName ?? null,
      workspace: project.workspace,
      members: project.members.map((m) => ({ ...m.user, role: m.role })),
      statuses: project.statuses,
      sprints: project.sprints,
    };
  }

  async updateProfile(
    projectId: string,
    user: UserSummary,
    dto: UpdateProjectProfileDto,
  ) {
    const membership = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: user.id } },
      select: { role: true },
    });
    if (!membership) {
      const exists = await this.prisma.project.count({
        where: { id: projectId },
      });
      if (!exists)
        throw new NotFoundException(`Project ${projectId} not found`);
    }
    if (membership?.role !== ProjectRole.OWNER) {
      throw new ForbiddenException(
        'Only the team lead can edit the project profile',
      );
    }
    if (typeof dto.logo === 'string') assertLogoImage(dto.logo);

    await this.prisma.$transaction(async (tx) => {
      await tx.project.update({
        where: { id: projectId },
        data: {
          name: dto.name,
          description:
            dto.description === undefined
              ? undefined
              : dto.description.trim() || null,
          logo: dto.logo,
          isPublic: dto.isPublic,
        },
      });
      if (dto.teamName !== undefined) {
        const groupName = dto.teamName || null;
        await tx.recordBook.upsert({
          where: { projectId },
          create: { projectId, groupName },
          update: { groupName },
        });
      }
    });
    return this.get(projectId);
  }

  /** The profile anyone with the link can see, unless the team lead made it private. */
  async publicProfile(projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, archivedAt: null },
      select: {
        id: true,
        key: true,
        name: true,
        description: true,
        logo: true,
        isPublic: true,
        updatedAt: true,
        workspace: { select: { name: true } },
        recordBook: { select: { groupName: true } },
        members: {
          select: { role: true, user: { select: userSummarySelect } },
          orderBy: { joinedAt: 'asc' },
        },
      },
    });
    if (!project) {
      throw new NotFoundException('This project does not exist');
    }
    if (!project.isPublic) {
      throw new ForbiddenException('This project profile is private');
    }
    return {
      id: project.id,
      key: project.key,
      name: project.name,
      description: project.description,
      logo: project.logo,
      teamName: project.recordBook?.groupName ?? null,
      workspace: project.workspace,
      members: project.members.map((m) => ({ ...m.user, role: m.role })),
      updatedAt: project.updatedAt,
    };
  }

  async board(projectId: string, sprintId?: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: {
        key: true,
        statuses: {
          orderBy: { position: 'asc' },
          select: {
            id: true,
            name: true,
            category: true,
            color: true,
            tasks: {
              where: sprintId ? { sprintId } : undefined,
              orderBy: { position: 'asc' },
              select: {
                id: true,
                number: true,
                title: true,
                priority: true,
                dueDate: true,
                sprintId: true,
                completedAt: true,
                assignees: {
                  orderBy: { assignedAt: 'asc' },
                  select: { user: { select: userSummarySelect } },
                },
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
            },
          },
        },
      },
    });
    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }

    return {
      columns: project.statuses.map((status) => ({
        id: status.id,
        name: status.name,
        category: status.category,
        color: status.color,
        tasks: status.tasks.map((task) => ({
          id: task.id,
          number: task.number,
          key: `${project.key}-${task.number}`,
          title: task.title,
          priority: task.priority,
          dueDate: task.dueDate,
          sprintId: task.sprintId,
          completedAt: task.completedAt,
          assignees: task.assignees.map((a) => a.user),
          openBlockers: task.blockedBy
            .filter(
              (d) => d.blockingTask.status.category !== StatusCategory.DONE,
            )
            .map((d) => `${project.key}-${d.blockingTask.number}`),
        })),
      })),
    };
  }
}

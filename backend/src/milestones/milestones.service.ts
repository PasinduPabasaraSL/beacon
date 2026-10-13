import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, StatusCategory } from '@prisma/client';
import { PLANNING_ROLES } from '../common/roles';
import { UserSummary } from '../common/user-summary';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMilestoneDto, UpdateMilestoneDto } from './dto/milestone.dto';

export const milestoneSelect = {
  id: true,
  title: true,
  description: true,
  dueDate: true,
  tasks: {
    orderBy: { number: 'asc' },
    select: {
      id: true,
      number: true,
      title: true,
      status: { select: { category: true } },
    },
  },
} satisfies Prisma.MilestoneSelect;

type MilestoneRow = Prisma.MilestoneGetPayload<{
  select: typeof milestoneSelect;
}>;

export type MilestoneStatus = 'COMPLETE' | 'OVERDUE' | 'UPCOMING';

function todayUtc(now: Date): Date {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

export function toMilestoneResponse(
  milestone: MilestoneRow,
  projectKey: string,
  now = new Date(),
) {
  const tasks = milestone.tasks.map((task) => ({
    id: task.id,
    key: `${projectKey}-${task.number}`,
    title: task.title,
    done: task.status.category === StatusCategory.DONE,
  }));
  const doneCount = tasks.filter((t) => t.done).length;
  const complete = tasks.length > 0 && doneCount === tasks.length;
  const status: MilestoneStatus = complete
    ? 'COMPLETE'
    : milestone.dueDate < todayUtc(now)
      ? 'OVERDUE'
      : 'UPCOMING';

  return {
    id: milestone.id,
    title: milestone.title,
    description: milestone.description,
    dueDate: milestone.dueDate,
    status,
    taskCount: tasks.length,
    doneCount,
    tasks,
  };
}

function dateOnly(day: string): Date {
  return new Date(`${day}T00:00:00Z`);
}

@Injectable()
export class MilestonesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(projectId: string) {
    const project = await this.getProject(projectId);
    const milestones = await this.prisma.milestone.findMany({
      where: { projectId },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
      select: milestoneSelect,
    });
    return milestones.map((m) => toMilestoneResponse(m, project.key));
  }

  async create(projectId: string, user: UserSummary, dto: CreateMilestoneDto) {
    const project = await this.getPlannableProject(projectId, user);
    const milestone = await this.prisma.milestone.create({
      data: {
        projectId,
        title: dto.title,
        description: dto.description || null,
        dueDate: dateOnly(dto.dueDate),
      },
      select: milestoneSelect,
    });
    return toMilestoneResponse(milestone, project.key);
  }

  async update(
    projectId: string,
    milestoneId: string,
    user: UserSummary,
    dto: UpdateMilestoneDto,
  ) {
    const project = await this.getPlannableProject(projectId, user);
    await this.getMilestone(projectId, milestoneId);
    const milestone = await this.prisma.milestone.update({
      where: { id: milestoneId },
      data: {
        title: dto.title,
        description:
          dto.description === undefined ? undefined : dto.description || null,
        dueDate: dto.dueDate ? dateOnly(dto.dueDate) : undefined,
      },
      select: milestoneSelect,
    });
    return toMilestoneResponse(milestone, project.key);
  }

  async remove(projectId: string, milestoneId: string, user: UserSummary) {
    await this.getPlannableProject(projectId, user);
    await this.getMilestone(projectId, milestoneId);
    await this.prisma.milestone.delete({ where: { id: milestoneId } });
  }

  private async getProject(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { key: true },
    });
    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }
    return project;
  }

  private async getPlannableProject(projectId: string, user: UserSummary) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: {
        key: true,
        members: { where: { userId: user.id }, select: { role: true } },
      },
    });
    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }
    const role = project.members[0]?.role;
    if (!role || !PLANNING_ROLES.includes(role)) {
      throw new ForbiddenException(
        'Only project owners and supervisors can manage milestones',
      );
    }
    return project;
  }

  private async getMilestone(projectId: string, milestoneId: string) {
    const milestone = await this.prisma.milestone.findFirst({
      where: { id: milestoneId, projectId },
      select: { id: true },
    });
    if (!milestone) {
      throw new NotFoundException(`Milestone ${milestoneId} not found`);
    }
  }
}

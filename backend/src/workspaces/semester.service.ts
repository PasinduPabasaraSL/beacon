import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { WORKSPACE_ADMIN_ROLES } from '../common/roles';
import { semesterSelect, toSemesterResponse } from '../common/semester';
import { UserSummary } from '../common/user-summary';
import { addWeeks, startOfIsoWeek } from '../common/week';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateSemesterDto } from './dto/update-semester.dto';

function mondayOf(day: string): Date {
  return startOfIsoWeek(new Date(`${day}T00:00:00Z`));
}

@Injectable()
export class SemesterService {
  constructor(private readonly prisma: PrismaService) {}

  async get(workspaceId: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { id: true, name: true, ...semesterSelect },
    });
    if (!workspace) {
      throw new NotFoundException(`Workspace ${workspaceId} not found`);
    }
    return {
      workspace: { id: workspace.id, name: workspace.name },
      semester: toSemesterResponse(workspace),
    };
  }

  async update(workspaceId: string, user: UserSummary, dto: UpdateSemesterDto) {
    await this.assertAdmin(workspaceId, user);

    const start = mondayOf(dto.startDate);
    const end = addWeeks(start, dto.weeks);
    const breaks = dto.breaks.map((b) => ({
      weekStart: mondayOf(b.week),
      kind: b.kind,
      label: b.label || null,
    }));

    const seen = new Set<number>();
    for (const { weekStart } of breaks) {
      if (weekStart < start || weekStart >= end) {
        throw new BadRequestException(
          'Break and exam weeks must fall inside the semester',
        );
      }
      if (seen.has(weekStart.getTime())) {
        throw new BadRequestException('Each week can only be marked once');
      }
      seen.add(weekStart.getTime());
    }
    if (breaks.length >= dto.weeks) {
      throw new BadRequestException(
        'A semester needs at least one teaching week',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.semesterBreak.deleteMany({ where: { workspaceId } });
      await tx.workspace.update({
        where: { id: workspaceId },
        data: {
          semesterName: dto.name || null,
          semesterStart: start,
          semesterWeeks: dto.weeks,
          semesterBreaks: { create: breaks },
        },
      });
    });
    return this.get(workspaceId);
  }

  private async assertAdmin(workspaceId: string, user: UserSummary) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        members: { where: { userId: user.id }, select: { role: true } },
      },
    });
    if (!workspace) {
      throw new NotFoundException(`Workspace ${workspaceId} not found`);
    }
    const role = workspace.members[0]?.role;
    if (!role || !WORKSPACE_ADMIN_ROLES.includes(role)) {
      throw new ForbiddenException(
        'Only workspace owners and admins can change the semester',
      );
    }
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { ContributionType, SprintStatus, StatusCategory } from '@prisma/client';
import { userSummarySelect } from '../common/user-summary';
import { addWeeks, startOfIsoWeek } from '../common/week';
import { PrismaService } from '../prisma/prisma.service';
import { emptyCategoryCounts } from './projects.service';

const DAY_MS = 24 * 60 * 60 * 1000;
const TREND_WEEKS = 4;

function emptyTypeTotals(): Record<ContributionType, number> {
  return {
    DEVELOPMENT: 0,
    TESTING: 0,
    RESEARCH: 0,
    DOCUMENTATION: 0,
    MEETING: 0,
    OTHER: 0,
  };
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async get(projectId: string, now = new Date()) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: {
        key: true,
        members: {
          select: { role: true, user: { select: userSummarySelect } },
          orderBy: { joinedAt: 'asc' },
        },
        sprints: {
          where: { status: SprintStatus.ACTIVE },
          orderBy: { startDate: 'desc' },
          take: 1,
          select: {
            id: true,
            name: true,
            goal: true,
            startDate: true,
            endDate: true,
          },
        },
      },
    });
    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }

    const thisWeek = startOfIsoWeek(now);
    const trendStart = addWeeks(thisWeek, -(TREND_WEEKS - 1));
    const today = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );

    const [tasks, rows] = await Promise.all([
      this.prisma.task.findMany({
        where: { projectId },
        select: {
          id: true,
          number: true,
          title: true,
          dueDate: true,
          sprintId: true,
          status: { select: { category: true } },
          assignees: { select: { userId: true } },
        },
      }),
      this.prisma.contributionEntry.findMany({
        where: { timesheet: { projectId, weekStart: { gte: trendStart } } },
        select: {
          hours: true,
          type: true,
          timesheet: { select: { userId: true, weekStart: true } },
        },
      }),
    ]);
    const entries = rows.map((row) => ({
      userId: row.timesheet.userId,
      weekStart: row.timesheet.weekStart,
      hours: row.hours,
      type: row.type,
    }));

    const byCategory = emptyCategoryCounts();
    for (const task of tasks) byCategory[task.status.category] += 1;
    const isDone = (t: (typeof tasks)[number]) =>
      t.status.category === StatusCategory.DONE;

    const activeSprint = project.sprints[0];
    const sprintTasks = activeSprint
      ? tasks.filter((t) => t.sprintId === activeSprint.id)
      : [];

    const weeks = Array.from({ length: TREND_WEEKS }, (_, i) =>
      addWeeks(trendStart, i),
    );
    const weeklyHours = weeks.map((weekStart) => ({
      weekStart,
      hours: round2(
        entries
          .filter((e) => e.weekStart.getTime() === weekStart.getTime())
          .reduce((sum, e) => sum + Number(e.hours), 0),
      ),
    }));

    const hoursByType = emptyTypeTotals();
    for (const entry of entries) hoursByType[entry.type] += Number(entry.hours);
    for (const type of Object.keys(hoursByType) as ContributionType[]) {
      hoursByType[type] = round2(hoursByType[type]);
    }

    const workload = project.members.map(({ user, role }) => {
      const assigned = tasks.filter((t) =>
        t.assignees.some((a) => a.userId === user.id),
      );
      const userEntries = entries.filter((e) => e.userId === user.id);
      return {
        user,
        role,
        openTasks: assigned.filter((t) => !isDone(t)).length,
        doneTasks: assigned.filter(isDone).length,
        hoursThisWeek: round2(
          userEntries
            .filter((e) => e.weekStart.getTime() === thisWeek.getTime())
            .reduce((sum, e) => sum + Number(e.hours), 0),
        ),
        hoursLast4Weeks: round2(
          userEntries.reduce((sum, e) => sum + Number(e.hours), 0),
        ),
      };
    });

    const overdueTasks = tasks
      .filter((t) => t.dueDate && t.dueDate < today && !isDone(t))
      .map((t) => ({
        id: t.id,
        key: `${project.key}-${t.number}`,
        title: t.title,
        dueDate: t.dueDate,
      }));

    return {
      progress: {
        total: tasks.length,
        done: byCategory.DONE,
        byCategory,
      },
      activeSprint: activeSprint
        ? {
            ...activeSprint,
            totalTasks: sprintTasks.length,
            doneTasks: sprintTasks.filter(isDone).length,
            daysRemaining: Math.max(
              0,
              Math.ceil(
                (activeSprint.endDate.getTime() - today.getTime()) / DAY_MS,
              ),
            ),
          }
        : null,
      workload,
      weeklyHours,
      hoursByType,
      overdueTasks,
    };
  }
}

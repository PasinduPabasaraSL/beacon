import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  ContributionType,
  ProjectRole,
  SprintStatus,
  StatusCategory,
} from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { addWeeks, startOfIsoWeek } from '../src/common/week';
import { ContributionsService } from '../src/contributions/contributions.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { DashboardService } from '../src/projects/dashboard.service';
import { ProjectsService } from '../src/projects/projects.service';

/** Response bodies as JSON: dates arrive as ISO strings. */
type Json<T> = T extends Date
  ? string
  : T extends Array<infer U>
    ? Json<U>[]
    : T extends object
      ? { [K in keyof T]: Json<T[K]> }
      : T;

type ProjectList = Json<Awaited<ReturnType<ProjectsService['list']>>>;
type Board = Json<Awaited<ReturnType<ProjectsService['board']>>>;
type Dashboard = Json<Awaited<ReturnType<DashboardService['get']>>>;
type Contributions = Json<
  Awaited<ReturnType<ContributionsService['listForWeek']>>
>;

describe('Projects, board, dashboard and contributions (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const suffix = randomUUID().slice(0, 8);
  const thisWeek = startOfIsoWeek(new Date());
  let projectId: string;
  let userIds: string[];
  let workspaceId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);

    const [lead, student] = await Promise.all(
      ['lead', 'student'].map((name) =>
        prisma.user.create({
          data: {
            githubId: `e2e-${name}-${suffix}`,
            githubLogin: `e2e-${name}-${suffix}`,
          },
        }),
      ),
    );
    userIds = [lead.id, student.id];

    const workspace = await prisma.workspace.create({
      data: { name: 'E2E', slug: `e2e-${suffix}` },
    });
    workspaceId = workspace.id;

    const project = await prisma.project.create({
      data: {
        workspaceId,
        name: 'E2E Project',
        key: 'E2E',
        members: {
          create: [
            { userId: lead.id, role: ProjectRole.OWNER },
            { userId: student.id, role: ProjectRole.MEMBER },
          ],
        },
        statuses: {
          create: [
            { name: 'Todo', category: StatusCategory.TODO, position: 0 },
            { name: 'Done', category: StatusCategory.DONE, position: 1 },
          ],
        },
        sprints: {
          create: {
            name: 'S1',
            startDate: thisWeek,
            endDate: addWeeks(thisWeek, 2),
            status: SprintStatus.ACTIVE,
          },
        },
      },
      include: { statuses: true, sprints: true },
    });
    projectId = project.id;
    const [todo, done] = project.statuses;
    const sprintId = project.sprints[0].id;

    const blocker = await prisma.task.create({
      data: {
        projectId,
        number: 1,
        title: 'Blocker',
        statusId: todo.id,
        reporterId: lead.id,
        sprintId,
        dueDate: addWeeks(thisWeek, -1),
        assignees: { create: [{ userId: student.id }] },
      },
    });
    const blocked = await prisma.task.create({
      data: {
        projectId,
        number: 2,
        title: 'Blocked',
        statusId: todo.id,
        reporterId: lead.id,
        sprintId,
        assignees: { create: [{ userId: lead.id }, { userId: student.id }] },
      },
    });
    await prisma.task.create({
      data: {
        projectId,
        number: 3,
        title: 'Finished',
        statusId: done.id,
        reporterId: lead.id,
        sprintId,
      },
    });
    await prisma.taskDependency.create({
      data: { blockingTaskId: blocker.id, blockedTaskId: blocked.id },
    });

    await prisma.contributionEntry.createMany({
      data: [
        {
          projectId,
          userId: student.id,
          weekStart: thisWeek,
          hours: 2.5,
          type: ContributionType.DEVELOPMENT,
          taskId: blocker.id,
          description: 'Worked on the blocker',
        },
        {
          projectId,
          userId: student.id,
          weekStart: addWeeks(thisWeek, -1),
          hours: 1,
          type: ContributionType.MEETING,
          description: 'Planning',
        },
      ],
    });
  });

  afterAll(async () => {
    await prisma.workspace.delete({ where: { id: workspaceId } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await app.close();
  });

  const api = () => request(app.getHttpServer());

  async function getJson<T>(path: string): Promise<T> {
    const response = await api().get(path).expect(200);
    return response.body as T;
  }

  it('lists the project with task counts and active sprint', async () => {
    const projects = await getJson<ProjectList>('/api/projects');
    const project = projects.find((p) => p.id === projectId);

    expect(project).toMatchObject({
      key: 'E2E',
      taskCounts: { total: 3, done: 1 },
      activeSprint: { name: 'S1' },
    });
    expect(project?.members).toHaveLength(2);
  });

  it('returns 400 for a malformed id and 404 for an unknown project', async () => {
    await api().get('/api/projects/not-a-uuid').expect(400);
    await api().get(`/api/projects/${randomUUID()}`).expect(404);
  });

  it('returns board columns with tasks, assignees and open blockers', async () => {
    const board = await getJson<Board>(`/api/projects/${projectId}/board`);

    expect(board.columns.map((c) => c.name)).toEqual(['Todo', 'Done']);
    const blocked = board.columns[0].tasks.find((t) => t.key === 'E2E-2');
    expect(blocked?.assignees).toHaveLength(2);
    expect(blocked?.openBlockers).toEqual(['E2E-1']);
  });

  it('summarises progress, workload and overdue tasks', async () => {
    const dashboard = await getJson<Dashboard>(
      `/api/projects/${projectId}/dashboard`,
    );

    expect(dashboard.progress).toMatchObject({ total: 3, done: 1 });
    expect(dashboard.activeSprint).toMatchObject({
      totalTasks: 3,
      doneTasks: 1,
    });
    expect(dashboard.overdueTasks.map((t) => t.key)).toEqual(['E2E-1']);

    const student = dashboard.workload.find((w) => w.user.id === userIds[1]);
    expect(student).toMatchObject({
      openTasks: 2,
      hoursThisWeek: 2.5,
      hoursLast4Weeks: 3.5,
    });
  });

  it('lists contributions for a given week with per-member totals', async () => {
    const current = await getJson<Contributions>(
      `/api/projects/${projectId}/contributions`,
    );

    expect(current.weekStart).toBe(thisWeek.toISOString());
    expect(current.totalHours).toBe(2.5);
    expect(current.entries).toHaveLength(1);
    expect(current.entries[0]).toMatchObject({
      hours: 2.5,
      task: { key: 'E2E-1' },
    });

    const lastWeek = addWeeks(thisWeek, -1).toISOString().slice(0, 10);
    const previous = await getJson<Contributions>(
      `/api/projects/${projectId}/contributions?week=${lastWeek}`,
    );
    expect(previous.totalHours).toBe(1);

    await api()
      .get(`/api/projects/${projectId}/contributions?week=yesterday`)
      .expect(400);
  });
});

import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ProjectRole, StatusCategory } from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { DEV_USER_HEADER } from '../src/auth/dev-auth.guard';
import { addWeeks, startOfIsoWeek } from '../src/common/week';
import { ContributionsService } from '../src/contributions/contributions.service';
import { PrismaService } from '../src/prisma/prisma.service';

type Entry = Awaited<ReturnType<ContributionsService['create']>> & {
  weekStart: string;
};

const ROLES = {
  lead: ProjectRole.OWNER,
  student: ProjectRole.MEMBER,
  supervisor: ProjectRole.SUPERVISOR,
  viewer: ProjectRole.VIEWER,
} as const;
type Person = keyof typeof ROLES | 'outsider';

describe('Contribution logging and review (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const suffix = randomUUID().slice(0, 8);
  const thisWeek = startOfIsoWeek(new Date());
  const day = (date: Date) => date.toISOString().slice(0, 10);
  const users = {} as Record<Person, string>;
  let workspaceId: string;
  let projectId: string;
  let taskId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);

    for (const person of [...Object.keys(ROLES), 'outsider'] as Person[]) {
      const user = await prisma.user.create({
        data: {
          githubId: `e2e-c-${person}-${suffix}`,
          githubLogin: `e2e-c-${person}-${suffix}`,
        },
      });
      users[person] = user.id;
    }

    const workspace = await prisma.workspace.create({
      data: { name: 'E2E contributions', slug: `e2e-c-${suffix}` },
    });
    workspaceId = workspace.id;

    const project = await prisma.project.create({
      data: {
        workspaceId,
        name: 'Contributions',
        key: 'CON',
        members: {
          create: Object.entries(ROLES).map(([person, role]) => ({
            userId: users[person as Person],
            role,
          })),
        },
        statuses: {
          create: { name: 'Todo', category: StatusCategory.TODO, position: 0 },
        },
      },
      include: { statuses: true },
    });
    projectId = project.id;

    const task = await prisma.task.create({
      data: {
        projectId,
        number: 1,
        title: 'Some task',
        statusId: project.statuses[0].id,
        reporterId: users.lead,
      },
    });
    taskId = task.id;
  });

  afterAll(async () => {
    await prisma.workspace.delete({ where: { id: workspaceId } });
    await prisma.user.deleteMany({
      where: { id: { in: Object.values(users) } },
    });
    await app.close();
  });

  const base = () => `/api/projects/${projectId}/contributions`;
  const as = (person: Person) => ({ [DEV_USER_HEADER]: users[person] });
  const server = () => request(app.getHttpServer());

  const validEntry = {
    week: day(thisWeek),
    hours: 3,
    type: 'DEVELOPMENT',
    description: 'Built the login page',
  };

  async function logEntry(person: Person, body: object = validEntry) {
    const response = await server()
      .post(base())
      .set(as(person))
      .send(body)
      .expect(201);
    return response.body as Entry;
  }

  it('lists users for the dev switcher', async () => {
    const response = await server().get('/api/dev/users').expect(200);
    const ids = (response.body as { id: string }[]).map((u) => u.id);
    expect(ids).toEqual(expect.arrayContaining(Object.values(users)));
  });

  it('requires an acting user for writes', async () => {
    await server().post(base()).send(validEntry).expect(401);
    await server()
      .post(base())
      .set({ [DEV_USER_HEADER]: randomUUID() })
      .send(validEntry)
      .expect(401);
  });

  it('lets members log hours for the current week, linked to a task', async () => {
    const entry = await logEntry('student', { ...validEntry, taskId });

    expect(entry).toMatchObject({
      hours: 3,
      type: 'DEVELOPMENT',
      reviewStatus: 'PENDING',
      task: { key: 'CON-1' },
    });
    expect(entry.weekStart).toBe(thisWeek.toISOString());
  });

  it('normalises any date in a week to that Monday and allows past weeks', async () => {
    const wednesdayLastWeek = new Date(addWeeks(thisWeek, -1).getTime());
    wednesdayLastWeek.setUTCDate(wednesdayLastWeek.getUTCDate() + 2);

    const entry = await logEntry('lead', {
      ...validEntry,
      week: day(wednesdayLastWeek),
    });
    expect(entry.weekStart).toBe(addWeeks(thisWeek, -1).toISOString());
  });

  it.each([
    ['a future week', { week: day(addWeeks(thisWeek, 1)) }],
    ['zero hours', { hours: 0 }],
    ['more than 168 hours', { hours: 169 }],
    ['more than two decimals', { hours: 1.123 }],
    ['an unknown type', { type: 'NAPPING' }],
    ['an empty description', { description: '   ' }],
    ['a task from another project', { taskId: randomUUID() }],
  ])('rejects %s', async (_label, override) => {
    await server()
      .post(base())
      .set(as('student'))
      .send({ ...validEntry, ...override })
      .expect(400);
  });

  it('caps a member at 168 hours per week', async () => {
    const week = day(addWeeks(thisWeek, -5));
    await logEntry('student', { ...validEntry, week, hours: 160 });
    await server()
      .post(base())
      .set(as('student'))
      .send({ ...validEntry, week, hours: 9 })
      .expect(400);
  });

  it.each(['viewer', 'supervisor', 'outsider'] as const)(
    'does not let a %s log hours',
    async (person) => {
      await server().post(base()).set(as(person)).send(validEntry).expect(403);
    },
  );

  describe('review and editing workflow', () => {
    let entry: Entry;

    beforeAll(async () => {
      entry = await logEntry('student', {
        ...validEntry,
        description: 'Wrote tests',
      });
    });

    const entryUrl = () => `${base()}/${entry.id}`;

    it('requires a comment when requesting changes', async () => {
      await server()
        .post(`${entryUrl()}/review`)
        .set(as('supervisor'))
        .send({ status: 'CHANGES_REQUESTED' })
        .expect(400);
    });

    it('does not let members review, or anyone review their own entry', async () => {
      await server()
        .post(`${entryUrl()}/review`)
        .set(as('student'))
        .send({ status: 'APPROVED' })
        .expect(403);

      const own = await logEntry('lead');
      await server()
        .post(`${base()}/${own.id}/review`)
        .set(as('lead'))
        .send({ status: 'APPROVED' })
        .expect(403);
    });

    it('lets a supervisor request changes with a comment', async () => {
      const response = await server()
        .post(`${entryUrl()}/review`)
        .set(as('supervisor'))
        .send({ status: 'CHANGES_REQUESTED', comment: 'Link the PR please' })
        .expect(200);

      expect(response.body as Entry).toMatchObject({
        reviewStatus: 'CHANGES_REQUESTED',
        reviewComment: 'Link the PR please',
      });
    });

    it('sends an edited entry back to pending, keeping the feedback', async () => {
      const response = await server()
        .patch(entryUrl())
        .set(as('student'))
        .send({ description: 'Wrote tests (PR #12)', hours: 4 })
        .expect(200);

      expect(response.body as Entry).toMatchObject({
        reviewStatus: 'PENDING',
        description: 'Wrote tests (PR #12)',
        hours: 4,
        reviewComment: 'Link the PR please',
      });
    });

    it("does not let someone else edit or delete a member's entry", async () => {
      await server()
        .patch(entryUrl())
        .set(as('lead'))
        .send({ hours: 1 })
        .expect(403);
      await server().delete(entryUrl()).set(as('lead')).expect(403);
    });

    it('locks an entry once it is approved', async () => {
      await server()
        .post(`${entryUrl()}/review`)
        .set(as('lead'))
        .send({ status: 'APPROVED' })
        .expect(200);

      await server()
        .patch(entryUrl())
        .set(as('student'))
        .send({ hours: 1 })
        .expect(409);
      await server().delete(entryUrl()).set(as('student')).expect(409);
    });

    it('lets the author delete a pending entry', async () => {
      const pending = await logEntry('student');
      await server()
        .delete(`${base()}/${pending.id}`)
        .set(as('student'))
        .expect(204);
      await server()
        .delete(`${base()}/${pending.id}`)
        .set(as('student'))
        .expect(404);
    });
  });
});

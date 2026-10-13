import { randomUUID } from 'node:crypto';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { ProjectRole, StatusCategory } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { DEV_USER_HEADER } from '../src/auth/dev-auth.guard';
import { addDays, addWeeks, isoDay, startOfIsoWeek } from '../src/common/week';
import { PrismaService } from '../src/prisma/prisma.service';
import type {
  RowResponse,
  TimesheetResponse,
} from '../src/timesheets/timesheet-response';

const ROLES = {
  lead: ProjectRole.OWNER,
  student: ProjectRole.MEMBER,
  supervisor: ProjectRole.SUPERVISOR,
  viewer: ProjectRole.VIEWER,
} as const;
type Person = keyof typeof ROLES | 'outsider';

interface WeekBody {
  days: string[];
  totalHours: number;
  members: {
    user: { id: string };
    canLog: boolean;
    timesheet: TimesheetResponse;
  }[];
}

describe('Weekly timesheets (e2e)', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;

  const suffix = randomUUID().slice(0, 8);
  const thisWeek = startOfIsoWeek(new Date());
  const monday = isoDay(thisWeek);
  const users = {} as Record<Person, string>;
  let workspaceId: string;
  let projectId: string;
  let taskId: string;
  let otherTaskId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication<NestExpressApplication>();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);

    for (const person of [...Object.keys(ROLES), 'outsider'] as Person[]) {
      const user = await prisma.user.create({
        data: {
          githubId: `e2e-t-${person}-${suffix}`,
          githubLogin: `e2e-t-${person}-${suffix}`,
        },
      });
      users[person] = user.id;
    }

    const workspace = await prisma.workspace.create({
      data: { name: 'E2E timesheets', slug: `e2e-t-${suffix}` },
    });
    workspaceId = workspace.id;

    const createProject = (key: string, withMembers: boolean) =>
      prisma.project.create({
        data: {
          workspaceId,
          name: key,
          key,
          members: withMembers
            ? {
                create: Object.entries(ROLES).map(([person, role]) => ({
                  userId: users[person as Person],
                  role,
                })),
              }
            : undefined,
          statuses: {
            create: {
              name: 'Todo',
              category: StatusCategory.TODO,
              position: 0,
            },
          },
        },
        include: { statuses: true },
      });
    const project = await createProject('TMS', true);
    projectId = project.id;
    const other = await createProject('OTH', false);

    taskId = (
      await prisma.task.create({
        data: {
          projectId,
          number: 1,
          title: 'Login page',
          statusId: project.statuses[0].id,
          reporterId: users.lead,
        },
      })
    ).id;
    otherTaskId = (
      await prisma.task.create({
        data: {
          projectId: other.id,
          number: 1,
          title: 'Elsewhere',
          statusId: other.statuses[0].id,
          reporterId: users.lead,
        },
      })
    ).id;
  });

  afterAll(async () => {
    await prisma.workspace.delete({ where: { id: workspaceId } });
    await prisma.user.deleteMany({
      where: { id: { in: Object.values(users) } },
    });
    await app.close();
  });

  const base = () => `/api/projects/${projectId}/timesheets`;
  const as = (person: Person) => ({ [DEV_USER_HEADER]: users[person] });
  const server = () => request(app.getHttpServer());

  async function addRow(person: Person, body: object, status = 201) {
    const response = await server()
      .post(`${base()}/rows`)
      .set(as(person))
      .send(body)
      .expect(status);
    return response.body as RowResponse;
  }

  const setDay = (person: Person, rowId: string, date: string, body: object) =>
    server()
      .put(`${base()}/rows/${rowId}/days/${date}`)
      .set(as(person))
      .send(body);

  async function sheetOf(person: Person, week = monday) {
    const response = await server().get(`${base()}?week=${week}`).expect(200);
    const body = response.body as WeekBody;
    return body.members.find((m) => m.user.id === users[person])!.timesheet;
  }

  describe('rows and days', () => {
    let rowId: string;

    it('requires an acting user and a logging role', async () => {
      const body = { week: monday, type: 'DEVELOPMENT', taskId };
      await server().post(`${base()}/rows`).send(body).expect(401);
      for (const person of ['supervisor', 'viewer', 'outsider'] as Person[]) {
        await addRow(person, body, 403);
      }
    });

    it('validates rows', async () => {
      await addRow('student', { week: monday, type: 'DEVELOPMENT' }, 400);
      await addRow(
        'student',
        { week: monday, type: 'DEVELOPMENT', taskId: otherTaskId },
        400,
      );
      await addRow(
        'student',
        { week: isoDay(addWeeks(thisWeek, 2)), type: 'DEVELOPMENT', taskId },
        400,
      );
      await addRow('student', { week: monday, type: 'NAPPING', taskId }, 400);
    });

    it('adds a row and records hours and a note on a day', async () => {
      const row = await addRow('student', {
        week: monday,
        type: 'DEVELOPMENT',
        taskId,
      });
      rowId = row.id;
      expect(row).toMatchObject({ hours: 0, task: { key: 'TMS-1' } });

      const response = await setDay('student', rowId, monday, {
        hours: 3,
        note: 'Form layout',
      }).expect(200);
      expect((response.body as RowResponse).hours).toBe(3);

      const sheet = await sheetOf('student');
      expect(sheet).toMatchObject({
        status: 'DRAFT',
        totalHours: 3,
        dailyHours: [3, 0, 0, 0, 0, 0, 0],
      });
      expect(sheet.rows[0].days).toEqual([
        { date: monday, hours: 3, note: 'Form layout' },
      ]);
    });

    it('keeps days inside the week and under 24 hours', async () => {
      await setDay('student', rowId, isoDay(addDays(thisWeek, 7)), {
        hours: 1,
      }).expect(400);
      await setDay('student', rowId, 'monday', { hours: 1 }).expect(400);
      await setDay('student', rowId, monday, { hours: 25 }).expect(400);

      const second = await addRow('student', {
        week: monday,
        type: 'MEETING',
        description: 'Stand-up',
      });
      await setDay('student', second.id, monday, { hours: 22 }).expect(400);
      await setDay('student', second.id, monday, { hours: 1 }).expect(200);
    });

    it('only lets the author change a row', async () => {
      await setDay('lead', rowId, monday, { hours: 1 }).expect(403);
      await server()
        .delete(`${base()}/rows/${rowId}`)
        .set(as('supervisor'))
        .expect(403);
    });

    it('clears a day set to zero without a note, keeping the note otherwise', async () => {
      await setDay('student', rowId, monday, { hours: 0 }).expect(200);
      let sheet = await sheetOf('student');
      expect(sheet.rows[0].days).toEqual([
        { date: monday, hours: 0, note: 'Form layout' },
      ]);

      await setDay('student', rowId, monday, { hours: 0, note: '' }).expect(
        200,
      );
      sheet = await sheetOf('student');
      expect(sheet.rows[0].days).toEqual([]);
    });

    it('quick-logs onto the matching row or starts a new one', async () => {
      const log = (body: object) =>
        server().post(`${base()}/log`).set(as('student')).send(body);

      await log({
        date: monday,
        hours: 2,
        type: 'DEVELOPMENT',
        taskId,
        note: 'Validation',
      }).expect(201);
      await log({
        date: monday,
        hours: 0.5,
        type: 'DEVELOPMENT',
        taskId,
        note: 'Bug fix',
      }).expect(201);
      const created = await log({
        date: monday,
        hours: 1,
        type: 'RESEARCH',
        note: 'Read the OAuth spec',
      }).expect(201);
      expect((created.body as { row: RowResponse }).row).toMatchObject({
        description: 'Read the OAuth spec',
        hours: 1,
      });

      const sheet = await sheetOf('student');
      const taskRow = sheet.rows.find((r) => r.id === rowId)!;
      expect(taskRow.days).toEqual([
        { date: monday, hours: 2.5, note: 'Validation\nBug fix' },
      ]);
      expect(sheet.rows).toHaveLength(3);

      await log({
        date: isoDay(addWeeks(thisWeek, 2)),
        hours: 1,
        type: 'OTHER',
        note: 'Future',
      }).expect(400);
    });
  });

  describe('submission and review', () => {
    const submit = (person: Person, week = monday) =>
      server().post(`${base()}/submit`).set(as(person)).send({ week });
    const recall = (person: Person) =>
      server().post(`${base()}/recall`).set(as(person)).send({ week: monday });
    const review = (person: Person, timesheetId: string, body: object) =>
      server()
        .post(`${base()}/${timesheetId}/review`)
        .set(as(person))
        .send(body);

    it('needs hours before a week can be submitted', async () => {
      await submit('student', isoDay(addWeeks(thisWeek, -3))).expect(400);
      await submit('supervisor').expect(403);
    });

    it('locks a submitted week until it is recalled', async () => {
      const submitted = await submit('student').expect(200);
      expect((submitted.body as TimesheetResponse).status).toBe('SUBMITTED');
      await submit('student').expect(409);

      const sheet = await sheetOf('student');
      await setDay('student', sheet.rows[0].id, monday, { hours: 1 }).expect(
        409,
      );
      await addRow(
        'student',
        { week: monday, type: 'OTHER', description: 'More' },
        409,
      );

      const recalled = await recall('student').expect(200);
      expect((recalled.body as TimesheetResponse).status).toBe('DRAFT');
      await recall('student').expect(409);
      await submit('student').expect(200);
    });

    it('lets reviewers send a week back with feedback, then approve it', async () => {
      const sheet = await sheetOf('student');
      const id = sheet.id!;

      await review('student', id, { status: 'APPROVED' }).expect(403);
      await review('supervisor', id, { status: 'CHANGES_REQUESTED' }).expect(
        400,
      );
      const sentBack = await review('supervisor', id, {
        status: 'CHANGES_REQUESTED',
        comment: 'Split the research hours',
      }).expect(200);
      expect(sentBack.body).toMatchObject({
        status: 'CHANGES_REQUESTED',
        reviewComment: 'Split the research hours',
        reviewedBy: { id: users.supervisor },
      });

      const week = await server()
        .get('/api/me/week')
        .set(as('student'))
        .expect(200);
      expect(
        (week.body as { changesRequested: { id: string }[] }).changesRequested,
      ).toEqual([expect.objectContaining({ id })]);

      // Still editable while changes are requested.
      await setDay('student', sheet.rows[0].id, monday, { hours: 2 }).expect(
        200,
      );
      await review('supervisor', id, { status: 'APPROVED' }).expect(409);
      await submit('student').expect(200);

      const approved = await review('supervisor', id, {
        status: 'APPROVED',
      }).expect(200);
      expect(approved.body).toMatchObject({
        status: 'APPROVED',
        reviewComment: null,
      });
      await setDay('student', sheet.rows[0].id, monday, { hours: 3 }).expect(
        409,
      );
      await recall('student').expect(409);
    });

    it('can reopen an approved week but not review your own', async () => {
      const sheet = await sheetOf('student');
      await review('supervisor', sheet.id!, { status: 'APPROVED' }).expect(409);
      const reopened = await review('supervisor', sheet.id!, {
        status: 'CHANGES_REQUESTED',
        comment: 'Add the meeting',
      }).expect(200);
      expect((reopened.body as TimesheetResponse).status).toBe(
        'CHANGES_REQUESTED',
      );

      const leadRow = await addRow('lead', {
        week: monday,
        type: 'MEETING',
        description: 'Planning',
      });
      await setDay('lead', leadRow.id, monday, { hours: 1 }).expect(200);
      await submit('lead').expect(200);
      const lead = await sheetOf('lead');
      await review('lead', lead.id!, { status: 'APPROVED' }).expect(403);
      await review('supervisor', randomUUID(), { status: 'APPROVED' }).expect(
        404,
      );
    });
  });
});

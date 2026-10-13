import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  ContributionReviewStatus,
  ContributionType,
  ProjectRole,
  StatusCategory,
  WorkspaceRole,
} from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { DEV_USER_HEADER } from '../src/auth/dev-auth.guard';
import { addWeeks, startOfIsoWeek } from '../src/common/week';
import { PrismaService } from '../src/prisma/prisma.service';

type Json<T> = { [K in keyof T]: T[K] extends Date ? string : T[K] };

interface AcademicWeek {
  weekStart: string;
  kind: string;
  teachingWeek: number | null;
  label: string | null;
}
interface SemesterBody {
  semester: {
    name: string | null;
    startDate: string;
    teachingWeeks: number;
    currentWeek: AcademicWeek | null;
    calendar: AcademicWeek[];
  } | null;
}
interface MilestoneBody {
  id: string;
  title: string;
  status: string;
  taskCount: number;
  doneCount: number;
  tasks: { key: string; done: boolean }[];
}
interface ReviewQueueBody {
  entries: { id: string; user: { id: string }; project: { key: string } }[];
}

const PEOPLE = ['lecturer', 'lead', 'student', 'outsider'] as const;
type Person = (typeof PEOPLE)[number];

describe('Semester, milestones and personal views (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const suffix = randomUUID().slice(0, 8);
  const thisWeek = startOfIsoWeek(new Date());
  const day = (date: Date) => date.toISOString().slice(0, 10);
  const users = {} as Record<Person, string>;
  let workspaceId: string;
  let projectId: string;
  let otherProjectId: string;
  let doneTaskId: string;
  let openTaskId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);

    for (const person of PEOPLE) {
      const user = await prisma.user.create({
        data: {
          githubId: `e2e-s-${person}-${suffix}`,
          githubLogin: `e2e-s-${person}-${suffix}`,
        },
      });
      users[person] = user.id;
    }

    const workspace = await prisma.workspace.create({
      data: {
        name: 'E2E semester',
        slug: `e2e-s-${suffix}`,
        members: {
          create: [
            { userId: users.lecturer, role: WorkspaceRole.OWNER },
            { userId: users.lead, role: WorkspaceRole.MEMBER },
            { userId: users.student, role: WorkspaceRole.MEMBER },
          ],
        },
      },
    });
    workspaceId = workspace.id;

    const createProject = (key: string, members: [Person, ProjectRole][]) =>
      prisma.project.create({
        data: {
          workspaceId,
          name: `Group ${key}`,
          key,
          members: {
            create: members.map(([person, role]) => ({
              userId: users[person],
              role,
            })),
          },
          statuses: {
            create: [
              { name: 'Todo', category: StatusCategory.TODO, position: 0 },
              { name: 'Done', category: StatusCategory.DONE, position: 1 },
            ],
          },
        },
        include: { statuses: true },
      });

    const project = await createProject('GRPA', [
      ['lead', ProjectRole.OWNER],
      ['student', ProjectRole.MEMBER],
      ['lecturer', ProjectRole.SUPERVISOR],
    ]);
    projectId = project.id;
    // The student is not a reviewer here, so its entries never reach their queue.
    const other = await createProject('GRPB', [['lead', ProjectRole.MEMBER]]);
    otherProjectId = other.id;

    const [todo, done] = project.statuses;
    const createTask = (number: number, statusId: string) =>
      prisma.task.create({
        data: {
          projectId,
          number,
          title: `Task ${number}`,
          statusId,
          reporterId: users.lead,
          assignees: { create: { userId: users.student } },
        },
      });
    doneTaskId = (await createTask(1, done.id)).id;
    openTaskId = (await createTask(2, todo.id)).id;
  });

  afterAll(async () => {
    await prisma.workspace.delete({ where: { id: workspaceId } });
    await prisma.user.deleteMany({
      where: { id: { in: Object.values(users) } },
    });
    await app.close();
  });

  const as = (person: Person) => ({ [DEV_USER_HEADER]: users[person] });
  const server = () => request(app.getHttpServer());

  describe('semester calendar', () => {
    const url = () => `/api/workspaces/${workspaceId}/semester`;
    const start = addWeeks(thisWeek, -2);
    const validSemester = () => ({
      name: 'Semester 1',
      // A Wednesday: the API stores the Monday of that week.
      startDate: day(new Date(start.getTime() + 2 * 24 * 60 * 60 * 1000)),
      weeks: 6,
      breaks: [
        { week: day(addWeeks(start, 1)), kind: 'BREAK', label: 'Recess' },
        { week: day(addWeeks(start, 5)), kind: 'EXAM' },
      ],
    });

    it('is empty until configured', async () => {
      const response = await server().get(url()).expect(200);
      expect((response.body as SemesterBody).semester).toBeNull();
    });

    it.each(['lead', 'student', 'outsider'] as const)(
      'does not let a %s change it',
      async (person) => {
        await server()
          .put(url())
          .set(as(person))
          .send(validSemester())
          .expect(403);
      },
    );

    it.each([
      [
        'a break outside the semester',
        { breaks: [{ week: day(addWeeks(start, 6)), kind: 'BREAK' }] },
      ],
      [
        'the same week twice',
        {
          breaks: [
            { week: day(start), kind: 'BREAK' },
            { week: day(start), kind: 'EXAM' },
          ],
        },
      ],
      [
        'no teaching weeks',
        { weeks: 1, breaks: [{ week: day(start), kind: 'BREAK' }] },
      ],
      ['too many weeks', { weeks: 53 }],
      [
        'an unknown break kind',
        { breaks: [{ week: day(start), kind: 'HOLIDAY' }] },
      ],
    ])('rejects %s', async (_label, override) => {
      await server()
        .put(url())
        .set(as('lecturer'))
        .send({ ...validSemester(), ...override })
        .expect(400);
    });

    it('lets a workspace owner set it and numbers teaching weeks', async () => {
      const response = await server()
        .put(url())
        .set(as('lecturer'))
        .send(validSemester())
        .expect(200);
      const { semester } = response.body as SemesterBody;

      expect(semester?.startDate).toBe(start.toISOString());
      expect(semester?.teachingWeeks).toBe(4);
      expect(semester?.calendar.map((w) => w.teachingWeek)).toEqual([
        1,
        null,
        2,
        3,
        4,
        null,
      ]);
      expect(semester?.calendar[1]).toMatchObject({
        kind: 'BREAK',
        label: 'Recess',
      });
      expect(semester?.currentWeek).toMatchObject({ teachingWeek: 2 });
    });
  });

  describe('milestones', () => {
    const url = () => `/api/projects/${projectId}/milestones`;
    let milestone: MilestoneBody;

    it('only lets owners and supervisors create them', async () => {
      const body = {
        title: 'Midterm demo',
        dueDate: day(addWeeks(thisWeek, 1)),
      };
      await server().post(url()).set(as('student')).send(body).expect(403);
      await server().post(url()).set(as('outsider')).send(body).expect(403);
      await server()
        .post(url())
        .set(as('lead'))
        .send({ title: ' ', dueDate: day(thisWeek) })
        .expect(400);

      const response = await server()
        .post(url())
        .set(as('lead'))
        .send(body)
        .expect(201);
      milestone = response.body as MilestoneBody;
      expect(milestone).toMatchObject({ taskCount: 0, status: 'UPCOMING' });
    });

    it('derives progress from linked tasks', async () => {
      await prisma.task.updateMany({
        where: { id: { in: [doneTaskId, openTaskId] } },
        data: { milestoneId: milestone.id },
      });
      const response = await server().get(url()).expect(200);
      const [listed] = response.body as MilestoneBody[];
      expect(listed).toMatchObject({ taskCount: 2, doneCount: 1 });
      expect(listed.tasks).toEqual([
        expect.objectContaining({ key: 'GRPA-1', done: true }),
        expect.objectContaining({ key: 'GRPA-2', done: false }),
      ]);
    });

    it('marks a past milestone with open tasks as overdue', async () => {
      const response = await server()
        .patch(`${url()}/${milestone.id}`)
        .set(as('lecturer'))
        .send({ dueDate: day(addWeeks(thisWeek, -1)) })
        .expect(200);
      expect((response.body as MilestoneBody).status).toBe('OVERDUE');
    });

    it('unlinks tasks when deleted', async () => {
      await server()
        .delete(`${url()}/${milestone.id}`)
        .set(as('student'))
        .expect(403);
      await server()
        .delete(`${url()}/${milestone.id}`)
        .set(as('lead'))
        .expect(204);

      const task = await prisma.task.findUniqueOrThrow({
        where: { id: openTaskId },
      });
      expect(task.milestoneId).toBeNull();
    });
  });

  describe('personal views', () => {
    let studentEntryId: string;
    let leadEntryId: string;
    let otherProjectEntryId: string;

    beforeAll(async () => {
      const entry = (
        userId: string,
        project: string,
        reviewStatus?: ContributionReviewStatus,
      ) =>
        prisma.contributionEntry.create({
          data: {
            projectId: project,
            userId,
            weekStart: thisWeek,
            hours: 2,
            type: ContributionType.DEVELOPMENT,
            description: 'Work',
            reviewStatus,
            reviewComment:
              reviewStatus === ContributionReviewStatus.CHANGES_REQUESTED
                ? 'Add detail'
                : null,
          },
        });
      studentEntryId = (await entry(users.student, projectId)).id;
      await entry(
        users.student,
        projectId,
        ContributionReviewStatus.CHANGES_REQUESTED,
      );
      leadEntryId = (await entry(users.lead, projectId)).id;
      otherProjectEntryId = (await entry(users.lead, otherProjectId)).id;
    });

    it('requires an acting user', async () => {
      await server().get('/api/me').expect(401);
      await server().get('/api/me/week').expect(401);
    });

    it('describes the student and the lecturer differently', async () => {
      const student = await server().get('/api/me').set(as('student'));
      expect(student.body).toMatchObject({ isStudent: true, canReview: false });

      const lecturer = await server().get('/api/me').set(as('lecturer'));
      expect(lecturer.body).toMatchObject({
        isStudent: false,
        canReview: true,
        workspaces: [expect.objectContaining({ role: 'OWNER' })],
      });
    });

    it("summarises a student's week", async () => {
      const response = await server()
        .get('/api/me/week')
        .set(as('student'))
        .expect(200);
      const body = response.body as Json<{
        totalHours: number;
        projects: { key: string; academicWeek: AcademicWeek | null }[];
        tasks: { key: string }[];
        changesRequested: { reviewComment: string; project: { key: string } }[];
      }>;

      expect(body.totalHours).toBe(4);
      expect(body.projects).toEqual([
        expect.objectContaining({
          key: 'GRPA',
          academicWeek: expect.objectContaining({ teachingWeek: 2 }) as unknown,
        }),
      ]);
      expect(body.tasks.map((t) => t.key)).toEqual(['GRPA-2']);
      expect(body.changesRequested).toEqual([
        expect.objectContaining({
          reviewComment: 'Add detail',
          project: expect.objectContaining({ key: 'GRPA' }) as unknown,
        }),
      ]);
    });

    it('queues pending entries from supervised projects only', async () => {
      const response = await server()
        .get('/api/me/reviews')
        .set(as('lecturer'))
        .expect(200);
      const ids = (response.body as ReviewQueueBody).entries.map((e) => e.id);

      expect(ids).toEqual(
        expect.arrayContaining([studentEntryId, leadEntryId]),
      );
      expect(ids).not.toContain(otherProjectEntryId);
    });

    it('rejects bulk approval the reviewer is not allowed to make', async () => {
      const approve = (person: Person, entryIds: string[]) =>
        server()
          .post('/api/me/reviews/approve')
          .set(as(person))
          .send({ entryIds });

      await approve('student', [leadEntryId]).expect(403);
      await approve('lead', [leadEntryId]).expect(403);
      await approve('lecturer', [otherProjectEntryId]).expect(403);
      await approve('lecturer', [studentEntryId, randomUUID()]).expect(404);
      await approve('lecturer', []).expect(400);
    });

    it('approves several entries at once', async () => {
      const response = await server()
        .post('/api/me/reviews/approve')
        .set(as('lecturer'))
        .send({ entryIds: [studentEntryId, leadEntryId] })
        .expect(200);
      expect(response.body).toEqual({ approved: 2 });

      const queue = await server().get('/api/me/reviews').set(as('lecturer'));
      expect((queue.body as ReviewQueueBody).entries).toHaveLength(0);
    });
  });
});

import { randomUUID } from 'node:crypto';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { ProjectRole, WorkspaceRole } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { DEV_USER_HEADER } from '../src/auth/dev-auth.guard';
import { PrismaService } from '../src/prisma/prisma.service';

interface Person {
  user: { id: string };
  registrationNumber: string | null;
  signature: { image: string } | null;
}
interface MeetingBody {
  id: string;
  number: number;
  phase: string;
  mode: string;
  status: string;
  supervisorComment: string | null;
  signatureImage: string | null;
  certifiedAt: string | null;
  certifiedBy: { id: string } | null;
  attendees: { id: string }[];
}
interface RecordBookBody {
  details: { moduleTitle: string; level: string; groupName: string | null };
  supervisors: Person[];
  members: Person[];
  phases: { phase: string; meetings: MeetingBody[] }[];
}

const PEOPLE = ['supervisor', 'lead', 'student', 'outsider'] as const;
type Role = (typeof PEOPLE)[number];

// 1x1 transparent PNG.
const PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

describe('Supervisor record book (e2e)', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;

  const suffix = randomUUID().slice(0, 8);
  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const users = {} as Record<Role, string>;
  let workspaceId: string;
  let projectId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication<NestExpressApplication>();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);

    for (const person of PEOPLE) {
      const user = await prisma.user.create({
        data: {
          githubId: `e2e-rb-${person}-${suffix}`,
          githubLogin: `e2e-rb-${person}-${suffix}`,
        },
      });
      users[person] = user.id;
    }
    const workspace = await prisma.workspace.create({
      data: {
        name: 'E2E record book',
        slug: `e2e-rb-${suffix}`,
        members: {
          create: PEOPLE.map((person) => ({
            userId: users[person],
            role: WorkspaceRole.MEMBER,
          })),
        },
      },
    });
    workspaceId = workspace.id;
    const project = await prisma.project.create({
      data: {
        workspaceId,
        name: 'Record book group',
        key: 'RBK',
        members: {
          create: [
            { userId: users.lead, role: ProjectRole.OWNER },
            { userId: users.student, role: ProjectRole.MEMBER },
            { userId: users.supervisor, role: ProjectRole.SUPERVISOR },
          ],
        },
      },
    });
    projectId = project.id;
  });

  afterAll(async () => {
    await prisma.workspace.delete({ where: { id: workspaceId } });
    await prisma.user.deleteMany({
      where: { id: { in: Object.values(users) } },
    });
    await app.close();
  });

  const as = (person: Role) => ({ [DEV_USER_HEADER]: users[person] });
  const server = () => request(app.getHttpServer());
  const bookUrl = () => `/api/projects/${projectId}/record-book`;
  const meetingsUrl = () => `/api/projects/${projectId}/meetings`;
  const getBook = async () =>
    (await server().get(bookUrl()).expect(200)).body as RecordBookBody;
  const entry = (overrides: Record<string, unknown> = {}) => ({
    phase: 'PROBLEM_IDENTIFICATION',
    mode: 'ONLINE_UPDATE',
    meetingDate: today,
    summary: 'Shared the project proposal draft.',
    attendeeIds: [users.lead, users.student],
    ...overrides,
  });

  describe('signatures', () => {
    it.each([
      ['a non-image data URL', 'data:text/plain;base64,aGVsbG8='],
      ['a GIF', 'data:image/gif;base64,R0lGODlhAQABAAAAACw='],
      ['JPEG bytes labelled as PNG', 'data:image/png;base64,/9j/4AAQSkZJRg=='],
      ['plain text', 'not a data url'],
    ])('rejects %s', async (_, image) => {
      await server()
        .put('/api/me/signature')
        .set(as('supervisor'))
        .send({ method: 'UPLOAD', image })
        .expect(400);
    });

    it('is empty until saved', async () => {
      const response = await server()
        .get('/api/me/signature')
        .set(as('supervisor'))
        .expect(200);
      expect(response.body).toEqual({ signature: null });
    });
  });

  describe('details page', () => {
    it('starts with the module defaults and four fixed phases', async () => {
      const book = await getBook();
      expect(book.details).toMatchObject({
        moduleTitle: 'IS2901 - Software Development Project',
        level: 'Level 02',
        groupName: null,
      });
      expect(book.phases.map((p) => p.phase)).toEqual([
        'PROBLEM_IDENTIFICATION',
        'ANALYSIS_DESIGN',
        'SYSTEM_DESIGN',
        'DEVELOPMENT_EVALUATION',
      ]);
      expect(book.supervisors.map((p) => p.user.id)).toEqual([
        users.supervisor,
      ]);
      expect(book.members.map((p) => p.user.id).sort()).toEqual(
        [users.lead, users.student].sort(),
      );
    });

    it.each(['student', 'outsider'] as const)(
      'does not let a %s edit the details',
      async (person) => {
        await server()
          .put(`${bookUrl()}/details`)
          .set(as(person))
          .send({ groupName: 'Group 1' })
          .expect(403);
      },
    );

    it('lets the group lead fill in the details', async () => {
      const response = await server()
        .put(`${bookUrl()}/details`)
        .set(as('lead'))
        .send({ groupName: '  Group 1  ', moduleTitle: '' })
        .expect(200);
      expect((response.body as RecordBookBody).details).toMatchObject({
        groupName: 'Group 1',
        moduleTitle: 'IS2901 - Software Development Project',
      });
    });

    it('needs a saved signature before signing', async () => {
      await server().post(`${bookUrl()}/sign`).set(as('lead')).expect(400);
    });

    it('needs a registration number from students', async () => {
      await server()
        .put('/api/me/signature')
        .set(as('lead'))
        .send({ method: 'DRAWN', image: PNG })
        .expect(200);
      await server().post(`${bookUrl()}/sign`).set(as('lead')).expect(400);
      await server()
        .post(`${bookUrl()}/sign`)
        .set(as('lead'))
        .send({ registrationNumber: 'bad number!' })
        .expect(400);
    });

    it('saves the registration number and a copy of the signature', async () => {
      const registrationNumber = `RB-${suffix}`;
      const response = await server()
        .post(`${bookUrl()}/sign`)
        .set(as('lead'))
        .send({ registrationNumber })
        .expect(200);
      const lead = (response.body as RecordBookBody).members.find(
        (p) => p.user.id === users.lead,
      );
      expect(lead).toMatchObject({
        registrationNumber,
        signature: { image: PNG },
      });
    });

    it('rejects a registration number owned by another student', async () => {
      await server()
        .put('/api/me/signature')
        .set(as('student'))
        .send({ method: 'TYPED', image: PNG })
        .expect(200);
      await server()
        .post(`${bookUrl()}/sign`)
        .set(as('student'))
        .send({ registrationNumber: `RB-${suffix}` })
        .expect(409);
    });

    it('does not let an outsider sign', async () => {
      await server().post(`${bookUrl()}/sign`).set(as('outsider')).expect(403);
    });
  });

  describe('meeting entries', () => {
    let meetingId: string;

    it.each(['supervisor', 'outsider'] as const)(
      'does not let a %s add an entry',
      async (person) => {
        await server()
          .post(meetingsUrl())
          .set(as(person))
          .send(entry())
          .expect(403);
      },
    );

    it.each([
      ['a future date', { meetingDate: tomorrow }],
      ['no members present', { attendeeIds: [] }],
      ['an unknown member present', { attendeeIds: [randomUUID()] }],
      ['an unknown phase', { phase: 'PHASE_E' }],
      ['an unknown mode', { mode: 'PHONE' }],
      ['an empty summary', { summary: '   ' }],
    ])('rejects %s', async (_, overrides) => {
      await server()
        .post(meetingsUrl())
        .set(as('student'))
        .send(entry(overrides))
        .expect(400);
    });

    it('rejects the supervisor in the attendee list', async () => {
      await server()
        .post(meetingsUrl())
        .set(as('student'))
        .send(entry({ attendeeIds: [users.lead, users.supervisor] }))
        .expect(400);
    });

    it('numbers entries per project', async () => {
      const first = await server()
        .post(meetingsUrl())
        .set(as('student'))
        .send(entry())
        .expect(201);
      const second = await server()
        .post(meetingsUrl())
        .set(as('lead'))
        .send(entry({ mode: 'IN_PERSON', phase: 'ANALYSIS_DESIGN' }))
        .expect(201);
      const firstBody = first.body as MeetingBody;
      meetingId = firstBody.id;
      expect(firstBody).toMatchObject({ number: 1, status: 'SUBMITTED' });
      expect((second.body as MeetingBody).number).toBe(2);

      const book = await getBook();
      expect(book.phases[0].meetings.map((m) => m.number)).toEqual([1]);
      expect(book.phases[1].meetings[0]).toMatchObject({ mode: 'IN_PERSON' });
    });

    it('shows submitted entries in the supervisor review queue', async () => {
      const response = await server()
        .get('/api/me/reviews')
        .set(as('supervisor'))
        .expect(200);
      const body = response.body as {
        meetings: (MeetingBody & { project: { key: string } })[];
      };
      expect(body.meetings.map((m) => m.number)).toEqual([1, 2]);
      expect(body.meetings[0].project.key).toBe('RBK');

      const lead = await server()
        .get('/api/me/reviews')
        .set(as('lead'))
        .expect(200);
      expect((lead.body as { meetings: unknown[] }).meetings).toEqual([]);
    });

    it('only lets the supervisor review entries', async () => {
      await server()
        .post(`${meetingsUrl()}/${meetingId}/review`)
        .set(as('lead'))
        .send({ decision: 'CERTIFIED' })
        .expect(403);
    });

    it('needs a comment to request changes', async () => {
      await server()
        .post(`${meetingsUrl()}/${meetingId}/review`)
        .set(as('supervisor'))
        .send({ decision: 'CHANGES_REQUESTED' })
        .expect(400);
    });

    it('sends the entry back and resubmits it when students edit it', async () => {
      const review = await server()
        .post(`${meetingsUrl()}/${meetingId}/review`)
        .set(as('supervisor'))
        .send({ decision: 'CHANGES_REQUESTED', comment: 'Add the next steps.' })
        .expect(200);
      expect(review.body).toMatchObject({
        status: 'CHANGES_REQUESTED',
        supervisorComment: 'Add the next steps.',
      });

      const edit = await server()
        .patch(`${meetingsUrl()}/${meetingId}`)
        .set(as('student'))
        .send({ summary: 'Shared the proposal. Next: interview users.' })
        .expect(200);
      expect(edit.body).toMatchObject({
        status: 'SUBMITTED',
        supervisorComment: 'Add the next steps.',
      });
    });

    it('needs a saved signature to certify', async () => {
      await server()
        .post(`${meetingsUrl()}/${meetingId}/review`)
        .set(as('supervisor'))
        .send({ decision: 'CERTIFIED' })
        .expect(400);
    });

    it('stamps a copy of the supervisor signature when certifying', async () => {
      await server()
        .put('/api/me/signature')
        .set(as('supervisor'))
        .send({ method: 'UPLOAD', image: PNG })
        .expect(200);
      const response = await server()
        .post(`${meetingsUrl()}/${meetingId}/review`)
        .set(as('supervisor'))
        .send({ decision: 'CERTIFIED', comment: 'Well documented.' })
        .expect(200);
      const body = response.body as MeetingBody;
      expect(body).toMatchObject({
        status: 'CERTIFIED',
        signatureImage: PNG,
        supervisorComment: 'Well documented.',
        certifiedBy: { id: users.supervisor },
      });
      expect(body.certifiedAt).not.toBeNull();

      // Replacing the signature later does not change certified entries.
      await server()
        .delete('/api/me/signature')
        .set(as('supervisor'))
        .expect(204);
      const book = await getBook();
      expect(book.phases[0].meetings[0].signatureImage).toBe(PNG);
    });

    it('locks certified entries', async () => {
      await server()
        .patch(`${meetingsUrl()}/${meetingId}`)
        .set(as('student'))
        .send({ summary: 'Rewritten' })
        .expect(409);
      await server()
        .delete(`${meetingsUrl()}/${meetingId}`)
        .set(as('lead'))
        .expect(409);
      await server()
        .post(`${meetingsUrl()}/${meetingId}/review`)
        .set(as('supervisor'))
        .send({ decision: 'CHANGES_REQUESTED', comment: 'Too late' })
        .expect(409);
    });

    it('lets students delete an uncertified entry', async () => {
      const book = await getBook();
      const pending = book.phases[1].meetings[0];
      await server()
        .delete(`${meetingsUrl()}/${pending.id}`)
        .set(as('supervisor'))
        .expect(403);
      await server()
        .delete(`${meetingsUrl()}/${pending.id}`)
        .set(as('student'))
        .expect(204);
      expect((await getBook()).phases[1].meetings).toEqual([]);
    });
  });
});

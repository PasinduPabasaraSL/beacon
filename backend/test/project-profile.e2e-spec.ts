import { randomUUID } from 'node:crypto';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { ProjectRole, WorkspaceRole } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { DEV_USER_HEADER } from '../src/auth/dev-auth.guard';
import { PrismaService } from '../src/prisma/prisma.service';

interface ProjectBody {
  id: string;
  name: string;
  description: string | null;
  logo: string | null;
  isPublic: boolean;
  teamName: string | null;
}
interface PublicProfileBody {
  key: string;
  name: string;
  description: string | null;
  logo: string | null;
  teamName: string | null;
  workspace: { name: string };
  members: { id: string; role: ProjectRole }[];
}

const PEOPLE = ['lead', 'student', 'supervisor', 'outsider'] as const;
type Role = (typeof PEOPLE)[number];

// 1x1 transparent PNG.
const PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
const WEBP = `data:image/webp;base64,${Buffer.from('RIFF\x1a\x00\x00\x00WEBPVP8L', 'latin1').toString('base64')}`;

describe('Project profile (e2e)', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;

  const suffix = randomUUID().slice(0, 8);
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
          githubId: `e2e-pp-${person}-${suffix}`,
          githubLogin: `e2e-pp-${person}-${suffix}`,
        },
      });
      users[person] = user.id;
    }
    const workspace = await prisma.workspace.create({
      data: {
        name: 'E2E profile',
        slug: `e2e-pp-${suffix}`,
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
        name: 'Profile group',
        key: 'PRF',
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
  const profileUrl = () => `/api/projects/${projectId}/profile`;
  const publicUrl = () => `/api/public/projects/${projectId}`;

  it('is public by default with no logo or team name', async () => {
    const res = await server().get(`/api/projects/${projectId}`).expect(200);
    expect(res.body).toMatchObject({
      logo: null,
      isPublic: true,
      teamName: null,
    });
  });

  it('needs a signed-in user', async () => {
    await server().patch(profileUrl()).send({ name: 'Nope' }).expect(401);
  });

  it.each(['student', 'supervisor', 'outsider'] as const)(
    'only lets the team lead edit it, not the %s',
    async (person) => {
      await server()
        .patch(profileUrl())
        .set(as(person))
        .send({ name: 'Nope' })
        .expect(403);
    },
  );

  it('returns 404 for a project that does not exist', async () => {
    await server()
      .patch(`/api/projects/${randomUUID()}/profile`)
      .set(as('lead'))
      .send({ name: 'Nope' })
      .expect(404);
    await server().get(`/api/public/projects/${randomUUID()}`).expect(404);
  });

  it('updates the name, team name, description and logo', async () => {
    const res = await server()
      .patch(profileUrl())
      .set(as('lead'))
      .send({
        name: '  Smart Campus  ',
        teamName: 'Group 12',
        description: '# Smart Campus\n\n- [x] Proposal',
        logo: PNG,
      })
      .expect(200);
    expect(res.body as ProjectBody).toMatchObject({
      name: 'Smart Campus',
      teamName: 'Group 12',
      description: '# Smart Campus\n\n- [x] Proposal',
      logo: PNG,
      isPublic: true,
    });

    const book = await server()
      .get(`/api/projects/${projectId}/record-book`)
      .expect(200);
    expect(book.body).toMatchObject({
      project: { name: 'Smart Campus', logo: PNG },
      details: { groupName: 'Group 12' },
    });
  });

  it('accepts WebP logos and leaves unsent fields alone', async () => {
    const res = await server()
      .patch(profileUrl())
      .set(as('lead'))
      .send({ logo: WEBP })
      .expect(200);
    expect(res.body as ProjectBody).toMatchObject({
      name: 'Smart Campus',
      teamName: 'Group 12',
      logo: WEBP,
    });
  });

  it.each([
    ['a GIF', 'data:image/gif;base64,R0lGODlhAQABAAAAACw='],
    ['JPEG bytes labelled as PNG', 'data:image/png;base64,/9j/4AAQSkZJRg=='],
    ['plain text', 'not a data url'],
    [
      'an image over 200 KB',
      `data:image/png;base64,${Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4e, 0x47]),
        Buffer.alloc(201 * 1024),
      ]).toString('base64')}`,
    ],
  ])('rejects %s as a logo', async (_, logo) => {
    await server()
      .patch(profileUrl())
      .set(as('lead'))
      .send({ logo })
      .expect(400);
  });

  it.each([
    ['an empty name', { name: '   ' }],
    ['a name over 80 characters', { name: 'x'.repeat(81) }],
    ['a team name over 80 characters', { teamName: 'x'.repeat(81) }],
    ['a non-boolean visibility', { isPublic: 'yes' }],
  ])('rejects %s', async (_, body) => {
    await server().patch(profileUrl()).set(as('lead')).send(body).expect(400);
  });

  it('shows the public profile without signing in', async () => {
    const res = await server().get(publicUrl()).expect(200);
    const body = res.body as PublicProfileBody;
    expect(body).toMatchObject({
      key: 'PRF',
      name: 'Smart Campus',
      teamName: 'Group 12',
      logo: WEBP,
      description: '# Smart Campus\n\n- [x] Proposal',
      workspace: { name: 'E2E profile' },
    });
    expect(body.members.map((m) => m.id)).toEqual([
      users.lead,
      users.student,
      users.supervisor,
    ]);
    expect(body).not.toHaveProperty('statuses');
  });

  it('removes the logo and clears the team name and description', async () => {
    const res = await server()
      .patch(profileUrl())
      .set(as('lead'))
      .send({ logo: null, teamName: '', description: '  ' })
      .expect(200);
    expect(res.body as ProjectBody).toMatchObject({
      logo: null,
      teamName: null,
      description: null,
    });
  });

  it('hides the public profile when the team lead makes it private', async () => {
    await server()
      .patch(profileUrl())
      .set(as('lead'))
      .send({ isPublic: false })
      .expect(200);
    const res = await server().get(publicUrl()).expect(403);
    expect((res.body as { message: string }).message).toBe(
      'This project profile is private',
    );

    await server()
      .patch(profileUrl())
      .set(as('lead'))
      .send({ isPublic: true })
      .expect(200);
    await server().get(publicUrl()).expect(200);
  });
});

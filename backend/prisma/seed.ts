import { config } from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  ContributionReviewStatus,
  ContributionType,
  PrismaClient,
  ProjectRole,
  SemesterBreakKind,
  SprintStatus,
  StatusCategory,
  TaskPriority,
  WorkspaceRole,
} from '@prisma/client';
import { addWeeks, startOfIsoWeek } from '../src/common/week';
import { DEFAULT_WORKFLOW_STATUSES } from '../src/projects/default-workflow-statuses';

config({ path: ['.env', '../.env'], quiet: true });

const DEMO_WORKSPACE_SLUG = 'demo-team';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function seedUsers() {
  const users = [
    { githubId: '9000001', githubLogin: 'alice-demo', name: 'Alice Lead' },
    { githubId: '9000002', githubLogin: 'bob-demo', name: 'Bob Student' },
    { githubId: '9000003', githubLogin: 'chen-demo', name: 'Chen Student' },
    {
      githubId: '9000004',
      githubLogin: 'dr-silva-demo',
      name: 'Dr. Silva (Supervisor)',
    },
    { githubId: '9000005', githubLogin: 'dana-demo', name: 'Dana Student' },
    { githubId: '9000006', githubLogin: 'eli-demo', name: 'Eli Student' },
  ];

  const [alice, bob, chen, supervisor, dana, eli] = await Promise.all(
    users.map((user) =>
      prisma.user.upsert({
        where: { githubId: user.githubId },
        update: {
          githubLogin: user.githubLogin,
          name: user.name,
          avatarUrl: null,
        },
        create: user,
      }),
    ),
  );
  return { alice, bob, chen, supervisor, dana, eli };
}

/** Friday of the week starting `monday`. */
function fridayOf(monday: Date): Date {
  return new Date(monday.getTime() + 4 * 24 * 60 * 60 * 1000);
}

async function main() {
  // Recreate the demo workspace from scratch; everything under it cascades.
  await prisma.workspace.deleteMany({ where: { slug: DEMO_WORKSPACE_SLUG } });

  const { alice, bob, chen, supervisor, dana, eli } = await seedUsers();

  const thisWeek = startOfIsoWeek(new Date());
  const lastWeek = addWeeks(thisWeek, -1);
  // Teaching week 6 of 12 this week: weeks 1-3, a break, weeks 4-12, then exams.
  const semesterStart = addWeeks(thisWeek, -6);
  const semesterWeeks = 14;

  const workspace = await prisma.workspace.create({
    data: {
      name: 'Demo University Team',
      slug: DEMO_WORKSPACE_SLUG,
      semesterName: `Semester 2, ${thisWeek.getUTCFullYear()}`,
      semesterStart,
      semesterWeeks,
      semesterBreaks: {
        create: [
          {
            weekStart: addWeeks(semesterStart, 3),
            kind: SemesterBreakKind.BREAK,
            label: 'Mid-semester break',
          },
          {
            weekStart: addWeeks(semesterStart, semesterWeeks - 1),
            kind: SemesterBreakKind.EXAM,
            label: 'Exam week',
          },
        ],
      },
      // The lecturer runs the module; students only lead their own groups.
      members: {
        create: [
          { userId: supervisor.id, role: WorkspaceRole.OWNER },
          { userId: alice.id, role: WorkspaceRole.MEMBER },
          { userId: bob.id, role: WorkspaceRole.MEMBER },
          { userId: chen.id, role: WorkspaceRole.MEMBER },
          { userId: dana.id, role: WorkspaceRole.MEMBER },
          { userId: eli.id, role: WorkspaceRole.MEMBER },
        ],
      },
    },
  });

  const project = await prisma.project.create({
    data: {
      workspaceId: workspace.id,
      name: 'Beacon Capstone',
      key: 'BCN',
      description: 'Semester capstone project used to demo Beacon.',
      members: {
        create: [
          { userId: alice.id, role: ProjectRole.OWNER },
          { userId: bob.id, role: ProjectRole.MEMBER },
          { userId: chen.id, role: ProjectRole.MEMBER },
          { userId: supervisor.id, role: ProjectRole.SUPERVISOR },
        ],
      },
      statuses: {
        create: [
          ...DEFAULT_WORKFLOW_STATUSES.slice(0, -1),
          // A custom column mapped onto a fixed category, placed before Done.
          { name: 'QA', category: StatusCategory.IN_REVIEW, color: '#f59e0b' },
          ...DEFAULT_WORKFLOW_STATUSES.slice(-1),
        ].map((status, index) => ({ ...status, position: index })),
      },
    },
    include: { statuses: true },
  });

  const statusId = (name: string) => {
    const status = project.statuses.find((s) => s.name === name);
    if (!status) throw new Error(`Missing seeded status "${name}"`);
    return status.id;
  };

  const [proposal, midterm, finalReport] = await Promise.all(
    [
      {
        title: 'Project proposal',
        description: 'Scope, team roles and initial architecture.',
        dueDate: fridayOf(addWeeks(semesterStart, 2)),
      },
      {
        title: 'Midterm demo',
        description: 'Working board and contribution logging shown in class.',
        dueDate: fridayOf(addWeeks(thisWeek, 1)),
      },
      {
        title: 'Final report and presentation',
        dueDate: fridayOf(addWeeks(semesterStart, semesterWeeks - 2)),
      },
    ].map((milestone) =>
      prisma.milestone.create({
        data: { projectId: project.id, ...milestone },
      }),
    ),
  );

  const sprint = await prisma.sprint.create({
    data: {
      projectId: project.id,
      name: 'Sprint 1',
      goal: 'Login and project board MVP',
      startDate: lastWeek,
      endDate: addWeeks(thisWeek, 1),
      status: SprintStatus.ACTIVE,
    },
  });

  const taskSeeds = [
    {
      title: 'Set up GitHub OAuth login',
      status: 'Done',
      priority: TaskPriority.HIGH,
      assignees: [alice.id],
      milestoneId: proposal.id,
    },
    {
      title: 'Design project board UI',
      status: 'In Progress',
      priority: TaskPriority.MEDIUM,
      assignees: [bob.id, chen.id],
      milestoneId: midterm.id,
    },
    {
      title: 'Implement task API endpoints',
      status: 'QA',
      priority: TaskPriority.HIGH,
      assignees: [chen.id],
      milestoneId: midterm.id,
    },
    {
      title: 'Write contribution logging docs',
      status: 'Todo',
      priority: TaskPriority.LOW,
      assignees: [bob.id],
      milestoneId: midterm.id,
    },
    {
      title: 'Research GitHub webhook events',
      status: 'Backlog',
      priority: TaskPriority.NONE,
      assignees: [],
      inSprint: false,
      milestoneId: finalReport.id,
    },
  ];

  const tasks = [];
  for (const [index, seed] of taskSeeds.entries()) {
    const isDone = seed.status === 'Done';
    tasks.push(
      await prisma.task.create({
        data: {
          projectId: project.id,
          number: index + 1,
          title: seed.title,
          statusId: statusId(seed.status),
          priority: seed.priority,
          reporterId: alice.id,
          sprintId: seed.inSprint === false ? null : sprint.id,
          milestoneId: seed.milestoneId,
          dueDate: seed.inSprint === false ? null : addWeeks(thisWeek, 1),
          position: index,
          completedAt: isDone ? new Date() : null,
          assignees: {
            create: seed.assignees.map((userId) => ({ userId })),
          },
        },
      }),
    );
  }
  await prisma.project.update({
    where: { id: project.id },
    data: { taskCounter: tasks.length },
  });

  const [oauthTask, boardTask, apiTask] = tasks;

  // The board UI depends on the task API.
  await prisma.taskDependency.create({
    data: { blockingTaskId: apiTask.id, blockedTaskId: boardTask.id },
  });

  await prisma.contributionEntry.createMany({
    data: [
      {
        projectId: project.id,
        userId: alice.id,
        weekStart: lastWeek,
        hours: 6,
        type: ContributionType.DEVELOPMENT,
        taskId: oauthTask.id,
        description: 'Implemented the GitHub OAuth flow and session handling.',
        reviewStatus: ContributionReviewStatus.APPROVED,
        reviewedById: supervisor.id,
        reviewedAt: new Date(),
      },
      {
        projectId: project.id,
        userId: bob.id,
        weekStart: lastWeek,
        hours: 2,
        type: ContributionType.MEETING,
        description: 'Sprint planning meeting with the team.',
      },
      {
        projectId: project.id,
        userId: bob.id,
        weekStart: thisWeek,
        hours: 4.5,
        type: ContributionType.DEVELOPMENT,
        taskId: boardTask.id,
        description: 'Built the first version of the board columns.',
      },
      {
        projectId: project.id,
        userId: chen.id,
        weekStart: thisWeek,
        hours: 3,
        type: ContributionType.TESTING,
        taskId: apiTask.id,
        description: 'Wrote e2e tests for the task endpoints.',
        reviewStatus: ContributionReviewStatus.CHANGES_REQUESTED,
        reviewedById: supervisor.id,
        reviewedAt: new Date(),
        reviewComment: 'Please link the PR that contains these tests.',
      },
      {
        projectId: project.id,
        userId: chen.id,
        weekStart: thisWeek,
        hours: 1.5,
        type: ContributionType.RESEARCH,
        description: 'Compared webhook vs polling for GitHub sync.',
      },
    ],
  });

  const navigator = await seedSecondGroup(workspace.id, {
    lead: dana.id,
    member: eli.id,
    supervisor: supervisor.id,
    thisWeek,
  });

  console.log(
    `Seeded workspace "${workspace.name}" with projects ${project.key} ` +
      `(${tasks.length} tasks, 3 milestones) and ${navigator.key}.`,
  );
}

/** A second group under the same supervisor, so the review queue spans teams. */
async function seedSecondGroup(
  workspaceId: string,
  people: { lead: string; member: string; supervisor: string; thisWeek: Date },
) {
  const { lead, member, supervisor, thisWeek } = people;
  const project = await prisma.project.create({
    data: {
      workspaceId,
      name: 'Campus Navigator',
      key: 'NAV',
      description: 'Indoor wayfinding app for the engineering building.',
      taskCounter: 2,
      members: {
        create: [
          { userId: lead, role: ProjectRole.OWNER },
          { userId: member, role: ProjectRole.MEMBER },
          { userId: supervisor, role: ProjectRole.SUPERVISOR },
        ],
      },
      statuses: {
        create: DEFAULT_WORKFLOW_STATUSES.map((status, index) => ({
          ...status,
          position: index,
        })),
      },
      milestones: {
        create: {
          title: 'Midterm demo',
          dueDate: fridayOf(addWeeks(thisWeek, 1)),
        },
      },
    },
    include: { statuses: true, milestones: true },
  });

  const statusOf = (category: StatusCategory) =>
    project.statuses.find((s) => s.category === category)!.id;

  await prisma.task.create({
    data: {
      projectId: project.id,
      number: 1,
      title: 'Map the ground floor',
      statusId: statusOf(StatusCategory.IN_PROGRESS),
      priority: TaskPriority.HIGH,
      reporterId: lead,
      milestoneId: project.milestones[0].id,
      dueDate: fridayOf(thisWeek),
      assignees: { create: [{ userId: member }] },
    },
  });
  await prisma.task.create({
    data: {
      projectId: project.id,
      number: 2,
      title: 'Prototype route search',
      statusId: statusOf(StatusCategory.TODO),
      priority: TaskPriority.MEDIUM,
      reporterId: lead,
      milestoneId: project.milestones[0].id,
      assignees: { create: [{ userId: lead }] },
    },
  });

  await prisma.contributionEntry.createMany({
    data: [
      {
        projectId: project.id,
        userId: lead,
        weekStart: addWeeks(thisWeek, -1),
        hours: 3,
        type: ContributionType.RESEARCH,
        description: 'Compared indoor positioning options.',
      },
      {
        projectId: project.id,
        userId: member,
        weekStart: thisWeek,
        hours: 5,
        type: ContributionType.DEVELOPMENT,
        description: 'Digitised the ground floor plan.',
      },
      {
        projectId: project.id,
        userId: lead,
        weekStart: thisWeek,
        hours: 1,
        type: ContributionType.MEETING,
        description: 'Weekly check-in with Dr. Silva.',
      },
    ],
  });
  return project;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

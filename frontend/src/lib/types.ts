// Response shapes of the Beacon API. Dates are ISO strings.

export type StatusCategory =
  'BACKLOG' | 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE'

export type TaskPriority = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

export type ProjectRole = 'OWNER' | 'MEMBER' | 'VIEWER' | 'SUPERVISOR'

export type SprintStatus = 'PLANNED' | 'ACTIVE' | 'COMPLETED'

export type ContributionType =
  'DEVELOPMENT' | 'TESTING' | 'RESEARCH' | 'DOCUMENTATION' | 'MEETING' | 'OTHER'

export type ContributionReviewStatus =
  'PENDING' | 'APPROVED' | 'CHANGES_REQUESTED'

export interface UserSummary {
  id: string
  githubLogin: string
  name: string | null
  avatarUrl: string | null
}

export interface ProjectMember extends UserSummary {
  role: ProjectRole
}

export interface WorkspaceSummary {
  id: string
  name: string
  slug: string
}

export interface SprintSummary {
  id: string
  name: string
  startDate: string
  endDate: string
}

export interface ProjectListItem {
  id: string
  key: string
  name: string
  description: string | null
  workspace: WorkspaceSummary
  members: ProjectMember[]
  taskCounts: {
    total: number
    done: number
    byCategory: Record<StatusCategory, number>
  }
  activeSprint: SprintSummary | null
}

export interface ProjectDetail {
  id: string
  key: string
  name: string
  description: string | null
  workspace: WorkspaceSummary
  members: ProjectMember[]
  statuses: {
    id: string
    name: string
    category: StatusCategory
    color: string | null
  }[]
  sprints: (SprintSummary & { goal: string | null; status: SprintStatus })[]
}

export interface BoardTask {
  id: string
  number: number
  key: string
  title: string
  priority: TaskPriority
  dueDate: string | null
  sprintId: string | null
  completedAt: string | null
  assignees: UserSummary[]
  openBlockers: string[]
}

export interface BoardColumn {
  id: string
  name: string
  category: StatusCategory
  color: string | null
  tasks: BoardTask[]
}

export interface Board {
  columns: BoardColumn[]
}

export interface ProjectDashboard {
  progress: {
    total: number
    done: number
    byCategory: Record<StatusCategory, number>
  }
  activeSprint:
    | (SprintSummary & {
        goal: string | null
        totalTasks: number
        doneTasks: number
        daysRemaining: number
      })
    | null
  workload: {
    user: UserSummary
    role: ProjectRole
    openTasks: number
    doneTasks: number
    hoursThisWeek: number
    hoursLast4Weeks: number
  }[]
  weeklyHours: { weekStart: string; hours: number }[]
  hoursByType: Record<ContributionType, number>
  overdueTasks: {
    id: string
    key: string
    title: string
    dueDate: string
  }[]
}

export interface ContributionEntry {
  id: string
  weekStart: string
  hours: number
  type: ContributionType
  description: string
  reviewStatus: ContributionReviewStatus
  reviewComment: string | null
  reviewedAt: string | null
  createdAt: string
  updatedAt: string
  user: UserSummary
  reviewedBy: UserSummary | null
  task: { id: string; key: string; title: string } | null
}

export interface ContributionInput {
  /** Any date in the week (YYYY-MM-DD). */
  week: string
  hours: number
  type: ContributionType
  taskId: string | null
  description: string
}

export interface ContributionReviewInput {
  status: Exclude<ContributionReviewStatus, 'PENDING'>
  comment?: string
}

export type WorkspaceRole = 'OWNER' | 'ADMIN' | 'MEMBER'

export interface ProjectRef {
  id: string
  key: string
  name: string
}

export type SemesterBreakKind = 'BREAK' | 'EXAM'

export interface AcademicWeek {
  weekStart: string
  kind: 'TEACHING' | SemesterBreakKind
  /** 1-based; null for break and exam weeks. */
  teachingWeek: number | null
  label: string | null
}

export interface Semester {
  name: string | null
  startDate: string
  weeks: number
  teachingWeeks: number
  currentWeek: AcademicWeek | null
  calendar: AcademicWeek[]
}

export interface WorkspaceSemester {
  workspace: { id: string; name: string }
  semester: Semester | null
}

export interface SemesterInput {
  name?: string
  /** Any date in teaching week 1 (YYYY-MM-DD). */
  startDate: string
  weeks: number
  breaks: { week: string; kind: SemesterBreakKind; label?: string }[]
}

export type MilestoneStatus = 'COMPLETE' | 'OVERDUE' | 'UPCOMING'

export interface Milestone {
  id: string
  title: string
  description: string | null
  dueDate: string
  status: MilestoneStatus
  taskCount: number
  doneCount: number
  tasks: { id: string; key: string; title: string; done: boolean }[]
}

export interface MilestoneInput {
  title: string
  description: string | null
  /** YYYY-MM-DD */
  dueDate: string
}

interface WorkspaceSummaryRef {
  id: string
  name: string
}

export interface Me {
  user: UserSummary
  workspaces: (WorkspaceSummaryRef & { role: WorkspaceRole })[]
  projects: (ProjectRef & { role: ProjectRole })[]
  /** Owner or member somewhere, so they log hours. */
  isStudent: boolean
  canReview: boolean
}

export type ContributionWithProject = ContributionEntry & {
  project: ProjectRef
}

export interface MyWeek {
  weekStart: string
  weekEnd: string
  totalHours: number
  projects: (ProjectRef & {
    workspace: WorkspaceSummaryRef
    role: ProjectRole
    canLog: boolean
    hours: number
    entryCount: number
    semesterName: string | null
    teachingWeeks: number | null
    academicWeek: AcademicWeek | null
  })[]
  tasks: {
    id: string
    key: string
    title: string
    priority: TaskPriority
    dueDate: string | null
    project: ProjectRef
    status: { name: string; category: StatusCategory }
    openBlockers: string[]
  }[]
  changesRequested: ContributionWithProject[]
  milestones: (Milestone & { project: ProjectRef })[]
  pendingReviews: number
}

export interface ReviewQueue {
  projects: (ProjectRef & {
    role: ProjectRole
    teachingWeeks: number | null
  })[]
  entries: (ContributionWithProject & { academicWeek: AcademicWeek | null })[]
}

export interface WeeklyContributions {
  weekStart: string
  weekEnd: string
  totalHours: number
  members: {
    user: UserSummary
    role: ProjectRole
    entryCount: number
    hours: number
  }[]
  entries: ContributionEntry[]
}

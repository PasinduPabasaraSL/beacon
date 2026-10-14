// Response shapes of the Beacon API. Dates are ISO strings.

export type StatusCategory =
  'BACKLOG' | 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE'

export type TaskPriority = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

export type ProjectRole = 'OWNER' | 'MEMBER' | 'VIEWER' | 'SUPERVISOR'

export type SprintStatus = 'PLANNED' | 'ACTIVE' | 'COMPLETED'

export type ContributionType =
  'DEVELOPMENT' | 'TESTING' | 'RESEARCH' | 'DOCUMENTATION' | 'MEETING' | 'OTHER'

export type TimesheetStatus =
  'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'CHANGES_REQUESTED'

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
  /** Markdown. */
  description: string | null
  /** Image data URL; the initials tile is shown when unset. */
  logo: string | null
  isPublic: boolean
  teamName: string | null
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
  /** Markdown. */
  description: string | null
  /** Image data URL; the initials tile is shown when unset. */
  logo: string | null
  isPublic: boolean
  teamName: string | null
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

export interface ProjectProfileInput {
  name?: string
  teamName?: string
  description?: string
  logo?: string | null
  isPublic?: boolean
}

/** What anyone with the link sees on a public project profile. */
export interface PublicProjectProfile {
  id: string
  key: string
  name: string
  description: string | null
  logo: string | null
  teamName: string | null
  workspace: { name: string }
  members: ProjectMember[]
  updatedAt: string
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

export interface TimesheetDay {
  /** YYYY-MM-DD */
  date: string
  hours: number
  note: string | null
}

/** A timesheet row: a work type and optionally a task, with hours per day. */
export interface TimesheetRow {
  id: string
  type: ContributionType
  description: string
  hours: number
  task: { id: string; key: string; title: string } | null
  days: TimesheetDay[]
}

/** One member's week. `id` is null until they add a row. */
export interface Timesheet {
  id: string | null
  weekStart: string
  status: TimesheetStatus
  submittedAt: string | null
  reviewedAt: string | null
  reviewedBy: UserSummary | null
  reviewComment: string | null
  totalHours: number
  /** Monday to Sunday. */
  dailyHours: number[]
  rows: TimesheetRow[]
}

export interface TimesheetWeek {
  weekStart: string
  weekEnd: string
  /** YYYY-MM-DD, Monday to Sunday. */
  days: string[]
  totalHours: number
  members: {
    user: UserSummary
    role: ProjectRole
    canLog: boolean
    timesheet: Timesheet
  }[]
}

export interface RowInput {
  type: ContributionType
  taskId: string | null
  description: string
}

export interface LogTimeInput {
  /** YYYY-MM-DD */
  date: string
  hours: number
  type: ContributionType
  taskId: string | null
  note: string
}

export interface TimesheetReviewInput {
  status: 'APPROVED' | 'CHANGES_REQUESTED'
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

export type TimesheetWithProject = Timesheet & {
  id: string
  project: ProjectRef
  academicWeek: AcademicWeek | null
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
    rowCount: number
    timesheetStatus: TimesheetStatus
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
  /** The acting user's weeks sent back by a reviewer. */
  changesRequested: TimesheetWithProject[]
  milestones: (Milestone & { project: ProjectRef })[]
  pendingReviews: number
}

export interface ReviewQueue {
  projects: (ProjectRef & {
    role: ProjectRole
    teachingWeeks: number | null
  })[]
  /** Submitted weeks waiting for the acting reviewer. */
  timesheets: (TimesheetWithProject & { user: UserSummary })[]
  /** Record book entries waiting for the acting supervisor. */
  meetings: (MeetingRecord & { project: ProjectRef })[]
}

export type SignatureMethod = 'UPLOAD' | 'DRAWN' | 'TYPED'

export interface UserSignature {
  /** PNG or JPEG data URL. */
  image: string
  method: SignatureMethod
  updatedAt: string
}

export type MeetingMode = 'ONLINE_UPDATE' | 'IN_PERSON'

export type MeetingPhase =
  | 'PROBLEM_IDENTIFICATION'
  | 'ANALYSIS_DESIGN'
  | 'SYSTEM_DESIGN'
  | 'DEVELOPMENT_EVALUATION'

export type MeetingRecordStatus =
  'SUBMITTED' | 'CHANGES_REQUESTED' | 'CERTIFIED'

export interface MeetingRecord {
  id: string
  number: number
  phase: MeetingPhase
  mode: MeetingMode
  meetingDate: string
  summary: string
  status: MeetingRecordStatus
  supervisorComment: string | null
  certifiedAt: string | null
  /** Copy of the supervisor's signature at the time of certifying. */
  signatureImage: string | null
  createdAt: string
  updatedAt: string
  createdBy: UserSummary
  certifiedBy: UserSummary | null
  attendees: UserSummary[]
}

export interface RecordBookPerson {
  user: UserSummary
  role: ProjectRole
  registrationNumber: string | null
  signature: { image: string; signedAt: string } | null
}

export interface RecordBookDetails {
  moduleTitle: string
  level: string
  batch: string | null
  groupName: string | null
  department: string | null
  faculty: string | null
  university: string | null
}

export interface RecordBook {
  project: ProjectRef & {
    logo: string | null
    workspace: WorkspaceSummaryRef
  }
  details: RecordBookDetails
  supervisors: RecordBookPerson[]
  members: RecordBookPerson[]
  phases: { phase: MeetingPhase; meetings: MeetingRecord[] }[]
}

export interface MeetingInput {
  phase: MeetingPhase
  mode: MeetingMode
  /** YYYY-MM-DD */
  meetingDate: string
  summary: string
  attendeeIds: string[]
}

export interface MeetingReviewInput {
  decision: 'CERTIFIED' | 'CHANGES_REQUESTED'
  comment?: string
}

import type {
  AcademicWeek,
  ContributionReviewStatus,
  ContributionType,
  MeetingMode,
  MeetingPhase,
  MeetingRecordStatus,
  MilestoneStatus,
  ProjectRole,
  RecordBookDetails,
  Semester,
  SemesterBreakKind,
  SignatureMethod,
  StatusCategory,
  TaskPriority,
  UserSummary,
} from '@/lib/types'

const DAY_MS = 24 * 60 * 60 * 1000

// Date-only API values (due dates, week starts) are UTC midnight, so format in UTC.
const shortDate = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
})
const longDate = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
})

export function formatDate(iso: string, withYear = false): string {
  return (withYear ? longDate : shortDate).format(new Date(iso))
}

export function formatWeekRange(weekStartIso: string): string {
  const start = new Date(weekStartIso)
  const end = new Date(start.getTime() + 6 * DAY_MS)
  return `${shortDate.format(start)} – ${longDate.format(end)}`
}

export function formatHours(hours: number): string {
  return `${Number.isInteger(hours) ? hours : hours.toFixed(1)}h`
}

/** YYYY-MM-DD of the Monday (UTC) of the week containing `date`. */
export function isoWeekStart(date: Date): string {
  const utc = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  )
  const daysSinceMonday = (date.getUTCDay() + 6) % 7
  return new Date(utc - daysSinceMonday * DAY_MS).toISOString().slice(0, 10)
}

export function shiftWeek(weekStart: string, weeks: number): string {
  const start = new Date(`${weekStart}T00:00:00Z`)
  return new Date(start.getTime() + weeks * 7 * DAY_MS)
    .toISOString()
    .slice(0, 10)
}

export function isOverdue(dueDate: string | null, done: boolean): boolean {
  if (!dueDate || done) return false
  const now = new Date()
  const todayUtc = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  )
  return new Date(dueDate).getTime() < todayUtc
}

export function displayName(user: UserSummary): string {
  return user.name ?? user.githubLogin
}

export function initials(user: UserSummary): string {
  const parts = displayName(user)
    .replace(/[^\p{L}\s-]/gu, ' ')
    .split(/[\s-]+/)
    .filter(Boolean)
  return (
    parts
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join('') || '?'
  )
}

export const CATEGORY_LABELS: Record<StatusCategory, string> = {
  BACKLOG: 'Backlog',
  TODO: 'Todo',
  IN_PROGRESS: 'In progress',
  IN_REVIEW: 'In review',
  DONE: 'Done',
}

export const CATEGORY_COLORS: Record<StatusCategory, string> = {
  BACKLOG: 'bg-chart-4',
  TODO: 'bg-chart-3',
  IN_PROGRESS: 'bg-info',
  IN_REVIEW: 'bg-brand',
  DONE: 'bg-success',
}

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  NONE: 'No priority',
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  URGENT: 'Urgent',
}

export const PRIORITY_STYLES: Record<TaskPriority, string> = {
  NONE: 'border-border text-muted-foreground',
  LOW: 'border-border bg-muted text-muted-foreground',
  MEDIUM: 'border-info/25 bg-info-soft text-info-foreground',
  HIGH: 'border-warning/35 bg-warning-soft text-warning-foreground',
  URGENT: 'border-danger/30 bg-danger-soft text-danger-foreground',
}

export const ROLE_LABELS: Record<ProjectRole, string> = {
  OWNER: 'Owner',
  MEMBER: 'Member',
  VIEWER: 'Viewer',
  SUPERVISOR: 'Supervisor',
}

export const CONTRIBUTION_TYPE_LABELS: Record<ContributionType, string> = {
  DEVELOPMENT: 'Development',
  TESTING: 'Testing',
  RESEARCH: 'Research',
  DOCUMENTATION: 'Documentation',
  MEETING: 'Meeting',
  OTHER: 'Other',
}

export const CONTRIBUTION_TYPE_COLORS: Record<ContributionType, string> = {
  DEVELOPMENT: 'bg-blue-500',
  TESTING: 'bg-emerald-500',
  RESEARCH: 'bg-amber-500',
  DOCUMENTATION: 'bg-purple-500',
  MEETING: 'bg-pink-500',
  OTHER: 'bg-slate-400',
}

export const REVIEW_LABELS: Record<ContributionReviewStatus, string> = {
  PENDING: 'Pending review',
  APPROVED: 'Approved',
  CHANGES_REQUESTED: 'Changes requested',
}

export const REVIEW_STYLES: Record<ContributionReviewStatus, string> = {
  PENDING: 'border-border text-muted-foreground',
  APPROVED: 'border-success/30 bg-success-soft text-success-foreground',
  CHANGES_REQUESTED:
    'border-warning/35 bg-warning-soft text-warning-foreground',
}

export const MILESTONE_STATUS_LABELS: Record<MilestoneStatus, string> = {
  UPCOMING: 'Upcoming',
  OVERDUE: 'Overdue',
  COMPLETE: 'Complete',
}

export const MILESTONE_STATUS_STYLES: Record<MilestoneStatus, string> = {
  UPCOMING: 'border-border text-muted-foreground',
  OVERDUE: 'border-danger/30 bg-danger-soft text-danger-foreground',
  COMPLETE: 'border-success/30 bg-success-soft text-success-foreground',
}

export const SIGNATURE_METHOD_LABELS: Record<SignatureMethod, string> = {
  UPLOAD: 'Uploaded',
  DRAWN: 'Drawn',
  TYPED: 'Typed',
}

/** Phases of the paper record book, in order. */
export const MEETING_PHASES: MeetingPhase[] = [
  'PROBLEM_IDENTIFICATION',
  'ANALYSIS_DESIGN',
  'SYSTEM_DESIGN',
  'DEVELOPMENT_EVALUATION',
]

export const MEETING_PHASE_LETTERS: Record<MeetingPhase, string> = {
  PROBLEM_IDENTIFICATION: 'A',
  ANALYSIS_DESIGN: 'B',
  SYSTEM_DESIGN: 'C',
  DEVELOPMENT_EVALUATION: 'D',
}

export const MEETING_PHASE_LABELS: Record<MeetingPhase, string> = {
  PROBLEM_IDENTIFICATION: 'Problem identification and project proposal',
  ANALYSIS_DESIGN: 'Analysis and design',
  SYSTEM_DESIGN: 'System design',
  DEVELOPMENT_EVALUATION: 'Development, testing and evaluation',
}

export const MEETING_MODE_LABELS: Record<MeetingMode, string> = {
  ONLINE_UPDATE: 'Online update',
  IN_PERSON: 'In-person meeting',
}

export const MEETING_MODE_DESCRIPTIONS: Record<MeetingMode, string> = {
  ONLINE_UPDATE: 'Progress shared with the supervisor through Beacon',
  IN_PERSON: 'A meeting held face to face with the supervisor',
}

/** Online updates have contributors; in-person meetings have members present. */
export const MEETING_ATTENDEE_LABELS: Record<MeetingMode, string> = {
  ONLINE_UPDATE: 'Contributors',
  IN_PERSON: 'Members present',
}

export const MEETING_STATUS_LABELS: Record<MeetingRecordStatus, string> = {
  SUBMITTED: 'Awaiting supervisor',
  CHANGES_REQUESTED: 'Changes requested',
  CERTIFIED: 'Certified',
}

export const MEETING_STATUS_STYLES: Record<MeetingRecordStatus, string> = {
  SUBMITTED: 'border-border text-muted-foreground',
  CHANGES_REQUESTED:
    'border-warning/35 bg-warning-soft text-warning-foreground',
  CERTIFIED: 'border-success/30 bg-success-soft text-success-foreground',
}

/** Fields of the record book details page, in print order. */
export const RECORD_BOOK_DETAIL_FIELDS: {
  key: keyof RecordBookDetails
  label: string
  placeholder: string
}[] = [
  {
    key: 'moduleTitle',
    label: 'Module',
    placeholder: 'IS2901 - Software Development Project',
  },
  { key: 'level', label: 'Level', placeholder: 'Level 02' },
  { key: 'batch', label: 'Batch', placeholder: 'e.g. 22' },
  { key: 'groupName', label: 'Group', placeholder: 'e.g. Group 07' },
  {
    key: 'department',
    label: 'Department',
    placeholder: 'Department of Information Technology',
  },
  {
    key: 'faculty',
    label: 'Faculty',
    placeholder: 'Faculty of Information Technology',
  },
  { key: 'university', label: 'University', placeholder: 'University name' },
]

export const SEMESTER_BREAK_LABELS: Record<SemesterBreakKind, string> = {
  BREAK: 'Break',
  EXAM: 'Exams',
}

/** "Week 6 of 12", or the break's own label. */
export function academicWeekLabel(
  week: AcademicWeek,
  teachingWeeks: number,
): string {
  if (week.teachingWeek !== null) {
    return `Week ${week.teachingWeek} of ${teachingWeeks}`
  }
  if (week.label) return week.label
  return week.kind === 'EXAM' ? 'Exam week' : 'Semester break'
}

export function findAcademicWeek(
  semester: Semester | null | undefined,
  weekStart: string,
): AcademicWeek | null {
  const day = weekStart.slice(0, 10)
  return (
    semester?.calendar.find((w) => w.weekStart.slice(0, 10) === day) ?? null
  )
}

/** Whole days from today (UTC) until a date-only value; negative when past. */
export function daysUntil(iso: string): number {
  const now = new Date()
  const todayUtc = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  )
  return Math.round((new Date(iso).getTime() - todayUtc) / DAY_MS)
}

export function formatDueIn(iso: string): string {
  const days = daysUntil(iso)
  if (days === 0) return 'Due today'
  if (days === 1) return 'Due tomorrow'
  if (days > 1) return `Due in ${days} days`
  return days === -1 ? 'Due yesterday' : `${-days} days overdue`
}

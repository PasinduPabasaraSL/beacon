import type { ProjectRole, TimesheetStatus, TimesheetWeek } from '@/lib/types'

export const LOGGING_ROLES: ProjectRole[] = ['OWNER', 'MEMBER']
export const REVIEWER_ROLES: ProjectRole[] = ['SUPERVISOR', 'OWNER']

/** Statuses in which the author can still change their week. */
export const EDITABLE_STATUSES: TimesheetStatus[] = [
  'DRAFT',
  'CHANGES_REQUESTED',
]

export type TimesheetMember = TimesheetWeek['members'][number]

/** Members who log time, plus anyone else who happens to have hours. */
export function teamMembers(week: TimesheetWeek): TimesheetMember[] {
  return week.members.filter((m) => m.canLog || m.timesheet.totalHours > 0)
}

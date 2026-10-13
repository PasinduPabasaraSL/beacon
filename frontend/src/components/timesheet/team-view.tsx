import { ChevronRight } from 'lucide-react'
import { TimesheetStatusBadge } from '@/components/badges'
import { EmptyState } from '@/components/query-state'
import { UserAvatar } from '@/components/user-avatar'
import {
  displayName,
  formatHours,
  formatHoursValue,
  formatWeekday,
  localToday,
  ROLE_LABELS,
} from '@/lib/format'
import { teamMembers } from '@/lib/timesheet'
import type { TimesheetWeek } from '@/lib/types'
import { cn } from '@/lib/utils'

export function TeamView({
  week,
  actingUserId,
  onOpen,
}: {
  week: TimesheetWeek
  actingUserId: string | null
  onOpen: (userId: string) => void
}) {
  const today = localToday()
  const members = teamMembers(week)
  if (members.length === 0) {
    return (
      <EmptyState
        title="Nobody logs time on this project yet"
        description="Owners and members fill in a weekly timesheet."
      />
    )
  }

  const dailyTotals = week.days.map((_, index) =>
    members.reduce((sum, m) => sum + m.timesheet.dailyHours[index], 0),
  )
  const dayClass = (index: number) =>
    cn(
      'border-l',
      index >= 5 && 'bg-muted/40',
      week.days[index] === today && 'bg-brand-soft/40',
    )

  return (
    <div className="bg-card overflow-x-auto rounded-xl border">
      <table className="w-full min-w-240 table-fixed border-collapse text-sm">
        <colgroup>
          <col />
          {week.days.map((day) => (
            <col key={day} className="w-18" />
          ))}
          <col className="w-20" />
          <col className="w-40" />
        </colgroup>
        <thead>
          <tr className="text-muted-foreground border-b text-xs">
            <th className="px-4 py-3 text-left font-medium">Member</th>
            {week.days.map((day, index) => (
              <th key={day} className={cn(dayClass(index), 'font-medium')}>
                {formatWeekday(day)} {Number(day.slice(8))}
              </th>
            ))}
            <th className="border-l px-2 text-right font-medium">Total</th>
            <th className="border-l px-3 text-left font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {members.map((member) => (
            <tr
              key={member.user.id}
              onClick={() => onOpen(member.user.id)}
              className="group hover:bg-muted/40 cursor-pointer border-b"
            >
              <td className="px-4 py-2.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onOpen(member.user.id)
                  }}
                  aria-label={`Open ${displayName(member.user)}'s timesheet`}
                  className="focus-visible:ring-ring flex w-full min-w-0 items-center gap-2.5 rounded-md text-left outline-none focus-visible:ring-2"
                >
                  <UserAvatar
                    user={member.user}
                    size="sm"
                    withTooltip={false}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">
                      {displayName(member.user)}
                      {member.user.id === actingUserId && (
                        <span className="text-muted-foreground font-normal">
                          {' '}
                          (you)
                        </span>
                      )}
                    </span>
                    <span className="text-muted-foreground block text-xs">
                      {ROLE_LABELS[member.role]}
                    </span>
                  </span>
                  <ChevronRight className="text-muted-foreground size-4 opacity-0 group-hover:opacity-100" />
                </button>
              </td>
              {member.timesheet.dailyHours.map((hours, index) => (
                <td
                  key={week.days[index]}
                  className={cn(
                    dayClass(index),
                    'text-center tabular-nums',
                    hours === 0 && 'text-muted-foreground/50',
                  )}
                >
                  {hours > 0 ? formatHoursValue(hours) : '–'}
                </td>
              ))}
              <td className="border-l px-2 text-right font-semibold tabular-nums">
                {formatHours(member.timesheet.totalHours)}
              </td>
              <td className="border-l px-3">
                <TimesheetStatusBadge status={member.timesheet.status} />
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-muted">
            <th scope="row" className="px-4 py-3 text-left text-xs font-medium">
              Team total
            </th>
            {dailyTotals.map((hours, index) => (
              <td
                key={week.days[index]}
                className={cn(
                  dayClass(index),
                  'text-center font-semibold tabular-nums',
                )}
              >
                {hours > 0 ? formatHoursValue(hours) : '–'}
              </td>
            ))}
            <td className="text-brand-strong border-l px-2 text-right text-base font-semibold tabular-nums">
              {formatHours(week.totalHours)}
            </td>
            <td className="border-l" />
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

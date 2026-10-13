import { Fragment, useState } from 'react'
import { ContributionTypeBadge } from '@/components/badges'
import { EmptyState } from '@/components/query-state'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { UserAvatar } from '@/components/user-avatar'
import { displayName, formatHours, formatLongDay } from '@/lib/format'
import { teamMembers } from '@/lib/timesheet'
import type { TimesheetRow, TimesheetWeek, UserSummary } from '@/lib/types'

const EVERYONE = 'all'

interface LogEntry {
  key: string
  date: string
  user: UserSummary
  row: TimesheetRow
  hours: number
  note: string | null
}

function logEntries(week: TimesheetWeek, userId: string): LogEntry[] {
  return week.members
    .filter((m) => userId === EVERYONE || m.user.id === userId)
    .flatMap((member) =>
      member.timesheet.rows.flatMap((row) =>
        row.days.map((day) => ({
          key: `${row.id}:${day.date}`,
          date: day.date,
          user: member.user,
          row,
          hours: day.hours,
          note: day.note,
        })),
      ),
    )
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) ||
        displayName(a.user).localeCompare(displayName(b.user)),
    )
}

/** Every logged day cell in the week as a flat, filterable list. */
export function TimeLog({ week }: { week: TimesheetWeek }) {
  const [userId, setUserId] = useState(EVERYONE)
  const entries = logEntries(week, userId)
  const byDay = new Map<string, LogEntry[]>()
  for (const entry of entries) {
    byDay.set(entry.date, [...(byDay.get(entry.date) ?? []), entry])
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm">
          {entries.length} {entries.length === 1 ? 'entry' : 'entries'} ·{' '}
          {formatHours(entries.reduce((sum, e) => sum + e.hours, 0))}
        </p>
        <Select value={userId} onValueChange={setUserId}>
          <SelectTrigger aria-label="Filter by member" className="w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            <SelectItem value={EVERYONE}>Everyone</SelectItem>
            {teamMembers(week).map((m) => (
              <SelectItem key={m.user.id} value={m.user.id}>
                {displayName(m.user)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {entries.length === 0 ? (
        <EmptyState
          title="No time logged this week"
          description="Hours entered on timesheets show up here day by day."
        />
      ) : (
        <div className="bg-card rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Member</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Hours</TableHead>
                <TableHead className="w-[38%] pr-4">Note</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...byDay].map(([date, dayEntries]) => (
                <Fragment key={date}>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableCell
                      colSpan={5}
                      className="px-4 py-2 text-xs font-medium"
                    >
                      {formatLongDay(date)}
                      <span className="text-muted-foreground font-normal">
                        {' · '}
                        {formatHours(
                          dayEntries.reduce((sum, e) => sum + e.hours, 0),
                        )}
                      </span>
                    </TableCell>
                  </TableRow>
                  {dayEntries.map((entry) => (
                    <TableRow key={entry.key}>
                      <TableCell className="pl-4">
                        <div className="flex items-center gap-2">
                          <UserAvatar
                            user={entry.user}
                            size="sm"
                            withTooltip={false}
                          />
                          <span className="font-medium">
                            {displayName(entry.user)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-64">
                        <span className="flex min-w-0 items-baseline gap-1.5">
                          {entry.row.task && (
                            <span className="text-muted-foreground shrink-0 font-mono text-xs">
                              {entry.row.task.key}
                            </span>
                          )}
                          <span className="truncate">
                            {entry.row.task?.title ?? entry.row.description}
                          </span>
                        </span>
                      </TableCell>
                      <TableCell>
                        <ContributionTypeBadge type={entry.row.type} />
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {entry.hours > 0 ? formatHours(entry.hours) : '–'}
                      </TableCell>
                      <TableCell className="text-muted-foreground pr-4 whitespace-normal">
                        {entry.note ?? '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

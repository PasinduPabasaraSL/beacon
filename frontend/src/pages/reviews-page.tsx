import { Check } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { MeetingCard } from '@/components/record-book/meeting-card'
import { PageHeader } from '@/components/page-header'
import { EmptyState, ErrorState } from '@/components/query-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { ReviewActions } from '@/components/timesheet/review-actions'
import { UserAvatar } from '@/components/user-avatar'
import { useApproveTimesheets, useReviewQueue } from '@/hooks/queries'
import { useActingUserId } from '@/lib/acting-user'
import { errorMessage } from '@/lib/api'
import {
  academicWeekLabel,
  CONTRIBUTION_TYPE_COLORS,
  CONTRIBUTION_TYPE_LABELS,
  displayName,
  formatDate,
  formatHours,
  formatHoursValue,
  formatWeekday,
  formatWeekRange,
  shiftDays,
} from '@/lib/format'
import type { ReviewQueue } from '@/lib/types'
import { cn } from '@/lib/utils'

type QueueTimesheet = ReviewQueue['timesheets'][number]
type QueueProject = ReviewQueue['projects'][number]
type QueueMeeting = ReviewQueue['meetings'][number]

function TimesheetBreakdown({ timesheet }: { timesheet: QueueTimesheet }) {
  const days = Array.from({ length: 7 }, (_, i) =>
    shiftDays(timesheet.weekStart.slice(0, 10), i),
  )
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] table-fixed text-sm">
        <colgroup>
          <col />
          {days.map((day) => (
            <col key={day} className="w-12" />
          ))}
          <col className="w-16" />
        </colgroup>
        <thead>
          <tr className="text-muted-foreground text-xs">
            <th className="py-1.5 text-left font-medium">Item</th>
            {days.map((day) => (
              <th key={day} className="font-medium">
                {formatWeekday(day)}
              </th>
            ))}
            <th className="text-right font-medium">Total</th>
          </tr>
        </thead>
        <tbody>
          {timesheet.rows.map((row) => (
            <tr key={row.id} className="border-t">
              <td className="py-2 pr-3">
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className={cn(
                      'size-2 shrink-0 rounded-full',
                      CONTRIBUTION_TYPE_COLORS[row.type],
                    )}
                  />
                  {row.task && (
                    <span className="text-muted-foreground shrink-0 font-mono text-xs">
                      {row.task.key}
                    </span>
                  )}
                  <span className="truncate">
                    {row.task?.title ?? row.description}
                  </span>
                  <span className="text-muted-foreground shrink-0 text-xs">
                    {CONTRIBUTION_TYPE_LABELS[row.type]}
                  </span>
                </span>
              </td>
              {days.map((day) => {
                const cell = row.days.find((d) => d.date === day)
                return (
                  <td
                    key={day}
                    title={cell?.note ?? undefined}
                    className={cn(
                      'relative text-center tabular-nums',
                      !cell?.hours && 'text-muted-foreground/50',
                    )}
                  >
                    {cell?.hours ? formatHoursValue(cell.hours) : '–'}
                    {cell?.note && (
                      <span className="bg-brand-strong absolute top-1.5 right-1 size-1.5 rounded-full" />
                    )}
                  </td>
                )
              })}
              <td className="text-right font-medium tabular-nums">
                {formatHours(row.hours)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ProjectQueue({
  project,
  timesheets,
  selected,
  onToggle,
}: {
  project: QueueProject
  timesheets: QueueTimesheet[]
  selected: Set<string>
  onToggle: (ids: string[], checked: boolean) => void
}) {
  const ids = timesheets.map((t) => t.id)
  const selectedCount = ids.filter((id) => selected.has(id)).length
  const totalHours = timesheets.reduce((sum, t) => sum + t.totalHours, 0)

  return (
    <Card>
      <CardHeader className="flex flex-row items-start gap-3">
        <Checkbox
          className="mt-1"
          aria-label={`Select all from ${project.name}`}
          checked={
            selectedCount === 0
              ? false
              : selectedCount === ids.length
                ? true
                : 'indeterminate'
          }
          onCheckedChange={(checked) => onToggle(ids, checked === true)}
        />
        <div className="flex flex-col gap-1.5">
          <CardTitle className="flex items-center gap-2">
            <Link
              to={`/projects/${project.id}/contributions?view=team`}
              className="hover:underline"
            >
              {project.name}
            </Link>
            <Badge variant="secondary" className="font-mono">
              {project.key}
            </Badge>
          </CardTitle>
          <CardDescription>
            {timesheets.length} {timesheets.length === 1 ? 'week' : 'weeks'}{' '}
            submitted · {formatHours(totalHours)}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {timesheets.map((timesheet) => (
          <div
            key={timesheet.id}
            data-state={selected.has(timesheet.id) ? 'selected' : undefined}
            className="data-[state=selected]:border-brand/50 data-[state=selected]:bg-brand-soft/30 flex flex-col gap-3 rounded-lg border p-4"
          >
            <div className="flex flex-wrap items-center gap-3">
              <Checkbox
                aria-label={`Select ${displayName(timesheet.user)}, ${formatHours(timesheet.totalHours)}`}
                checked={selected.has(timesheet.id)}
                onCheckedChange={(checked) =>
                  onToggle([timesheet.id], checked === true)
                }
              />
              <UserAvatar user={timesheet.user} size="sm" withTooltip={false} />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{displayName(timesheet.user)}</p>
                <p className="text-muted-foreground text-xs">
                  {timesheet.academicWeek && project.teachingWeeks !== null
                    ? `${academicWeekLabel(timesheet.academicWeek, project.teachingWeeks)} · `
                    : ''}
                  {formatWeekRange(timesheet.weekStart)}
                  {timesheet.submittedAt &&
                    ` · submitted ${formatDate(timesheet.submittedAt)}`}
                </p>
              </div>
              <p className="text-lg font-semibold tabular-nums">
                {formatHours(timesheet.totalHours)}
              </p>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" asChild>
                  <Link
                    to={`/projects/${project.id}/contributions?week=${timesheet.weekStart.slice(0, 10)}&member=${timesheet.user.id}`}
                  >
                    Open
                  </Link>
                </Button>
                <ReviewActions
                  projectId={project.id}
                  timesheet={timesheet}
                  user={timesheet.user}
                />
              </div>
            </div>
            <TimesheetBreakdown timesheet={timesheet} />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function MeetingQueue({
  project,
  meetings,
}: {
  project: QueueProject
  meetings: QueueMeeting[]
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link
            to={`/projects/${project.id}/record-book`}
            className="hover:underline"
          >
            {project.name}
          </Link>
          <Badge variant="secondary" className="font-mono">
            {project.key}
          </Badge>
        </CardTitle>
        <CardDescription>
          {meetings.length} record book{' '}
          {meetings.length === 1 ? 'entry' : 'entries'} to certify
        </CardDescription>
      </CardHeader>
      <CardContent className="divide-y">
        {meetings.map((meeting) => (
          <MeetingCard
            key={meeting.id}
            projectId={project.id}
            meeting={meeting}
            members={[]}
            canEdit={false}
            canReview
            showPhase
          />
        ))}
      </CardContent>
    </Card>
  )
}

export function ReviewsPage() {
  const actingUserId = useActingUserId()
  const { data, error, isPending, refetch } = useReviewQueue()
  const approve = useApproveTimesheets()
  const [selection, setSelection] = useState<Set<string>>(new Set())

  // Group by project, then by student so one person's weeks sit together.
  const groups = useMemo(() => {
    if (!data) return []
    return data.projects
      .map((project) => ({
        project,
        timesheets: data.timesheets
          .filter((t) => t.project.id === project.id)
          .sort(
            (a, b) =>
              displayName(a.user).localeCompare(displayName(b.user)) ||
              a.weekStart.localeCompare(b.weekStart),
          ),
      }))
      .filter((group) => group.timesheets.length > 0)
  }, [data])

  const meetingGroups = useMemo(() => {
    if (!data) return []
    return data.projects
      .map((project) => ({
        project,
        meetings: data.meetings.filter((m) => m.project.id === project.id),
      }))
      .filter((group) => group.meetings.length > 0)
  }, [data])

  // Drop ids that left the queue (approved elsewhere or after a refetch).
  const selected = useMemo(() => {
    const live = new Set(data?.timesheets.map((t) => t.id))
    return new Set([...selection].filter((id) => live.has(id)))
  }, [selection, data])

  const toggle = (ids: string[], checked: boolean) =>
    setSelection((current) => {
      const next = new Set(current)
      ids.forEach((id) => (checked ? next.add(id) : next.delete(id)))
      return next
    })

  const approveSelected = () =>
    approve.mutate([...selected], {
      onSuccess: ({ approved }) => {
        toast.success(
          `Approved ${approved} ${approved === 1 ? 'week' : 'weeks'}`,
        )
        setSelection(new Set())
      },
      onError: (e) => toast.error(errorMessage(e)),
    })

  const header = (
    <PageHeader
      title="Reviews"
      description="Record book entries and weekly timesheets from the groups you supervise"
      actions={
        groups.length > 0 && (
          <Button
            onClick={approveSelected}
            disabled={selected.size === 0 || approve.isPending}
          >
            <Check />
            {approve.isPending
              ? 'Approving...'
              : selected.size > 0
                ? `Approve ${selected.size} selected`
                : 'Approve selected'}
          </Button>
        )
      }
    />
  )

  let body
  if (!actingUserId) {
    body = (
      <EmptyState
        title="Choose who you are"
        description='Pick a supervisor under "Acting as" in the sidebar.'
      />
    )
  } else if (error) {
    body = <ErrorState error={error} onRetry={() => refetch()} />
  } else if (isPending) {
    body = <Skeleton className="h-72 rounded-xl" />
  } else if (data.projects.length === 0) {
    body = (
      <EmptyState
        title="You don't review any groups"
        description="Supervisors and project owners review weekly timesheets."
      />
    )
  } else if (groups.length === 0 && meetingGroups.length === 0) {
    body = (
      <EmptyState
        title="Nothing to review"
        description="Submitted timesheets and record book entries from your groups will appear here."
      />
    )
  } else {
    body = (
      <>
        {meetingGroups.length > 0 && (
          <section className="flex flex-col gap-4">
            <h2 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Meeting records
            </h2>
            {meetingGroups.map(({ project, meetings }) => (
              <MeetingQueue
                key={project.id}
                project={project}
                meetings={meetings}
              />
            ))}
          </section>
        )}
        {groups.length > 0 && (
          <section className="flex flex-col gap-4">
            <h2 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Weekly timesheets
            </h2>
            {groups.map(({ project, timesheets }) => (
              <ProjectQueue
                key={project.id}
                project={project}
                timesheets={timesheets}
                selected={selected}
                onToggle={toggle}
              />
            ))}
          </section>
        )}
      </>
    )
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      {header}
      {body}
    </div>
  )
}

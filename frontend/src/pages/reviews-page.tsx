import { Check } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { ContributionTypeBadge } from '@/components/badges'
import { EntryActions } from '@/components/contributions/entry-actions'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { UserAvatar } from '@/components/user-avatar'
import { useApproveEntries, useReviewQueue } from '@/hooks/queries'
import { useActingUserId } from '@/lib/acting-user'
import { errorMessage } from '@/lib/api'
import {
  academicWeekLabel,
  displayName,
  formatHours,
  formatWeekRange,
} from '@/lib/format'
import type { ReviewQueue } from '@/lib/types'

type QueueEntry = ReviewQueue['entries'][number]
type QueueProject = ReviewQueue['projects'][number]

const REVIEW_PERMISSIONS = { canEdit: false, canReview: true }

function ProjectQueue({
  project,
  entries,
  selected,
  onToggle,
}: {
  project: QueueProject
  entries: QueueEntry[]
  selected: Set<string>
  onToggle: (ids: string[], checked: boolean) => void
}) {
  const ids = entries.map((e) => e.id)
  const selectedCount = ids.filter((id) => selected.has(id)).length
  const totalHours = entries.reduce((sum, e) => sum + e.hours, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link
            to={`/projects/${project.id}/contributions`}
            className="hover:underline"
          >
            {project.name}
          </Link>
          <Badge variant="secondary" className="font-mono">
            {project.key}
          </Badge>
        </CardTitle>
        <CardDescription>
          {entries.length} pending · {formatHours(totalHours)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8">
                <Checkbox
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
              </TableHead>
              <TableHead>Student</TableHead>
              <TableHead>Week</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Hours</TableHead>
              <TableHead className="w-[40%]">Summary</TableHead>
              <TableHead className="w-10">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => (
              <TableRow
                key={entry.id}
                data-state={selected.has(entry.id) ? 'selected' : undefined}
              >
                <TableCell>
                  <Checkbox
                    aria-label={`Select ${displayName(entry.user)}, ${formatHours(entry.hours)}`}
                    checked={selected.has(entry.id)}
                    onCheckedChange={(checked) =>
                      onToggle([entry.id], checked === true)
                    }
                  />
                </TableCell>
                <TableCell>
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
                <TableCell>
                  <p>
                    {entry.academicWeek && project.teachingWeeks !== null
                      ? academicWeekLabel(
                          entry.academicWeek,
                          project.teachingWeeks,
                        )
                      : formatWeekRange(entry.weekStart)}
                  </p>
                  {entry.academicWeek && (
                    <p className="text-muted-foreground text-xs">
                      {formatWeekRange(entry.weekStart)}
                    </p>
                  )}
                </TableCell>
                <TableCell>
                  <ContributionTypeBadge type={entry.type} />
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums">
                  {formatHours(entry.hours)}
                </TableCell>
                <TableCell className="text-muted-foreground whitespace-normal">
                  {entry.task && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="outline" className="mr-1.5 font-mono">
                          {entry.task.key}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>{entry.task.title}</TooltipContent>
                    </Tooltip>
                  )}
                  {entry.description}
                </TableCell>
                <TableCell>
                  <EntryActions
                    projectId={project.id}
                    entry={entry}
                    permissions={REVIEW_PERMISSIONS}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

export function ReviewsPage() {
  const actingUserId = useActingUserId()
  const { data, error, isPending, refetch } = useReviewQueue()
  const approve = useApproveEntries()
  const [selection, setSelection] = useState<Set<string>>(new Set())

  // Group by project, then by student so one person's weeks sit together.
  const groups = useMemo(() => {
    if (!data) return []
    return data.projects
      .map((project) => ({
        project,
        entries: data.entries
          .filter((e) => e.project.id === project.id)
          .sort(
            (a, b) =>
              displayName(a.user).localeCompare(displayName(b.user)) ||
              a.weekStart.localeCompare(b.weekStart),
          ),
      }))
      .filter((group) => group.entries.length > 0)
  }, [data])

  // Drop ids that left the queue (approved elsewhere or after a refetch).
  const selected = useMemo(() => {
    const live = new Set(data?.entries.map((e) => e.id))
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
          `Approved ${approved} ${approved === 1 ? 'entry' : 'entries'}`,
        )
        setSelection(new Set())
      },
      onError: (e) => toast.error(errorMessage(e)),
    })

  const header = (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reviews</h1>
        <p className="text-muted-foreground text-sm">
          Pending weekly contributions from the groups you supervise
        </p>
      </div>
      {groups.length > 0 && (
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
      )}
    </div>
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
        description="Supervisors and project owners review weekly contributions."
      />
    )
  } else if (groups.length === 0) {
    body = (
      <EmptyState
        title="Nothing to review"
        description="New entries from your groups will appear here."
      />
    )
  } else {
    body = groups.map(({ project, entries }) => (
      <ProjectQueue
        key={project.id}
        project={project}
        entries={entries}
        selected={selected}
        onToggle={toggle}
      />
    ))
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      {header}
      {body}
    </div>
  )
}

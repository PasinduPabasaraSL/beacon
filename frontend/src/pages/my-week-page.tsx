import { ArrowRight, ClipboardCheck, Lock, Plus } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import {
  ContributionTypeBadge,
  MilestoneStatusBadge,
  PriorityBadge,
} from '@/components/badges'
import { ContributionFormDialog } from '@/components/contributions/contribution-form-dialog'
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
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { useMyWeek } from '@/hooks/queries'
import { useActingUserId } from '@/lib/acting-user'
import {
  academicWeekLabel,
  daysUntil,
  displayName,
  formatDate,
  formatDueIn,
  formatHours,
  formatWeekRange,
  REVIEW_STYLES,
} from '@/lib/format'
import type { ContributionWithProject, MyWeek } from '@/lib/types'
import { cn } from '@/lib/utils'

type WeekProject = MyWeek['projects'][number]

function CheckInCard({
  project,
  primary,
  onLog,
}: {
  project: WeekProject
  primary: boolean
  onLog: () => void
}) {
  const week = project.academicWeek
  const isBreak = !!week && week.kind !== 'TEACHING'
  const logged = project.entryCount > 0

  return (
    <Card className="gap-4">
      <CardHeader>
        <CardDescription className="flex items-center gap-2">
          <Badge variant="secondary" className="font-mono">
            {project.key}
          </Badge>
          {week && project.teachingWeeks !== null
            ? academicWeekLabel(week, project.teachingWeeks)
            : 'This week'}
        </CardDescription>
        <CardTitle className="truncate">{project.name}</CardTitle>
      </CardHeader>
      <CardContent className="flex items-end justify-between gap-3">
        <div>
          <p
            className={cn(
              'text-2xl font-semibold tabular-nums',
              !logged && 'text-muted-foreground',
            )}
          >
            {formatHours(project.hours)}
          </p>
          <p className="text-muted-foreground text-xs">
            {logged
              ? `${project.entryCount} ${project.entryCount === 1 ? 'entry' : 'entries'} this week`
              : isBreak
                ? 'Break week, logging is optional'
                : 'Not logged yet'}
          </p>
        </div>
        <Button
          variant={primary ? 'default' : 'outline'}
          size="sm"
          onClick={onLog}
        >
          <Plus /> Log hours
        </Button>
      </CardContent>
    </Card>
  )
}

function ChangesRequested({
  entries,
  onEdit,
}: {
  entries: ContributionWithProject[]
  onEdit: (entry: ContributionWithProject) => void
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Needs your changes</CardTitle>
        <CardDescription>
          A reviewer asked you to update these entries. Saving sends them back
          for review.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="divide-y">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-start"
            >
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
                  <Badge variant="secondary" className="font-mono">
                    {entry.project.key}
                  </Badge>
                  {formatWeekRange(entry.weekStart)}
                  <ContributionTypeBadge type={entry.type} />
                  <span className="text-foreground font-medium tabular-nums">
                    {formatHours(entry.hours)}
                  </span>
                </div>
                <p className="text-sm">{entry.description}</p>
                {entry.reviewComment && (
                  <p
                    className={cn(
                      'rounded-md border px-3 py-2 text-sm',
                      REVIEW_STYLES.CHANGES_REQUESTED,
                    )}
                  >
                    <span className="font-medium">
                      {entry.reviewedBy
                        ? displayName(entry.reviewedBy)
                        : 'Reviewer'}
                      :{' '}
                    </span>
                    {entry.reviewComment}
                  </p>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={() => onEdit(entry)}>
                Edit entry
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

function MyTasks({ tasks }: { tasks: MyWeek['tasks'] }) {
  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>My tasks</CardTitle>
        <CardDescription>
          Open tasks assigned to you, soonest first
        </CardDescription>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <EmptyState
            title="No open tasks assigned to you"
            description="Pick up a task from your project board."
          />
        ) : (
          <ul className="divide-y">
            {tasks.map((task) => {
              const overdue = !!task.dueDate && daysUntil(task.dueDate) < 0
              return (
                <li key={task.id}>
                  <Link
                    to={`/projects/${task.project.id}/board`}
                    className="hover:bg-muted/30 focus-visible:ring-ring -mx-2 flex flex-col gap-1 rounded-md px-2 py-3 outline-none focus-visible:ring-2 sm:flex-row sm:items-center sm:gap-4"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <Badge variant="outline" className="shrink-0 font-mono">
                        {task.key}
                      </Badge>
                      <span className="truncate text-sm font-medium">
                        {task.title}
                      </span>
                    </div>
                    <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
                      {task.openBlockers.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Lock className="size-3.5" />
                          Blocked by {task.openBlockers.join(', ')}
                        </span>
                      )}
                      <PriorityBadge priority={task.priority} />
                      <span>{task.status.name}</span>
                      {task.dueDate && (
                        <span
                          className={cn(
                            overdue && 'text-destructive font-medium',
                          )}
                        >
                          {formatDueIn(task.dueDate)}
                        </span>
                      )}
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

function UpcomingMilestones({
  milestones,
}: {
  milestones: MyWeek['milestones']
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Coming up</CardTitle>
        <CardDescription>Next assessed deliverables</CardDescription>
      </CardHeader>
      <CardContent>
        {milestones.length === 0 ? (
          <EmptyState title="No upcoming milestones" />
        ) : (
          <ul className="flex flex-col gap-4">
            {milestones.map((m) => {
              const percent =
                m.taskCount === 0
                  ? 0
                  : Math.round((m.doneCount / m.taskCount) * 100)
              return (
                <li key={m.id}>
                  <Link
                    to={`/projects/${m.project.id}/timeline`}
                    className="hover:bg-muted/30 focus-visible:ring-ring -mx-2 flex flex-col gap-1.5 rounded-md px-2 py-1.5 outline-none focus-visible:ring-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium">
                        {m.title}
                      </span>
                      {m.status === 'OVERDUE' && (
                        <MilestoneStatusBadge status={m.status} />
                      )}
                    </div>
                    <p className="text-muted-foreground text-xs">
                      <span className="font-mono">{m.project.key}</span> ·{' '}
                      {formatDate(m.dueDate)} · {formatDueIn(m.dueDate)}
                    </p>
                    <Progress value={percent} />
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

export function MyWeekPage() {
  const actingUserId = useActingUserId()
  const { data, error, isPending, refetch } = useMyWeek()
  const [logProjectId, setLogProjectId] = useState<string | null>(null)
  const [editing, setEditing] = useState<ContributionWithProject | null>(null)

  if (!actingUserId) {
    return (
      <div className="mx-auto max-w-6xl">
        <EmptyState
          title="Choose who you are"
          description='Pick a user under "Acting as" in the sidebar to see your week.'
        />
      </div>
    )
  }
  if (error) return <ErrorState error={error} onRetry={() => refetch()} />
  if (isPending) {
    return (
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <Skeleton className="h-14 w-72" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-36 rounded-xl" />
          <Skeleton className="h-36 rounded-xl" />
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }

  const loggable = data.projects.filter((p) => p.canLog)
  const firstToLog = loggable.find(
    (p) => p.entryCount === 0 && p.academicWeek?.kind !== 'BREAK',
  )
  const headline = data.projects.find((p) => p.academicWeek)
  const weekStart = data.weekStart.slice(0, 10)

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-muted-foreground text-sm">
            {headline?.academicWeek && headline.teachingWeeks !== null
              ? [
                  headline.semesterName,
                  academicWeekLabel(
                    headline.academicWeek,
                    headline.teachingWeeks,
                  ),
                ]
                  .filter(Boolean)
                  .join(' · ')
              : formatWeekRange(data.weekStart)}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">My week</h1>
          {headline?.academicWeek && (
            <p className="text-muted-foreground text-sm">
              {formatWeekRange(data.weekStart)}
            </p>
          )}
        </div>
        {loggable.length > 0 && (
          <div className="text-right">
            <p className="text-2xl font-semibold tabular-nums">
              {formatHours(data.totalHours)}
            </p>
            <p className="text-muted-foreground text-xs">logged this week</p>
          </div>
        )}
      </div>

      {data.pendingReviews > 0 && (
        <Card className="py-4">
          <CardContent className="flex items-center gap-3 px-4">
            <ClipboardCheck className="text-muted-foreground size-4" />
            <p className="flex-1 text-sm">
              {data.pendingReviews}{' '}
              {data.pendingReviews === 1 ? 'entry is' : 'entries are'} waiting
              for your review.
            </p>
            <Button variant="outline" size="sm" asChild>
              <Link to="/reviews">
                Review <ArrowRight />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {loggable.length > 0 && (
        <section className="flex flex-col gap-3">
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Weekly check-in
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {loggable.map((project) => (
              <CheckInCard
                key={project.id}
                project={project}
                primary={project.id === firstToLog?.id}
                onLog={() => setLogProjectId(project.id)}
              />
            ))}
          </div>
        </section>
      )}

      {data.changesRequested.length > 0 && (
        <ChangesRequested entries={data.changesRequested} onEdit={setEditing} />
      )}

      {data.projects.length === 0 ? (
        <EmptyState
          title="You are not in any project yet"
          description="Ask your team lead or lecturer to add you to a group."
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <MyTasks tasks={data.tasks} />
          <UpcomingMilestones milestones={data.milestones} />
        </div>
      )}

      {logProjectId && (
        <ContributionFormDialog
          projectId={logProjectId}
          week={weekStart}
          open
          onOpenChange={(open) => !open && setLogProjectId(null)}
        />
      )}
      {editing && (
        <ContributionFormDialog
          projectId={editing.project.id}
          week={editing.weekStart.slice(0, 10)}
          entry={editing}
          open
          onOpenChange={(open) => !open && setEditing(null)}
        />
      )}
    </div>
  )
}

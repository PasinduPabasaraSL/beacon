import { AlertTriangle } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { ErrorState, LoadingBlocks } from '@/components/query-state'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { UserAvatar } from '@/components/user-avatar'
import { useDashboard } from '@/hooks/queries'
import {
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  CONTRIBUTION_TYPE_COLORS,
  CONTRIBUTION_TYPE_LABELS,
  displayName,
  formatDate,
  formatHours,
  ROLE_LABELS,
} from '@/lib/format'
import type {
  ContributionType,
  ProjectDashboard,
  StatusCategory,
} from '@/lib/types'
import { cn } from '@/lib/utils'

function percentOf(part: number, whole: number): number {
  return whole === 0 ? 0 : Math.round((part / whole) * 100)
}

function StatCard({
  label,
  value,
  detail,
  children,
}: {
  label: string
  value: ReactNode
  detail?: ReactNode
  children?: ReactNode
}) {
  return (
    <Card className="gap-3 py-5">
      <CardHeader className="px-5">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
      <CardContent className="text-muted-foreground flex flex-col gap-2 px-5 text-xs">
        {children}
        {detail}
      </CardContent>
    </Card>
  )
}

function StatusBreakdown({
  progress,
}: {
  progress: ProjectDashboard['progress']
}) {
  const categories = Object.keys(CATEGORY_LABELS) as StatusCategory[]
  return (
    <Card>
      <CardHeader>
        <CardTitle>Task status</CardTitle>
        <CardDescription>
          {progress.total} tasks in this project
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="bg-muted flex h-3 overflow-hidden rounded-full">
          {categories.map((category) => (
            <div
              key={category}
              className={CATEGORY_COLORS[category]}
              style={{
                width: `${percentOf(progress.byCategory[category], progress.total)}%`,
              }}
            />
          ))}
        </div>
        <ul className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
          {categories.map((category) => (
            <li key={category} className="flex items-center gap-2">
              <span
                className={cn(
                  'size-2.5 rounded-full',
                  CATEGORY_COLORS[category],
                )}
              />
              <span className="text-muted-foreground">
                {CATEGORY_LABELS[category]}
              </span>
              <span className="ml-auto font-medium tabular-nums">
                {progress.byCategory[category]}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

function HoursByType({
  hoursByType,
}: {
  hoursByType: ProjectDashboard['hoursByType']
}) {
  const types = Object.keys(CONTRIBUTION_TYPE_LABELS) as ContributionType[]
  const max = Math.max(...types.map((t) => hoursByType[t]), 1)
  return (
    <Card>
      <CardHeader>
        <CardTitle>Hours by contribution type</CardTitle>
        <CardDescription>Self-reported, last 4 weeks</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2.5">
        {types.map((type) => (
          <div key={type} className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground w-28 shrink-0">
              {CONTRIBUTION_TYPE_LABELS[type]}
            </span>
            <div className="bg-muted h-2 flex-1 overflow-hidden rounded-full">
              <div
                className={cn(
                  'h-full rounded-full',
                  CONTRIBUTION_TYPE_COLORS[type],
                )}
                style={{ width: `${(hoursByType[type] / max) * 100}%` }}
              />
            </div>
            <span className="w-12 text-right font-medium tabular-nums">
              {formatHours(hoursByType[type])}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function WeeklyTrend({
  weeklyHours,
}: {
  weeklyHours: ProjectDashboard['weeklyHours']
}) {
  const max = Math.max(...weeklyHours.map((w) => w.hours), 1)
  return (
    <Card>
      <CardHeader>
        <CardTitle>Team hours per week</CardTitle>
        <CardDescription>Self-reported contributions</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex h-40 items-end gap-4">
          {weeklyHours.map((week, index) => {
            const isCurrent = index === weeklyHours.length - 1
            return (
              <div
                key={week.weekStart}
                className="flex h-full flex-1 flex-col items-center justify-end gap-1.5"
              >
                <span className="text-xs font-medium tabular-nums">
                  {formatHours(week.hours)}
                </span>
                <div
                  className={cn(
                    'w-full max-w-12 rounded-t-md',
                    isCurrent ? 'bg-primary' : 'bg-primary/30',
                  )}
                  style={{
                    height: `${Math.max((week.hours / max) * 100, 2)}%`,
                  }}
                />
                <span className="text-muted-foreground text-xs">
                  {isCurrent ? 'This week' : formatDate(week.weekStart)}
                </span>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

function WorkloadTable({
  workload,
}: {
  workload: ProjectDashboard['workload']
}) {
  const maxHours = Math.max(...workload.map((w) => w.hoursLast4Weeks), 1)
  return (
    <Card>
      <CardHeader>
        <CardTitle>Team workload</CardTitle>
        <CardDescription>
          Assigned tasks and self-reported hours per member
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead className="text-right">Open tasks</TableHead>
              <TableHead className="text-right">Done</TableHead>
              <TableHead className="text-right">This week</TableHead>
              <TableHead className="w-48">Last 4 weeks</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {workload.map((row) => (
              <TableRow key={row.user.id}>
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <UserAvatar user={row.user} size="sm" withTooltip={false} />
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {displayName(row.user)}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {ROLE_LABELS[row.role]}
                      </span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {row.openTasks}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {row.doneTasks}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatHours(row.hoursThisWeek)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="bg-muted h-2 flex-1 overflow-hidden rounded-full">
                      <div
                        className="bg-primary/70 h-full rounded-full"
                        style={{
                          width: `${(row.hoursLast4Weeks / maxHours) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="w-10 text-right text-sm tabular-nums">
                      {formatHours(row.hoursLast4Weeks)}
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

export function ProjectOverviewPage() {
  const { projectId = '' } = useParams()
  const { data, error, isPending, refetch } = useDashboard(projectId)

  if (isPending) return <LoadingBlocks count={6} />
  if (error) return <ErrorState error={error} onRetry={() => refetch()} />

  const { progress, activeSprint, workload, weeklyHours, overdueTasks } = data
  const hoursThisWeek = weeklyHours.at(-1)?.hours ?? 0
  const hoursLastWeek = weeklyHours.at(-2)?.hours ?? 0
  const loggedThisWeek = workload.filter((w) => w.hoursThisWeek > 0).length
  const contributors = workload.filter(
    (w) => w.role === 'OWNER' || w.role === 'MEMBER',
  ).length

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Overall progress"
          value={`${percentOf(progress.done, progress.total)}%`}
          detail={`${progress.done} of ${progress.total} tasks done`}
        >
          <Progress value={percentOf(progress.done, progress.total)} />
        </StatCard>

        {activeSprint ? (
          <StatCard
            label={`Active sprint · ${activeSprint.name}`}
            value={`${activeSprint.doneTasks}/${activeSprint.totalTasks}`}
            detail={`${activeSprint.daysRemaining} days left · ends ${formatDate(activeSprint.endDate)}`}
          >
            <Progress
              value={percentOf(activeSprint.doneTasks, activeSprint.totalTasks)}
            />
          </StatCard>
        ) : (
          <StatCard
            label="Active sprint"
            value="None"
            detail="No sprint is running"
          />
        )}

        <StatCard
          label="Hours this week"
          value={formatHours(hoursThisWeek)}
          detail={`${formatHours(hoursLastWeek)} last week · ${loggedThisWeek} of ${contributors} members logged`}
        />

        <StatCard
          label="Overdue tasks"
          value={
            <span className={cn(overdueTasks.length > 0 && 'text-red-600')}>
              {overdueTasks.length}
            </span>
          }
          detail={
            overdueTasks.length > 0
              ? 'Past their due date and not done'
              : 'Nothing overdue'
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <StatusBreakdown progress={progress} />
        <WeeklyTrend weeklyHours={weeklyHours} />
      </div>

      <WorkloadTable workload={workload} />

      <div className="grid gap-4 lg:grid-cols-2">
        <HoursByType hoursByType={data.hoursByType} />
        <Card>
          <CardHeader>
            <CardTitle>Overdue</CardTitle>
            <CardDescription>Tasks past their due date</CardDescription>
          </CardHeader>
          <CardContent>
            {overdueTasks.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No overdue tasks. Nice.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {overdueTasks.map((task) => (
                  <li key={task.id} className="flex items-center gap-2 text-sm">
                    <AlertTriangle className="size-4 shrink-0 text-red-600" />
                    <Badge variant="outline" className="font-mono">
                      {task.key}
                    </Badge>
                    <span className="truncate">{task.title}</span>
                    <span className="ml-auto shrink-0 text-xs text-red-600">
                      due {formatDate(task.dueDate)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <Link
              to="board"
              className="text-muted-foreground mt-4 inline-block text-sm underline-offset-4 hover:underline"
            >
              Open board
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

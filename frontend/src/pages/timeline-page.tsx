import { CalendarCog, Plus } from 'lucide-react'
import { useState } from 'react'
import { useParams } from 'react-router'
import { MilestoneStatusBadge } from '@/components/badges'
import { EmptyState, ErrorState } from '@/components/query-state'
import {
  MilestoneActions,
  MilestoneFormDialog,
} from '@/components/timeline/milestone-dialogs'
import { SemesterFormDialog } from '@/components/timeline/semester-form-dialog'
import { SemesterStrip } from '@/components/timeline/semester-strip'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useMe, useMilestones, useProject, useSemester } from '@/hooks/queries'
import { useActingUserId } from '@/lib/acting-user'
import {
  academicWeekLabel,
  findAcademicWeek,
  formatDate,
  formatDueIn,
  isoWeekStart,
} from '@/lib/format'
import type {
  Milestone,
  ProjectRole,
  Semester,
  WorkspaceRole,
} from '@/lib/types'
import { cn } from '@/lib/utils'

const PLANNING_ROLES: ProjectRole[] = ['OWNER', 'SUPERVISOR']
const WORKSPACE_ADMIN_ROLES: WorkspaceRole[] = ['OWNER', 'ADMIN']

function MilestoneRow({
  projectId,
  milestone,
  semester,
  canPlan,
}: {
  projectId: string
  milestone: Milestone
  semester: Semester | null
  canPlan: boolean
}) {
  const week = findAcademicWeek(
    semester,
    isoWeekStart(new Date(milestone.dueDate)),
  )
  const percent =
    milestone.taskCount === 0
      ? 0
      : Math.round((milestone.doneCount / milestone.taskCount) * 100)

  return (
    <li className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:gap-6">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium">{milestone.title}</p>
          <MilestoneStatusBadge status={milestone.status} />
        </div>
        {milestone.description && (
          <p className="text-muted-foreground mt-0.5 text-sm">
            {milestone.description}
          </p>
        )}
        {milestone.tasks.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {milestone.tasks.map((task) => (
              <Tooltip key={task.id}>
                <TooltipTrigger asChild>
                  <Badge
                    variant="outline"
                    className={cn(
                      'font-mono',
                      task.done && 'text-muted-foreground line-through',
                    )}
                  >
                    {task.key}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  {task.title}
                  {task.done && ' · done'}
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        )}
      </div>

      <div className="text-sm sm:w-44 sm:text-right">
        <p className="font-medium">{formatDate(milestone.dueDate, true)}</p>
        <p className="text-muted-foreground text-xs">
          {week && semester
            ? `${academicWeekLabel(week, semester.teachingWeeks)} · `
            : ''}
          {milestone.status === 'COMPLETE'
            ? 'Complete'
            : formatDueIn(milestone.dueDate)}
        </p>
      </div>

      <div className="flex items-center gap-2 sm:w-40">
        <div className="flex-1">
          <Progress value={percent} />
          <p className="text-muted-foreground mt-1 text-xs">
            {milestone.taskCount === 0
              ? 'No tasks linked'
              : `${milestone.doneCount} of ${milestone.taskCount} tasks done`}
          </p>
        </div>
        {canPlan && (
          <MilestoneActions projectId={projectId} milestone={milestone} />
        )}
      </div>
    </li>
  )
}

export function TimelinePage() {
  const { projectId = '' } = useParams()
  const actingUserId = useActingUserId()
  const [semesterOpen, setSemesterOpen] = useState(false)
  const [milestoneOpen, setMilestoneOpen] = useState(false)

  const { data: project } = useProject(projectId)
  const { data: me } = useMe()
  const semesterQuery = useSemester(project?.workspace.id)
  const milestonesQuery = useMilestones(projectId)

  const role = project?.members.find((m) => m.id === actingUserId)?.role
  const canPlan = !!role && PLANNING_ROLES.includes(role)
  const workspaceRole = me?.workspaces.find(
    (w) => w.id === project?.workspace.id,
  )?.role
  const canEditSemester =
    !!workspaceRole && WORKSPACE_ADMIN_ROLES.includes(workspaceRole)

  const semester = semesterQuery.data?.semester ?? null
  const milestones = milestonesQuery.data ?? []
  const current = semester?.currentWeek

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{semester?.name ?? 'Semester'}</CardTitle>
          <CardDescription>
            {semester
              ? [
                  current
                    ? `${academicWeekLabel(current, semester.teachingWeeks)} this week`
                    : 'Outside the semester this week',
                  `starts ${formatDate(semester.startDate, true)}`,
                  `shared by all groups in ${semesterQuery.data?.workspace.name}`,
                ].join(' · ')
              : 'Teaching weeks, breaks and exams for this module'}
          </CardDescription>
          {semester && canEditSemester && (
            <CardAction>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSemesterOpen(true)}
              >
                <CalendarCog /> Edit semester
              </Button>
            </CardAction>
          )}
        </CardHeader>
        <CardContent>
          {semesterQuery.error ? (
            <ErrorState
              error={semesterQuery.error}
              onRetry={() => semesterQuery.refetch()}
            />
          ) : semesterQuery.isPending ? (
            <Skeleton className="h-10" />
          ) : semester ? (
            <SemesterStrip semester={semester} milestones={milestones} />
          ) : (
            <EmptyState
              title="No semester calendar yet"
              description={
                canEditSemester
                  ? 'Set the teaching weeks so weekly logs and milestones line up with the semester.'
                  : 'A workspace admin, usually the lecturer, sets the teaching weeks.'
              }
              action={
                canEditSemester && (
                  <Button
                    variant="outline"
                    onClick={() => setSemesterOpen(true)}
                  >
                    <CalendarCog /> Set up semester
                  </Button>
                )
              }
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Milestones</CardTitle>
          <CardDescription>
            Assessed deliverables and how far their tasks are.
          </CardDescription>
          {canPlan && (
            <CardAction>
              <Button onClick={() => setMilestoneOpen(true)}>
                <Plus /> Add milestone
              </Button>
            </CardAction>
          )}
        </CardHeader>
        <CardContent>
          {milestonesQuery.error ? (
            <ErrorState
              error={milestonesQuery.error}
              onRetry={() => milestonesQuery.refetch()}
            />
          ) : milestonesQuery.isPending ? (
            <div className="flex flex-col gap-3">
              <Skeleton className="h-14" />
              <Skeleton className="h-14" />
            </div>
          ) : milestones.length === 0 ? (
            <EmptyState
              title="No milestones yet"
              description={
                canPlan
                  ? 'Add the assessed deliverables, like the proposal or final report.'
                  : 'The project owner or supervisor adds assessed deliverables here.'
              }
            />
          ) : (
            <ul className="divide-y">
              {milestones.map((milestone) => (
                <MilestoneRow
                  key={milestone.id}
                  projectId={projectId}
                  milestone={milestone}
                  semester={semester}
                  canPlan={canPlan}
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {project && (
        <SemesterFormDialog
          workspaceId={project.workspace.id}
          workspaceName={project.workspace.name}
          semester={semester}
          open={semesterOpen}
          onOpenChange={setSemesterOpen}
        />
      )}
      <MilestoneFormDialog
        projectId={projectId}
        open={milestoneOpen}
        onOpenChange={setMilestoneOpen}
      />
    </div>
  )
}

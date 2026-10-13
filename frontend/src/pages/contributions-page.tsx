import {
  CalendarCheck2,
  ChevronLeft,
  ChevronRight,
  CopyPlus,
  Lock,
  MessageSquareWarning,
  Plus,
  Send,
  Undo2,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useParams, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { TimesheetStatusBadge } from '@/components/badges'
import { EmptyState, ErrorState } from '@/components/query-state'
import { LogTimeDialog } from '@/components/timesheet/log-time-dialog'
import { ReviewActions } from '@/components/timesheet/review-actions'
import { TeamView } from '@/components/timesheet/team-view'
import { TimeLog } from '@/components/timesheet/time-log'
import { TimesheetGrid } from '@/components/timesheet/timesheet-grid'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { UserAvatar } from '@/components/user-avatar'
import {
  useCopyLastWeek,
  useProject,
  useSemester,
  useSubmitTimesheet,
  useTimesheets,
} from '@/hooks/queries'
import { useActingUserId } from '@/lib/acting-user'
import { errorMessage } from '@/lib/api'
import {
  academicWeekLabel,
  displayName,
  findAcademicWeek,
  formatDate,
  formatHours,
  formatWeekRange,
  isoWeekStart,
  localToday,
  shiftWeek,
} from '@/lib/format'
import {
  EDITABLE_STATUSES,
  LOGGING_ROLES,
  REVIEWER_ROLES,
  teamMembers,
  type TimesheetMember,
} from '@/lib/timesheet'
import { cn } from '@/lib/utils'

type View = 'sheet' | 'team' | 'log'
const VIEWS: { value: View; label: string }[] = [
  { value: 'sheet', label: 'Timesheet' },
  { value: 'team', label: 'Team' },
  { value: 'log', label: 'Time log' },
]

function Banner({
  tone,
  icon,
  children,
}: {
  tone: 'warning' | 'info' | 'success'
  icon: ReactNode
  children: ReactNode
}) {
  return (
    <div
      role="status"
      className={cn(
        'flex items-start gap-3 rounded-lg border px-4 py-3 text-sm [&>svg]:mt-0.5 [&>svg]:size-4 [&>svg]:shrink-0',
        tone === 'warning' &&
          'border-warning/35 bg-warning-soft text-warning-foreground',
        tone === 'info' && 'border-info/30 bg-info-soft text-info-foreground',
        tone === 'success' &&
          'border-success/30 bg-success-soft text-success-foreground',
      )}
    >
      {icon}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}

function StatusBanner({
  member,
  isOwn,
}: {
  member: TimesheetMember
  isOwn: boolean
}) {
  const { timesheet } = member
  const reviewer = timesheet.reviewedBy
    ? displayName(timesheet.reviewedBy)
    : 'The reviewer'

  if (timesheet.status === 'CHANGES_REQUESTED') {
    return (
      <Banner tone="warning" icon={<MessageSquareWarning />}>
        <p>
          <span className="font-medium">{reviewer} requested changes</span>
          {timesheet.reviewComment && `: ${timesheet.reviewComment}`}
        </p>
        {isOwn && (
          <p className="mt-0.5 opacity-80">
            Update your hours, then submit the week again.
          </p>
        )}
      </Banner>
    )
  }
  if (timesheet.status === 'SUBMITTED') {
    return (
      <Banner tone="info" icon={<Send />}>
        Submitted
        {timesheet.submittedAt && ` on ${formatDate(timesheet.submittedAt)}`}
        {isOwn
          ? ' and waiting for your supervisor. Recall it if you need to change something.'
          : ` and waiting for review.`}
      </Banner>
    )
  }
  if (timesheet.status === 'APPROVED') {
    return (
      <Banner tone="success" icon={<Lock />}>
        Approved by {reviewer}
        {timesheet.reviewedAt && ` on ${formatDate(timesheet.reviewedAt)}`}.
        This week is locked.
      </Banner>
    )
  }
  return null
}

function SubmitActions({
  projectId,
  week,
  member,
}: {
  projectId: string
  week: string
  member: TimesheetMember
}) {
  const submit = useSubmitTimesheet(projectId)
  const { timesheet } = member
  const run = (action: 'submit' | 'recall') =>
    submit.mutate(
      { week, action },
      {
        onSuccess: () =>
          toast.success(
            action === 'submit'
              ? 'Week submitted for review'
              : 'Week recalled; you can edit it again',
          ),
        onError: (error) => toast.error(errorMessage(error)),
      },
    )

  if (timesheet.status === 'SUBMITTED') {
    return (
      <Button
        variant="outline"
        onClick={() => run('recall')}
        disabled={submit.isPending}
      >
        <Undo2 /> Recall
      </Button>
    )
  }
  if (!EDITABLE_STATUSES.includes(timesheet.status)) return null

  const empty = timesheet.totalHours === 0
  const button = (
    <Button onClick={() => run('submit')} disabled={empty || submit.isPending}>
      <Send />
      {timesheet.status === 'CHANGES_REQUESTED'
        ? 'Resubmit week'
        : 'Submit week'}
    </Button>
  )
  if (!empty) return button
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {/* Disabled buttons don't fire pointer events, so wrap for the tooltip. */}
        <span tabIndex={0}>{button}</span>
      </TooltipTrigger>
      <TooltipContent>Log some hours before submitting</TooltipContent>
    </Tooltip>
  )
}

function MemberPicker({
  members,
  value,
  actingUserId,
  onChange,
}: {
  members: TimesheetMember[]
  value: string
  actingUserId: string | null
  onChange: (userId: string) => void
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label="Timesheet of" className="h-10 min-w-56">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {members.map((m) => (
          <SelectItem key={m.user.id} value={m.user.id}>
            <UserAvatar user={m.user} size="sm" withTooltip={false} />
            <span className="font-medium">{displayName(m.user)}</span>
            {m.user.id === actingUserId && (
              <span className="text-muted-foreground">(you)</span>
            )}
            <span className="text-muted-foreground ml-auto pl-2 text-xs tabular-nums">
              {formatHours(m.timesheet.totalHours)}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function ContributionsPage() {
  const { projectId = '' } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const [logOpen, setLogOpen] = useState(false)
  const actingUserId = useActingUserId()
  const copyLastWeek = useCopyLastWeek(projectId)

  const today = localToday()
  const currentWeek = isoWeekStart(new Date(`${today}T00:00:00Z`))
  const requested = isoWeekStart(
    new Date(`${searchParams.get('week') ?? currentWeek}T00:00:00Z`),
  )
  const week = requested > currentWeek ? currentWeek : requested
  const isCurrentWeek = week === currentWeek
  const view: View =
    VIEWS.find((v) => v.value === searchParams.get('view'))?.value ?? 'sheet'

  const { data: project } = useProject(projectId)
  const { data, error, isPending, isFetching, refetch } = useTimesheets(
    projectId,
    week,
  )
  const semester = useSemester(project?.workspace.id).data?.semester
  const academicWeek = findAcademicWeek(semester, week)

  const actingRole = project?.members.find((m) => m.id === actingUserId)?.role
  const canLog = !!actingRole && LOGGING_ROLES.includes(actingRole)
  const isReviewer = !!actingRole && REVIEWER_ROLES.includes(actingRole)

  const members = data ? teamMembers(data) : []
  const memberId =
    searchParams.get('member') ??
    (canLog && actingUserId ? actingUserId : members[0]?.user.id)
  const member =
    members.find((m) => m.user.id === memberId) ?? members[0] ?? null
  const isOwn = !!member && member.user.id === actingUserId
  const editable =
    isOwn && canLog && EDITABLE_STATUSES.includes(member.timesheet.status)

  const updateParams = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams)
    for (const [key, value] of Object.entries(changes)) {
      if (value === null) next.delete(key)
      else next.set(key, value)
    }
    setSearchParams(next, { replace: true })
  }
  const goToWeek = (target: string) =>
    updateParams({ week: target === currentWeek ? null : target })
  const setView = (next: View) =>
    updateParams({ view: next === 'sheet' ? null : next })
  const openMember = (userId: string) =>
    updateParams({
      member: userId === actingUserId ? null : userId,
      view: null,
    })

  const copyRows = () => {
    if (!actingUserId) return
    copyLastWeek.mutate(
      { week, userId: actingUserId },
      {
        onSuccess: (count) =>
          count === 0
            ? toast.info('Last week had no rows to copy')
            : toast.success(
                `Copied ${count} ${count === 1 ? 'row' : 'rows'} from last week`,
              ),
        onError: (e) => toast.error(errorMessage(e)),
      },
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Previous week"
            onClick={() => goToWeek(shiftWeek(week, -1))}
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Next week"
            disabled={isCurrentWeek}
            onClick={() => goToWeek(shiftWeek(week, 1))}
          >
            <ChevronRight />
          </Button>
          <div className="ml-2">
            <p className="font-semibold">{formatWeekRange(week)}</p>
            <p className="text-muted-foreground text-xs">
              {isCurrentWeek ? 'This week' : 'Past week'}
              {academicWeek && semester && (
                <>
                  {' · '}
                  {academicWeekLabel(academicWeek, semester.teachingWeeks)}
                </>
              )}
            </p>
          </div>
          {!isCurrentWeek && (
            <Button
              variant="ghost"
              size="sm"
              className="ml-1"
              onClick={() => goToWeek(currentWeek)}
            >
              <CalendarCheck2 /> This week
            </Button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Tabs value={view} onValueChange={(v) => setView(v as View)}>
            <TabsList>
              {VIEWS.map((v) => (
                <TabsTrigger key={v.value} value={v.value}>
                  {v.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          {canLog && (
            <Button variant="outline" onClick={() => setLogOpen(true)}>
              <Plus /> Log time
            </Button>
          )}
        </div>
      </div>

      {error ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : isPending ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-14 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      ) : (
        <div className={cn('flex flex-col gap-4', isFetching && 'opacity-70')}>
          {view === 'team' && (
            <TeamView
              week={data}
              actingUserId={actingUserId}
              onOpen={openMember}
            />
          )}
          {view === 'log' && <TimeLog week={data} />}
          {view === 'sheet' &&
            (member ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <MemberPicker
                      members={members}
                      value={member.user.id}
                      actingUserId={actingUserId}
                      onChange={openMember}
                    />
                    <TimesheetStatusBadge status={member.timesheet.status} />
                    {!isOwn && (
                      <span className="text-muted-foreground text-xs">
                        Read only
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="text-right">
                      <p className="text-xl leading-tight font-semibold tabular-nums">
                        {formatHours(member.timesheet.totalHours)}
                      </p>
                      <p className="text-muted-foreground text-xs">this week</p>
                    </div>
                    {editable && member.timesheet.rows.length === 0 && (
                      <Button
                        variant="ghost"
                        onClick={copyRows}
                        disabled={copyLastWeek.isPending}
                      >
                        <CopyPlus /> Copy last week's rows
                      </Button>
                    )}
                    {isOwn && canLog && (
                      <SubmitActions
                        projectId={projectId}
                        week={week}
                        member={member}
                      />
                    )}
                    {!isOwn && isReviewer && member.timesheet.id && (
                      <ReviewActions
                        projectId={projectId}
                        timesheet={{
                          ...member.timesheet,
                          id: member.timesheet.id,
                        }}
                        user={member.user}
                      />
                    )}
                  </div>
                </div>

                <StatusBanner member={member} isOwn={isOwn} />

                <TimesheetGrid
                  projectId={projectId}
                  week={week}
                  days={data.days}
                  timesheet={member.timesheet}
                  editable={editable}
                />

                {editable && (
                  <p className="text-muted-foreground text-xs">
                    Type hours as 1.5, 1:30 or 90m. Enter moves down a row.
                    Hours are self-reported and reviewed weekly by your
                    supervisor; GitHub activity is never counted as hours.
                  </p>
                )}
              </>
            ) : (
              <EmptyState
                title="Nobody logs time on this project yet"
                description="Owners and members fill in a weekly timesheet."
              />
            ))}
        </div>
      )}

      <LogTimeDialog
        projectId={projectId}
        defaultDate={isCurrentWeek ? today : week}
        open={logOpen}
        onOpenChange={setLogOpen}
      />
    </div>
  )
}

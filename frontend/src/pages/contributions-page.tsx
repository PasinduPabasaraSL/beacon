import {
  ChevronLeft,
  ChevronRight,
  Info,
  MessageSquare,
  Plus,
} from 'lucide-react'
import { useState } from 'react'
import { useParams, useSearchParams } from 'react-router'
import { ContributionTypeBadge, ReviewBadge } from '@/components/badges'
import { ContributionFormDialog } from '@/components/contributions/contribution-form-dialog'
import {
  EntryActions,
  type EntryPermissions,
} from '@/components/contributions/entry-actions'
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
import { useContributions, useProject, useSemester } from '@/hooks/queries'
import { useActingUserId } from '@/lib/acting-user'
import {
  academicWeekLabel,
  displayName,
  findAcademicWeek,
  formatHours,
  formatWeekRange,
  isoWeekStart,
  ROLE_LABELS,
  shiftWeek,
} from '@/lib/format'
import type {
  ContributionEntry,
  ProjectRole,
  WeeklyContributions,
} from '@/lib/types'
import { cn } from '@/lib/utils'

const LOGGING_ROLES: ProjectRole[] = ['OWNER', 'MEMBER']
const REVIEWER_ROLES: ProjectRole[] = ['SUPERVISOR', 'OWNER']

function MemberTotals({
  members,
  actingUserId,
}: {
  members: WeeklyContributions['members']
  actingUserId: string | null
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {members.map((member) => (
        <Card
          key={member.user.id}
          className={cn(
            'gap-0 py-4',
            member.user.id === actingUserId && 'border-primary/40',
          )}
        >
          <CardContent className="flex items-center gap-3 px-4">
            <UserAvatar user={member.user} withTooltip={false} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {displayName(member.user)}
                {member.user.id === actingUserId && (
                  <span className="text-muted-foreground font-normal">
                    {' '}
                    (you)
                  </span>
                )}
              </p>
              <p className="text-muted-foreground text-xs">
                {ROLE_LABELS[member.role]}
              </p>
            </div>
            <div className="text-right">
              <p
                className={cn(
                  'text-lg font-semibold tabular-nums',
                  member.hours === 0 && 'text-muted-foreground',
                )}
              >
                {formatHours(member.hours)}
              </p>
              <p className="text-muted-foreground text-xs">
                {member.entryCount}{' '}
                {member.entryCount === 1 ? 'entry' : 'entries'}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function EntriesTable({
  projectId,
  entries,
  permissionsFor,
}: {
  projectId: string
  entries: ContributionEntry[]
  permissionsFor: (entry: ContributionEntry) => EntryPermissions
}) {
  if (entries.length === 0) {
    return (
      <EmptyState
        title="No contributions logged this week"
        description="Students record their hours weekly, so a quiet week is fine."
      />
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Member</TableHead>
          <TableHead>Type</TableHead>
          <TableHead className="text-right">Hours</TableHead>
          <TableHead>Task</TableHead>
          <TableHead className="w-[35%]">Summary</TableHead>
          <TableHead>Review</TableHead>
          <TableHead className="w-10">
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map((entry) => {
          const permissions = permissionsFor(entry)
          return (
            <TableRow key={entry.id}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <UserAvatar user={entry.user} size="sm" withTooltip={false} />
                  <span className="font-medium">{displayName(entry.user)}</span>
                </div>
              </TableCell>
              <TableCell>
                <ContributionTypeBadge type={entry.type} />
              </TableCell>
              <TableCell className="text-right font-medium tabular-nums">
                {formatHours(entry.hours)}
              </TableCell>
              <TableCell>
                {entry.task ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="outline" className="font-mono">
                        {entry.task.key}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>{entry.task.title}</TooltipContent>
                  </Tooltip>
                ) : (
                  <span className="text-muted-foreground text-xs">—</span>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground whitespace-normal">
                {entry.description}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1.5">
                  <ReviewBadge status={entry.reviewStatus} />
                  {entry.reviewComment && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          aria-label="Reviewer comment"
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <MessageSquare className="size-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-64">
                        {entry.reviewedBy && (
                          <span className="font-medium">
                            {displayName(entry.reviewedBy)}:{' '}
                          </span>
                        )}
                        {entry.reviewComment}
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </TableCell>
              <TableCell>
                {(permissions.canEdit || permissions.canReview) && (
                  <EntryActions
                    projectId={projectId}
                    entry={entry}
                    permissions={permissions}
                  />
                )}
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}

export function ContributionsPage() {
  const { projectId = '' } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const [logOpen, setLogOpen] = useState(false)
  const actingUserId = useActingUserId()

  const currentWeek = isoWeekStart(new Date())
  const week = isoWeekStart(
    new Date(`${searchParams.get('week') ?? currentWeek}T00:00:00Z`),
  )
  const isCurrentWeek = week === currentWeek

  const { data: project } = useProject(projectId)
  const { data, error, isPending, isFetching, refetch } = useContributions(
    projectId,
    week,
  )
  const semester = useSemester(project?.workspace.id).data?.semester
  const academicWeek = findAcademicWeek(semester, week)

  const actingRole = project?.members.find((m) => m.id === actingUserId)?.role
  const canLog = !!actingRole && LOGGING_ROLES.includes(actingRole)
  const canReview = !!actingRole && REVIEWER_ROLES.includes(actingRole)
  const logDisabledReason = !actingUserId
    ? 'Choose a user under "Acting as" in the sidebar first'
    : !canLog
      ? 'Only project owners and members can log hours'
      : null

  const permissionsFor = (entry: ContributionEntry): EntryPermissions => {
    const isAuthor = entry.user.id === actingUserId
    return {
      canEdit: isAuthor && entry.reviewStatus !== 'APPROVED',
      canReview: canReview && !isAuthor,
    }
  }

  const goToWeek = (target: string) =>
    setSearchParams(target === currentWeek ? {} : { week: target }, {
      replace: true,
    })

  const logButton = (
    <Button onClick={() => setLogOpen(true)} disabled={!!logDisabledReason}>
      <Plus /> Log hours
    </Button>
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Previous week"
            onClick={() => goToWeek(shiftWeek(week, -1))}
          >
            <ChevronLeft />
          </Button>
          <div className="min-w-56 text-center">
            <p className="font-semibold">{formatWeekRange(week)}</p>
            <p className="text-muted-foreground text-xs">
              <span>{isCurrentWeek ? 'This week' : 'Week view'}</span>
              {academicWeek && semester && (
                <span>
                  {' · '}
                  {academicWeekLabel(academicWeek, semester.teachingWeeks)}
                </span>
              )}
            </p>
          </div>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Next week"
            disabled={isCurrentWeek}
            onClick={() => goToWeek(shiftWeek(week, 1))}
          >
            <ChevronRight />
          </Button>
          {!isCurrentWeek && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => goToWeek(currentWeek)}
            >
              Back to this week
            </Button>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-2xl font-semibold tabular-nums">
              {data ? formatHours(data.totalHours) : '—'}
            </p>
            <p className="text-muted-foreground text-xs">team total</p>
          </div>
          {logDisabledReason ? (
            <Tooltip>
              <TooltipTrigger asChild>
                {/* Disabled buttons don't fire pointer events, so wrap for the tooltip. */}
                <span tabIndex={0}>{logButton}</span>
              </TooltipTrigger>
              <TooltipContent>{logDisabledReason}</TooltipContent>
            </Tooltip>
          ) : (
            logButton
          )}
        </div>
      </div>

      <p className="bg-muted/40 text-muted-foreground flex items-start gap-2 rounded-lg border px-4 py-3 text-sm">
        <Info className="mt-0.5 size-4 shrink-0" />
        Hours are self-reported once a week by each member and reviewed by the
        project supervisor. GitHub activity provides context but is never
        counted as hours.
      </p>

      {error ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : isPending ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      ) : (
        <div className={cn('flex flex-col gap-6', isFetching && 'opacity-60')}>
          <MemberTotals members={data.members} actingUserId={actingUserId} />
          <Card>
            <CardHeader>
              <CardTitle>Entries</CardTitle>
              <CardDescription>
                {data.entries.length}{' '}
                {data.entries.length === 1 ? 'entry' : 'entries'} for this week
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EntriesTable
                projectId={projectId}
                entries={data.entries}
                permissionsFor={permissionsFor}
              />
            </CardContent>
          </Card>
        </div>
      )}

      <ContributionFormDialog
        projectId={projectId}
        week={week}
        open={logOpen}
        onOpenChange={setLogOpen}
      />
    </div>
  )
}

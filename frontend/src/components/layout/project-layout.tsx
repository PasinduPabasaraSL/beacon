import {
  BookOpenCheck,
  Clock,
  Globe,
  Link2,
  MoreHorizontal,
  Printer,
  Settings,
  SquareKanban,
  Users,
} from 'lucide-react'
import { Link, NavLink, Outlet, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { ProjectIcon } from '@/components/project-icon'
import { ErrorState } from '@/components/query-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { UserAvatarStack } from '@/components/user-avatar'
import { useProject, useProjects, useRecordBook } from '@/hooks/queries'
import { useActingUserId } from '@/lib/acting-user'
import { formatDate } from '@/lib/format'
import { PROJECT_TABS } from '@/lib/project-tabs'
import type { ProjectDetail } from '@/lib/types'
import { cn } from '@/lib/utils'

/** Badge counts per tab: open tasks, and record book entries awaiting the supervisor. */
function useTabCounts(projectId: string): Record<string, number | undefined> {
  const { data: projects } = useProjects()
  const { data: book } = useRecordBook(projectId)
  const listed = projects?.find((p) => p.id === projectId)
  const awaiting = book?.phases
    .flatMap((phase) => phase.meetings)
    .filter((meeting) => meeting.status === 'SUBMITTED').length

  return {
    board: listed && listed.taskCounts.total - listed.taskCounts.done,
    'record-book': awaiting,
  }
}

function ProjectActions({
  project,
  isLead,
}: {
  project: ProjectDetail
  isLead: boolean
}) {
  const navigate = useNavigate()

  const copyLink = async () => {
    await navigator.clipboard.writeText(
      `${window.location.origin}/projects/${project.id}`,
    )
    toast.success('Project link copied')
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Project actions">
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-52">
        <DropdownMenuItem onSelect={() => navigate('board')}>
          <SquareKanban /> Open board
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate('contributions')}>
          <Clock /> Open timesheet
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate('record-book')}>
          <BookOpenCheck /> Add record book entry
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate('record-book/print')}>
          <Printer /> Print record book
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={copyLink}>
          <Link2 /> Copy project link
        </DropdownMenuItem>
        {isLead && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => navigate('settings')}>
              <Settings /> Project settings
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function ProjectHeader({ project }: { project: ProjectDetail }) {
  const actingUserId = useActingUserId()
  const activeSprint = project.sprints.find((s) => s.status === 'ACTIVE')
  const isLead = project.members.some(
    (m) => m.id === actingUserId && m.role === 'OWNER',
  )

  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex min-w-0 items-center gap-3.5">
        <ProjectIcon projectKey={project.key} logo={project.logo} size="lg" />
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="text-muted-foreground text-xs">
            {project.workspace.name}
          </p>
          <div className="flex min-w-0 items-center gap-2">
            <h1 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">
              {project.name}
            </h1>
            <Badge variant="secondary" className="font-mono">
              {project.key}
            </Badge>
          </div>
          {project.teamName && (
            <p className="text-muted-foreground flex min-w-0 items-center gap-1.5 text-sm">
              <Users className="size-3.5 shrink-0" />
              <span className="truncate">{project.teamName}</span>
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        {activeSprint && (
          <span className="text-muted-foreground hidden items-center gap-2 rounded-full border px-3 py-1 text-xs lg:flex">
            <span className="bg-success size-1.5 rounded-full" />
            {activeSprint.name} · ends {formatDate(activeSprint.endDate)}
          </span>
        )}
        <UserAvatarStack users={project.members} max={5} />
        {project.isPublic && (
          <Button variant="outline" size="sm" asChild>
            <Link to={`/p/${project.id}`} target="_blank" rel="noreferrer">
              <Globe /> Public page
            </Link>
          </Button>
        )}
        <ProjectActions project={project} isLead={isLead} />
      </div>
    </div>
  )
}

export function ProjectLayout() {
  const { projectId = '' } = useParams()
  const { data: project, error, refetch } = useProject(projectId)
  const counts = useTabCounts(projectId)

  if (error) return <ErrorState error={error} onRetry={() => refetch()} />

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-5 border-b">
        {project ? (
          <ProjectHeader project={project} />
        ) : (
          <div className="flex items-center gap-3.5">
            <Skeleton className="size-11 rounded-lg" />
            <div className="flex flex-col gap-2">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-7 w-56" />
            </div>
          </div>
        )}
        <nav className="-mb-px flex gap-1 overflow-x-auto">
          {PROJECT_TABS.map((tab) => {
            const count = counts[tab.to]
            return (
              <NavLink
                key={tab.label}
                to={tab.to}
                end={tab.to === ''}
                className={({ isActive }) =>
                  cn(
                    'text-muted-foreground hover:text-foreground flex items-center gap-2 border-b-2 px-3 pb-2.5 text-sm whitespace-nowrap transition-colors',
                    '[&>svg]:size-4',
                    isActive
                      ? 'border-brand text-foreground font-medium'
                      : 'border-transparent',
                  )
                }
              >
                <tab.icon />
                {tab.label}
                {!!count && (
                  <span
                    aria-hidden
                    className="bg-muted text-muted-foreground rounded-full px-1.5 py-px text-[11px] font-medium tabular-nums"
                  >
                    {count}
                  </span>
                )}
              </NavLink>
            )
          })}
        </nav>
      </div>
      <Outlet />
    </div>
  )
}

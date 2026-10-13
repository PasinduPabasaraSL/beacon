import {
  CalendarCheck,
  ClipboardCheck,
  FolderKanban,
  type LucideIcon,
} from 'lucide-react'
import { NavLink, Outlet } from 'react-router'
import { ActingUserSwitcher } from '@/components/acting-user-switcher'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useMe, useProjects, useReviewQueue } from '@/hooks/queries'
import { useHealth, type HealthState } from '@/hooks/use-health'
import { useActingUserId } from '@/lib/acting-user'
import { cn } from '@/lib/utils'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground',
    isActive && 'bg-accent font-medium text-accent-foreground',
  )

function statusLabel(health: HealthState): string {
  switch (health.state) {
    case 'loading':
      return 'Checking...'
    case 'offline':
      return 'Offline'
    case 'online':
      return health.health.database === 'up' ? 'Online' : 'Degraded'
  }
}

function ApiStatus() {
  const health = useHealth()
  const online = health.state === 'online' && health.health.database === 'up'
  return (
    <div className="text-muted-foreground flex items-center gap-2 px-5 py-4 text-xs">
      <span
        className={cn(
          'size-2 rounded-full',
          health.state === 'loading'
            ? 'bg-slate-300'
            : online
              ? 'bg-green-500'
              : 'bg-red-500',
        )}
      />
      API <span data-testid="api-status">{statusLabel(health)}</span>
    </div>
  )
}

function SidebarProjects() {
  const { data: projects, isPending } = useProjects()

  if (isPending) {
    return (
      <div className="flex flex-col gap-2 px-3">
        <Skeleton className="h-7" />
        <Skeleton className="h-7" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      {projects?.map((project) => (
        <NavLink
          key={project.id}
          to={`/projects/${project.id}`}
          className={navLinkClass}
        >
          <span className="text-muted-foreground w-9 shrink-0 font-mono text-[11px]">
            {project.key}
          </span>
          <span className="truncate">{project.name}</span>
        </NavLink>
      ))}
    </div>
  )
}

interface PrimaryLink {
  to: string
  label: string
  icon: LucideIcon
  count?: number
}

function usePrimaryLinks(): PrimaryLink[] {
  const actingUserId = useActingUserId()
  const { data: me } = useMe()
  const canReview = !!me?.canReview
  const { data: queue } = useReviewQueue({ enabled: canReview })

  const links: PrimaryLink[] = []
  if (actingUserId && me?.isStudent !== false) {
    links.push({ to: '/me', label: 'My week', icon: CalendarCheck })
  }
  if (canReview) {
    links.push({
      to: '/reviews',
      label: 'Reviews',
      icon: ClipboardCheck,
      count: queue?.entries.length,
    })
  }
  links.push({ to: '/projects', label: 'Projects', icon: FolderKanban })
  return links
}

function PrimaryNavLink({ link }: { link: PrimaryLink }) {
  const Icon = link.icon
  return (
    <NavLink to={link.to} end className={navLinkClass}>
      <Icon className="size-4" />
      {link.label}
      {!!link.count && (
        <Badge variant="secondary" className="ml-auto tabular-nums">
          {link.count}
        </Badge>
      )}
    </NavLink>
  )
}

export function AppLayout() {
  const links = usePrimaryLinks()
  return (
    <div className="bg-background text-foreground flex min-h-svh">
      <aside className="bg-muted/30 sticky top-0 hidden h-svh w-60 shrink-0 flex-col border-r md:flex">
        <div className="flex h-14 items-center border-b px-5 text-lg font-semibold tracking-tight">
          Beacon
        </div>
        <nav className="flex flex-1 flex-col gap-4 overflow-y-auto p-3">
          <div className="flex flex-col gap-1">
            {links.map((link) => (
              <PrimaryNavLink key={link.to} link={link} />
            ))}
          </div>
          <div>
            <p className="text-muted-foreground px-3 pb-1 text-xs font-medium tracking-wide uppercase">
              Your projects
            </p>
            <SidebarProjects />
          </div>
        </nav>
        <ActingUserSwitcher />
        <ApiStatus />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center gap-4 border-b px-6 md:hidden">
          <NavLink to="/" className="font-semibold">
            Beacon
          </NavLink>
          <nav className="flex min-w-0 gap-1 overflow-x-auto">
            {links.map((link) => (
              <PrimaryNavLink key={link.to} link={link} />
            ))}
          </nav>
        </header>
        <main className="flex-1 p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

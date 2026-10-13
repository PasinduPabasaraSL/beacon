import { Check, ChevronsUpDown, LayoutGrid } from 'lucide-react'
import { Link, NavLink, useLocation } from 'react-router'
import { ActingUserSwitcher } from '@/components/acting-user-switcher'
import { LogoMark } from '@/components/logo'
import { ProjectIcon } from '@/components/project-icon'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar'
import { useHealth, type HealthState } from '@/hooks/use-health'
import { usePrimaryLinks } from '@/hooks/use-primary-links'
import { useWorkspaceProjects } from '@/hooks/use-workspace-projects'
import { cn } from '@/lib/utils'
import { setWorkspaceId } from '@/lib/workspace'

/** Active items get an amber marker on their leading edge. */
const menuButtonClass =
  'relative data-[active=true]:before:absolute data-[active=true]:before:inset-y-2 data-[active=true]:before:left-0 data-[active=true]:before:w-[3px] data-[active=true]:before:rounded-r-full data-[active=true]:before:bg-brand'

function WorkspaceSwitcher() {
  const { isMobile } = useSidebar()
  const { workspaces, workspace } = useWorkspaceProjects()

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              aria-label="Switch workspace"
              className="data-[state=open]:bg-sidebar-accent"
            >
              <span className="flex size-8 shrink-0 rounded-lg dark:ring-1 dark:ring-white/15">
                <LogoMark />
              </span>
              <span className="grid flex-1 text-left leading-tight">
                <span className="text-foreground truncate font-semibold tracking-tight">
                  Beacon
                </span>
                <span className="text-muted-foreground truncate text-xs">
                  {workspace?.name ?? 'All workspaces'}
                </span>
              </span>
              <ChevronsUpDown className="text-muted-foreground ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="min-w-60"
            align="start"
            side={isMobile ? 'bottom' : 'right'}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              Workspaces
            </DropdownMenuLabel>
            <DropdownMenuItem onSelect={() => setWorkspaceId(null)}>
              <LayoutGrid />
              All workspaces
              {!workspace && <Check className="ml-auto" />}
            </DropdownMenuItem>
            {workspaces.length > 0 && <DropdownMenuSeparator />}
            {workspaces.map((option) => (
              <DropdownMenuItem
                key={option.id}
                onSelect={() => setWorkspaceId(option.id)}
              >
                <span className="bg-muted flex size-5 items-center justify-center rounded text-[10px] font-semibold">
                  {option.name.charAt(0)}
                </span>
                <span className="truncate">{option.name}</span>
                <span className="text-muted-foreground ml-auto text-xs tabular-nums">
                  {option.projectCount}
                </span>
                {workspace?.id === option.id && <Check />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

function PrimaryNav() {
  const links = usePrimaryLinks()
  const { pathname } = useLocation()
  const { setOpenMobile } = useSidebar()

  return (
    <SidebarGroup>
      <SidebarMenu>
        {links.map((link) => (
          <SidebarMenuItem key={link.to}>
            <SidebarMenuButton
              asChild
              isActive={pathname === link.to}
              tooltip={link.label}
              className={menuButtonClass}
            >
              <NavLink to={link.to} end onClick={() => setOpenMobile(false)}>
                <link.icon />
                <span>{link.label}</span>
              </NavLink>
            </SidebarMenuButton>
            {!!link.count && (
              <SidebarMenuBadge className="bg-brand text-brand-foreground rounded-full">
                {link.count}
              </SidebarMenuBadge>
            )}
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}

function ProjectNav() {
  const { projects, isPending } = useWorkspaceProjects()
  const { pathname } = useLocation()
  const { setOpenMobile } = useSidebar()

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Your projects</SidebarGroupLabel>
      <SidebarGroupAction asChild title="All projects">
        <Link to="/projects">
          <LayoutGrid />
          <span className="sr-only">All projects</span>
        </Link>
      </SidebarGroupAction>
      <SidebarMenu>
        {isPending
          ? Array.from({ length: 2 }, (_, i) => (
              <SidebarMenuItem key={i}>
                <SidebarMenuSkeleton showIcon />
              </SidebarMenuItem>
            ))
          : projects?.map((project) => {
              const to = `/projects/${project.id}`
              return (
                <SidebarMenuItem key={project.id}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === to || pathname.startsWith(`${to}/`)}
                    tooltip={project.name}
                    className={menuButtonClass}
                  >
                    <NavLink to={to} onClick={() => setOpenMobile(false)}>
                      <ProjectIcon
                        projectKey={project.key}
                        size="sm"
                        className="-mx-0.5"
                      />
                      <span>{project.name}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
      </SidebarMenu>
    </SidebarGroup>
  )
}

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
    <div className="text-muted-foreground flex items-center gap-2 px-2 pb-1 text-xs group-data-[collapsible=icon]:hidden">
      <span
        className={cn(
          'size-1.5 rounded-full',
          health.state === 'loading'
            ? 'bg-muted-foreground/40'
            : online
              ? 'bg-success'
              : 'bg-danger',
        )}
      />
      API <span data-testid="api-status">{statusLabel(health)}</span>
    </div>
  )
}

export function AppSidebar() {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <WorkspaceSwitcher />
      </SidebarHeader>
      <SidebarContent>
        <PrimaryNav />
        <ProjectNav />
      </SidebarContent>
      <SidebarFooter className="border-sidebar-border border-t">
        <ActingUserSwitcher />
        <ApiStatus />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

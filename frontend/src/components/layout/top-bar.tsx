import { Search } from 'lucide-react'
import { Fragment, useState } from 'react'
import { Link, useLocation, useMatch } from 'react-router'
import { CommandMenu } from '@/components/layout/command-menu'
import { NotificationsMenu } from '@/components/layout/notifications-menu'
import { ThemeMenu } from '@/components/layout/theme-menu'
import { UserMenu } from '@/components/layout/user-menu'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { useProject } from '@/hooks/queries'
import { shortcutLabel } from '@/lib/keyboard'
import { projectTabFor } from '@/lib/project-tabs'

const PAGE_TITLES: Record<string, string> = {
  '/me': 'My week',
  '/reviews': 'Reviews',
  '/projects': 'Projects',
}

interface Crumb {
  label: string
  to?: string
}

function useCrumbs(): Crumb[] | null {
  const { pathname } = useLocation()
  const match = useMatch('/projects/:projectId/*')
  const projectId = match?.params.projectId ?? ''
  const { data: project } = useProject(projectId)

  if (projectId) {
    if (!project) return null
    const base = `/projects/${projectId}`
    return [
      { label: 'Projects', to: '/projects' },
      { label: project.name, to: base },
      { label: projectTabFor(match?.params['*'] ?? '').label },
    ]
  }
  if (pathname === '/') return []
  return [{ label: PAGE_TITLES[pathname] ?? 'Not found' }]
}

function AppBreadcrumbs() {
  const crumbs = useCrumbs()

  if (!crumbs) return <Skeleton className="h-4 w-48" />
  return (
    <Breadcrumb className="min-w-0">
      <BreadcrumbList className="flex-nowrap">
        {crumbs.map((crumb, index) => {
          const last = index === crumbs.length - 1
          return (
            <Fragment key={`${crumb.label}-${index}`}>
              <BreadcrumbItem
                className={last ? 'min-w-0' : 'hidden shrink-0 md:inline-flex'}
              >
                {last || !crumb.to ? (
                  <BreadcrumbPage className="truncate font-medium">
                    {crumb.label}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link to={crumb.to}>{crumb.label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!last && <BreadcrumbSeparator className="hidden md:block" />}
            </Fragment>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}

export function TopBar() {
  const [commandOpen, setCommandOpen] = useState(false)

  return (
    <header className="bg-background/85 supports-backdrop-filter:bg-background/70 sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b px-4 backdrop-blur lg:px-6">
      <SidebarTrigger className="-ml-1.5" />
      <Separator
        orientation="vertical"
        className="mr-1 data-[orientation=vertical]:h-4"
      />
      <AppBreadcrumbs />

      <div className="ml-auto flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCommandOpen(true)}
          className="text-muted-foreground hidden w-56 justify-start gap-2 font-normal shadow-none sm:flex lg:w-64"
        >
          <Search />
          Search...
          <kbd className="bg-muted ml-auto rounded border px-1.5 font-mono text-[10px] font-medium">
            {shortcutLabel('K')}
          </kbd>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="sm:hidden"
          aria-label="Search"
          onClick={() => setCommandOpen(true)}
        >
          <Search />
        </Button>
        <NotificationsMenu />
        <ThemeMenu />
        <UserMenu />
      </div>

      <CommandMenu open={commandOpen} onOpenChange={setCommandOpen} />
    </header>
  )
}

import { NavLink, Outlet, useParams } from 'react-router'
import { ErrorState } from '@/components/query-state'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useProject } from '@/hooks/queries'
import { cn } from '@/lib/utils'

const tabs = [
  { to: '', label: 'Overview', end: true },
  { to: 'board', label: 'Board', end: false },
  { to: 'contributions', label: 'Contributions', end: false },
  { to: 'timeline', label: 'Timeline', end: false },
]

export function ProjectLayout() {
  const { projectId = '' } = useParams()
  const { data: project, error, refetch } = useProject(projectId)

  if (error) return <ErrorState error={error} onRetry={() => refetch()} />

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 border-b">
        {project ? (
          <div>
            <p className="text-muted-foreground text-sm">
              {project.workspace.name}
            </p>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">
                {project.name}
              </h1>
              <Badge variant="secondary" className="font-mono">
                {project.key}
              </Badge>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-8 w-64" />
          </div>
        )}
        <nav className="-mb-px flex gap-1">
          {tabs.map((tab) => (
            <NavLink
              key={tab.label}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                cn(
                  'text-muted-foreground hover:text-foreground border-b-2 px-3 pb-2 text-sm transition-colors',
                  isActive
                    ? 'border-foreground text-foreground font-medium'
                    : 'border-transparent',
                )
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </nav>
      </div>
      <Outlet />
    </div>
  )
}

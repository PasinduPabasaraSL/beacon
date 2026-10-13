import { CalendarDays } from 'lucide-react'
import { Link } from 'react-router'
import { EmptyState, ErrorState, LoadingBlocks } from '@/components/query-state'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { UserAvatarStack } from '@/components/user-avatar'
import { useProjects } from '@/hooks/queries'
import { formatDate } from '@/lib/format'
import type { ProjectListItem } from '@/lib/types'

function ProjectCard({ project }: { project: ProjectListItem }) {
  const { total, done } = project.taskCounts
  const percent = total === 0 ? 0 : Math.round((done / total) * 100)

  return (
    <Link
      to={`/projects/${project.id}`}
      className="focus-visible:ring-ring rounded-xl focus-visible:ring-2 focus-visible:outline-none"
    >
      <Card className="hover:border-foreground/20 hover:bg-muted/30 h-full transition-colors">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="truncate">{project.name}</CardTitle>
              <CardDescription>{project.workspace.name}</CardDescription>
            </div>
            <Badge variant="secondary" className="font-mono">
              {project.key}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {project.description && (
            <p className="text-muted-foreground line-clamp-2 text-sm">
              {project.description}
            </p>
          )}
          <div className="flex flex-col gap-1.5">
            <div className="text-muted-foreground flex justify-between text-xs">
              <span>
                {done} of {total} tasks done
              </span>
              <span>{percent}%</span>
            </div>
            <Progress value={percent} />
          </div>
          <div className="flex items-center justify-between gap-2">
            {project.activeSprint ? (
              <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
                <CalendarDays className="size-3.5" />
                {project.activeSprint.name} · ends{' '}
                {formatDate(project.activeSprint.endDate)}
              </span>
            ) : (
              <span className="text-muted-foreground text-xs">
                No active sprint
              </span>
            )}
            <UserAvatarStack users={project.members} />
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

export function ProjectsPage() {
  const { data: projects, error, isPending, refetch } = useProjects()

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
        <p className="text-muted-foreground text-sm">
          Everything your teams are working on.
        </p>
      </div>

      {isPending ? (
        <LoadingBlocks />
      ) : error ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : projects.length === 0 ? (
        <EmptyState
          title="No projects yet"
          description="Run `npm run db:seed` in backend/ to load the demo project."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  )
}

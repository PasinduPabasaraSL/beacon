import { CalendarDays } from 'lucide-react'
import { Link } from 'react-router'
import { PageHeader } from '@/components/page-header'
import { ProjectIcon } from '@/components/project-icon'
import { EmptyState, ErrorState, LoadingBlocks } from '@/components/query-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { UserAvatarStack } from '@/components/user-avatar'
import { useWorkspaceProjects } from '@/hooks/use-workspace-projects'
import { formatDate } from '@/lib/format'
import { markdownExcerpt } from '@/lib/markdown'
import type { ProjectListItem } from '@/lib/types'
import { setWorkspaceId } from '@/lib/workspace'

function ProjectCard({ project }: { project: ProjectListItem }) {
  const { total, done } = project.taskCounts
  const percent = total === 0 ? 0 : Math.round((done / total) * 100)
  const excerpt = markdownExcerpt(project.description)

  return (
    <Link
      to={`/projects/${project.id}`}
      className="focus-visible:ring-ring rounded-xl focus-visible:ring-2 focus-visible:outline-none"
    >
      <Card className="hover:border-foreground/20 h-full transition-[border-color,box-shadow] hover:shadow-md">
        <CardHeader>
          <div className="flex items-start gap-3">
            <ProjectIcon
              projectKey={project.key}
              name={project.name}
              logo={project.logo}
            />
            <div className="min-w-0 flex-1">
              <CardTitle className="truncate">{project.name}</CardTitle>
              <CardDescription className="truncate">
                {project.teamName ?? project.workspace.name}
              </CardDescription>
            </div>
            <Badge variant="secondary" className="font-mono">
              {project.key}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {excerpt && (
            <p className="text-muted-foreground line-clamp-2 text-sm">
              {excerpt}
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
  const { projects, workspace, error, isPending, refetch } =
    useWorkspaceProjects()

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <PageHeader
        title="Projects"
        description={
          workspace
            ? `Projects in ${workspace.name}.`
            : 'Everything your teams are working on.'
        }
        actions={
          workspace && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setWorkspaceId(null)}
            >
              Show all workspaces
            </Button>
          )
        }
      />

      {isPending ? (
        <LoadingBlocks />
      ) : error ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : !projects || projects.length === 0 ? (
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

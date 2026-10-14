import {
  BookOpen,
  Building2,
  Check,
  Globe,
  Link2,
  Lock,
  SearchX,
  Users,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useParams } from 'react-router'
import { ThemeMenu } from '@/components/layout/theme-menu'
import { LogoMark } from '@/components/logo'
import { Markdown } from '@/components/markdown'
import { ProjectIcon } from '@/components/project-icon'
import { ErrorState } from '@/components/query-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { UserAvatar } from '@/components/user-avatar'
import { usePublicProject } from '@/hooks/queries'
import { ApiError } from '@/lib/api'
import { displayName, formatDate } from '@/lib/format'
import type { ProjectRole, PublicProjectProfile } from '@/lib/types'

const ROLE_LABELS: Record<ProjectRole, string> = {
  OWNER: 'Team lead',
  MEMBER: 'Member',
  VIEWER: 'Viewer',
  SUPERVISOR: 'Supervisor',
}

function TopBar() {
  return (
    <header className="border-b">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-2">
          <LogoMark className="size-7" />
          <span className="font-semibold tracking-tight">Beacon</span>
        </div>
        <ThemeMenu />
      </div>
    </header>
  )
}

function CopyLinkButton() {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    await navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <Button variant="outline" onClick={copy}>
      {copied ? <Check className="text-success" /> : <Link2 />}
      {copied ? 'Link copied' : 'Copy link'}
    </Button>
  )
}

function Hero({ project }: { project: PublicProjectProfile }) {
  return (
    <div className="bg-muted/40 border-b">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-6 px-4 py-8 sm:px-6">
        <div className="flex min-w-0 items-center gap-5">
          <ProjectIcon
            projectKey={project.key}
            name={project.name}
            logo={project.logo}
            size="xl"
          />
          <div className="flex min-w-0 flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                {project.name}
              </h1>
              <Badge variant="secondary" className="font-mono">
                {project.key}
              </Badge>
              <Badge variant="outline" className="text-muted-foreground">
                <Globe /> Public
              </Badge>
            </div>
            <p className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              {project.teamName && (
                <span className="flex items-center gap-1.5">
                  <Users className="size-3.5" />
                  {project.teamName}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Building2 className="size-3.5" />
                {project.workspace.name}
              </span>
            </p>
          </div>
        </div>
        <CopyLinkButton />
      </div>
    </div>
  )
}

function SideSection({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section className="flex flex-col gap-3 border-b pb-6 last:border-b-0">
      <h2 className="text-sm font-semibold">{title}</h2>
      {children}
    </section>
  )
}

function ProfileBody({ project }: { project: PublicProjectProfile }) {
  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_17rem]">
      <article className="bg-card min-w-0 rounded-xl border">
        <div className="flex items-center gap-2 border-b px-5 py-3 text-sm font-medium">
          <BookOpen className="text-muted-foreground size-4" />
          README
        </div>
        <div className="px-5 py-6 sm:px-8">
          {project.description ? (
            <Markdown>{project.description}</Markdown>
          ) : (
            <p className="text-muted-foreground text-sm">
              This project doesn't have a description yet.
            </p>
          )}
        </div>
      </article>

      <aside className="flex flex-col gap-6">
        <SideSection title="About">
          <dl className="flex flex-col gap-2 text-sm">
            {project.teamName && (
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Team</dt>
                <dd className="truncate text-right">{project.teamName}</dd>
              </div>
            )}
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Project code</dt>
              <dd className="font-mono">{project.key}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Workspace</dt>
              <dd className="truncate text-right">{project.workspace.name}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Updated</dt>
              <dd>{formatDate(project.updatedAt)}</dd>
            </div>
          </dl>
        </SideSection>
        <SideSection title={`Members · ${project.members.length}`}>
          <ul className="flex flex-col gap-3">
            {project.members.map((member) => (
              <li key={member.id} className="flex items-center gap-3">
                <UserAvatar user={member} withTooltip={false} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {displayName(member)}
                  </p>
                  <p className="text-muted-foreground truncate text-xs">
                    {ROLE_LABELS[member.role]}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </SideSection>
      </aside>
    </div>
  )
}

function Unavailable({
  icon,
  title,
  description,
}: {
  icon: ReactNode
  title: string
  description: string
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 px-4 py-24 text-center">
      <span className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-full [&>svg]:size-5">
        {icon}
      </span>
      <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
      <p className="text-muted-foreground text-sm">{description}</p>
    </div>
  )
}

/** The shareable project profile, open to anyone without signing in. */
export function PublicProjectPage() {
  const { projectId = '' } = useParams()
  const {
    data: project,
    error,
    isPending,
    refetch,
  } = usePublicProject(projectId)

  let content: ReactNode
  if (error instanceof ApiError && error.status === 403) {
    content = (
      <Unavailable
        icon={<Lock />}
        title="This project profile is private"
        description="The team lead has made this project private. Ask them to share it again."
      />
    )
  } else if (
    error instanceof ApiError &&
    (error.status === 404 || error.status === 400)
  ) {
    content = (
      <Unavailable
        icon={<SearchX />}
        title="Project not found"
        description="Check the link. The project may have been removed."
      />
    )
  } else if (error) {
    content = (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <ErrorState error={error} onRetry={() => refetch()} />
      </div>
    )
  } else if (isPending) {
    content = (
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6">
        <div className="flex items-center gap-5">
          <Skeleton className="size-20 rounded-2xl" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    )
  } else {
    content = (
      <>
        <title>{`${project.name} · Beacon`}</title>
        <Hero project={project} />
        <ProfileBody project={project} />
      </>
    )
  }

  return (
    <div className="bg-background min-h-svh">
      <TopBar />
      <main>{content}</main>
    </div>
  )
}

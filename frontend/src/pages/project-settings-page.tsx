import { Copy, ExternalLink, Globe, ImageUp, Lock, Trash2 } from 'lucide-react'
import { useRef, useState, type ChangeEvent } from 'react'
import { Link, useParams } from 'react-router'
import { toast } from 'sonner'
import { Markdown } from '@/components/markdown'
import { ProjectIcon } from '@/components/project-icon'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { useProject, useUpdateProjectProfile } from '@/hooks/queries'
import { useActingUserId } from '@/lib/acting-user'
import { LOGO_TYPES, prepareLogo } from '@/lib/project-logo'
import type { ProjectDetail, ProjectProfileInput } from '@/lib/types'

const MAX_NAME = 80
const MAX_TEAM_NAME = 80
const MAX_DESCRIPTION = 20_000

function LogoField({
  project,
  logo,
  onChange,
}: {
  project: ProjectDetail
  logo: string | null
  onChange: (logo: string | null) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [reading, setReading] = useState(false)

  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setReading(true)
    try {
      onChange(await prepareLogo(file))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error))
    } finally {
      setReading(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-5">
      <ProjectIcon projectKey={project.key} logo={logo} size="xl" />
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={reading}
            onClick={() => inputRef.current?.click()}
          >
            <ImageUp /> {logo ? 'Change logo' : 'Upload logo'}
          </Button>
          {logo && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-danger hover:text-danger"
              onClick={() => onChange(null)}
            >
              <Trash2 /> Remove
            </Button>
          )}
        </div>
        <p className="text-muted-foreground text-xs">
          PNG, JPEG or WebP, up to 5 MB. It's cropped to a square.
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={LOGO_TYPES.join(',')}
          className="hidden"
          aria-label="Logo image"
          onChange={upload}
        />
      </div>
    </div>
  )
}

function DescriptionField({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  return (
    <Tabs defaultValue="write" className="gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <TabsList>
          <TabsTrigger value="write">Write</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>
        <p className="text-muted-foreground text-xs tabular-nums">
          {value.length.toLocaleString()} / {MAX_DESCRIPTION.toLocaleString()}
        </p>
      </div>
      <TabsContent value="write" className="flex flex-col gap-2">
        <Textarea
          aria-label="Description"
          value={value}
          maxLength={MAX_DESCRIPTION}
          onChange={(e) => onChange(e.target.value)}
          placeholder={
            '# About the project\n\nWhat you are building, the tech stack and how to run it.'
          }
          className="min-h-80 resize-y font-mono text-[13px] leading-relaxed"
        />
        <p className="text-muted-foreground text-xs">
          Markdown is supported: headings, **bold**, lists, links, tables, task
          lists and code blocks.
        </p>
      </TabsContent>
      <TabsContent value="preview">
        <div className="min-h-80 rounded-md border px-5 py-4">
          {value.trim() ? (
            <Markdown>{value}</Markdown>
          ) : (
            <p className="text-muted-foreground text-sm">Nothing to preview.</p>
          )}
        </div>
      </TabsContent>
    </Tabs>
  )
}

function VisibilityField({
  project,
  isPublic,
  onChange,
}: {
  project: ProjectDetail
  isPublic: boolean
  onChange: (isPublic: boolean) => void
}) {
  const url = `${window.location.origin}/p/${project.id}`
  const copy = async () => {
    await navigator.clipboard.writeText(url)
    toast.success('Public link copied')
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex gap-3">
          <span
            className={
              isPublic
                ? 'bg-success-soft text-success-foreground flex size-9 shrink-0 items-center justify-center rounded-lg'
                : 'bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-lg'
            }
          >
            {isPublic ? (
              <Globe className="size-4" />
            ) : (
              <Lock className="size-4" />
            )}
          </span>
          <div>
            <Label htmlFor="project-public" className="text-sm font-medium">
              {isPublic ? 'Public' : 'Private'}
            </Label>
            <p className="text-muted-foreground text-sm">
              {isPublic
                ? 'Anyone with the link can see the name, logo, team, members and description.'
                : 'Only project members can see this project.'}
            </p>
          </div>
        </div>
        <Switch
          id="project-public"
          checked={isPublic}
          onCheckedChange={onChange}
        />
      </div>
      {isPublic && project.isPublic && (
        <div className="bg-muted/50 flex items-center gap-2 rounded-md border py-1 pr-1 pl-3">
          <span className="text-muted-foreground min-w-0 flex-1 truncate font-mono text-xs">
            {url}
          </span>
          <Button type="button" variant="ghost" size="sm" onClick={copy}>
            <Copy /> Copy
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link to={`/p/${project.id}`} target="_blank" rel="noreferrer">
              <ExternalLink /> Open
            </Link>
          </Button>
        </div>
      )}
      <p className="text-muted-foreground text-xs">
        The board, timesheets and record book are always private.
      </p>
    </div>
  )
}

function ProfileForm({ project }: { project: ProjectDetail }) {
  const update = useUpdateProjectProfile(project.id)
  const [name, setName] = useState(project.name)
  const [teamName, setTeamName] = useState(project.teamName ?? '')
  const [description, setDescription] = useState(project.description ?? '')
  const [logo, setLogo] = useState(project.logo)
  const [isPublic, setIsPublic] = useState(project.isPublic)

  const changes: ProjectProfileInput = {}
  if (name.trim() !== project.name) changes.name = name.trim()
  if (teamName.trim() !== (project.teamName ?? '')) {
    changes.teamName = teamName.trim()
  }
  if (description.trim() !== (project.description ?? '').trim()) {
    changes.description = description.trim()
  }
  if (logo !== project.logo) changes.logo = logo
  if (isPublic !== project.isPublic) changes.isPublic = isPublic
  const dirty = Object.keys(changes).length > 0
  const nameMissing = !name.trim()

  const discard = () => {
    setName(project.name)
    setTeamName(project.teamName ?? '')
    setDescription(project.description ?? '')
    setLogo(project.logo)
    setIsPublic(project.isPublic)
  }

  const save = () =>
    update.mutate(changes, {
      onSuccess: () => toast.success('Project profile saved'),
      onError: (error) => toast.error(error.message),
    })

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault()
        if (dirty && !nameMissing) save()
      }}
    >
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            How the project appears across Beacon and on its public page.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <LogoField project={project} logo={logo} onChange={setLogo} />
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="project-name">Project name</Label>
              <Input
                id="project-name"
                value={name}
                maxLength={MAX_NAME}
                onChange={(e) => setName(e.target.value)}
                aria-invalid={nameMissing}
              />
              <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
                Project code
                <Badge variant="secondary" className="font-mono">
                  {project.key}
                </Badge>
                stays the same.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="team-name">Team name</Label>
              <Input
                id="team-name"
                value={teamName}
                maxLength={MAX_TEAM_NAME}
                placeholder="e.g. Group 07"
                onChange={(e) => setTeamName(e.target.value)}
              />
              <p className="text-muted-foreground text-xs">
                Also used as the group on the record book.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Description</CardTitle>
          <CardDescription>
            A README for your project, written in Markdown.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DescriptionField value={description} onChange={setDescription} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Visibility</CardTitle>
          <CardDescription>
            Choose who can see the project profile.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <VisibilityField
            project={project}
            isPublic={isPublic}
            onChange={setIsPublic}
          />
        </CardContent>
      </Card>

      <div className="bg-background/90 sticky bottom-0 -mx-1 flex flex-wrap items-center justify-end gap-3 border-t px-1 py-3 backdrop-blur">
        {dirty && (
          <p className="text-muted-foreground mr-auto text-sm">
            You have unsaved changes.
          </p>
        )}
        <Button
          type="button"
          variant="ghost"
          disabled={!dirty || update.isPending}
          onClick={discard}
        >
          Discard
        </Button>
        <Button
          type="submit"
          disabled={!dirty || nameMissing || update.isPending}
        >
          {update.isPending ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </form>
  )
}

export function ProjectSettingsPage() {
  const { projectId = '' } = useParams()
  const actingUserId = useActingUserId()
  const { data: project, error, isPending, refetch } = useProject(projectId)

  if (error) return <ErrorState error={error} onRetry={() => refetch()} />
  if (isPending) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    )
  }

  const isLead = project.members.some(
    (m) => m.id === actingUserId && m.role === 'OWNER',
  )

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">
          Project settings
        </h2>
        <p className="text-muted-foreground text-sm">
          Update the project's name, logo, team name and public profile.
        </p>
      </div>
      {isLead ? (
        <ProfileForm key={project.id} project={project} />
      ) : (
        <EmptyState
          title="Only the team lead can change project settings"
          description="Ask your team lead to update the name, logo, team name or description."
        />
      )}
    </div>
  )
}

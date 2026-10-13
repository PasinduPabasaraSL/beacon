import { PanelLeft, PenLine } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { useMatch, useNavigate } from 'react-router'
import { ProjectIcon } from '@/components/project-icon'
import { SignatureDialog } from '@/components/signature/signature-dialog'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command'
import { useSidebar } from '@/components/ui/sidebar'
import { useProjects } from '@/hooks/queries'
import { usePrimaryLinks } from '@/hooks/use-primary-links'
import { useActingUserId } from '@/lib/acting-user'
import { shortcutLabel } from '@/lib/keyboard'
import { PROJECT_TABS } from '@/lib/project-tabs'
import { THEME_OPTIONS } from '@/lib/theme'

export function CommandMenu({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const navigate = useNavigate()
  const { setTheme } = useTheme()
  const { toggleSidebar } = useSidebar()
  const actingUserId = useActingUserId()
  const links = usePrimaryLinks()
  const { data: projects } = useProjects()
  const projectId = useMatch('/projects/:projectId/*')?.params.projectId
  const current = projects?.find((p) => p.id === projectId)
  const [signatureOpen, setSignatureOpen] = useState(false)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        onOpenChange(!open)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onOpenChange])

  const run = (action: () => void) => {
    onOpenChange(false)
    action()
  }

  return (
    <>
      <CommandDialog
        open={open}
        onOpenChange={onOpenChange}
        title="Search Beacon"
        description="Jump to a page or project, or run a command."
      >
        <CommandInput placeholder="Search pages, projects and commands..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>

          {current && (
            <CommandGroup heading={current.name}>
              {PROJECT_TABS.map((tab) => (
                <CommandItem
                  key={tab.label}
                  value={`${current.name} ${tab.label}`}
                  onSelect={() =>
                    run(() =>
                      navigate(
                        `/projects/${current.id}${tab.to ? `/${tab.to}` : ''}`,
                      ),
                    )
                  }
                >
                  <tab.icon />
                  {tab.label}
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          <CommandGroup heading="Go to">
            {links.map((link) => (
              <CommandItem
                key={link.to}
                onSelect={() => run(() => navigate(link.to))}
              >
                <link.icon />
                {link.label}
                {!!link.count && (
                  <CommandShortcut>{link.count} waiting</CommandShortcut>
                )}
              </CommandItem>
            ))}
          </CommandGroup>

          {!!projects?.length && (
            <CommandGroup heading="Projects">
              {projects.map((project) => (
                <CommandItem
                  key={project.id}
                  value={`${project.name} ${project.key} ${project.workspace.name}`}
                  onSelect={() =>
                    run(() => navigate(`/projects/${project.id}`))
                  }
                >
                  <ProjectIcon projectKey={project.key} size="sm" />
                  {project.name}
                  <CommandShortcut>{project.key}</CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          <CommandSeparator />
          <CommandGroup heading="Preferences">
            {THEME_OPTIONS.map((option) => (
              <CommandItem
                key={option.value}
                value={`Theme ${option.label}`}
                onSelect={() => run(() => setTheme(option.value))}
              >
                <option.icon />
                {option.label} theme
              </CommandItem>
            ))}
            <CommandItem onSelect={() => run(toggleSidebar)}>
              <PanelLeft />
              Toggle sidebar
              <CommandShortcut>{shortcutLabel('B')}</CommandShortcut>
            </CommandItem>
            {actingUserId && (
              <CommandItem onSelect={() => run(() => setSignatureOpen(true))}>
                <PenLine />
                My signature
              </CommandItem>
            )}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
      <SignatureDialog open={signatureOpen} onOpenChange={setSignatureOpen} />
    </>
  )
}

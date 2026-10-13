import { useMemo } from 'react'
import { useProjects } from '@/hooks/queries'
import type { WorkspaceSummary } from '@/lib/types'
import { useWorkspaceId } from '@/lib/workspace'

export interface WorkspaceOption extends WorkspaceSummary {
  projectCount: number
}

/** Projects in the workspace picked in the sidebar, or all of them. */
export function useWorkspaceProjects() {
  const query = useProjects()
  const selectedId = useWorkspaceId()

  const workspaces = useMemo(() => {
    const byId = new Map<string, WorkspaceOption>()
    for (const project of query.data ?? []) {
      const existing = byId.get(project.workspace.id)
      if (existing) existing.projectCount += 1
      else
        byId.set(project.workspace.id, {
          ...project.workspace,
          projectCount: 1,
        })
    }
    return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name))
  }, [query.data])

  const workspace = workspaces.find((w) => w.id === selectedId) ?? null
  const projects = workspace
    ? query.data?.filter((p) => p.workspace.id === workspace.id)
    : query.data

  return { ...query, projects, workspaces, workspace }
}

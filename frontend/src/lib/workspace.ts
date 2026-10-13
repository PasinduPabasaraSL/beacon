import { useSyncExternalStore } from 'react'

// The workspace picked in the sidebar switcher; none means all workspaces.
const STORAGE_KEY = 'beacon.workspaceId'
const listeners = new Set<() => void>()

function getWorkspaceId(): string | null {
  return localStorage.getItem(STORAGE_KEY)
}

export function setWorkspaceId(workspaceId: string | null): void {
  if (workspaceId) localStorage.setItem(STORAGE_KEY, workspaceId)
  else localStorage.removeItem(STORAGE_KEY)
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) listener()
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', onStorage)
  }
}

export function useWorkspaceId(): string | null {
  return useSyncExternalStore(subscribe, getWorkspaceId)
}

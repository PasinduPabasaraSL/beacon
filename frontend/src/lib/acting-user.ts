import { useSyncExternalStore } from 'react'

// Temporary stand-in for GitHub sign-in: the API trusts this id in development.
const STORAGE_KEY = 'beacon.actingUserId'
const listeners = new Set<() => void>()

export function getActingUserId(): string | null {
  return localStorage.getItem(STORAGE_KEY)
}

export function setActingUserId(userId: string | null): void {
  if (userId) localStorage.setItem(STORAGE_KEY, userId)
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

export function useActingUserId(): string | null {
  return useSyncExternalStore(subscribe, getActingUserId)
}

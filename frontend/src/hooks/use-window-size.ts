import { useSyncExternalStore } from 'react'

function subscribe(callback: () => void) {
  window.addEventListener('resize', callback)
  return () => window.removeEventListener('resize', callback)
}

/** The viewport size, re-rendering on resize. */
export function useWindowSize(): { width: number; height: number } {
  const width = useSyncExternalStore(subscribe, () => window.innerWidth)
  const height = useSyncExternalStore(subscribe, () => window.innerHeight)
  return { width, height }
}

import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'

export interface HealthStatus {
  status: 'ok' | 'error'
  database: 'up' | 'down'
  timestamp: string
}

export type HealthState =
  | { state: 'loading' }
  | { state: 'online'; health: HealthStatus }
  | { state: 'offline' }

export function useHealth(): HealthState {
  const [result, setResult] = useState<HealthState>({ state: 'loading' })

  useEffect(() => {
    const controller = new AbortController()

    apiFetch<HealthStatus>('/health', { signal: controller.signal })
      .then((health) => setResult({ state: 'online', health }))
      .catch(() => {
        if (!controller.signal.aborted) setResult({ state: 'offline' })
      })

    return () => controller.abort()
  }, [])

  return result
}

import { getActingUserId } from '@/lib/acting-user'

const API_URL = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/$/, '')

export class ApiError extends Error {
  readonly status: number
  readonly body: unknown

  constructor(status: number, body: unknown) {
    super(apiMessage(body) ?? `API request failed with status ${status}`)
    this.status = status
    this.body = body
  }
}

/** Nest error bodies carry `message` as a string or a list of validation messages. */
function apiMessage(body: unknown): string | undefined {
  if (typeof body !== 'object' || body === null || !('message' in body)) {
    return undefined
  }
  const { message } = body as { message: unknown }
  if (Array.isArray(message)) return message.join('. ')
  return typeof message === 'string' ? message : undefined
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const actingUserId = getActingUserId()
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(actingUserId ? { 'X-Dev-User-Id': actingUserId } : {}),
      ...init?.headers,
    },
  })

  const body: unknown =
    response.status === 204 ? null : await response.json().catch(() => null)
  if (!response.ok) {
    throw new ApiError(response.status, body)
  }
  return body as T
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong'
}

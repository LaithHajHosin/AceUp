import type { ApiErrorEnvelope } from '../types/api'

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
).replace(/\/+$/, '')

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code?: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return fallback
}

function isErrorEnvelope(value: unknown): value is ApiErrorEnvelope {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.statusCode === 'number' &&
    typeof candidate.code === 'string' &&
    typeof candidate.message === 'string' &&
    (candidate.details === undefined ||
      (typeof candidate.details === 'object' &&
        candidate.details !== null &&
        !Array.isArray(candidate.details)))
  )
}

export async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers)
  if (options.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  })

  const responseText = await response.text()
  let payload: unknown
  if (responseText) {
    try {
      payload = JSON.parse(responseText)
    } catch {
      throw new ApiError(
        `The server returned an invalid response (HTTP ${response.status}).`,
        response.status,
      )
    }
  }

  if (!response.ok) {
    if (isErrorEnvelope(payload)) {
      throw new ApiError(
        payload.message,
        payload.statusCode,
        payload.code,
        payload.details,
      )
    }
    throw new ApiError(
      `The request failed with HTTP ${response.status}.`,
      response.status,
    )
  }

  if (payload === undefined && response.status !== 204) {
    throw new ApiError(
      'The server returned an empty response where JSON was expected.',
      response.status,
    )
  }

  return payload as T
}

import { request } from './client'
import type {
  CreateSessionRequest,
  SessionResponse,
  SubmitAnswerRequest,
} from '../types/api'

export function createSession(input: CreateSessionRequest) {
  return request<SessionResponse>('/sessions', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function getSession(sessionId: number) {
  return request<SessionResponse>(`/sessions/${sessionId}`)
}

export async function submitAnswer(
  sessionId: number,
  input: SubmitAnswerRequest,
): Promise<void> {
  await request<unknown>(`/sessions/${sessionId}/answers`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function finishSession(sessionId: number) {
  return request<SessionResponse>(`/sessions/${sessionId}/finish`, {
    method: 'POST',
  })
}

export function getSessionResults<T = unknown>(sessionId: number) {
  return request<T>(`/sessions/${sessionId}/results`)
}

export function getHistory<T = unknown>(displayName: string) {
  const query = new URLSearchParams({ displayName })
  return request<T>(`/history?${query.toString()}`)
}

export function getHistorySession<T = unknown>(sessionId: number) {
  return request<T>(`/history/${sessionId}`)
}

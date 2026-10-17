import { request } from './client'
import type {
  Difficulty,
  PublicQuestion,
  QuestionListResponse,
  QuestionType,
} from '../types/api'

export interface QuestionFilters {
  category?: string
  difficulty?: Difficulty
  type?: QuestionType
}

export function getQuestions(filters: QuestionFilters = {}) {
  const params = new URLSearchParams()
  if (filters.category) params.set('category', filters.category)
  if (filters.difficulty) params.set('difficulty', filters.difficulty)
  if (filters.type) params.set('type', filters.type)
  const query = params.size > 0 ? `?${params.toString()}` : ''

  return request<QuestionListResponse>(`/questions${query}`)
}

export function getQuestion(questionId: number) {
  return request<PublicQuestion>(`/questions/${questionId}`)
}

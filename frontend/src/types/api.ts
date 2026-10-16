export type Difficulty = 'easy' | 'medium' | 'hard'

export type QuestionType = 'multiple_choice' | 'short_answer' | 'code_output'

export type SessionStatus = 'in_progress' | 'finished' | 'timed_out'

export interface QuestionChoice {
  id: string
  text: string
}

export interface PublicQuestion {
  id: number
  prompt: string
  category: string
  difficulty: Difficulty
  type: QuestionType
  choices?: QuestionChoice[]
  codeSnippet?: string
}

export interface QuestionListResponse {
  items: PublicQuestion[]
}

export interface CreateSessionRequest {
  displayName: string
  category: string
  difficulty: Difficulty
  questionCount: number
}

export interface SessionResponse {
  id: number
  displayName: string
  category: string
  difficulty: Difficulty
  questionCount: number
  status: SessionStatus
  startedAt: string
  deadlineAt: string
  timePerQuestionSeconds: number
  questions: PublicQuestion[]
}

export type AnswerPayload =
  | { type: 'multiple_choice'; choiceId: string }
  | { type: 'short_answer'; text: string }
  | { type: 'code_output'; text: string }

export interface SubmitAnswerRequest {
  questionId: number
  answer: AnswerPayload
}

export interface ApiErrorEnvelope {
  statusCode: number
  code: string
  message: string
  details?: Record<string, unknown>
}

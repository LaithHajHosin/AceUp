/**
 * PrepPressure API Client
 * Enforces Contract Section 9:
 * - API Base URL: /api/v1 (or VITE_API_URL)
 * - Token Storage: localStorage key `preppressure.token`
 * - User Storage: localStorage key `preppressure.user`
 * - Authorization: Bearer <token>
 * - On 401: Clears keys and dispatches `preppressure:logout`
 */

import {
  User,
  UserStats,
  Question,
  InterviewSummary,
  InterviewDetail,
  Attempt,
  AttemptResult,
} from '../types/index.js';

const BASE_URL = (import.meta.env.VITE_API_URL as string) || '/api/v1';

export class ApiError extends Error {
  statusCode: number;
  code: string;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('preppressure.token');
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    localStorage.removeItem('preppressure.token');
    localStorage.removeItem('preppressure.user');
    window.dispatchEvent(new Event('preppressure:logout'));
    let errBody: any = {};
    try {
      errBody = await response.json();
    } catch {}
    throw new ApiError(401, errBody.code || 'UNAUTHORIZED', errBody.message || 'Session expired. Please log in.');
  }

  if (response.status === 204) {
    return {} as T;
  }

  let data: any;
  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    const errorMsg = Array.isArray(data.message) ? data.message.join(', ') : (data.message || 'An error occurred');
    throw new ApiError(response.status, data.code || 'REQUEST_FAILED', errorMsg);
  }

  return data as T;
}

export const api = {
  // Auth
  register: (body: { username: string; email: string; password: string; displayName: string }) =>
    request<{ accessToken: string; tokenType: string; expiresIn: number; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  login: (body: { usernameOrEmail: string; password: string }) =>
    request<{ accessToken: string; tokenType: string; expiresIn: number; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  getMe: () => request<User>('/auth/me'),

  updateMe: (body: { displayName?: string; bio?: string | null }) =>
    request<User>('/users/me', {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  getUserProfile: (id: number) =>
    request<{ user: User; stats: UserStats }>(`/users/${id}/profile`),

  // Questions
  getQuestions: (params?: { category?: string; difficulty?: string; type?: string; ownerId?: number; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.category) query.set('category', params.category);
    if (params?.difficulty) query.set('difficulty', params.difficulty);
    if (params?.type) query.set('type', params.type);
    if (params?.ownerId) query.set('ownerId', String(params.ownerId));
    if (params?.search) query.set('search', params.search);
    const qs = query.toString();
    return request<Question[]>(`/questions${qs ? `?${qs}` : ''}`);
  },

  getQuestionById: (id: number) => request<Question>(`/questions/${id}`),

  createQuestion: (body: any) =>
    request<Question>('/questions', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  updateQuestion: (id: number, body: any) =>
    request<Question>(`/questions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  deleteQuestion: (id: number) =>
    request<void>(`/questions/${id}`, {
      method: 'DELETE',
    }),

  // Interviews
  getInterviews: (params?: { category?: string; difficulty?: string; ownerId?: number; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.category) query.set('category', params.category);
    if (params?.difficulty) query.set('difficulty', params.difficulty);
    if (params?.ownerId) query.set('ownerId', String(params.ownerId));
    if (params?.search) query.set('search', params.search);
    const qs = query.toString();
    return request<InterviewSummary[]>(`/interviews${qs ? `?${qs}` : ''}`);
  },

  getInterviewById: (id: number) => request<InterviewDetail>(`/interviews/${id}`),

  createInterview: (body: {
    title: string;
    description: string;
    category: string;
    difficulty: string;
    questionIds: number[];
    timeLimitSeconds: number;
  }) =>
    request<InterviewDetail>('/interviews', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  updateInterview: (id: number, body: any) =>
    request<InterviewDetail>(`/interviews/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  deleteInterview: (id: number) =>
    request<void>(`/interviews/${id}`, {
      method: 'DELETE',
    }),

  // Attempts
  startAttempt: (interviewId: number) =>
    request<Attempt>('/attempts', {
      method: 'POST',
      body: JSON.stringify({ interviewId }),
    }),

  getAttempts: (params?: { status?: string; interviewId?: number; all?: boolean }) => {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.interviewId) query.set('interviewId', String(params.interviewId));
    if (params?.all) query.set('all', 'true');
    const qs = query.toString();
    return request<Attempt[]>(`/attempts${qs ? `?${qs}` : ''}`);
  },

  getAttemptById: (id: number) => request<Attempt>(`/attempts/${id}`),

  submitAnswer: (attemptId: number, body: { questionId: number; answer: any }) =>
    request<{ questionId: number; accepted: boolean; submittedAt: string }>(`/attempts/${attemptId}/answers`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  finishAttempt: (attemptId: number) =>
    request<Attempt>(`/attempts/${attemptId}/finish`, {
      method: 'POST',
    }),

  getAttemptResults: (attemptId: number) => request<AttemptResult>(`/attempts/${attemptId}/results`),

  // Admin supervision
  getAdminOverview: () => request<any>('/admin/overview'),

  updateUserRole: (userId: number, role: string) =>
    request<any>(`/admin/users/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    }),

  resetSeeds: () => request<any>('/admin/reset', { method: 'POST' }),
};

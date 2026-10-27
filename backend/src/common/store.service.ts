import { Injectable } from '@nestjs/common';

export type Difficulty = 'easy' | 'medium' | 'hard';
export type QuestionType = 'multiple_choice' | 'short_answer' | 'code_output';
export type AttemptStatus = 'in_progress' | 'finished' | 'timed_out';
export type Readiness = 'needs_practice' | 'almost_ready' | 'ready';

export interface UserRecord {
  id: number;
  username: string;
  email: string;
  passwordHash: string;
  displayName: string;
  bio: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface QuestionChoice {
  id: string;
  text: string;
  isCorrect?: boolean;
}

export interface QuestionRecord {
  id: number;
  ownerId: number;
  ownerUsername: string | null;
  prompt: string;
  category: string;
  difficulty: Difficulty;
  type: QuestionType;
  choices: QuestionChoice[] | null;
  codeSnippet: string | null;
  expectedKeywords: string[] | null;
  requiredKeywordCount: number | null;
  expectedOutput: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InterviewRecord {
  id: number;
  ownerId: number;
  ownerUsername: string | null;
  title: string;
  description: string;
  category: string;
  difficulty: Difficulty;
  questionIds: number[];
  timeLimitSeconds: number;
  createdAt: string;
  updatedAt: string;
}

export interface AttemptAnswer {
  type: QuestionType;
  choiceId?: string;
  text?: string;
}

export interface AttemptQuestionSnapshot {
  questionId: number;
  position: number;
  prompt: string;
  type: QuestionType;
  difficulty: Difficulty;
  category: string;
  choices: Array<{ id: string; text: string }> | null;
  codeSnippet: string | null;
  expectedKeywords: string[] | null;
  requiredKeywordCount: number | null;
  expectedOutput: string | null;
  isCorrect?: boolean | string | null;
}

export interface AttemptRecord {
  id: number;
  interviewId: number;
  interviewTitle: string;
  userId: number;
  status: AttemptStatus;
  startedAt: string;
  deadlineAt: string;
  finishedAt: string | null;
  timeLimitSeconds: number;
  questions: AttemptQuestionSnapshot[];
  answers: Record<number, AttemptAnswer>;
  score: number | null;
  maxScore: number | null;
  percentage: number | null;
  readiness: Readiness | null;
}

@Injectable()
export class InMemoryStore {
  users: UserRecord[] = [];
  questions: QuestionRecord[] = [];
  interviews: InterviewRecord[] = [];
  attempts: AttemptRecord[] = [];

  private nextIds: Record<string, number> = { users: 1, questions: 1, interviews: 1, attempts: 1 };

  nextId(kind: 'users' | 'questions' | 'interviews' | 'attempts') {
    const value = this.nextIds[kind] ?? 1;
    this.nextIds[kind] = value + 1;
    return value;
  }

  getUserById(id: number) {
    return this.users.find((user) => user.id === id) ?? null;
  }

  getQuestionById(id: number) {
    return this.questions.find((question) => question.id === id) ?? null;
  }

  getInterviewById(id: number) {
    return this.interviews.find((interview) => interview.id === id) ?? null;
  }

  getAttemptById(id: number) {
    return this.attempts.find((attempt) => attempt.id === id) ?? null;
  }

  getOwnerUsername(userId: number) {
    const user = this.getUserById(userId);
    return user?.username ?? null;
  }
}

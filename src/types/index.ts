export type Difficulty = 'easy' | 'medium' | 'hard';
export type QuestionType = 'multiple_choice' | 'short_answer' | 'code_output';
export type AttemptStatus = 'in_progress' | 'finished' | 'timed_out';
export type ReadinessLevel = 'needs_practice' | 'almost_ready' | 'ready';
export type UserRole = 'user' | 'author' | 'admin';

export interface User {
  id: number;
  username: string;
  email?: string;
  displayName: string;
  bio: string | null;
  role: UserRole;
  createdAt: string;
}

export interface UserStats {
  questionsCreated: number;
  interviewsCreated: number;
  attemptsCompleted: number;
  attemptsInProgress: number;
  questionsAnswered: number;
  averagePercentage: number | null;
  bestPercentage: number | null;
}

export interface Choice {
  id: string;
  text: string;
  isCorrect?: boolean;
}

export interface Question {
  id: number;
  ownerId: number;
  ownerUsername: string;
  prompt: string;
  category: string;
  difficulty: Difficulty;
  type: QuestionType;
  choices?: Choice[] | null;
  codeSnippet?: string | null;
  expectedKeywords?: string[] | null;
  requiredKeywordCount?: number | null;
  expectedOutput?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface InterviewSummary {
  id: number;
  ownerId: number;
  ownerUsername: string;
  title: string;
  description: string;
  category: string;
  difficulty: Difficulty;
  questionCount: number;
  timeLimitSeconds: number;
  createdAt: string;
  updatedAt?: string;
}

export interface InterviewDetail extends InterviewSummary {
  questions: Question[];
}

export interface AttemptQuestion {
  questionId: number;
  position: number;
  prompt: string;
  type: QuestionType;
  difficulty: Difficulty;
  category: string;
  choices?: { id: string; text: string }[] | null;
  codeSnippet?: string | null;
}

export interface Attempt {
  id: number;
  interviewId: number;
  interviewTitle: string;
  userId: number;
  status: AttemptStatus;
  startedAt: string;
  deadlineAt: string;
  finishedAt: string | null;
  timeLimitSeconds: number;
  questions: AttemptQuestion[];
  answeredQuestionIds: number[];
  score: number | null;
  maxScore: number | null;
  percentage: number | null;
  readiness: ReadinessLevel | null;
}

export interface AttemptResultItem {
  questionId: number;
  position: number;
  prompt: string;
  type: QuestionType;
  submitted: { choiceId?: string; text?: string } | null;
  expected: {
    correctChoiceId?: string;
    expectedKeywords?: string[];
    requiredKeywordCount?: number;
    expectedOutput?: string;
  };
  points: number;
  maxPoints: number;
  explanation: string;
}

export interface AttemptResult {
  attemptId: number;
  interviewId: number;
  interviewTitle: string;
  status: AttemptStatus;
  startedAt: string;
  finishedAt: string;
  score: number;
  maxScore: number;
  percentage: number;
  readiness: ReadinessLevel;
  items: AttemptResultItem[];
}

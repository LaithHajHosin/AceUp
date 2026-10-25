export type Difficulty = "easy" | "medium" | "hard";

export type QuestionType = "multiple_choice" | "short_answer" | "code_output";

export interface QuestionChoice {
  id: number;
  text: string;
}

export interface PublicQuestion {
  id: number;
  ownerId: number;
  ownerUsername: string;
  prompt: string;
  category: string;
  difficulty: Difficulty;
  type: QuestionType;
  choices: QuestionChoice[] | null;
  codeSnippet: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InterviewFilters {
  category?: string;
  difficulty?: Difficulty;
  ownerId?: number;
  search?: string;
}

export interface InterviewInput {
  title: string;
  description: string;
  category: string;
  difficulty: Difficulty;
  questionIds: number[];
  timeLimitSeconds: number;
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
  updatedAt: string;
}

export interface InterviewDetail extends InterviewSummary {
  questions: PublicQuestion[];
}

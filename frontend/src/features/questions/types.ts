export type Difficulty = "easy" | "medium" | "hard";
export type QuestionType = "multiple_choice" | "short_answer" | "code_output";

export interface QuestionChoice {
  id: string;
  text: string;
  isCorrect?: boolean;
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

export interface OwnerQuestion extends PublicQuestion {
  choices: QuestionChoice[] | null;
  expectedKeywords: string[] | null;
  requiredKeywordCount: number | null;
  expectedOutput: string | null;
}

export interface QuestionInput {
  prompt: string;
  category: string;
  difficulty: Difficulty;
  type: QuestionType;
  choices?: QuestionChoice[];
  codeSnippet?: string | null;
  expectedKeywords?: string[];
  requiredKeywordCount?: number;
  expectedOutput?: string;
}

export interface QuestionFilters {
  category?: string;
  difficulty?: Difficulty | "";
  type?: QuestionType | "";
  ownerId?: number;
  search?: string;
}

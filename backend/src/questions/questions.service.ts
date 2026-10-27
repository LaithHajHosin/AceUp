import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InMemoryStore, type Difficulty, type QuestionRecord, type QuestionType } from '../common/store.service.js';

export interface QuestionFilterInput {
  category?: string;
  difficulty?: Difficulty;
  type?: QuestionType;
  ownerId?: string;
  search?: string;
}

export interface CreateQuestionInput {
  prompt: string;
  category: string;
  difficulty: Difficulty;
  type: QuestionType;
  choices?: Array<{ id: string; text: string; isCorrect?: boolean }>;
  expectedKeywords?: string[];
  requiredKeywordCount?: number;
  codeSnippet?: string;
  expectedOutput?: string;
}

@Injectable()
export class QuestionsService {
  constructor(private readonly store: InMemoryStore) {}

  private normalizeCategory(value: string) {
    return value.trim().toLowerCase();
  }

  private toPublicQuestion(question: QuestionRecord) {
    return {
      id: question.id,
      ownerId: question.ownerId,
      ownerUsername: question.ownerUsername,
      prompt: question.prompt,
      category: question.category,
      difficulty: question.difficulty,
      type: question.type,
      choices: question.type === 'multiple_choice' ? (question.choices ?? []).map(({ id, text }) => ({ id, text })) : null,
      codeSnippet: question.type === 'code_output' ? question.codeSnippet : null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  private toOwnerQuestion(question: QuestionRecord) {
    return {
      ...this.toPublicQuestion(question),
      choices: question.choices,
      expectedKeywords: question.expectedKeywords,
      requiredKeywordCount: question.requiredKeywordCount,
      expectedOutput: question.expectedOutput,
    };
  }

  private validateQuestionBody(body: CreateQuestionInput) {
    const prompt = String(body.prompt ?? '').trim();
    if (prompt.length < 5 || prompt.length > 2000) {
      throw new BadRequestException({ code: 'VALIDATION_FAILED', message: 'Prompt must be 5-2000 characters.' });
    }

    const category = this.normalizeCategory(body.category ?? '');
    if (category.length < 2 || category.length > 40) {
      throw new BadRequestException({ code: 'VALIDATION_FAILED', message: 'Category must be 2-40 characters.' });
    }

    const difficulty = body.difficulty;
    if (!['easy', 'medium', 'hard'].includes(difficulty)) {
      throw new BadRequestException({ code: 'VALIDATION_FAILED', message: 'Difficulty is invalid.' });
    }

    const type = body.type;
    if (!['multiple_choice', 'short_answer', 'code_output'].includes(type)) {
      throw new BadRequestException({ code: 'VALIDATION_FAILED', message: 'Question type is invalid.' });
    }

    if (type === 'multiple_choice') {
      const choices = Array.isArray(body.choices) ? body.choices : [];
      if (choices.length < 2 || choices.length > 6) {
        throw new BadRequestException({ code: 'VALIDATION_FAILED', message: 'Multiple choice questions need 2-6 choices.' });
      }
      if (choices.some((choice) => typeof choice.id !== 'string' || choice.id.length < 1 || choice.id.length > 10)) {
        throw new BadRequestException({ code: 'VALIDATION_FAILED', message: 'Choice ids must be 1-10 characters.' });
      }
      const ids = new Set<string>();
      for (const choice of choices) {
        if (ids.has(choice.id)) {
          throw new BadRequestException({ code: 'VALIDATION_FAILED', message: 'Choice ids must be unique.' });
        }
        ids.add(choice.id);
      }
      const correctCount = choices.filter((choice) => choice.isCorrect === true).length;
      if (correctCount !== 1) {
        throw new BadRequestException({ code: 'VALIDATION_FAILED', message: 'Exactly one correct answer is required.' });
      }
      return { ...body, prompt, category, difficulty, type, choices: choices.map(({ id, text, isCorrect }) => ({ id, text: String(text ?? '').trim(), isCorrect: Boolean(isCorrect) })) };
    }

    if (type === 'short_answer') {
      const keywords = Array.isArray(body.expectedKeywords) ? body.expectedKeywords.map((word) => String(word).trim().toLowerCase()).filter(Boolean) : [];
      if (keywords.length < 2 || keywords.length > 6) {
        throw new BadRequestException({ code: 'VALIDATION_FAILED', message: 'Short answer questions need 2-6 keywords.' });
      }
      const requiredCount = Number(body.requiredKeywordCount ?? 1);
      if (!Number.isInteger(requiredCount) || requiredCount < 1 || requiredCount > keywords.length) {
        throw new BadRequestException({ code: 'VALIDATION_FAILED', message: 'requiredKeywordCount is invalid.' });
      }
      return { ...body, prompt, category, difficulty, type, expectedKeywords: keywords, requiredKeywordCount: requiredCount };
    }

    const expectedOutput = String(body.expectedOutput ?? '').trim();
    const codeSnippet = body.codeSnippet === undefined ? null : String(body.codeSnippet ?? '').slice(0, 5000);
    if (!expectedOutput) {
      throw new BadRequestException({ code: 'VALIDATION_FAILED', message: 'Expected output is required.' });
    }
    return { ...body, prompt, category, difficulty, type, codeSnippet, expectedOutput };
  }

  listQuestions(filters: QuestionFilterInput) {
    const normalized = this.store.questions.filter((question) => {
      const matchesCategory = !filters.category || question.category === this.normalizeCategory(filters.category);
      const matchesDifficulty = !filters.difficulty || question.difficulty === filters.difficulty;
      const matchesType = !filters.type || question.type === filters.type;
      const matchesOwner = !filters.ownerId || String(question.ownerId) === String(filters.ownerId);
      const matchesSearch = !filters.search || question.prompt.toLowerCase().includes(filters.search.toLowerCase());
      return matchesCategory && matchesDifficulty && matchesType && matchesOwner && matchesSearch;
    });

    return {
      items: [...normalized].sort((a, b) => b.id - a.id).map((question) => ({
        ...this.toPublicQuestion(question),
        createdAt: question.createdAt,
        updatedAt: question.updatedAt,
      })),
    };
  }

  getQuestion(userId: number, questionId: number) {
    const question = this.store.getQuestionById(questionId);
    if (!question) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Question not found.' });
    }
    return question.ownerId === userId ? this.toOwnerQuestion(question) : this.toPublicQuestion(question);
  }

  createQuestion(userId: number, body: CreateQuestionInput) {
    const cleaned = this.validateQuestionBody(body);
    const now = new Date().toISOString();
    const question: QuestionRecord = {
      id: this.store.nextId('questions'),
      ownerId: userId,
      ownerUsername: this.store.getOwnerUsername(userId),
      prompt: cleaned.prompt,
      category: cleaned.category,
      difficulty: cleaned.difficulty,
      type: cleaned.type,
      choices: cleaned.type === 'multiple_choice' ? cleaned.choices ?? null : null,
      codeSnippet: cleaned.type === 'code_output' ? cleaned.codeSnippet ?? null : null,
      expectedKeywords: cleaned.type === 'short_answer' ? cleaned.expectedKeywords ?? null : null,
      requiredKeywordCount: cleaned.type === 'short_answer' ? cleaned.requiredKeywordCount ?? null : null,
      expectedOutput: cleaned.type === 'code_output' ? cleaned.expectedOutput ?? null : null,
      createdAt: now,
      updatedAt: now,
    };
    this.store.questions.push(question);
    return this.toOwnerQuestion(question);
  }

  updateQuestion(userId: number, questionId: number, body: Partial<CreateQuestionInput>) {
    const question = this.store.getQuestionById(questionId);
    if (!question) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Question not found.' });
    }
    if (question.ownerId !== userId) {
      throw new ForbiddenException({ code: 'NOT_OWNER', message: 'You can only edit your own question.' });
    }

    const updatedInput = this.validateQuestionBody({
      ...question,
      ...body,
      type: body.type ?? question.type,
      prompt: body.prompt ?? question.prompt,
      category: body.category ?? question.category,
      difficulty: body.difficulty ?? question.difficulty,
    } as CreateQuestionInput);

    question.prompt = updatedInput.prompt;
    question.category = updatedInput.category;
    question.difficulty = updatedInput.difficulty;
    question.type = updatedInput.type;
    question.choices = updatedInput.type === 'multiple_choice' ? updatedInput.choices ?? null : null;
    question.codeSnippet = updatedInput.type === 'code_output' ? updatedInput.codeSnippet ?? null : null;
    question.expectedKeywords = updatedInput.type === 'short_answer' ? updatedInput.expectedKeywords ?? null : null;
    question.requiredKeywordCount = updatedInput.type === 'short_answer' ? updatedInput.requiredKeywordCount ?? null : null;
    question.expectedOutput = updatedInput.type === 'code_output' ? updatedInput.expectedOutput ?? null : null;
    question.updatedAt = new Date().toISOString();
    return this.toOwnerQuestion(question);
  }

  deleteQuestion(userId: number, questionId: number) {
    const question = this.store.getQuestionById(questionId);
    if (!question) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Question not found.' });
    }
    if (question.ownerId !== userId) {
      throw new ForbiddenException({ code: 'NOT_OWNER', message: 'You can only delete your own question.' });
    }

    const inInterview = this.store.interviews.some((interview) => interview.questionIds.includes(questionId));
    const inAttempt = this.store.attempts.some((attempt) => attempt.questions.some((item) => item.questionId === questionId));
    if (inInterview || inAttempt) {
      throw new ConflictException({ code: 'QUESTION_IN_USE', message: 'This question is in use by an interview or attempt snapshot.' });
    }

    this.store.questions = this.store.questions.filter((item) => item.id !== questionId);
    return null;
  }
}

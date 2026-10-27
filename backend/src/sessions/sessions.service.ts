import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InMemoryStore, type QuestionRecord } from '../common/store.service.js';

export interface CreateSessionInput {
  displayName: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  questionCount: number;
}

export interface SessionAnswerInput {
  questionId: number;
  answer: { type: string; choiceId?: string; text?: string };
}

export interface SessionResponse {
  id: number;
  displayName: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  questionCount: number;
  status: 'in_progress' | 'finished' | 'timed_out';
  startedAt: string;
  deadlineAt: string;
  timePerQuestionSeconds: number;
  questions: any[];
  answers: Record<number, { type: string; choiceId?: string; text?: string }>;
  finishedAt: string | null;
}

@Injectable()
export class SessionsService {
  constructor(private readonly store: InMemoryStore) {}

  private sessions: SessionResponse[] = [];

  private normalizeCategory(value: string) {
    return value.trim().toLowerCase();
  }

  private safeQuestion(question: QuestionRecord) {
    return {
      id: question.id,
      prompt: question.prompt,
      category: question.category,
      difficulty: question.difficulty,
      type: question.type,
      choices:
        question.type === 'multiple_choice'
          ? (question.choices ?? []).map(({ id, text }) => ({ id, text }))
          : undefined,
      codeSnippet: question.type === 'code_output' ? question.codeSnippet ?? undefined : undefined,
    };
  }

  createSession(userId: number, input: CreateSessionInput) {
    const displayName = String(input.displayName ?? '').trim();
    const category = this.normalizeCategory(input.category ?? '');
    const difficulty = input.difficulty;
    const questionCount = Number(input.questionCount ?? 5);

    if (!displayName || displayName.length > 80) {
      throw new BadRequestException({ code: 'VALIDATION_FAILED', message: 'Display name must be 1-80 chars.' });
    }
    if (!category || category.length < 2 || category.length > 40) {
      throw new BadRequestException({ code: 'VALIDATION_FAILED', message: 'Category is required.' });
    }
    if (!['easy', 'medium', 'hard'].includes(difficulty)) {
      throw new BadRequestException({ code: 'VALIDATION_FAILED', message: 'Difficulty is invalid.' });
    }
    if (!Number.isInteger(questionCount) || questionCount < 5 || questionCount > 10) {
      throw new BadRequestException({ code: 'VALIDATION_FAILED', message: 'Question count must be between 5 and 10.' });
    }

    const matchingQuestions = this.store.questions
      .filter((question) => question.category === category && question.difficulty === difficulty)
      .sort((a, b) => b.id - a.id)
      .slice(0, questionCount);

    if (matchingQuestions.length < questionCount) {
      throw new BadRequestException({
        code: 'INSUFFICIENT_QUESTIONS',
        message: 'Not enough matching questions are available.',
        details: { availableCount: matchingQuestions.length },
      });
    }

    const startedAt = new Date();
    const timePerQuestionSeconds = 90;
    const deadlineAt = new Date(startedAt.getTime() + questionCount * timePerQuestionSeconds * 1000).toISOString();

    const session: SessionResponse = {
      id: this.sessions.length + 1 + this.store.attempts.length,
      displayName,
      category,
      difficulty,
      questionCount,
      status: 'in_progress',
      startedAt: startedAt.toISOString(),
      deadlineAt,
      timePerQuestionSeconds,
      questions: matchingQuestions.map((question) => this.safeQuestion(question)),
      answers: {},
      finishedAt: null,
    };

    this.sessions.push(session);
    return session;
  }

  getSession(sessionId: number) {
    const session = this.sessions.find((item) => item.id === sessionId);
    if (!session) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Session not found.' });
    }
    return session;
  }

  submitAnswer(sessionId: number, input: SessionAnswerInput) {
    const session = this.getSession(sessionId);
    if (session.status !== 'in_progress') {
      throw new ConflictException({ code: 'SESSION_NOT_ACTIVE', message: 'This session has ended.' });
    }

    const question = session.questions.find((item: any) => item.id === input.questionId);
    if (!question) {
      throw new BadRequestException({ code: 'QUESTION_NOT_IN_ATTEMPT', message: 'Question not in this session.' });
    }
    if (session.answers[input.questionId]) {
      throw new ConflictException({ code: 'DUPLICATE_ANSWER', message: 'Answer already submitted.' });
    }
    const answer = input.answer;
    if (answer.type !== question.type) {
      throw new BadRequestException({ code: 'ANSWER_TYPE_MISMATCH', message: 'Answer type does not match the question type.' });
    }
    if (question.type === 'multiple_choice' && answer.choiceId) {
      const valid = (question.choices ?? []).some((choice: any) => choice.id === answer.choiceId);
      if (!valid) {
        throw new BadRequestException({ code: 'INVALID_CHOICE', message: 'Invalid choice.' });
      }
    }

    session.answers[input.questionId] = answer;
    return { questionId: input.questionId, accepted: true, submittedAt: new Date().toISOString() };
  }

  finishSession(sessionId: number) {
    const session = this.getSession(sessionId);
    if (session.status !== 'in_progress') {
      throw new ConflictException({ code: 'SESSION_NOT_ACTIVE', message: 'This session has already ended.' });
    }
    session.status = 'finished';
    session.finishedAt = new Date().toISOString();
    return session;
  }
}

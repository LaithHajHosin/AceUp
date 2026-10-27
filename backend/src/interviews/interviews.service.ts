import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InMemoryStore, type Difficulty, type InterviewRecord } from '../common/store.service.js';

export interface CreateInterviewInput {
  title: string;
  description?: string;
  category: string;
  difficulty: Difficulty;
  questionIds: number[];
  timeLimitSeconds: number;
}

@Injectable()
export class InterviewsService {
  constructor(private readonly store: InMemoryStore) {}

  private normalizeCategory(value: string) {
    return value.trim().toLowerCase();
  }

  private summarizeInterview(interview: InterviewRecord) {
    return {
      id: interview.id,
      ownerId: interview.ownerId,
      ownerUsername: interview.ownerUsername,
      title: interview.title,
      description: interview.description,
      category: interview.category,
      difficulty: interview.difficulty,
      questionCount: interview.questionIds.length,
      timeLimitSeconds: interview.timeLimitSeconds,
      createdAt: interview.createdAt,
      updatedAt: interview.updatedAt,
    };
  }

  private toDetail(interview: InterviewRecord) {
    const questions = interview.questionIds
      .map((questionId) => this.store.getQuestionById(questionId))
      .filter(Boolean)
      .map((question) => ({
        id: question!.id,
        ownerId: question!.ownerId,
        ownerUsername: question!.ownerUsername,
        prompt: question!.prompt,
        category: question!.category,
        difficulty: question!.difficulty,
        type: question!.type,
        choices:
          question!.type === 'multiple_choice'
            ? (question!.choices ?? []).map(({ id, text }) => ({ id, text }))
            : null,
        codeSnippet: question!.type === 'code_output' ? question!.codeSnippet : null,
        createdAt: question!.createdAt,
        updatedAt: question!.updatedAt,
      }));

    return {
      ...this.summarizeInterview(interview),
      questions,
    };
  }

  listInterviews(filters: { category?: string; difficulty?: Difficulty | string; ownerId?: string; search?: string }) {
    const items = this.store.interviews.filter((interview) => {
      const matchesCategory = !filters.category || interview.category === this.normalizeCategory(filters.category);
      const matchesDifficulty = !filters.difficulty || interview.difficulty === String(filters.difficulty) as Difficulty;
      const matchesOwner = !filters.ownerId || String(interview.ownerId) === String(filters.ownerId);
      const matchesSearch = !filters.search || interview.title.toLowerCase().includes(filters.search.toLowerCase());
      return matchesCategory && matchesDifficulty && matchesOwner && matchesSearch;
    });

    return [...items].sort((a, b) => b.id - a.id).map((item) => this.summarizeInterview(item));
  }

  getInterview(interviewId: number) {
    const interview = this.store.getInterviewById(interviewId);
    if (!interview) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Interview not found.' });
    }
    return this.toDetail(interview);
  }

  private validateInput(body: CreateInterviewInput) {
    const title = String(body.title ?? '').trim();
    if (title.length < 3 || title.length > 100) {
      throw new BadRequestException({ code: 'VALIDATION_FAILED', message: 'Title must be 3-100 chars.' });
    }

    const description = String(body.description ?? '').trim();
    if (description.length > 1000) {
      throw new BadRequestException({ code: 'VALIDATION_FAILED', message: 'Description must be 1000 chars or fewer.' });
    }

    const category = this.normalizeCategory(body.category ?? '');
    if (category.length < 2 || category.length > 40) {
      throw new BadRequestException({ code: 'VALIDATION_FAILED', message: 'Category must be 2-40 chars.' });
    }

    const questionIds = Array.isArray(body.questionIds) ? body.questionIds.map(Number) : [];
    if (questionIds.length < 1 || questionIds.length > 20 || new Set(questionIds).size !== questionIds.length) {
      throw new BadRequestException({ code: 'VALIDATION_FAILED', message: 'Question IDs must be unique and total 1-20.' });
    }
    for (const id of questionIds) {
      if (!Number.isInteger(id) || id <= 0) {
        throw new BadRequestException({ code: 'QUESTION_NOT_FOUND_IN_LIST', message: 'Question IDs must be positive integers.' });
      }
    }
    if (questionIds.some((questionId) => !this.store.getQuestionById(questionId))) {
      throw new BadRequestException({ code: 'QUESTION_NOT_FOUND_IN_LIST', message: 'One or more question IDs do not exist.' });
    }

    const timeLimitSeconds = Number(body.timeLimitSeconds ?? 0);
    if (!Number.isInteger(timeLimitSeconds) || timeLimitSeconds < 30 || timeLimitSeconds > 3600) {
      throw new BadRequestException({ code: 'VALIDATION_FAILED', message: 'Time limit must be 30-3600 seconds.' });
    }

    return {
      title,
      description,
      category,
      difficulty: body.difficulty,
      questionIds,
      timeLimitSeconds,
    };
  }

  createInterview(userId: number, body: CreateInterviewInput) {
    const valid = this.validateInput(body);
    const now = new Date().toISOString();
    const created: InterviewRecord = {
      id: this.store.nextId('interviews'),
      ownerId: userId,
      ownerUsername: this.store.getOwnerUsername(userId),
      title: valid.title,
      description: valid.description,
      category: valid.category,
      difficulty: valid.difficulty,
      questionIds: valid.questionIds,
      timeLimitSeconds: valid.timeLimitSeconds,
      createdAt: now,
      updatedAt: now,
    };

    this.store.interviews.push(created);
    return this.toDetail(created);
  }

  updateInterview(userId: number, interviewId: number, body: Partial<CreateInterviewInput>) {
    const interview = this.store.getInterviewById(interviewId);
    if (!interview) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Interview not found.' });
    }
    if (interview.ownerId !== userId) {
      throw new ForbiddenException({ code: 'NOT_OWNER', message: 'You can only update your own interview.' });
    }

    const next = this.validateInput({
      title: body.title ?? interview.title,
      description: body.description ?? interview.description,
      category: body.category ?? interview.category,
      difficulty: body.difficulty ?? interview.difficulty,
      questionIds: body.questionIds ?? interview.questionIds,
      timeLimitSeconds: body.timeLimitSeconds ?? interview.timeLimitSeconds,
    });

    interview.title = next.title;
    interview.description = next.description;
    interview.category = next.category;
    interview.difficulty = next.difficulty;
    interview.questionIds = next.questionIds;
    interview.timeLimitSeconds = next.timeLimitSeconds;
    interview.updatedAt = new Date().toISOString();
    return this.toDetail(interview);
  }

  deleteInterview(userId: number, interviewId: number) {
    const interview = this.store.getInterviewById(interviewId);
    if (!interview) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Interview not found.' });
    }
    if (interview.ownerId !== userId) {
      throw new ForbiddenException({ code: 'NOT_OWNER', message: 'You can only delete your own interview.' });
    }

    this.store.interviews = this.store.interviews.filter((item) => item.id !== interviewId);
    return null;
  }
}

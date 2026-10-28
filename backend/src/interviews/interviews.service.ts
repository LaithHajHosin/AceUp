import { Injectable, BadRequestException, NotFoundException, ForbiddenException, Inject } from '@nestjs/common';
import { DatabaseService, InterviewEntity } from '../database/database.service.js';
import { CreateInterviewDto, UpdateInterviewDto } from './dto/interview.dto.js';

@Injectable()
export class InterviewsService {
  constructor(@Inject(DatabaseService) private db: DatabaseService) {}

  private isOwnerOrAdmin(item: InterviewEntity, userId: number): boolean {
    const user = this.db.users.find(u => u.id === userId);
    return item.ownerId === userId || user?.role === 'admin' || user?.username === 'admin';
  }

  async findAll(query: { category?: string; difficulty?: string; ownerId?: number; search?: string }) {
    let list = [...this.db.interviews];

    if (query.category) {
      list = list.filter(i => i.category.toLowerCase() === query.category!.toLowerCase());
    }
    if (query.difficulty) {
      list = list.filter(i => i.difficulty === query.difficulty);
    }
    if (query.ownerId) {
      list = list.filter(i => i.ownerId === query.ownerId);
    }
    if (query.search) {
      const sub = query.search.toLowerCase();
      list = list.filter(i => i.title.toLowerCase().includes(sub) || i.description.toLowerCase().includes(sub));
    }

    list.sort((a, b) => b.id - a.id);

    return list.map(i => ({
      id: i.id,
      ownerId: i.ownerId,
      ownerUsername: i.ownerUsername,
      title: i.title,
      description: i.description,
      category: i.category,
      difficulty: i.difficulty,
      questionCount: i.questionIds.length,
      timeLimitSeconds: i.timeLimitSeconds,
      createdAt: i.createdAt,
      updatedAt: i.updatedAt,
    }));
  }

  async findOne(id: number) {
    const interview = this.db.interviews.find(i => i.id === id);
    if (!interview) {
      throw new NotFoundException({
        statusCode: 404,
        error: 'Not Found',
        code: 'NOT_FOUND',
        message: 'Interview not found',
      });
    }

    // Map questions in questionIds order, always public form (Contract Section 6)
    const questions: any[] = [];
    interview.questionIds.forEach(qId => {
      const q = this.db.questions.find(item => item.id === qId);
      if (q) {
        questions.push({
          id: q.id,
          ownerId: q.ownerId,
          ownerUsername: q.ownerUsername,
          prompt: q.prompt,
          category: q.category,
          difficulty: q.difficulty,
          type: q.type,
          choices: q.choices ? q.choices.map(c => ({ id: c.id, text: c.text })) : null,
          codeSnippet: q.type === 'code_output' ? q.codeSnippet : null,
          createdAt: q.createdAt,
          updatedAt: q.updatedAt,
        });
      }
    });

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
      questions,
      createdAt: interview.createdAt,
      updatedAt: interview.updatedAt,
    };
  }

  async create(dto: CreateInterviewDto, userId: number, username: string) {
    const { title, description, category, difficulty, questionIds, timeLimitSeconds } = dto;

    if (!Array.isArray(questionIds) || questionIds.length < 1 || questionIds.length > 20) {
      throw new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        code: 'VALIDATION_FAILED',
        message: 'questionIds must be 1 to 20 distinct integers',
      });
    }

    const distinct = Array.from(new Set(questionIds.map(Number)));
    if (distinct.length !== questionIds.length) {
      throw new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        code: 'VALIDATION_FAILED',
        message: 'questionIds must be distinct integers',
      });
    }

    // All must exist (Contract Section 6)
    for (const qId of distinct) {
      if (!this.db.questions.some(q => q.id === qId)) {
        throw new BadRequestException({
          statusCode: 400,
          error: 'Bad Request',
          code: 'QUESTION_NOT_FOUND_IN_LIST',
          message: `Question with id ${qId} does not exist`,
        });
      }
    }

    const id = this.db.getNextId('interviews');
    const now = new Date().toISOString();

    const newInterview: InterviewEntity = {
      id,
      ownerId: userId,
      ownerUsername: username,
      title: title.trim(),
      description: (description || '').trim(),
      category: category.trim().toLowerCase(),
      difficulty,
      questionIds: distinct,
      timeLimitSeconds,
      createdAt: now,
      updatedAt: now,
    };

    this.db.interviews.push(newInterview);
    this.db.saveToDisk();

    return this.findOne(newInterview.id);
  }

  async update(id: number, dto: UpdateInterviewDto, userId: number) {
    const interview = this.db.interviews.find(i => i.id === id);
    if (!interview) {
      throw new NotFoundException({ statusCode: 404, error: 'Not Found', code: 'NOT_FOUND', message: 'Interview not found' });
    }

    if (!this.isOwnerOrAdmin(interview, userId)) {
      throw new ForbiddenException({ statusCode: 403, error: 'Forbidden', code: 'NOT_OWNER', message: 'Only owner or admin can edit this interview' });
    }

    if (dto.title !== undefined) interview.title = dto.title.trim();
    if (dto.description !== undefined) interview.description = (dto.description || '').trim();
    if (dto.category !== undefined) interview.category = dto.category.trim().toLowerCase();
    if (dto.difficulty !== undefined) interview.difficulty = dto.difficulty;
    if (dto.timeLimitSeconds !== undefined) interview.timeLimitSeconds = dto.timeLimitSeconds;

    if (dto.questionIds !== undefined) {
      if (!Array.isArray(dto.questionIds) || dto.questionIds.length < 1 || dto.questionIds.length > 20) {
        throw new BadRequestException({ statusCode: 400, error: 'Bad Request', code: 'VALIDATION_FAILED', message: 'questionIds must be 1 to 20' });
      }
      for (const qId of dto.questionIds) {
        if (!this.db.questions.some(q => q.id === qId)) {
          throw new BadRequestException({ statusCode: 400, error: 'Bad Request', code: 'QUESTION_NOT_FOUND_IN_LIST', message: `Question ${qId} does not exist` });
        }
      }
      interview.questionIds = dto.questionIds;
    }

    interview.updatedAt = new Date().toISOString();
    this.db.saveToDisk();

    return this.findOne(interview.id);
  }

  async remove(id: number, userId: number) {
    const index = this.db.interviews.findIndex(i => i.id === id);
    if (index === -1) {
      throw new NotFoundException({ statusCode: 404, error: 'Not Found', code: 'NOT_FOUND', message: 'Interview not found' });
    }

    const interview = this.db.interviews[index];
    if (!this.isOwnerOrAdmin(interview, userId)) {
      throw new ForbiddenException({ statusCode: 403, error: 'Forbidden', code: 'NOT_OWNER', message: 'Only owner or admin can delete this interview' });
    }

    this.db.interviews.splice(index, 1);
    this.db.saveToDisk();
    // Existing attempts keep their snapshot and still show results (Contract Section 4 & 6)
  }
}

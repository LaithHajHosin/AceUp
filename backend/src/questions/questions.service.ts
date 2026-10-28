import { Injectable, BadRequestException, ForbiddenException, NotFoundException, ConflictException, Inject } from '@nestjs/common';
import { DatabaseService, QuestionEntity } from '../database/database.service.js';
import { CreateQuestionDto, UpdateQuestionDto } from './dto/question.dto.js';

@Injectable()
export class QuestionsService {
  constructor(@Inject(DatabaseService) private db: DatabaseService) {}

  private isOwnerOrAdmin(q: QuestionEntity, userId: number): boolean {
    const user = this.db.users.find(u => u.id === userId);
    return q.ownerId === userId || user?.role === 'admin' || user?.username === 'admin';
  }

  public formatQuestion(q: QuestionEntity, requesterUserId: number) {
    const isOwner = this.isOwnerOrAdmin(q, requesterUserId);

    if (isOwner) {
      return {
        id: q.id,
        ownerId: q.ownerId,
        ownerUsername: q.ownerUsername,
        prompt: q.prompt,
        category: q.category,
        difficulty: q.difficulty,
        type: q.type,
        choices: q.choices ? q.choices.map(c => ({ id: c.id, text: c.text, isCorrect: c.isCorrect })) : null,
        codeSnippet: q.codeSnippet ?? null,
        expectedKeywords: q.expectedKeywords ?? null,
        requiredKeywordCount: q.requiredKeywordCount ?? null,
        expectedOutput: q.expectedOutput ?? null,
        createdAt: q.createdAt,
        updatedAt: q.updatedAt,
      };
    }

    // PublicQuestion (Contract Section 5)
    return {
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
    };
  }

  async findAll(query: { category?: string; difficulty?: string; type?: string; ownerId?: number; search?: string }, requesterUserId: number) {
    let list = [...this.db.questions];

    if (query.category) {
      list = list.filter(q => q.category.toLowerCase() === query.category!.toLowerCase());
    }
    if (query.difficulty) {
      list = list.filter(q => q.difficulty === query.difficulty);
    }
    if (query.type) {
      list = list.filter(q => q.type === query.type);
    }
    if (query.ownerId) {
      list = list.filter(q => q.ownerId === query.ownerId);
    }
    if (query.search) {
      const sub = query.search.toLowerCase();
      list = list.filter(q => q.prompt.toLowerCase().includes(sub) || q.category.toLowerCase().includes(sub));
    }

    list.sort((a, b) => b.id - a.id);
    return list.map(q => this.formatQuestion(q, requesterUserId));
  }

  async findOne(id: number, requesterUserId: number) {
    const q = this.db.questions.find(item => item.id === id);
    if (!q) {
      throw new NotFoundException({
        statusCode: 404,
        error: 'Not Found',
        code: 'NOT_FOUND',
        message: 'Question not found',
      });
    }
    return this.formatQuestion(q, requesterUserId);
  }

  async create(dto: CreateQuestionDto, userId: number, username: string) {
    const { prompt, category, difficulty, type, choices, expectedKeywords, requiredKeywordCount, codeSnippet, expectedOutput } = dto;

    let finalChoices: any = null;
    let finalKeywords: string[] | null = null;
    let finalReqCount: number | null = null;
    let finalSnippet: string | null = null;
    let finalOutput: string | null = null;

    if (type === 'multiple_choice') {
      if (expectedKeywords !== undefined || requiredKeywordCount !== undefined || codeSnippet !== undefined || expectedOutput !== undefined) {
        throw new BadRequestException({ statusCode: 400, error: 'Bad Request', code: 'VALIDATION_FAILED', message: 'Fields from other types are not allowed' });
      }
      if (!Array.isArray(choices) || choices.length < 2 || choices.length > 6) {
        throw new BadRequestException({ statusCode: 400, error: 'Bad Request', code: 'VALIDATION_FAILED', message: 'multiple_choice requires 2-6 choices' });
      }
      const ids = new Set<string>();
      let correctCount = 0;
      for (const c of choices) {
        if (!c.id || c.id.trim().length < 1 || c.id.trim().length > 10) {
          throw new BadRequestException({ statusCode: 400, error: 'Bad Request', code: 'VALIDATION_FAILED', message: 'Choice id must be 1-10 characters' });
        }
        if (ids.has(c.id.trim())) {
          throw new BadRequestException({ statusCode: 400, error: 'Bad Request', code: 'VALIDATION_FAILED', message: 'Choice ids must be unique' });
        }
        ids.add(c.id.trim());
        if (c.isCorrect === true) correctCount++;
      }
      if (correctCount !== 1) {
        throw new BadRequestException({ statusCode: 400, error: 'Bad Request', code: 'VALIDATION_FAILED', message: 'multiple_choice must have exactly one correct choice' });
      }
      finalChoices = choices.map(c => ({ id: c.id.trim(), text: c.text.trim(), isCorrect: !!c.isCorrect }));
    } else if (type === 'short_answer') {
      if (choices !== undefined || codeSnippet !== undefined || expectedOutput !== undefined) {
        throw new BadRequestException({ statusCode: 400, error: 'Bad Request', code: 'VALIDATION_FAILED', message: 'Fields from other types are not allowed' });
      }
      if (!Array.isArray(expectedKeywords) || expectedKeywords.length < 2 || expectedKeywords.length > 6) {
        throw new BadRequestException({ statusCode: 400, error: 'Bad Request', code: 'VALIDATION_FAILED', message: 'expectedKeywords must be 2-6 items' });
      }
      const reqCount = Number(requiredKeywordCount);
      if (isNaN(reqCount) || reqCount < 1 || reqCount > expectedKeywords.length) {
        throw new BadRequestException({ statusCode: 400, error: 'Bad Request', code: 'VALIDATION_FAILED', message: `requiredKeywordCount must be between 1 and ${expectedKeywords.length}` });
      }
      finalKeywords = expectedKeywords.map(k => String(k).trim());
      finalReqCount = reqCount;
    } else if (type === 'code_output') {
      if (choices !== undefined || expectedKeywords !== undefined || requiredKeywordCount !== undefined) {
        throw new BadRequestException({ statusCode: 400, error: 'Bad Request', code: 'VALIDATION_FAILED', message: 'Fields from other types are not allowed' });
      }
      if (!expectedOutput || !expectedOutput.trim()) {
        throw new BadRequestException({ statusCode: 400, error: 'Bad Request', code: 'VALIDATION_FAILED', message: 'expectedOutput is required' });
      }
      finalSnippet = codeSnippet || '';
      finalOutput = expectedOutput;
    }

    const id = this.db.getNextId('questions');
    const now = new Date().toISOString();

    const newQuestion: QuestionEntity = {
      id,
      ownerId: userId,
      ownerUsername: username,
      prompt: prompt.trim(),
      category: category.trim().toLowerCase(),
      difficulty,
      type,
      choices: finalChoices,
      expectedKeywords: finalKeywords,
      requiredKeywordCount: finalReqCount,
      codeSnippet: finalSnippet,
      expectedOutput: finalOutput,
      createdAt: now,
      updatedAt: now,
    };

    this.db.questions.push(newQuestion);
    this.db.saveToDisk();

    return this.formatQuestion(newQuestion, userId);
  }

  async update(id: number, dto: UpdateQuestionDto, userId: number) {
    const q = this.db.questions.find(item => item.id === id);
    if (!q) {
      throw new NotFoundException({ statusCode: 404, error: 'Not Found', code: 'NOT_FOUND', message: 'Question not found' });
    }

    if (!this.isOwnerOrAdmin(q, userId)) {
      throw new ForbiddenException({ statusCode: 403, error: 'Forbidden', code: 'NOT_OWNER', message: 'Only question owner or admin can edit' });
    }

    if (dto.prompt !== undefined) q.prompt = dto.prompt.trim();
    if (dto.category !== undefined) q.category = dto.category.trim().toLowerCase();
    if (dto.difficulty !== undefined) q.difficulty = dto.difficulty;
    if (dto.type !== undefined) q.type = dto.type;
    if (dto.choices !== undefined) q.choices = dto.choices as any;
    if (dto.expectedKeywords !== undefined) q.expectedKeywords = dto.expectedKeywords;
    if (dto.requiredKeywordCount !== undefined) q.requiredKeywordCount = dto.requiredKeywordCount;
    if (dto.codeSnippet !== undefined) q.codeSnippet = dto.codeSnippet;
    if (dto.expectedOutput !== undefined) q.expectedOutput = dto.expectedOutput;

    q.updatedAt = new Date().toISOString();
    this.db.saveToDisk();

    return this.formatQuestion(q, userId);
  }

  async remove(id: number, userId: number) {
    const index = this.db.questions.findIndex(item => item.id === id);
    if (index === -1) {
      throw new NotFoundException({ statusCode: 404, error: 'Not Found', code: 'NOT_FOUND', message: 'Question not found' });
    }

    const q = this.db.questions[index];
    if (!this.isOwnerOrAdmin(q, userId)) {
      throw new ForbiddenException({ statusCode: 403, error: 'Forbidden', code: 'NOT_OWNER', message: 'Only question owner or admin can delete' });
    }

    // Check QUESTION_IN_USE (Contract Section 4 & 6)
    const usedInInterview = this.db.interviews.some(i => i.questionIds.includes(id));
    const usedInAttempt = this.db.attempts.some(a => a.questions.some(item => item.questionId === id));

    if (usedInInterview || usedInAttempt) {
      throw new ConflictException({
        statusCode: 409,
        error: 'Conflict',
        code: 'QUESTION_IN_USE',
        message: 'Question is currently referenced by an interview or attempt and cannot be deleted',
      });
    }

    this.db.questions.splice(index, 1);
    this.db.saveToDisk();
  }
}

import { HttpStatus, Injectable, Logger, Optional } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import type { Connection, Model } from 'mongoose';
import { AppHttpException } from '../common/exceptions/app-http.exception.js';
import { CreateQuestionDto } from './dto/create-question.dto.js';
import {
  QuestionFilterDto,
  QuestionListResponseDto,
  QuestionPublicDto,
  toQuestionPublicDto,
} from './dto/question-filter.dto.js';
import {
  UpdateQuestionDto,
  validateQuestionShape,
} from './dto/update-question.dto.js';
import {
  type Difficulty,
  Question,
  type QuestionDocument,
} from './schemas/question.schema.js';
import type { SeedQuestionItem } from './seed-questions.js';

export type SessionQuestionUsageChecker = (
  questionId: number,
) => Promise<boolean> | boolean;

@Injectable()
export class QuestionsService {
  private readonly logger = new Logger(QuestionsService.name);
  private readonly fallbackStore = new Map<number, Question>();
  private readonly fallbackUsedInSessions = new Set<number>();
  private externalUsageChecker?: SessionQuestionUsageChecker;

  constructor(
    @Optional()
    @InjectModel(Question.name)
    private readonly questionModel?: Model<QuestionDocument>,
    @Optional()
    @InjectConnection()
    private readonly connection?: Connection,
  ) {}

  /**
   * Optional hook allowing Esmaeel's SessionsService (or unit tests) to register
   * an additional usage check for 409 QUESTION_IN_USE alongside the MongoDB `sessions` query.
   */
  registerSessionUsageChecker(checker: SessionQuestionUsageChecker): void {
    this.externalUsageChecker = checker;
  }

  /**
   * Helper for tests or fallback session tracking to mark a question ID as referenced by a session.
   */
  markQuestionUsedInSession(questionId: number): void {
    this.fallbackUsedInSessions.add(questionId);
  }

  /**
   * Computes the next numeric application ID directly by sorting existing questions by `{ id: -1 }`
   * using the unique `{ id: 1 }` index (B4F class convention, starting at 101 if empty).
   */
  async getNextQuestionId(): Promise<number> {
    if (this.isMongoConnected()) {
      const highestDoc = await this.questionModel!
        .findOne()
        .sort({ id: -1 })
        .select({ id: 1 })
        .lean()
        .exec();
      const maxMongoId = highestDoc?.id ?? 100;
      const maxMemId =
        this.fallbackStore.size > 0
          ? Math.max(...this.fallbackStore.keys())
          : 100;
      return Math.max(maxMongoId, maxMemId) + 1;
    }

    const maxId =
      this.fallbackStore.size > 0
        ? Math.max(...this.fallbackStore.keys())
        : 100;
    return maxId + 1;
  }

  /**
   * Seeds initial questions idempotently on startup without duplicating existing records.
   */
  async seedInitialQuestions(
    seedItems: SeedQuestionItem[],
  ): Promise<{ seededCount: number; totalCount: number }> {
    const validatedSeeds: Question[] = seedItems.map((item) => {
      const shape = validateQuestionShape(item);
      const now = new Date();
      return {
        id: item.id,
        ...shape,
        createdAt: now,
        updatedAt: now,
      };
    });

    if (this.isMongoConnected()) {
      const existingCount = await this.questionModel!.countDocuments().exec();
      if (existingCount === 0) {
        await this.questionModel!.insertMany(validatedSeeds, { ordered: true });
        for (const q of validatedSeeds) {
          this.fallbackStore.set(q.id, structuredClone(q));
        }
        this.logger.log(
          `Seeded ${validatedSeeds.length} initial questions into MongoDB.`,
        );
        return {
          seededCount: validatedSeeds.length,
          totalCount: validatedSeeds.length,
        };
      }

      this.logger.log(
        `Question bank already initialized in MongoDB (${existingCount} questions present); skipping duplicate seed.`,
      );
      return { seededCount: 0, totalCount: existingCount };
    }

    if (this.fallbackStore.size === 0) {
      for (const q of validatedSeeds) {
        this.fallbackStore.set(q.id, structuredClone(q));
      }
      this.logger.log(
        `Seeded ${validatedSeeds.length} initial questions into fallback store.`,
      );
      return {
        seededCount: validatedSeeds.length,
        totalCount: validatedSeeds.length,
      };
    }

    return { seededCount: 0, totalCount: this.fallbackStore.size };
  }

  /**
   * Public endpoint: GET /api/v1/questions
   * Returns active questions only, filtered by optional category, difficulty, and type.
   * Strictly redacts private grading fields.
   */
  async findAllPublic(
    filter: QuestionFilterDto = {},
  ): Promise<QuestionListResponseDto> {
    const normalizedCategory = filter.category?.trim().toLowerCase();

    if (this.isMongoConnected()) {
      const mongoFilter: Record<string, unknown> = { active: true };
      if (normalizedCategory) {
        mongoFilter.category = normalizedCategory;
      }
      if (filter.difficulty) {
        mongoFilter.difficulty = filter.difficulty;
      }
      if (filter.type) {
        mongoFilter.type = filter.type;
      }

      const docs = await this.questionModel!
        .find(mongoFilter)
        .sort({ id: 1 })
        .lean()
        .exec();

      return {
        items: docs.map((doc) => toQuestionPublicDto(doc)),
      };
    }

    const items = Array.from(this.fallbackStore.values())
      .filter((q) => {
        if (!q.active) return false;
        if (
          normalizedCategory &&
          q.category.toLowerCase() !== normalizedCategory
        ) {
          return false;
        }
        if (filter.difficulty && q.difficulty !== filter.difficulty) {
          return false;
        }
        if (filter.type && q.type !== filter.type) {
          return false;
        }
        return true;
      })
      .sort((a, b) => a.id - b.id)
      .map((q) => toQuestionPublicDto(q));

    return { items };
  }

  /**
   * Public endpoint: GET /api/v1/questions/:id
   * Returns safe public question detail by numeric ID, or 404 QUESTION_NOT_FOUND.
   */
  async findOnePublicById(id: number): Promise<QuestionPublicDto> {
    const question = await this.findInternalByIdOrThrow(id);
    return toQuestionPublicDto(question);
  }

  /**
   * Boundary method for Esmaeel's SessionsService:
   * Returns all active internal Question records matching `{ active: true, category, difficulty }`
   * with full grading fields (`choices[].isCorrect`, `expectedKeywords`, `requiredKeywordCount`,
   * `expectedOutput`, `codeSnippet`) so SessionsService can randomly select `questionCount`
   * distinct items and embed immutable snapshots into the Session document.
   */
  async findActiveForSession(
    category: string,
    difficulty: Difficulty,
  ): Promise<Question[]> {
    const normalizedCategory = category.trim().toLowerCase();

    if (this.isMongoConnected()) {
      const docs = await this.questionModel!
        .find({
          active: true,
          category: normalizedCategory,
          difficulty,
        })
        .sort({ id: 1 })
        .lean()
        .exec();

      return docs.map((doc) => this.stripMongoInternals(doc));
    }

    return Array.from(this.fallbackStore.values())
      .filter(
        (q) =>
          q.active &&
          q.category.toLowerCase() === normalizedCategory &&
          q.difficulty === difficulty,
      )
      .sort((a, b) => a.id - b.id)
      .map((q) => structuredClone(q));
  }

  /**
   * Guarded internal endpoint: POST /api/v1/internal/questions
   * Creates a validated question with a new numeric application ID.
   */
  async createInternal(dto: CreateQuestionDto): Promise<Question> {
    const validatedShape = validateQuestionShape({
      prompt: dto.prompt,
      category: dto.category,
      difficulty: dto.difficulty,
      type: dto.type,
      active: dto.active ?? true,
      choices: dto.choices,
      expectedKeywords: dto.expectedKeywords,
      requiredKeywordCount: dto.requiredKeywordCount,
      expectedOutput: dto.expectedOutput,
      codeSnippet: dto.codeSnippet,
    });

    const nextId = await this.getNextQuestionId();
    const now = new Date();
    const newQuestion: Question = {
      id: nextId,
      ...validatedShape,
      createdAt: now,
      updatedAt: now,
    };

    if (this.isMongoConnected()) {
      const created = await this.questionModel!.create(newQuestion);
      const clean = this.stripMongoInternals(created.toObject());
      this.fallbackStore.set(clean.id, structuredClone(clean));
      this.logger.log(
        `Question created: id=${clean.id} category=${clean.category} difficulty=${clean.difficulty} type=${clean.type}`,
      );
      return clean;
    }

    this.fallbackStore.set(newQuestion.id, structuredClone(newQuestion));
    this.logger.log(
      `Question created: id=${newQuestion.id} category=${newQuestion.category} difficulty=${newQuestion.difficulty} type=${newQuestion.type}`,
    );
    return structuredClone(newQuestion);
  }

  /**
   * Guarded internal endpoint: PATCH /api/v1/internal/questions/:id
   * Validates the complete resulting question shape after merging partial updates.
   * Existing session snapshots are never modified.
   */
  async updateInternal(id: number, dto: UpdateQuestionDto): Promise<Question> {
    const existing = await this.findInternalByIdOrThrow(id);
    const targetType = dto.type ?? existing.type;

    const mergedCandidate = {
      prompt: dto.prompt !== undefined ? dto.prompt : existing.prompt,
      category: dto.category !== undefined ? dto.category : existing.category,
      difficulty:
        dto.difficulty !== undefined ? dto.difficulty : existing.difficulty,
      type: targetType,
      active: dto.active !== undefined ? dto.active : existing.active,
      choices:
        dto.choices !== undefined
          ? dto.choices
          : targetType === 'multiple_choice'
            ? existing.choices
            : undefined,
      expectedKeywords:
        dto.expectedKeywords !== undefined
          ? dto.expectedKeywords
          : targetType === 'short_answer'
            ? existing.expectedKeywords
            : undefined,
      requiredKeywordCount:
        dto.requiredKeywordCount !== undefined
          ? dto.requiredKeywordCount
          : targetType === 'short_answer'
            ? existing.requiredKeywordCount
            : undefined,
      expectedOutput:
        dto.expectedOutput !== undefined
          ? dto.expectedOutput
          : targetType === 'code_output'
            ? existing.expectedOutput
            : undefined,
      codeSnippet:
        dto.codeSnippet !== undefined
          ? dto.codeSnippet
          : targetType === 'code_output'
            ? existing.codeSnippet
            : undefined,
    };

    const validatedShape = validateQuestionShape(mergedCandidate);
    const updatedQuestion: Question = {
      id: existing.id,
      ...validatedShape,
      createdAt: existing.createdAt ?? new Date(),
      updatedAt: new Date(),
    };

    if (this.isMongoConnected()) {
      const unsetFields: Record<string, 1> = {};
      if (validatedShape.type !== 'multiple_choice') unsetFields.choices = 1;
      if (validatedShape.type !== 'short_answer') {
        unsetFields.expectedKeywords = 1;
        unsetFields.requiredKeywordCount = 1;
      }
      if (validatedShape.type !== 'code_output') {
        unsetFields.expectedOutput = 1;
        unsetFields.codeSnippet = 1;
      } else if (validatedShape.codeSnippet === undefined) {
        unsetFields.codeSnippet = 1;
      }

      const updatedDoc = await this.questionModel!
        .findOneAndUpdate(
          { id },
          {
            $set: {
              prompt: validatedShape.prompt,
              category: validatedShape.category,
              difficulty: validatedShape.difficulty,
              type: validatedShape.type,
              active: validatedShape.active,
              ...(validatedShape.choices !== undefined
                ? { choices: validatedShape.choices }
                : {}),
              ...(validatedShape.expectedKeywords !== undefined
                ? { expectedKeywords: validatedShape.expectedKeywords }
                : {}),
              ...(validatedShape.requiredKeywordCount !== undefined
                ? { requiredKeywordCount: validatedShape.requiredKeywordCount }
                : {}),
              ...(validatedShape.expectedOutput !== undefined
                ? { expectedOutput: validatedShape.expectedOutput }
                : {}),
              ...(validatedShape.codeSnippet !== undefined
                ? { codeSnippet: validatedShape.codeSnippet }
                : {}),
            },
            ...(Object.keys(unsetFields).length > 0
              ? { $unset: unsetFields }
              : {}),
          },
          { new: true },
        )
        .lean()
        .exec();

      if (!updatedDoc) {
        throw new AppHttpException(
          HttpStatus.NOT_FOUND,
          'QUESTION_NOT_FOUND',
          `Question with id ${id} was not found.`,
        );
      }

      const clean = this.stripMongoInternals(updatedDoc);
      this.fallbackStore.set(id, structuredClone(clean));
      this.logger.log(
        `Question updated: id=${id} category=${clean.category} difficulty=${clean.difficulty} type=${clean.type} active=${clean.active}`,
      );
      return clean;
    }

    this.fallbackStore.set(id, structuredClone(updatedQuestion));
    this.logger.log(
      `Question updated: id=${id} category=${updatedQuestion.category} difficulty=${updatedQuestion.difficulty} type=${updatedQuestion.type} active=${updatedQuestion.active}`,
    );
    return structuredClone(updatedQuestion);
  }

  /**
   * Guarded internal endpoint: PATCH /api/v1/internal/questions/:id/deactivate
   * Soft-deletes the question (active=false) while preserving the record and historical sessions.
   */
  async deactivateInternal(id: number): Promise<Question> {
    const existing = await this.findInternalByIdOrThrow(id);

    if (this.isMongoConnected()) {
      const updatedDoc = await this.questionModel!
        .findOneAndUpdate({ id }, { $set: { active: false } }, { new: true })
        .lean()
        .exec();

      if (!updatedDoc) {
        throw new AppHttpException(
          HttpStatus.NOT_FOUND,
          'QUESTION_NOT_FOUND',
          `Question with id ${id} was not found.`,
        );
      }

      const clean = this.stripMongoInternals(updatedDoc);
      this.fallbackStore.set(id, structuredClone(clean));
      this.logger.log(`Question deactivated: id=${id}`);
      return clean;
    }

    const deactivated: Question = {
      ...existing,
      active: false,
      updatedAt: new Date(),
    };
    this.fallbackStore.set(id, structuredClone(deactivated));
    this.logger.log(`Question deactivated: id=${id}`);
    return structuredClone(deactivated);
  }

  /**
   * Guarded internal endpoint: DELETE /api/v1/internal/questions/:id
   * Deletes a question ONLY if it has never been referenced in any session snapshot.
   * Otherwise throws 409 QUESTION_IN_USE and recommends deactivation instead.
   */
  async deleteInternal(id: number): Promise<{ deleted: true; id: number }> {
    await this.findInternalByIdOrThrow(id);

    const inUse = await this.isQuestionUsedInAnySession(id);
    if (inUse) {
      this.logger.warn(
        `Blocked deletion of question id=${id}: question is referenced by at least one session.`,
      );
      throw new AppHttpException(
        HttpStatus.CONFLICT,
        'QUESTION_IN_USE',
        `Question ${id} has been referenced by an interview session and cannot be deleted. Deactivate it instead using PATCH /api/v1/internal/questions/${id}/deactivate.`,
      );
    }

    if (this.isMongoConnected()) {
      await this.questionModel!.deleteOne({ id }).exec();
    }
    this.fallbackStore.delete(id);

    this.logger.log(`Question deleted: id=${id}`);
    return { deleted: true, id };
  }

  /**
   * Checks whether a numeric question ID appears inside any session snapshot.
   * Queries the MongoDB `sessions` collection directly (`{ 'questions.id': questionId }`)
   * plus any registered session usage checker.
   */
  async isQuestionUsedInAnySession(questionId: number): Promise<boolean> {
    if (this.fallbackUsedInSessions.has(questionId)) {
      return true;
    }

    if (this.externalUsageChecker) {
      const usedExternally = await this.externalUsageChecker(questionId);
      if (usedExternally) {
        return true;
      }
    }

    if (
      this.connection &&
      this.connection.readyState === 1 &&
      this.connection.db
    ) {
      try {
        const count = await this.connection.db
          .collection('sessions')
          .countDocuments(
            {
              $or: [
                { 'questions.id': questionId },
                { 'questions.questionId': questionId },
              ],
            },
            { limit: 1 },
          );
        if (count > 0) {
          return true;
        }
      } catch {
        // If sessions collection does not exist yet, question is not in use
      }
    }

    return false;
  }

  private async findInternalByIdOrThrow(id: number): Promise<Question> {
    if (!Number.isInteger(id) || id <= 0) {
      throw new AppHttpException(
        HttpStatus.NOT_FOUND,
        'QUESTION_NOT_FOUND',
        `Question with id ${id} was not found.`,
      );
    }

    if (this.isMongoConnected()) {
      const doc = await this.questionModel!.findOne({ id }).lean().exec();
      if (!doc) {
        throw new AppHttpException(
          HttpStatus.NOT_FOUND,
          'QUESTION_NOT_FOUND',
          `Question with id ${id} was not found.`,
        );
      }
      return this.stripMongoInternals(doc);
    }

    const found = this.fallbackStore.get(id);
    if (!found) {
      throw new AppHttpException(
        HttpStatus.NOT_FOUND,
        'QUESTION_NOT_FOUND',
        `Question with id ${id} was not found.`,
      );
    }
    return structuredClone(found);
  }

  private stripMongoInternals(
    raw: Record<string, unknown> | Question,
  ): Question {
    const obj = { ...(raw as Record<string, unknown>) };
    delete obj._id;
    delete obj.__v;
    return obj as unknown as Question;
  }

  private isMongoConnected(): boolean {
    return Boolean(
      this.questionModel &&
        this.questionModel.db &&
        this.questionModel.db.readyState === 1,
    );
  }
}

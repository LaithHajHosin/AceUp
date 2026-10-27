import {
  Injectable,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import type { Connection, Model } from 'mongoose';
import {
  Attempt,
  AttemptDocument,
  AttemptQuestionSnapshot,
} from './schemas/attempt.schema.js';
import { CreateAttemptDto } from './dto/create-attempt.dto.js';
import { AttemptFilterDto } from './dto/attempt-filter.dto.js';
import { SubmitAnswerDto } from './dto/submit-answer.dto.js';
import { scoreAttempt } from './scoring.service.js';
import {
  toSafeAttempt,
  toAttemptListItem,
  toAttemptResults,
} from './attempt-serializer.js';

export class AttemptContractException extends HttpException {
  constructor(statusCode: HttpStatus, code: string, message: string) {
    super(
      {
        statusCode,
        error: HttpStatus[statusCode] || 'Error',
        code,
        message,
      },
      statusCode,
    );
  }
}

@Injectable()
export class AttemptsService {
  constructor(
    @InjectModel(Attempt.name)
    private attemptModel: Model<AttemptDocument>,
    @InjectConnection()
    private connection: Connection,
  ) {}

  /**
   * Private atomic numeric ID generator using the counters collection.
   * Only operates on its assigned key: 'attempts'.
   */
  private async getNextAttemptId(): Promise<number> {
    const res = await this.connection.collection('counters').findOneAndUpdate(
      { _id: 'attempts' as any },
      { $inc: { seq: 1 } },
      { upsert: true, returnDocument: 'after' },
    );

    const doc: any = res?.value ?? res;
    return typeof doc?.seq === 'number' ? doc.seq : 1;
  }

  /**
   * Creates a new attempt from an interview.
   * Reads interviews and questions directly from their native collections.
   */
  async createAttempt(userId: number, dto: CreateAttemptDto) {
    const interview = await this.connection
      .collection('interviews')
      .findOne({ id: dto.interviewId });

    if (!interview) {
      throw new AttemptContractException(
        HttpStatus.NOT_FOUND,
        'NOT_FOUND',
        `Interview with ID ${dto.interviewId} not found`,
      );
    }

    const questionIds: number[] = interview.questionIds || [];
    const questionsCursor = await this.connection
      .collection('questions')
      .find({ id: { $in: questionIds } });
    const rawQuestions = await questionsCursor.toArray();

    // Map by id to preserve interview.questionIds ordering and omit deleted questions
    const questionMap = new Map<number, any>();
    for (const q of rawQuestions) {
      questionMap.set(q.id, q);
    }

    const questionSnapshots: AttemptQuestionSnapshot[] = [];
    let position = 1;

    for (const qId of questionIds) {
      const q = questionMap.get(qId);
      if (!q) continue; // Deleted questions are skipped per contract

      questionSnapshots.push({
        questionId: q.id,
        position: position++,
        prompt: q.prompt,
        type: q.type,
        difficulty: q.difficulty,
        category: q.category,
        choices: q.choices || null,
        codeSnippet: q.codeSnippet || null,
        expectedKeywords: q.expectedKeywords || null,
        requiredKeywordCount: q.requiredKeywordCount ?? null,
        expectedOutput: q.expectedOutput ?? null,
      });
    }

    const now = new Date();
    const timeLimitSeconds = interview.timeLimitSeconds;
    const deadline = new Date(now.getTime() + timeLimitSeconds * 1000);

    const nextId = await this.getNextAttemptId();

    const created = await this.attemptModel.create({
      id: nextId,
      interviewId: interview.id,
      interviewTitle: interview.title,
      userId,
      status: 'in_progress',
      startedAt: now.toISOString(),
      deadlineAt: deadline.toISOString(),
      finishedAt: null,
      timeLimitSeconds,
      score: null,
      maxScore: null,
      percentage: null,
      readiness: null,
      questions: questionSnapshots,
      answers: [],
    });

    return toSafeAttempt(created);
  }

  /**
   * Lists the current user's attempts (newest first).
   */
  async getMyAttempts(userId: number, filter: AttemptFilterDto) {
    const query: any = { userId };
    if (filter.status) {
      query.status = filter.status;
    }
    if (filter.interviewId) {
      query.interviewId = filter.interviewId;
    }

    const attempts = await this.attemptModel
      .find(query)
      .sort({ startedAt: -1 })
      .lean()
      .exec();

    return attempts.map((a) => toAttemptListItem(a as any));
  }

  /**
   * Applies lazy timeout: if deadline passed and still in_progress, transition to timed_out and calculate scores.
   */
  private async applyLazyTimeout(attempt: AttemptDocument): Promise<AttemptDocument> {
    if (attempt.status !== 'in_progress') {
      return attempt;
    }

    const now = Date.now();
    const deadlineTime = new Date(attempt.deadlineAt).getTime();

    if (now > deadlineTime) {
      const scoring = scoreAttempt(attempt.questions as any, attempt.answers as any);

      attempt.status = 'timed_out';
      attempt.finishedAt = attempt.deadlineAt;
      attempt.score = scoring.score;
      attempt.maxScore = scoring.maxScore;
      attempt.percentage = scoring.percentage;
      attempt.readiness = scoring.readiness;

      await attempt.save();
    }

    return attempt;
  }

  /**
   * Gets an attempt by ID with lazy timeout applied.
   * Only the owner can view their attempt.
   */
  async getAttemptById(attemptId: number, userId: number) {
    const attempt = await this.attemptModel.findOne({ id: attemptId }).exec();

    if (!attempt) {
      throw new AttemptContractException(
        HttpStatus.NOT_FOUND,
        'NOT_FOUND',
        `Attempt with ID ${attemptId} not found`,
      );
    }

    if (attempt.userId !== userId) {
      throw new AttemptContractException(
        HttpStatus.FORBIDDEN,
        'NOT_OWNER',
        'You do not own this attempt',
      );
    }

    const updated = await this.applyLazyTimeout(attempt);
    return toSafeAttempt(updated);
  }

  /**
   * Submits an answer for a question in an attempt.
   * Performs atomic duplicate check & write to prevent race conditions.
   */
  async submitAnswer(attemptId: number, userId: number, dto: SubmitAnswerDto) {
    const attempt = await this.attemptModel.findOne({ id: attemptId }).exec();

    if (!attempt) {
      throw new AttemptContractException(
        HttpStatus.NOT_FOUND,
        'NOT_FOUND',
        `Attempt with ID ${attemptId} not found`,
      );
    }

    if (attempt.userId !== userId) {
      throw new AttemptContractException(
        HttpStatus.FORBIDDEN,
        'NOT_OWNER',
        'You do not own this attempt',
      );
    }

    if (attempt.status !== 'in_progress') {
      throw new AttemptContractException(
        HttpStatus.CONFLICT,
        'ATTEMPT_ENDED',
        'Attempt has already ended',
      );
    }

    // Check deadline with 5 second grace period
    const now = Date.now();
    const deadlineWithGrace = new Date(attempt.deadlineAt).getTime() + 5000;

    if (now > deadlineWithGrace) {
      // Mark as timed out
      await this.applyLazyTimeout(attempt);
      throw new AttemptContractException(
        HttpStatus.CONFLICT,
        'ANSWER_LATE',
        'Answer arrived after deadline',
      );
    }

    // Verify question is part of the attempt
    const question = attempt.questions.find((q) => q.questionId === dto.questionId);
    if (!question) {
      throw new AttemptContractException(
        HttpStatus.BAD_REQUEST,
        'QUESTION_NOT_IN_ATTEMPT',
        `Question ${dto.questionId} is not in this attempt`,
      );
    }

    // Verify answer type matches question type
    if (dto.answer.type !== question.type) {
      throw new AttemptContractException(
        HttpStatus.BAD_REQUEST,
        'ANSWER_TYPE_MISMATCH',
        `Answer type '${dto.answer.type}' does not match question type '${question.type}'`,
      );
    }

    // For multiple choice, verify choice exists
    if (question.type === 'multiple_choice') {
      const choiceExists = question.choices?.some((c) => c.id === dto.answer.choiceId);
      if (!choiceExists) {
        throw new AttemptContractException(
          HttpStatus.BAD_REQUEST,
          'INVALID_CHOICE',
          `choiceId '${dto.answer.choiceId}' not in the question's choices`,
        );
      }
    }

    const submittedAt = new Date().toISOString();
    const newAnswer = {
      questionId: dto.questionId,
      answer: {
        type: dto.answer.type,
        choiceId: dto.answer.choiceId ?? undefined,
        text: dto.answer.text ?? undefined,
      },
      submittedAt,
    };

    // Atomic update: only pushes answer if questionId is NOT already present in answers array
    const updated = await this.attemptModel
      .findOneAndUpdate(
        {
          id: attemptId,
          status: 'in_progress',
          'answers.questionId': { $ne: dto.questionId },
        },
        {
          $push: { answers: newAnswer },
        },
        { returnDocument: 'after' },
      )
      .exec();

    if (!updated) {
      // Check why update failed
      const freshAttempt = await this.attemptModel.findOne({ id: attemptId }).exec();
      if (!freshAttempt || freshAttempt.status !== 'in_progress') {
        throw new AttemptContractException(
          HttpStatus.CONFLICT,
          'ATTEMPT_ENDED',
          'Attempt has already ended',
        );
      }

      if (freshAttempt.answers.some((a) => a.questionId === dto.questionId)) {
        throw new AttemptContractException(
          HttpStatus.CONFLICT,
          'ANSWER_DUPLICATE',
          `Question ${dto.questionId} has already been answered`,
        );
      }

      throw new AttemptContractException(
        HttpStatus.CONFLICT,
        'ATTEMPT_ENDED',
        'Could not accept answer',
      );
    }

    return {
      questionId: dto.questionId,
      accepted: true,
      submittedAt,
    };
  }

  /**
   * Finishes an attempt manually and calculates the final scores.
   */
  async finishAttempt(attemptId: number, userId: number) {
    const attempt = await this.attemptModel.findOne({ id: attemptId }).exec();

    if (!attempt) {
      throw new AttemptContractException(
        HttpStatus.NOT_FOUND,
        'NOT_FOUND',
        `Attempt with ID ${attemptId} not found`,
      );
    }

    if (attempt.userId !== userId) {
      throw new AttemptContractException(
        HttpStatus.FORBIDDEN,
        'NOT_OWNER',
        'You do not own this attempt',
      );
    }

    if (attempt.status !== 'in_progress') {
      throw new AttemptContractException(
        HttpStatus.CONFLICT,
        'ATTEMPT_ENDED',
        'Attempt has already ended',
      );
    }

    const scoring = scoreAttempt(attempt.questions as any, attempt.answers as any);

    attempt.status = 'finished';
    attempt.finishedAt = new Date().toISOString();
    attempt.score = scoring.score;
    attempt.maxScore = scoring.maxScore;
    attempt.percentage = scoring.percentage;
    attempt.readiness = scoring.readiness;

    await attempt.save();

    return toSafeAttempt(attempt);
  }

  /**
   * Gets detailed results for an ended attempt.
   * Throws 409 ATTEMPT_NOT_ENDED if still in progress.
   */
  async getAttemptResults(attemptId: number, userId: number) {
    const attempt = await this.attemptModel.findOne({ id: attemptId }).exec();

    if (!attempt) {
      throw new AttemptContractException(
        HttpStatus.NOT_FOUND,
        'NOT_FOUND',
        `Attempt with ID ${attemptId} not found`,
      );
    }

    if (attempt.userId !== userId) {
      throw new AttemptContractException(
        HttpStatus.FORBIDDEN,
        'NOT_OWNER',
        'You do not own this attempt',
      );
    }

    const updated = await this.applyLazyTimeout(attempt);

    if (updated.status === 'in_progress') {
      throw new AttemptContractException(
        HttpStatus.CONFLICT,
        'ATTEMPT_NOT_ENDED',
        'Results requested while attempt in progress',
      );
    }

    return toAttemptResults(updated);
  }
}

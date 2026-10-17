import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateSessionDto } from './dto/create-session.dto.js';
import { SubmitAnswerDto } from './dto/submit-answer.dto.js';
import { ScoringService } from './scoring.service.js';
import { Session, SessionDocument } from './schemas/session.schema.js';
import { IdSequenceService } from '../common/id-sequence.service.js';

const GRACE_MS = 5000;

@Injectable()
export class SessionsService {
  constructor(
    @InjectModel(Session.name) private readonly sessions: Model<Session>,
    @InjectModel('Question') private readonly questions: Model<any>,
    private readonly ids: IdSequenceService,
    private readonly scoring: ScoringService,
  ) {}

  async create(dto: CreateSessionDto) {
    if (!['easy', 'medium', 'hard'].includes(dto.difficulty)) {
      throw this.error(400, 'VALIDATION_ERROR', 'Invalid difficulty.');
    }

    const displayName = dto.displayName.trim();
    const category = dto.category.trim();
    if (!displayName || !category) {
      throw this.error(
        400,
        'VALIDATION_ERROR',
        'displayName and category are required.',
      );
    }

    const available = await this.questions
      .find({
        active: true,
        category,
        difficulty: dto.difficulty,
      })
      .lean();

    if (available.length < dto.questionCount) {
      throw this.error(
        409,
        'INSUFFICIENT_QUESTIONS',
        'Not enough matching questions.',
        {
          availableCount: available.length,
        },
      );
    }

    const selected = this.shuffle(available).slice(0, dto.questionCount);
    const startedAt = new Date();
    const seconds = this.secondsPerQuestion(dto.difficulty);
    const deadlineAt = new Date(
      startedAt.getTime() + dto.questionCount * seconds * 1000,
    );
    const snapshots = selected.map((question) => ({
      id: question.id,
      prompt: question.prompt,
      category: question.category,
      difficulty: question.difficulty,
      type: question.type,
      choices: question.choices ?? [],
      expectedKeywords: question.expectedKeywords ?? [],
      requiredKeywordCount: question.requiredKeywordCount,
      expectedOutput: question.expectedOutput,
      codeSnippet: question.codeSnippet,
    }));

    const session = await this.sessions.create({
      id: await this.ids.next('sessions'),
      displayName,
      displayNameNormalized: displayName.toLowerCase(),
      category,
      difficulty: dto.difficulty,
      status: 'in_progress',
      startedAt,
      deadlineAt,
      timePerQuestionSeconds: seconds,
      questions: snapshots,
      answers: [],
    });

    return this.toPublicSession(session);
  }

  async findOne(id: number) {
    const session = await this.getSession(id);

    if (session.status === 'in_progress' && this.isExpired(session)) {
      return this.expire(session);
    }

    return this.toPublicSession(session);
  }

  async submitAnswer(id: number, dto: SubmitAnswerDto) {
    const session = await this.getSession(id);

    if (session.status !== 'in_progress') {
      throw this.error(409, 'SESSION_NOT_ACTIVE', 'Session is not active.');
    }

    if (this.isExpired(session)) {
      await this.expire(session);
      throw this.error(
        409,
        'SESSION_NOT_ACTIVE',
        'The session deadline has passed.',
      );
    }

    const question = session.questions.find(
      (item) => item.id === dto.questionId,
    );

    if (!question) {
      throw this.error(
        409,
        'QUESTION_NOT_IN_SESSION',
        'Question is not in this session.',
      );
    }

    if (question.type !== dto.answer.type) {
      throw this.error(
        400,
        'ANSWER_TYPE_MISMATCH',
        'Answer type does not match question type.',
      );
    }

    if (dto.answer.type === 'multiple_choice') {
      if (!dto.answer.choiceId || dto.answer.text !== undefined) {
        throw this.error(
          400,
          'VALIDATION_ERROR',
          'Provide only choiceId for multiple choice.',
        );
      }

      const choiceExists = question.choices.some(
        (choice) => choice.id === dto.answer.choiceId,
      );

      if (!choiceExists) {
        throw this.error(
          400,
          'INVALID_CHOICE',
          'The selected choice does not exist.',
        );
      }
    } else {
      if (!dto.answer.text?.trim() || dto.answer.choiceId !== undefined) {
        throw this.error(
          400,
          'VALIDATION_ERROR',
          'Provide non-empty text only.',
        );
      }
    }

    const answerToSave = {
      questionId: dto.questionId,
      type: dto.answer.type,
      choiceId: dto.answer.choiceId,
      text: dto.answer.text?.trim(),
      submittedAt: new Date(),
    };

    const update = await this.sessions.updateOne(
      {
        _id: session._id,
        status: 'in_progress',
        deadlineAt: { $gte: new Date(Date.now() - GRACE_MS) },
        answers: {
          $not: {
            $elemMatch: { questionId: dto.questionId },
          },
        },
      },
      {
        $push: { answers: answerToSave },
      },
    );

    if (update.modifiedCount !== 1) {
      const latestSession = await this.getSession(id);

      const answerAlreadyExists = latestSession.answers.some(
        (answer) => answer.questionId === dto.questionId,
      );

      if (answerAlreadyExists) {
        throw this.error(
          409,
          'DUPLICATE_ANSWER',
          'An answer was already submitted.',
        );
      }

      if (latestSession.status !== 'in_progress') {
        throw this.error(409, 'SESSION_NOT_ACTIVE', 'Session is not active.');
      }

      if (this.isExpired(latestSession)) {
        await this.expire(latestSession);
        throw this.error(
          409,
          'SESSION_NOT_ACTIVE',
          'The session deadline has passed.',
        );
      }

      throw this.error(
        409,
        'SESSION_NOT_ACTIVE',
        'The answer could not be saved.',
      );
    }

    return { accepted: true, questionId: dto.questionId };
  }

  async finish(id: number) {
    const session = await this.getSession(id);

    if (session.status !== 'in_progress') {
      return this.toPublicSession(session);
    }

    if (this.isExpired(session)) {
      return this.expire(session);
    }

    session.status = 'finished';
    session.finishedAt = new Date();

    const result = this.scoring.calculate(session.questions, session.answers);
    session.score = {
      earnedPoints: result.earnedPoints,
      possiblePoints: result.possiblePoints,
      percentage: result.percentage,
      readiness: result.readiness,
    };

    await session.save();
    return this.toPublicSession(session);
  }

  async results(id: number) {
    const session = await this.getSession(id);
    if (session.status === 'in_progress' && this.isExpired(session)) {
      await this.expire(session);
    }
    if (session.status === 'in_progress') {
      throw this.error(
        409,
        'SESSION_NOT_ENDED',
        'Results are available after the session ends.',
      );
    }
    return {
      id: session.id,
      status: session.status,
      ...this.scoring.calculate(session.questions, session.answers),
    };
  }

  async history(displayName: string) {
    const normalized = displayName.trim().toLowerCase();

    if (!normalized) {
      throw this.error(400, 'VALIDATION_ERROR', 'displayName is required.');
    }

    const sessions = await this.sessions
      .find({ displayNameNormalized: normalized })
      .sort({ startedAt: -1 })
      .select(
        'id displayName category difficulty status startedAt finishedAt score questions',
      )
      .lean();

    return sessions.map((session) => ({
      id: session.id,
      displayName: session.displayName,
      category: session.category,
      difficulty: session.difficulty,
      questionCount: session.questions?.length ?? 0,
      status: session.status,
      startedAt: session.startedAt,
      finishedAt: session.finishedAt,
      score: session.score,
    }));
  }

  async historyDetail(id: number) {
    let session = await this.getSession(id);

    if (session.status === 'in_progress' && this.isExpired(session)) {
      await this.expire(session);
      session = await this.getSession(id);
    }

    return {
      ...this.toPublicSession(session),
      answers: session.answers.map((answer) => ({
        questionId: answer.questionId,
        type: answer.type,
        ...(answer.choiceId ? { choiceId: answer.choiceId } : {}),
        ...(answer.text !== undefined ? { text: answer.text } : {}),
        submittedAt: answer.submittedAt,
      })),
    };
  }

  private async getSession(id: number): Promise<SessionDocument> {
    const session = await this.sessions.findOne({ id });
    if (!session)
      throw this.error(404, 'SESSION_NOT_FOUND', 'Session not found.');
    return session;
  }

  private async expire(session: SessionDocument) {
    session.status = 'timed_out';
    session.finishedAt = new Date();
    const result = this.scoring.calculate(session.questions, session.answers);
    session.score = {
      earnedPoints: result.earnedPoints,
      possiblePoints: result.possiblePoints,
      percentage: result.percentage,
      readiness: result.readiness,
    };
    await session.save();
    return this.toPublicSession(session);
  }

  private isExpired(session: SessionDocument): boolean {
    return Date.now() > session.deadlineAt.getTime() + GRACE_MS;
  }

  private toPublicSession(session: SessionDocument) {
    const active = session.status === 'in_progress';
    return {
      id: session.id,
      displayName: session.displayName,
      category: session.category,
      difficulty: session.difficulty,
      questionCount: session.questions.length,
      status: session.status,
      startedAt: session.startedAt,
      deadlineAt: session.deadlineAt,
      timePerQuestionSeconds: session.timePerQuestionSeconds,
      questions: session.questions.map((question) => ({
        id: question.id,
        prompt: question.prompt,
        category: question.category,
        difficulty: question.difficulty,
        type: question.type,
        choices: question.choices.map(({ id, text }) => ({ id, text })),
        codeSnippet: question.codeSnippet,
        ...(active
          ? {}
          : {
              expectedKeywords: question.expectedKeywords,
              requiredKeywordCount: question.requiredKeywordCount,
              expectedOutput: question.expectedOutput,
              correctChoiceId: question.choices.find(
                (choice) => choice.isCorrect,
              )?.id,
            }),
      })),
    };
  }

  private secondsPerQuestion(difficulty: string): number {
    if (difficulty === 'easy') return 60;
    if (difficulty === 'medium') return 90;
    return 120;
  }

  private shuffle<T>(items: T[]): T[] {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  private error(
    status: number,
    code: string,
    message: string,
    details?: object,
  ) {
    const response = {
      statusCode: status,
      code,
      message,
      ...(details ? { details } : {}),
    };
    if (status === 404) return new NotFoundException(response);
    if (status === 409) return new ConflictException(response);
    return new BadRequestException(response);
  }
}

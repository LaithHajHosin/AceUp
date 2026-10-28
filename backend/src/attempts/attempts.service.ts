import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { DatabaseService, AttemptEntity } from '../database/database.service.js';
import { ScoringService } from './scoring.service.js';
import { StartAttemptDto, SubmitAnswerDto } from './dto/attempt.dto.js';

@Injectable()
export class AttemptsService {
  constructor(
    @Inject(DatabaseService) private db: DatabaseService,
    @Inject(ScoringService) private scoringService: ScoringService,
  ) {}

  public checkLazyTimeout(attempt: AttemptEntity): boolean {
    if (attempt.status !== 'in_progress') {
      return false;
    }
    const deadline = new Date(attempt.deadlineAt).getTime();
    const now = Date.now();
    // 5 seconds network grace (Contract Section 5)
    if (now > deadline + 5000) {
      attempt.status = 'timed_out';
      attempt.finishedAt = attempt.deadlineAt;
      const evaluation = this.scoringService.evaluateAttempt(attempt);
      attempt.score = evaluation.score;
      attempt.maxScore = evaluation.maxScore;
      attempt.percentage = evaluation.percentage;
      attempt.readiness = evaluation.readiness;
      this.db.saveToDisk();
      return true;
    }
    return false;
  }

  private formatAttempt(attempt: AttemptEntity) {
    // Safe AttemptQuestion format (hiding correct choices and answers)
    const safeQuestions = attempt.questions.map(q => ({
      questionId: q.questionId,
      position: q.position,
      prompt: q.prompt,
      type: q.type,
      difficulty: q.difficulty,
      category: q.category,
      choices: q.choices ? q.choices.map(c => ({ id: c.id, text: c.text })) : null,
      codeSnippet: q.type === 'code_output' ? q.codeSnippet : null,
    }));

    return {
      id: attempt.id,
      interviewId: attempt.interviewId,
      interviewTitle: attempt.interviewTitle,
      userId: attempt.userId,
      status: attempt.status,
      startedAt: attempt.startedAt,
      deadlineAt: attempt.deadlineAt,
      finishedAt: attempt.finishedAt,
      timeLimitSeconds: attempt.timeLimitSeconds,
      questions: safeQuestions,
      answeredQuestionIds: attempt.answeredQuestionIds,
      score: attempt.status === 'in_progress' ? null : attempt.score,
      maxScore: attempt.status === 'in_progress' ? null : attempt.maxScore,
      percentage: attempt.status === 'in_progress' ? null : attempt.percentage,
      readiness: attempt.status === 'in_progress' ? null : attempt.readiness,
    };
  }

  async start(dto: StartAttemptDto, userId: number) {
    const interview = this.db.interviews.find(i => i.id === dto.interviewId);
    if (!interview) {
      throw new NotFoundException({
        statusCode: 404,
        error: 'Not Found',
        code: 'NOT_FOUND',
        message: 'Interview not found',
      });
    }

    // Freeze snapshot of all questions
    const snapshots: any[] = [];
    interview.questionIds.forEach((qId, idx) => {
      const q = this.db.questions.find(item => item.id === qId);
      if (q) {
        snapshots.push({
          questionId: q.id,
          position: idx + 1,
          prompt: q.prompt,
          type: q.type,
          difficulty: q.difficulty,
          category: q.category,
          choices: q.choices ? q.choices.map(c => ({ id: c.id, text: c.text, isCorrect: c.isCorrect })) : null,
          codeSnippet: q.codeSnippet,
          expectedOutput: q.expectedOutput,
          expectedKeywords: q.expectedKeywords,
          requiredKeywordCount: q.requiredKeywordCount,
        });
      }
    });

    const now = new Date();
    const startedAt = now.toISOString();
    const deadlineAt = new Date(now.getTime() + interview.timeLimitSeconds * 1000).toISOString();
    const attemptId = this.db.getNextId('attempts');

    const newAttempt: AttemptEntity = {
      id: attemptId,
      interviewId: interview.id,
      interviewTitle: interview.title,
      userId,
      status: 'in_progress',
      startedAt,
      deadlineAt,
      finishedAt: null,
      timeLimitSeconds: interview.timeLimitSeconds,
      questions: snapshots,
      answeredQuestionIds: [],
      answers: [],
      score: null,
      maxScore: null,
      percentage: null,
      readiness: null,
    };

    this.db.attempts.push(newAttempt);
    this.db.saveToDisk();

    return this.formatAttempt(newAttempt);
  }

  async findAll(userId: number, isAdmin: boolean, status?: string, interviewId?: number) {
    let list = this.db.attempts.filter(a => isAdmin || a.userId === userId);

    list.forEach(a => this.checkLazyTimeout(a));

    if (status) {
      list = list.filter(a => a.status === status);
    }
    if (interviewId) {
      list = list.filter(a => a.interviewId === interviewId);
    }

    list.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

    return list.map(a => ({
      id: a.id,
      interviewId: a.interviewId,
      interviewTitle: a.interviewTitle,
      userId: a.userId,
      status: a.status,
      startedAt: a.startedAt,
      finishedAt: a.finishedAt,
      score: a.status === 'in_progress' ? null : a.score,
      maxScore: a.status === 'in_progress' ? null : a.maxScore,
      percentage: a.status === 'in_progress' ? null : a.percentage,
      readiness: a.status === 'in_progress' ? null : a.readiness,
    }));
  }

  async findOne(id: number, userId: number, isAdmin: boolean) {
    const attempt = this.db.attempts.find(a => a.id === id);
    if (!attempt) {
      throw new NotFoundException({ statusCode: 404, error: 'Not Found', code: 'NOT_FOUND', message: 'Attempt not found' });
    }

    if (attempt.userId !== userId && !isAdmin) {
      throw new ForbiddenException({ statusCode: 403, error: 'Forbidden', code: 'NOT_OWNER', message: 'Not owner of attempt' });
    }

    this.checkLazyTimeout(attempt);
    return this.formatAttempt(attempt);
  }

  async submitAnswer(id: number, dto: SubmitAnswerDto, userId: number, isAdmin: boolean) {
    const attempt = this.db.attempts.find(a => a.id === id);
    if (!attempt) {
      throw new NotFoundException({ statusCode: 404, error: 'Not Found', code: 'NOT_FOUND', message: 'Attempt not found' });
    }

    if (attempt.userId !== userId && !isAdmin) {
      throw new ForbiddenException({ statusCode: 403, error: 'Forbidden', code: 'NOT_OWNER', message: 'Not owner of attempt' });
    }

    const timedOut = this.checkLazyTimeout(attempt);
    if (timedOut) {
      throw new ConflictException({
        statusCode: 409,
        error: 'Conflict',
        code: 'ANSWER_LATE',
        message: 'Answer submitted after deadline (grace period expired). Attempt has timed out.',
      });
    }

    if (attempt.status !== 'in_progress') {
      throw new ConflictException({
        statusCode: 409,
        error: 'Conflict',
        code: 'ATTEMPT_ENDED',
        message: 'Attempt has already ended.',
      });
    }

    const targetQuestion = attempt.questions.find(q => q.questionId === dto.questionId);
    if (!targetQuestion) {
      throw new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        code: 'QUESTION_NOT_IN_ATTEMPT',
        message: `Question ${dto.questionId} does not belong to this attempt`,
      });
    }

    if (attempt.answeredQuestionIds.includes(dto.questionId)) {
      throw new ConflictException({
        statusCode: 409,
        error: 'Conflict',
        code: 'ANSWER_DUPLICATE',
        message: 'Question has already been answered',
      });
    }

    if (dto.answer.type !== targetQuestion.type) {
      throw new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        code: 'ANSWER_TYPE_MISMATCH',
        message: `Answer type ${dto.answer.type} does not match question type ${targetQuestion.type}`,
      });
    }

    if (targetQuestion.type === 'multiple_choice') {
      if (!dto.answer.choiceId) {
        throw new BadRequestException({ statusCode: 400, error: 'Bad Request', code: 'VALIDATION_FAILED', message: 'choiceId is required' });
      }
      const exists = targetQuestion.choices?.some(c => c.id === dto.answer.choiceId);
      if (!exists) {
        throw new BadRequestException({ statusCode: 400, error: 'Bad Request', code: 'INVALID_CHOICE', message: 'choiceId not in choices' });
      }
    } else {
      if (typeof dto.answer.text !== 'string' || dto.answer.text.length > 2000) {
        throw new BadRequestException({ statusCode: 400, error: 'Bad Request', code: 'VALIDATION_FAILED', message: 'text must be <= 2000 characters' });
      }
      if (targetQuestion.type === 'short_answer' && !dto.answer.text.trim()) {
        throw new BadRequestException({ statusCode: 400, error: 'Bad Request', code: 'VALIDATION_FAILED', message: 'short answer cannot be empty' });
      }
    }

    const submittedAt = new Date().toISOString();
    attempt.answers.push({
      questionId: dto.questionId,
      answer: dto.answer,
      submittedAt,
    });
    attempt.answeredQuestionIds.push(dto.questionId);
    this.db.saveToDisk();

    return {
      questionId: dto.questionId,
      accepted: true,
      submittedAt,
    };
  }

  async finish(id: number, userId: number, isAdmin: boolean) {
    const attempt = this.db.attempts.find(a => a.id === id);
    if (!attempt) {
      throw new NotFoundException({ statusCode: 404, error: 'Not Found', code: 'NOT_FOUND', message: 'Attempt not found' });
    }

    if (attempt.userId !== userId && !isAdmin) {
      throw new ForbiddenException({ statusCode: 403, error: 'Forbidden', code: 'NOT_OWNER', message: 'Not owner of attempt' });
    }

    if (attempt.status !== 'in_progress') {
      throw new ConflictException({
        statusCode: 409,
        error: 'Conflict',
        code: 'ATTEMPT_ENDED',
        message: 'Attempt has already ended',
      });
    }

    attempt.status = 'finished';
    attempt.finishedAt = new Date().toISOString();
    const evaluation = this.scoringService.evaluateAttempt(attempt);
    attempt.score = evaluation.score;
    attempt.maxScore = evaluation.maxScore;
    attempt.percentage = evaluation.percentage;
    attempt.readiness = evaluation.readiness;
    this.db.saveToDisk();

    return this.formatAttempt(attempt);
  }

  async getResults(id: number, userId: number, isAdmin: boolean) {
    const attempt = this.db.attempts.find(a => a.id === id);
    if (!attempt) {
      throw new NotFoundException({ statusCode: 404, error: 'Not Found', code: 'NOT_FOUND', message: 'Attempt not found' });
    }

    if (attempt.userId !== userId && !isAdmin) {
      throw new ForbiddenException({ statusCode: 403, error: 'Forbidden', code: 'NOT_OWNER', message: 'Not owner of attempt' });
    }

    this.checkLazyTimeout(attempt);

    if (attempt.status === 'in_progress') {
      throw new ConflictException({
        statusCode: 409,
        error: 'Conflict',
        code: 'ATTEMPT_NOT_ENDED',
        message: 'Results requested while attempt is still in progress',
      });
    }

    const evaluation = this.scoringService.evaluateAttempt(attempt);

    return {
      attemptId: attempt.id,
      interviewId: attempt.interviewId,
      interviewTitle: attempt.interviewTitle,
      status: attempt.status,
      startedAt: attempt.startedAt,
      finishedAt: attempt.finishedAt,
      score: evaluation.score,
      maxScore: evaluation.maxScore,
      percentage: evaluation.percentage,
      readiness: evaluation.readiness,
      items: evaluation.items,
    };
  }
}

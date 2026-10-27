import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InMemoryStore, type AttemptRecord, type Readiness } from '../common/store.service.js';

export interface CreateAttemptInput {
  interviewId: number;
}

export interface SubmitAnswerInput {
  questionId: number;
  answer: { type: string; choiceId?: string; text?: string };
}

@Injectable()
export class AttemptsService {
  constructor(private readonly store: InMemoryStore) {}

  private nowIso() {
    return new Date().toISOString();
  }

  private normalizeShortAnswer(answer: string) {
    return answer.toLowerCase();
  }

  private scoreQuestion(question: AttemptRecord['questions'][number], answer: { type: string; choiceId?: string; text?: string } | undefined) {
    if (!answer) {
      return 0;
    }

    if (question.type === 'multiple_choice') {
      const expected = (question as any).isCorrect ?? null;
      const chosen = answer.choiceId;
      return expected !== null && chosen === expected ? 1 : 0;
    }

    if (question.type === 'short_answer') {
      const submission = String(answer.text ?? '').trim();
      const expectedKeywords = question.expectedKeywords ?? [];
      const requiredCount = question.requiredKeywordCount ?? 0;
      if (!submission) {
        return 0;
      }
      const matched = expectedKeywords.reduce((count, keyword) => {
        if (this.normalizeShortAnswer(submission).includes(this.normalizeShortAnswer(keyword))) {
          return count + 1;
        }
        return count;
      }, 0);
      if (matched >= requiredCount) return 1;
      if (matched > 0 && matched < requiredCount) return 0.5;
      return 0;
    }

    const expected = String((question as any).expectedOutput ?? '');
    const normalizedExpected = expected.replace(/\r\n/g, '\n').trim();
    const normalizedSubmitted = String(answer.text ?? '').replace(/\r\n/g, '\n').trim();
    return normalizedExpected === normalizedSubmitted ? 1 : 0;
  }

  private getReadiness(percentage: number): Readiness {
    if (percentage < 60) return 'needs_practice';
    if (percentage < 85) return 'almost_ready';
    return 'ready';
  }

  private recomputeAttemptMetrics(attempt: AttemptRecord) {
    const questions = attempt.questions;
    let score = 0;
    for (const question of questions) {
      const answer = attempt.answers[question.questionId];
      score += this.scoreQuestion(question, answer);
    }

    const maxScore = questions.length;
    const percentage = maxScore === 0 ? 0 : Number(((score / maxScore) * 100).toFixed(1));
    attempt.score = score;
    attempt.maxScore = maxScore;
    attempt.percentage = percentage;
    attempt.readiness = this.getReadiness(percentage);
    return { score, maxScore, percentage, readiness: attempt.readiness };
  }

  private applyLazyTimeout(attempt: AttemptRecord) {
    if (attempt.status !== 'in_progress') {
      return attempt;
    }
    const now = Date.now();
    const deadlineMs = new Date(attempt.deadlineAt).getTime() + 5000;
    if (now > deadlineMs) {
      attempt.status = 'timed_out';
      attempt.finishedAt = new Date().toISOString();
      this.recomputeAttemptMetrics(attempt);
    }
    return attempt;
  }

  private safeAttempt(attempt: AttemptRecord) {
    const answeredQuestionIds = Object.keys(attempt.answers).map(Number);
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
      questions: attempt.questions.map((question) => ({
        questionId: question.questionId,
        position: question.position,
        prompt: question.prompt,
        type: question.type,
        difficulty: question.difficulty,
        category: question.category,
        choices: question.choices,
        codeSnippet: question.codeSnippet,
      })),
      answeredQuestionIds,
      score: attempt.score,
      maxScore: attempt.maxScore,
      percentage: attempt.percentage,
      readiness: attempt.readiness,
    };
  }

  listAttempts(userId: number, status?: string, interviewId?: string) {
    return this.store.attempts
      .filter((attempt) => attempt.userId === userId)
      .filter((attempt) => (!status || attempt.status === status))
      .filter((attempt) => (!interviewId || String(attempt.interviewId) === String(interviewId)))
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
      .map((attempt) => {
        const finalAttempt = this.applyLazyTimeout({ ...attempt, answers: { ...attempt.answers } });
        return {
          id: finalAttempt.id,
          interviewId: finalAttempt.interviewId,
          interviewTitle: finalAttempt.interviewTitle,
          status: finalAttempt.status,
          startedAt: finalAttempt.startedAt,
          finishedAt: finalAttempt.finishedAt,
          score: finalAttempt.score,
          maxScore: finalAttempt.maxScore,
          percentage: finalAttempt.percentage,
          readiness: finalAttempt.readiness,
        };
      });
  }

  createAttempt(userId: number, input: CreateAttemptInput) {
    const interview = this.store.getInterviewById(input.interviewId);
    if (!interview) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Interview not found.' });
    }

    const startedAt = new Date();
    const deadlineAt = new Date(startedAt.getTime() + interview.timeLimitSeconds * 1000).toISOString();
    const questions = interview.questionIds.map((questionId, index) => {
      const question = this.store.getQuestionById(questionId);
      if (!question) {
        throw new BadRequestException({ code: 'QUESTION_NOT_FOUND_IN_LIST', message: 'Question missing from interview.' });
      }
      const snapshot = {
        questionId: question.id,
        position: index + 1,
        prompt: question.prompt,
        type: question.type,
        difficulty: question.difficulty,
        category: question.category,
        choices: question.type === 'multiple_choice' ? (question.choices ?? []).map(({ id, text }) => ({ id, text })) : null,
        codeSnippet: question.type === 'code_output' ? question.codeSnippet : null,
        expectedKeywords: question.expectedKeywords,
        requiredKeywordCount: question.requiredKeywordCount,
        expectedOutput: question.expectedOutput,
        isCorrect: question.type === 'multiple_choice' ? question.choices?.find((choice) => choice.isCorrect)?.id ?? null : null,
      };
      return snapshot;
    });

    const created: AttemptRecord = {
      id: this.store.nextId('attempts'),
      interviewId: interview.id,
      interviewTitle: interview.title,
      userId,
      status: 'in_progress',
      startedAt: startedAt.toISOString(),
      deadlineAt,
      finishedAt: null,
      timeLimitSeconds: interview.timeLimitSeconds,
      questions,
      answers: {},
      score: null,
      maxScore: null,
      percentage: null,
      readiness: null,
    };

    this.store.attempts.push(created);
    return this.safeAttempt(created);
  }

  getAttempt(userId: number, attemptId: number) {
    const attempt = this.store.getAttemptById(attemptId);
    if (!attempt) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Attempt not found.' });
    }
    if (attempt.userId !== userId) {
      throw new ForbiddenException({ code: 'NOT_OWNER', message: 'You are not allowed to access this attempt.' });
    }
    this.applyLazyTimeout(attempt);
    return this.safeAttempt(attempt);
  }

  submitAnswer(userId: number, attemptId: number, input: SubmitAnswerInput) {
    const attempt = this.store.getAttemptById(attemptId);
    if (!attempt) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Attempt not found.' });
    }
    if (attempt.userId !== userId) {
      throw new ForbiddenException({ code: 'NOT_OWNER', message: 'You are not allowed to answer this attempt.' });
    }

    this.applyLazyTimeout(attempt);
    if (attempt.status !== 'in_progress') {
      throw new ConflictException({ code: 'ATTEMPT_ENDED', message: 'This attempt is no longer active.' });
    }

    const question = attempt.questions.find((item) => item.questionId === input.questionId);
    if (!question) {
      throw new BadRequestException({ code: 'QUESTION_NOT_IN_ATTEMPT', message: 'This question is not part of the attempt.' });
    }

    const answer = input.answer;
    if (answer.type !== question.type) {
      throw new BadRequestException({ code: 'ANSWER_TYPE_MISMATCH', message: 'Answer type does not match the question type.' });
    }

    if (question.type === 'multiple_choice') {
      const validChoice = (question.choices ?? []).some((choice) => choice.id === answer.choiceId);
      if (!validChoice) {
        throw new BadRequestException({ code: 'INVALID_CHOICE', message: 'Selected choice is invalid.' });
      }
    }

    if (attempt.answers[input.questionId]) {
      throw new ConflictException({ code: 'ANSWER_DUPLICATE', message: 'This question has already been answered.' });
    }

    const now = Date.now();
    const graceDeadline = new Date(attempt.deadlineAt).getTime() + 5000;
    if (now > graceDeadline) {
      attempt.status = 'timed_out';
      attempt.finishedAt = this.nowIso();
      this.recomputeAttemptMetrics(attempt);
      throw new ConflictException({ code: 'ANSWER_LATE', message: 'The answer was submitted after the grace period.' });
    }

    attempt.answers[input.questionId] = answer as any;
    return { questionId: input.questionId, accepted: true, submittedAt: this.nowIso() };
  }

  finishAttempt(userId: number, attemptId: number) {
    const attempt = this.store.getAttemptById(attemptId);
    if (!attempt) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Attempt not found.' });
    }
    if (attempt.userId !== userId) {
      throw new ForbiddenException({ code: 'NOT_OWNER', message: 'You are not allowed to finish this attempt.' });
    }

    this.applyLazyTimeout(attempt);
    if (attempt.status !== 'in_progress') {
      throw new ConflictException({ code: 'ATTEMPT_ENDED', message: 'This attempt is already ended.' });
    }

    attempt.status = 'finished';
    attempt.finishedAt = this.nowIso();
    this.recomputeAttemptMetrics(attempt);
    return this.safeAttempt(attempt);
  }

  getResults(userId: number, attemptId: number) {
    const attempt = this.store.getAttemptById(attemptId);
    if (!attempt) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Attempt not found.' });
    }
    if (attempt.userId !== userId) {
      throw new ForbiddenException({ code: 'NOT_OWNER', message: 'You are not allowed to view this result.' });
    }

    this.applyLazyTimeout(attempt);
    if (attempt.status === 'in_progress') {
      throw new ConflictException({ code: 'ATTEMPT_NOT_ENDED', message: 'This attempt is still in progress.' });
    }

    const items = attempt.questions.map((question) => {
      const submitted = attempt.answers[question.questionId];
      const points = this.scoreQuestion(question, submitted);
      const expected =
        question.type === 'multiple_choice'
          ? { correctChoiceId: (question as any).isCorrect ?? null }
          : question.type === 'short_answer'
            ? { expectedKeywords: question.expectedKeywords ?? [], requiredKeywordCount: question.requiredKeywordCount ?? 0 }
            : { expectedOutput: question.expectedOutput ?? '' };

      let explanation = 'Unanswered question: 0 points.';
      if (question.type === 'multiple_choice') {
        const correctChoiceId = (question as any).isCorrect ?? '';
        explanation = submitted && submitted.choiceId === correctChoiceId ? 'Correct choice selected: 1 point.' : 'Incorrect choice selected: 0 points.';
      }
      if (question.type === 'short_answer') {
        const keywords = question.expectedKeywords ?? [];
        const required = question.requiredKeywordCount ?? 0;
        const matched = submitted
          ? keywords.reduce((count, keyword) => {
              if (String(submitted.text ?? '').toLowerCase().includes(keyword.toLowerCase())) {
                return count + 1;
              }
              return count;
            }, 0)
          : 0;
        if (submitted && matched >= required) explanation = `Matched ${matched} of ${keywords.length} keywords: full credit.`;
        else if (submitted && matched > 0 && matched < required) explanation = `Matched ${matched} of ${required} required keywords: half credit.`;
        else if (submitted) explanation = `Matched 0 of ${required} required keywords: no credit.`;
      }
      if (question.type === 'code_output') {
        explanation = submitted && String(submitted.text ?? '').trim() === String(question.expectedOutput ?? '').trim()
          ? 'Output matches exactly: 1 point.'
          : 'Output did not match expected output: 0 points.';
      }

      return {
        questionId: question.questionId,
        position: question.position,
        prompt: question.prompt,
        type: question.type,
        submitted: submitted ?? null,
        expected,
        points,
        maxPoints: 1,
        explanation,
      };
    });

    return {
      attemptId: attempt.id,
      interviewId: attempt.interviewId,
      interviewTitle: attempt.interviewTitle,
      status: attempt.status,
      startedAt: attempt.startedAt,
      finishedAt: attempt.finishedAt,
      score: attempt.score,
      maxScore: attempt.maxScore,
      percentage: attempt.percentage,
      readiness: attempt.readiness,
      items,
    };
  }
}

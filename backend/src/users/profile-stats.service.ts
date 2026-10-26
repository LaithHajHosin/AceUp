import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';
import { ProfileStatsDto } from './dto/user-response.dto.js';

interface StoredQuestionDoc {
  id: number;
  ownerId: number;
}

interface StoredInterviewDoc {
  id: number;
  ownerId: number;
}

interface StoredAttemptDoc {
  id: number;
  userId: number;
  interviewId?: number;
  status: 'in_progress' | 'finished' | 'timed_out';
  percentage: number | null;
  questions?: Array<{ questionId: number }>;
  answers?: unknown[];
}

@Injectable()
export class ProfileStatsService {
  private readonly fallbackCollections: {
    questions: StoredQuestionDoc[];
    interviews: StoredInterviewDoc[];
    attempts: StoredAttemptDoc[];
  } = {
    questions: [],
    interviews: [],
    attempts: [],
  };

  constructor(@InjectConnection() private readonly connection: Connection) {}

  private isDbConnected(): boolean {
    return Number(this.connection.readyState) === 1;
  }

  /**
   * Used in offline/in-memory e2e test environments when a live mongod
   * process is not running, mirroring raw collection inserts per Contract §8.
   */
  getFallbackStore() {
    return this.fallbackCollections;
  }

  async getStatsForUser(userId: number): Promise<ProfileStatsDto> {
    if (this.isDbConnected()) {
      const [questionsCreated, interviewsCreated, attempts] = await Promise.all([
        this.connection
          .collection<StoredQuestionDoc>('questions')
          .countDocuments({ ownerId: userId }),
        this.connection
          .collection<StoredInterviewDoc>('interviews')
          .countDocuments({ ownerId: userId }),
        this.connection
          .collection<StoredAttemptDoc>('attempts')
          .find(
            { userId },
            { projection: { status: 1, percentage: 1, answers: 1, _id: 0 } },
          )
          .toArray(),
      ]);

      return this.computeAttemptMetrics(
        questionsCreated,
        interviewsCreated,
        attempts,
      );
    }

    const questionsCreated = this.fallbackCollections.questions.filter(
      (q) => q.ownerId === userId,
    ).length;
    const interviewsCreated = this.fallbackCollections.interviews.filter(
      (i) => i.ownerId === userId,
    ).length;
    const attempts = this.fallbackCollections.attempts.filter(
      (a) => a.userId === userId,
    );

    return this.computeAttemptMetrics(
      questionsCreated,
      interviewsCreated,
      attempts,
    );
  }

  private computeAttemptMetrics(
    questionsCreated: number,
    interviewsCreated: number,
    attempts: StoredAttemptDoc[],
  ): ProfileStatsDto {
    let attemptsCompleted = 0;
    let attemptsInProgress = 0;
    let questionsAnswered = 0;
    const completedPercentages: number[] = [];

    for (const attempt of attempts) {
      if (Array.isArray(attempt.answers)) {
        questionsAnswered += attempt.answers.length;
      }

      if (attempt.status === 'in_progress') {
        attemptsInProgress += 1;
      } else if (
        attempt.status === 'finished' ||
        attempt.status === 'timed_out'
      ) {
        attemptsCompleted += 1;
        if (
          typeof attempt.percentage === 'number' &&
          Number.isFinite(attempt.percentage)
        ) {
          completedPercentages.push(attempt.percentage);
        }
      }
    }

    let averagePercentage: number | null = null;
    let bestPercentage: number | null = null;

    if (completedPercentages.length > 0) {
      const sum = completedPercentages.reduce((acc, val) => acc + val, 0);
      averagePercentage =
        Math.round((sum / completedPercentages.length) * 10) / 10;
      bestPercentage =
        Math.round(Math.max(...completedPercentages) * 10) / 10;
    }

    return {
      questionsCreated,
      interviewsCreated,
      attemptsCompleted,
      attemptsInProgress,
      questionsAnswered,
      averagePercentage,
      bestPercentage,
    };
  }
}

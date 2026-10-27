import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InMemoryStore, type UserRecord } from '../common/store.service.js';

export interface UpdateProfileInput {
  displayName?: string;
  bio?: string | null;
}

@Injectable()
export class UsersService {
  constructor(private readonly store: InMemoryStore) {}

  private sanitizeUser(user: UserRecord) {
    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      bio: user.bio,
      createdAt: user.createdAt,
    };
  }

  getPublicProfile(userId: number) {
    const user = this.store.getUserById(userId);
    if (!user) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'User not found.' });
    }

    const questionsCreated = this.store.questions.filter((question) => question.ownerId === userId).length;
    const interviewsCreated = this.store.interviews.filter((interview) => interview.ownerId === userId).length;
    const attemptsCompleted = this.store.attempts.filter(
      (attempt) => attempt.userId === userId && (attempt.status === 'finished' || attempt.status === 'timed_out'),
    ).length;
    const attemptsInProgress = this.store.attempts.filter(
      (attempt) => attempt.userId === userId && attempt.status === 'in_progress',
    ).length;
    const endedAttempts = this.store.attempts.filter(
      (attempt) => attempt.userId === userId && (attempt.status === 'finished' || attempt.status === 'timed_out'),
    );
    const questionsAnswered = endedAttempts.reduce((total, attempt) => total + Object.keys(attempt.answers).length, 0);
    const percentages = endedAttempts.map((attempt) => attempt.percentage ?? 0).filter((value) => value !== null);
    const averagePercentage = percentages.length ? Number((percentages.reduce((sum, value) => sum + value, 0) / percentages.length).toFixed(1)) : null;
    const bestPercentage = percentages.length ? Math.max(...percentages) : null;

    return {
      user: this.sanitizeUser(user),
      stats: {
        questionsCreated,
        interviewsCreated,
        attemptsCompleted,
        attemptsInProgress,
        questionsAnswered,
        averagePercentage,
        bestPercentage,
      },
    };
  }

  updateCurrentUser(userId: number, input: UpdateProfileInput) {
    const user = this.store.getUserById(userId);
    if (!user) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'User not found.' });
    }

    const displayName = input.displayName !== undefined ? input.displayName.trim() : user.displayName;
    if (displayName.length < 2 || displayName.length > 50) {
      throw new BadRequestException({ code: 'VALIDATION_FAILED', message: 'Display name must be 2-50 characters.' });
    }

    const bio = input.bio === undefined ? user.bio : input.bio === null ? null : input.bio.slice(0, 300);
    if (typeof bio === 'string' && bio.length > 300) {
      throw new BadRequestException({ code: 'VALIDATION_FAILED', message: 'Bio must be 300 characters or fewer.' });
    }

    user.displayName = displayName;
    user.bio = bio;
    user.updatedAt = new Date().toISOString();

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: user.displayName,
      bio: user.bio,
      createdAt: user.createdAt,
    };
  }
}

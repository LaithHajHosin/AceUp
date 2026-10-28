import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { UpdateUserDto } from './dto/update-user.dto.js';

@Injectable()
export class UsersService {
  constructor(@Inject(DatabaseService) private db: DatabaseService) {}

  async updateMe(userId: number, dto: UpdateUserDto) {
    const user = this.db.users.find(u => u.id === userId);
    if (!user) {
      throw new NotFoundException({
        statusCode: 404,
        error: 'Not Found',
        code: 'NOT_FOUND',
        message: 'User not found',
      });
    }

    if (dto.displayName !== undefined) {
      user.displayName = dto.displayName.trim();
    }

    if (dto.bio !== undefined) {
      user.bio = dto.bio ? dto.bio.trim() : null;
    }

    user.updatedAt = new Date().toISOString();
    this.db.saveToDisk();

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: user.displayName,
      bio: user.bio,
      role: user.role,
      createdAt: user.createdAt,
    };
  }

  async getProfile(targetId: number) {
    const user = this.db.users.find(u => u.id === targetId);
    if (!user) {
      throw new NotFoundException({
        statusCode: 404,
        error: 'Not Found',
        code: 'NOT_FOUND',
        message: 'User not found',
      });
    }

    // Profile statistics matching Section 7:
    // questionsCreated, interviewsCreated, attemptsCompleted, attemptsInProgress, questionsAnswered, averagePercentage, bestPercentage
    const questionsCreated = this.db.questions.filter(q => q.ownerId === targetId).length;
    const interviewsCreated = this.db.interviews.filter(i => i.ownerId === targetId).length;

    const userAttempts = this.db.attempts.filter(a => a.userId === targetId);
    const now = Date.now();

    // Check lazy timeouts (+5s grace)
    userAttempts.forEach(a => {
      if (a.status === 'in_progress' && now > new Date(a.deadlineAt).getTime() + 5000) {
        a.status = 'timed_out';
        a.finishedAt = a.deadlineAt;
      }
    });

    const endedAttempts = userAttempts.filter(a => a.status === 'finished' || a.status === 'timed_out');
    const attemptsCompleted = endedAttempts.length;
    const attemptsInProgress = userAttempts.filter(a => a.status === 'in_progress').length;

    let questionsAnswered = 0;
    endedAttempts.forEach(a => {
      questionsAnswered += (a.answers || []).length;
    });

    let averagePercentage: number | null = null;
    let bestPercentage: number | null = null;

    if (endedAttempts.length > 0) {
      const percentages = endedAttempts.map(a => a.percentage ?? 0);
      const sum = percentages.reduce((acc, val) => acc + val, 0);
      averagePercentage = Math.round((sum / percentages.length) * 10) / 10;
      bestPercentage = Math.round(Math.max(...percentages) * 10) / 10;
    }

    return {
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        bio: user.bio,
        createdAt: user.createdAt,
      },
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
}

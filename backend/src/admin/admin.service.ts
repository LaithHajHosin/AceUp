import { Injectable, ForbiddenException, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';

@Injectable()
export class AdminService {
  constructor(@Inject(DatabaseService) private db: DatabaseService) {}

  private checkAdmin(username?: string, userId?: number) {
    if (username === 'admin') return;
    const user = this.db.users.find(u => u.id === userId);
    if (user?.role !== 'admin' && user?.username !== 'admin') {
      throw new ForbiddenException({ statusCode: 403, error: 'Forbidden', code: 'FORBIDDEN', message: 'Admin access required' });
    }
  }

  async getOverview(username: string, userId: number) {
    this.checkAdmin(username, userId);

    const totalUsers = this.db.users.length;
    const totalQuestions = this.db.questions.length;
    const totalInterviews = this.db.interviews.length;
    const totalAttempts = this.db.attempts.length;

    const finished = this.db.attempts.filter(a => a.status === 'finished' || a.status === 'timed_out');
    const avgPercentage = finished.length > 0
      ? Math.round((finished.reduce((acc, a) => acc + (a.percentage || 0), 0) / finished.length) * 10) / 10
      : 0;

    const readinessBreakdown = {
      ready: finished.filter(a => a.readiness === 'ready').length,
      almost_ready: finished.filter(a => a.readiness === 'almost_ready').length,
      needs_practice: finished.filter(a => a.readiness === 'needs_practice').length,
    };

    const usersList = this.db.users.map(u => ({
      id: u.id,
      username: u.username,
      email: u.email,
      displayName: u.displayName,
      role: u.role,
      bio: u.bio,
      createdAt: u.createdAt,
      questionsCreated: this.db.questions.filter(q => q.ownerId === u.id).length,
      attemptsTaken: this.db.attempts.filter(a => a.userId === u.id).length,
    }));

    const allAttempts = this.db.attempts.map(a => {
      const candidate = this.db.users.find(u => u.id === a.userId);
      return {
        id: a.id,
        interviewId: a.interviewId,
        interviewTitle: a.interviewTitle,
        userId: a.userId,
        username: candidate?.username || 'unknown',
        displayName: candidate?.displayName || 'Unknown Candidate',
        status: a.status,
        startedAt: a.startedAt,
        finishedAt: a.finishedAt,
        score: a.score,
        maxScore: a.maxScore,
        percentage: a.percentage,
        readiness: a.readiness,
      };
    });

    return {
      metrics: {
        totalUsers,
        totalQuestions,
        totalInterviews,
        totalAttempts,
        avgPercentage,
        readinessBreakdown,
      },
      users: usersList,
      attempts: allAttempts,
    };
  }

  async updateUserRole(id: number, role: string, username: string, userId: number) {
    this.checkAdmin(username, userId);

    const user = this.db.users.find(u => u.id === id);
    if (!user) {
      throw new NotFoundException({ statusCode: 404, error: 'Not Found', code: 'NOT_FOUND', message: 'User not found' });
    }

    if (!['admin', 'author', 'user'].includes(role)) {
      throw new BadRequestException({ statusCode: 400, error: 'Bad Request', code: 'VALIDATION_FAILED', message: 'Invalid role' });
    }

    user.role = role as any;
    user.updatedAt = new Date().toISOString();
    this.db.saveToDisk();

    return { success: true, user: { id: user.id, username: user.username, role: user.role } };
  }

  async resetData(username: string, userId: number) {
    this.checkAdmin(username, userId);
    this.db.resetAllToSeeds();
    return { success: true, message: 'Database reset to 40+ seeds successfully' };
  }
}

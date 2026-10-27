import { INestApplication } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Connection } from 'mongoose';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/main.js';
import { ProfileStatsService } from '../src/users/profile-stats.service.js';

describe('Users & Profile Statistics (e2e)', () => {
  let app: INestApplication;
  let connection: Connection;
  let profileStatsService: ProfileStatsService;

  let emptyUserToken = '';
  let emptyUserId = 0;

  let inProgressUserId = 0;
  let completedUserId = 0;

  beforeAll(async () => {
    process.env.MONGODB_URI =
      process.env.MONGODB_URI || 'mongodb://localhost:27017/preppressure_test';
    process.env.JWT_SECRET =
      process.env.JWT_SECRET || 'test-jwt-secret-preppressure-v3';
    process.env.JWT_EXPIRES_IN = '1h';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();

    connection = moduleFixture.get<Connection>(getConnectionToken());
    await connection.collection('users').deleteMany({});
    await connection.collection('counters').deleteMany({});
    await connection.collection('questions').deleteMany({});
    await connection.collection('interviews').deleteMany({});
    await connection.collection('attempts').deleteMany({});

    profileStatsService =
      moduleFixture.get<ProfileStatsService>(ProfileStatsService);

    // Register 3 test users for the 3 profile stats checklist scenarios
    const u1 = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        username: 'user_nothing',
        email: 'nothing@example.com',
        password: 'password123',
        displayName: 'New User',
      });
    emptyUserToken = u1.body.accessToken;
    emptyUserId = u1.body.user.id;

    const u2 = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        username: 'user_inprogress',
        email: 'inprogress@example.com',
        password: 'password123',
        displayName: 'In Progress User',
      });
    inProgressUserId = u2.body.user.id;

    const u3 = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        username: 'user_completed',
        email: 'completed@example.com',
        password: 'password123',
        displayName: 'Experienced User',
      });
    completedUserId = u3.body.user.id;
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  async function seedContractDocuments(docs: {
    questions?: Array<{ id: number; ownerId: number; prompt: string }>;
    interviews?: Array<{ id: number; ownerId: number; title: string }>;
    attempts?: Array<{
      id: number;
      userId: number;
      interviewId: number;
      status: 'in_progress' | 'finished' | 'timed_out';
      percentage: number | null;
      questions: Array<{ questionId: number }>;
      answers: unknown[];
    }>;
  }) {
    if (Number(connection.readyState) === 1) {
      if (docs.questions?.length) {
        await connection.collection('questions').insertMany(docs.questions);
      }
      if (docs.interviews?.length) {
        await connection.collection('interviews').insertMany(docs.interviews);
      }
      if (docs.attempts?.length) {
        await connection.collection('attempts').insertMany(docs.attempts);
      }
    } else {
      const store = profileStatsService.getFallbackStore();
      if (docs.questions?.length) {
        store.questions.push(...docs.questions);
      }
      if (docs.interviews?.length) {
        store.interviews.push(...docs.interviews);
      }
      if (docs.attempts?.length) {
        store.attempts.push(...docs.attempts);
      }
    }
  }

  describe('PATCH /api/v1/users/me', () => {
    it('updates displayName and bio for the current user and returns PrivateUser without passwordHash', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/v1/users/me')
        .set('Authorization', `Bearer ${emptyUserToken}`)
        .send({
          displayName: '  Alex Updated  ',
          bio: '  Backend learner preparing for interviews  ',
        });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        id: emptyUserId,
        username: 'user_nothing',
        email: 'nothing@example.com',
        displayName: 'Alex Updated',
        bio: 'Backend learner preparing for interviews',
        createdAt: expect.any(String),
      });
      expect(res.body.passwordHash).toBeUndefined();
    });

    it('allows clearing bio to null', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/v1/users/me')
        .set('Authorization', `Bearer ${emptyUserToken}`)
        .send({
          bio: null,
        });

      expect(res.status).toBe(200);
      expect(res.body.bio).toBeNull();
    });

    it('rejects unknown body fields and invalid lengths with 400', async () => {
      const unknownFieldRes = await request(app.getHttpServer())
        .patch('/api/v1/users/me')
        .set('Authorization', `Bearer ${emptyUserToken}`)
        .send({
          displayName: 'Valid Name',
          email: 'hacker@example.com',
        });
      expect(unknownFieldRes.status).toBe(400);

      const longBioRes = await request(app.getHttpServer())
        .patch('/api/v1/users/me')
        .set('Authorization', `Bearer ${emptyUserToken}`)
        .send({
          bio: 'a'.repeat(301),
        });
      expect(longBioRes.status).toBe(400);
    });
  });

  describe('GET /api/v1/users/:id/profile', () => {
    it('returns PublicUser (without email or passwordHash) and zero/null stats for a user with nothing', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/users/${emptyUserId}/profile`)
        .set('Authorization', `Bearer ${emptyUserToken}`);

      expect(res.status).toBe(200);
      expect(res.body.user).toEqual({
        id: emptyUserId,
        username: 'user_nothing',
        displayName: 'Alex Updated',
        bio: null,
        createdAt: expect.any(String),
      });
      expect(res.body.user.email).toBeUndefined();
      expect(res.body.user.passwordHash).toBeUndefined();
      expect(res.body.stats).toEqual({
        questionsCreated: 0,
        interviewsCreated: 0,
        attemptsCompleted: 0,
        attemptsInProgress: 0,
        questionsAnswered: 0,
        averagePercentage: null,
        bestPercentage: null,
      });
    });

    it('computes accurate profile stats for a user with only in-progress attempts', async () => {
      await seedContractDocuments({
        attempts: [
          {
            id: 201,
            userId: inProgressUserId,
            interviewId: 10,
            status: 'in_progress',
            percentage: null,
            questions: [{ questionId: 1 }, { questionId: 2 }],
            answers: [{ questionId: 1 }],
          },
          {
            id: 202,
            userId: inProgressUserId,
            interviewId: 11,
            status: 'in_progress',
            percentage: null,
            questions: [{ questionId: 3 }],
            answers: [{ questionId: 3 }, { questionId: 4 }],
          },
        ],
      });

      const res = await request(app.getHttpServer())
        .get(`/api/v1/users/${inProgressUserId}/profile`)
        .set('Authorization', `Bearer ${emptyUserToken}`);

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBeUndefined();
      expect(res.body.stats).toEqual({
        questionsCreated: 0,
        interviewsCreated: 0,
        attemptsCompleted: 0,
        attemptsInProgress: 2,
        questionsAnswered: 3,
        averagePercentage: null,
        bestPercentage: null,
      });
    });

    it('computes accurate profile stats for a user with several ended attempts and created questions/interviews', async () => {
      await seedContractDocuments({
        questions: [
          { id: 101, ownerId: completedUserId, prompt: 'Q1' },
          { id: 102, ownerId: completedUserId, prompt: 'Q2' },
          { id: 103, ownerId: completedUserId, prompt: 'Q3' },
        ],
        interviews: [
          { id: 301, ownerId: completedUserId, title: 'Interview 1' },
          { id: 302, ownerId: completedUserId, title: 'Interview 2' },
        ],
        attempts: [
          {
            id: 401,
            userId: completedUserId,
            interviewId: 301,
            status: 'finished',
            percentage: 70.0,
            questions: [{ questionId: 101 }, { questionId: 102 }],
            answers: [{ questionId: 101 }, { questionId: 102 }],
          },
          {
            id: 402,
            userId: completedUserId,
            interviewId: 302,
            status: 'timed_out',
            percentage: 85.5,
            questions: [{ questionId: 101 }, { questionId: 103 }],
            answers: [{ questionId: 101 }],
          },
          {
            id: 403,
            userId: completedUserId,
            interviewId: 302,
            status: 'finished',
            percentage: 95.0,
            questions: [{ questionId: 101 }, { questionId: 102 }, { questionId: 103 }],
            answers: [{ questionId: 101 }, { questionId: 102 }, { questionId: 103 }],
          },
          {
            id: 404,
            userId: completedUserId,
            interviewId: 301,
            status: 'in_progress',
            percentage: null,
            questions: [{ questionId: 101 }],
            answers: [{ questionId: 101 }],
          },
        ],
      });

      const res = await request(app.getHttpServer())
        .get(`/api/v1/users/${completedUserId}/profile`)
        .set('Authorization', `Bearer ${emptyUserToken}`);

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBeUndefined();
      // Average of [70.0, 85.5, 95.0] = 250.5 / 3 = 83.5; Best = 95.0
      expect(res.body.stats).toEqual({
        questionsCreated: 3,
        interviewsCreated: 2,
        attemptsCompleted: 3,
        attemptsInProgress: 1,
        questionsAnswered: 7,
        averagePercentage: 83.5,
        bestPercentage: 95,
      });
    });

    it('returns 404 NOT_FOUND when user id does not exist', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/users/99999/profile')
        .set('Authorization', `Bearer ${emptyUserToken}`);

      expect(res.status).toBe(404);
      expect(res.body.code).toBe('NOT_FOUND');
    });
  });
});

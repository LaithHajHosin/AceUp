import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { MongooseModule, getConnectionToken } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Connection } from 'mongoose';
import request from 'supertest';
import { AttemptsModule } from '../src/attempts/attempts.module.js';
import { AttemptsFakeAuthGuard } from './helpers/attempts-fake-auth.guard.js';

describe('Attempts Module (e2e)', () => {
  let app: INestApplication;
  let mongod: MongoMemoryServer;
  let connection: Connection;

  const validToken = 'Bearer valid_test_token';

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(uri),
        AttemptsModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalGuards(new AttemptsFakeAuthGuard());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
    connection = moduleFixture.get<Connection>(getConnectionToken());
  });

  afterAll(async () => {
    await app.close();
    if (mongod) {
      await mongod.stop();
    }
  });

  beforeEach(async () => {
    // Reset fake auth guard to standard test user
    AttemptsFakeAuthGuard.currentUserId = 1;
    AttemptsFakeAuthGuard.currentUsername = 'tester';
    AttemptsFakeAuthGuard.enforceAuth = true;

    // Clear collections
    await connection.collection('attempts').deleteMany({});
    await connection.collection('counters').deleteMany({});
    await connection.collection('interviews').deleteMany({});
    await connection.collection('questions').deleteMany({});

    // Seed mock questions according to contract Section 8
    await connection.collection('questions').insertMany([
      {
        id: 101,
        ownerId: 2,
        prompt: 'What is the time complexity of array lookup?',
        category: 'arrays',
        difficulty: 'easy',
        type: 'multiple_choice',
        choices: [
          { id: 'a', text: 'O(1)', isCorrect: true },
          { id: 'b', text: 'O(n)', isCorrect: false },
        ],
        codeSnippet: null,
        expectedKeywords: null,
        requiredKeywordCount: null,
        expectedOutput: null,
      },
      {
        id: 102,
        ownerId: 2,
        prompt: 'Describe how a stack works and its operations.',
        category: 'stacks',
        difficulty: 'medium',
        type: 'short_answer',
        choices: null,
        codeSnippet: null,
        expectedKeywords: ['lifo', 'push', 'pop'],
        requiredKeywordCount: 2,
        expectedOutput: null,
      },
      {
        id: 103,
        ownerId: 2,
        prompt: 'What does this snippet print?',
        category: 'javascript',
        difficulty: 'hard',
        type: 'code_output',
        choices: null,
        codeSnippet: "console.log([1, 2].map(x => x * 2))",
        expectedKeywords: null,
        requiredKeywordCount: null,
        expectedOutput: '[ 2, 4 ]',
      },
    ]);

    // Seed mock interview according to contract Section 8
    await connection.collection('interviews').insertOne({
      id: 7,
      ownerId: 2,
      title: 'Data Structures Warmup',
      questionIds: [101, 102, 103],
      timeLimitSeconds: 300,
    });
  });

  describe('Authentication Enforcement', () => {
    it('returns 401 UNAUTHORIZED when no token is supplied', async () => {
      const res = await request(app.getHttpServer())
        .post('/attempts')
        .send({ interviewId: 7 });

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('UNAUTHORIZED');
    });
  });

  describe('POST /attempts', () => {
    it('returns 404 NOT_FOUND if interview does not exist', async () => {
      const res = await request(app.getHttpServer())
        .post('/attempts')
        .set('Authorization', validToken)
        .send({ interviewId: 9999 });

      expect(res.status).toBe(404);
      expect(res.body.code).toBe('NOT_FOUND');
    });

    it('creates attempt successfully with safe questions (no secret answer keys revealed)', async () => {
      const res = await request(app.getHttpServer())
        .post('/attempts')
        .set('Authorization', validToken)
        .send({ interviewId: 7 });

      expect(res.status).toBe(201);
      const attempt = res.body;

      expect(attempt.id).toBeDefined();
      expect(attempt.interviewId).toBe(7);
      expect(attempt.interviewTitle).toBe('Data Structures Warmup');
      expect(attempt.status).toBe('in_progress');
      expect(attempt.questions).toHaveLength(3);
      expect(attempt.answeredQuestionIds).toEqual([]);

      // Verify that NO answer keys or scoring criteria are leaked
      for (const q of attempt.questions) {
        expect(q.expectedKeywords).toBeUndefined();
        expect(q.expectedOutput).toBeUndefined();
        expect(q.requiredKeywordCount).toBeUndefined();
        if (q.choices) {
          for (const c of q.choices) {
            expect(c.isCorrect).toBeUndefined();
          }
        }
      }
    });
  });

  describe('GET /attempts', () => {
    it("returns list of current user's attempts sorted newest first", async () => {
      // Create two attempts
      await request(app.getHttpServer())
        .post('/attempts')
        .set('Authorization', validToken)
        .send({ interviewId: 7 });

      await request(app.getHttpServer())
        .post('/attempts')
        .set('Authorization', validToken)
        .send({ interviewId: 7 });

      const res = await request(app.getHttpServer())
        .get('/attempts')
        .set('Authorization', validToken);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].id).toBe(2);
      expect(res.body[1].id).toBe(1);
    });
  });

  describe('GET /attempts/:id', () => {
    it('returns 404 NOT_FOUND for non-existent attempt', async () => {
      const res = await request(app.getHttpServer())
        .get('/attempts/999')
        .set('Authorization', validToken);

      expect(res.status).toBe(404);
      expect(res.body.code).toBe('NOT_FOUND');
    });

    it('returns 403 NOT_OWNER if attempt belongs to another user', async () => {
      // User 1 creates attempt
      const createRes = await request(app.getHttpServer())
        .post('/attempts')
        .set('Authorization', validToken)
        .send({ interviewId: 7 });

      const attemptId = createRes.body.id;

      // Switch auth guard to user 2
      AttemptsFakeAuthGuard.currentUserId = 2;

      const res = await request(app.getHttpServer())
        .get(`/attempts/${attemptId}`)
        .set('Authorization', validToken);

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('NOT_OWNER');
    });
  });

  describe('POST /attempts/:id/answers', () => {
    let attemptId: number;

    beforeEach(async () => {
      const createRes = await request(app.getHttpServer())
        .post('/attempts')
        .set('Authorization', validToken)
        .send({ interviewId: 7 });
      attemptId = createRes.body.id;
    });

    it('rejects question that is not in attempt with 400 QUESTION_NOT_IN_ATTEMPT', async () => {
      const res = await request(app.getHttpServer())
        .post(`/attempts/${attemptId}/answers`)
        .set('Authorization', validToken)
        .send({
          questionId: 9999,
          answer: { type: 'multiple_choice', choiceId: 'a' },
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('QUESTION_NOT_IN_ATTEMPT');
    });

    it('rejects answer type mismatch with 400 ANSWER_TYPE_MISMATCH', async () => {
      const res = await request(app.getHttpServer())
        .post(`/attempts/${attemptId}/answers`)
        .set('Authorization', validToken)
        .send({
          questionId: 101, // MC question
          answer: { type: 'short_answer', text: 'Some text' },
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('ANSWER_TYPE_MISMATCH');
    });

    it('rejects invalid choiceId for MC question with 400 INVALID_CHOICE', async () => {
      const res = await request(app.getHttpServer())
        .post(`/attempts/${attemptId}/answers`)
        .set('Authorization', validToken)
        .send({
          questionId: 101,
          answer: { type: 'multiple_choice', choiceId: 'non_existent_choice' },
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('INVALID_CHOICE');
    });

    it('accepts valid answer with 201 receipt (no correctness revealed)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/attempts/${attemptId}/answers`)
        .set('Authorization', validToken)
        .send({
          questionId: 101,
          answer: { type: 'multiple_choice', choiceId: 'a' },
        });

      expect(res.status).toBe(201);
      expect(res.body.questionId).toBe(101);
      expect(res.body.accepted).toBe(true);
      expect(res.body.submittedAt).toBeDefined();
    });

    it('rejects answering the same question twice with 409 ANSWER_DUPLICATE', async () => {
      // First answer
      await request(app.getHttpServer())
        .post(`/attempts/${attemptId}/answers`)
        .set('Authorization', validToken)
        .send({
          questionId: 101,
          answer: { type: 'multiple_choice', choiceId: 'a' },
        });

      // Second answer to same question
      const res = await request(app.getHttpServer())
        .post(`/attempts/${attemptId}/answers`)
        .set('Authorization', validToken)
        .send({
          questionId: 101,
          answer: { type: 'multiple_choice', choiceId: 'b' },
        });

      expect(res.status).toBe(409);
      expect(res.body.code).toBe('ANSWER_DUPLICATE');
    });
  });

  describe('Lifecycle: In Progress -> Finish -> Results', () => {
    let attemptId: number;

    beforeEach(async () => {
      const createRes = await request(app.getHttpServer())
        .post('/attempts')
        .set('Authorization', validToken)
        .send({ interviewId: 7 });
      attemptId = createRes.body.id;
    });

    it('rejects GET /attempts/:id/results while attempt is in progress with 409 ATTEMPT_NOT_ENDED', async () => {
      const res = await request(app.getHttpServer())
        .get(`/attempts/${attemptId}/results`)
        .set('Authorization', validToken);

      expect(res.status).toBe(409);
      expect(res.body.code).toBe('ATTEMPT_NOT_ENDED');
    });

    it('finishes attempt and provides explainable results with submitted vs expected', async () => {
      // Submit answer for MC (correct)
      await request(app.getHttpServer())
        .post(`/attempts/${attemptId}/answers`)
        .set('Authorization', validToken)
        .send({
          questionId: 101,
          answer: { type: 'multiple_choice', choiceId: 'a' },
        });

      // Submit short answer with 1 keyword out of 2 (half credit)
      await request(app.getHttpServer())
        .post(`/attempts/${attemptId}/answers`)
        .set('Authorization', validToken)
        .send({
          questionId: 102,
          answer: { type: 'short_answer', text: 'It uses LIFO principle' },
        });

      // Finish attempt
      const finishRes = await request(app.getHttpServer())
        .post(`/attempts/${attemptId}/finish`)
        .set('Authorization', validToken);

      expect(finishRes.status).toBe(200);
      expect(finishRes.body.status).toBe('finished');

      // Attempt is now ended; cannot answer anymore
      const lateAnswerRes = await request(app.getHttpServer())
        .post(`/attempts/${attemptId}/answers`)
        .set('Authorization', validToken)
        .send({
          questionId: 103,
          answer: { type: 'code_output', text: '[ 2, 4 ]' },
        });

      expect(lateAnswerRes.status).toBe(409);
      expect(lateAnswerRes.body.code).toBe('ATTEMPT_ENDED');

      // Fetch results
      const resultsRes = await request(app.getHttpServer())
        .get(`/attempts/${attemptId}/results`)
        .set('Authorization', validToken);

      expect(resultsRes.status).toBe(200);
      const results = resultsRes.body;

      expect(results.status).toBe('finished');
      expect(results.items).toHaveLength(3);

      // Question 101: MC correct (1 point)
      const q1 = results.items.find((item: any) => item.questionId === 101);
      expect(q1.points).toBe(1);
      expect(q1.expected.correctChoiceId).toBe('a');

      // Question 102: SA half credit (1 point out of 2)
      const q2 = results.items.find((item: any) => item.questionId === 102);
      expect(q2.points).toBe(1); // 2 maxPoints / 2 = 1
      expect(q2.explanation).toContain('half credit');

      // Question 103: Unanswered (0 points)
      const q3 = results.items.find((item: any) => item.questionId === 103);
      expect(q3.points).toBe(0);
      expect(q3.submitted).toBeNull();
      expect(q3.explanation).toContain('not answered');
    });

    it('rejects POST /attempts/:id/finish on an already finished attempt with 409 ATTEMPT_ENDED', async () => {
      // First finish
      await request(app.getHttpServer())
        .post(`/attempts/${attemptId}/finish`)
        .set('Authorization', validToken);

      // Second finish
      const res = await request(app.getHttpServer())
        .post(`/attempts/${attemptId}/finish`)
        .set('Authorization', validToken);

      expect(res.status).toBe(409);
      expect(res.body.code).toBe('ATTEMPT_ENDED');
    });
  });

  describe('Lazy Timeout and Late Answer Handling', () => {
    it('applies lazy timeout and transitions to timed_out when deadline passes', async () => {
      // Insert an interview with 0 seconds limit for instant timeout testing
      await connection.collection('interviews').insertOne({
        id: 99,
        ownerId: 2,
        title: 'Instant Timeout Interview',
        questionIds: [101],
        timeLimitSeconds: 1,
      });

      const createRes = await request(app.getHttpServer())
        .post('/attempts')
        .set('Authorization', validToken)
        .send({ interviewId: 99 });

      const attemptId = createRes.body.id;

      // Simulate passage of time by updating deadline in DB to the past
      await connection.collection('attempts').updateOne(
        { id: attemptId },
        {
          $set: {
            startedAt: new Date(Date.now() - 20000).toISOString(),
            deadlineAt: new Date(Date.now() - 15000).toISOString(),
          },
        },
      );

      // GET /attempts/:id triggers lazy timeout
      const getRes = await request(app.getHttpServer())
        .get(`/attempts/${attemptId}`)
        .set('Authorization', validToken);

      expect(getRes.status).toBe(200);
      expect(getRes.body.status).toBe('timed_out');

      // Late answer triggers ANSWER_LATE
      const answerRes = await request(app.getHttpServer())
        .post(`/attempts/${attemptId}/answers`)
        .set('Authorization', validToken)
        .send({
          questionId: 101,
          answer: { type: 'multiple_choice', choiceId: 'a' },
        });

      expect(answerRes.status).toBe(409);
      expect(answerRes.body.code).toBe('ATTEMPT_ENDED');
    });
  });
});

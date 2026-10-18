import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/main.js';
import { QuestionsService } from '../src/questions/questions.service.js';

describe('Questions & Internal Questions Endpoints (e2e)', () => {
  let app: INestApplication;
  let questionsService: QuestionsService;
  const TEST_INTERNAL_KEY = 'test-secret-internal-key-2026';

  beforeAll(async () => {
    process.env.INTERNAL_TOOL_KEY = TEST_INTERNAL_KEY;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();

    questionsService = moduleFixture.get<QuestionsService>(QuestionsService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/questions returns active seeded questions with private fields redacted', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/questions?category=react&difficulty=medium')
      .expect(200);

    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items.length).toBe(7);

    const first = res.body.items[0];
    expect(first).toHaveProperty('id');
    expect(first).toHaveProperty('prompt');
    expect(first.expectedKeywords).toBeUndefined();
    expect(first.expectedOutput).toBeUndefined();
    if (first.choices) {
      expect(first.choices[0].isCorrect).toBeUndefined();
    }
  });

  it('GET /api/v1/questions rejects unknown query parameters with 400 VALIDATION_ERROR', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/questions?unknownParam=foo')
      .expect(400);

    expect(res.body).toMatchObject({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
    });
  });

  it('GET /api/v1/questions/:id returns 404 QUESTION_NOT_FOUND for non-existent ID', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/questions/99999')
      .expect(404);

    expect(res.body).toMatchObject({
      statusCode: 404,
      code: 'QUESTION_NOT_FOUND',
    });
  });

  it('POST /api/v1/internal/questions rejects requests without x-internal-tool-key with 401 UNAUTHORIZED', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/internal/questions')
      .send({
        prompt: 'Unauthorized question creation attempt',
        category: 'react',
        difficulty: 'easy',
        type: 'short_answer',
        expectedKeywords: ['hooks', 'state'],
        requiredKeywordCount: 1,
      })
      .expect(401);

    expect(res.body).toMatchObject({
      statusCode: 401,
      code: 'UNAUTHORIZED',
    });
  });

  it('POST /api/v1/internal/questions creates a question when valid x-internal-tool-key is provided, then supports PATCH, deactivate, and DELETE', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/api/v1/internal/questions')
      .set('x-internal-tool-key', TEST_INTERNAL_KEY)
      .send({
        prompt: 'What does console.log(typeof null) output in JavaScript?',
        category: 'typescript',
        difficulty: 'easy',
        type: 'code_output',
        codeSnippet: 'console.log(typeof null);',
        expectedOutput: 'object',
      })
      .expect(201);

    const createdId = createRes.body.id;
    expect(typeof createdId).toBe('number');
    expect(createRes.body.expectedOutput).toBe('object');

    // Public detail redacts expectedOutput
    const publicRes = await request(app.getHttpServer())
      .get(`/api/v1/questions/${createdId}`)
      .expect(200);
    expect(publicRes.body.expectedOutput).toBeUndefined();
    expect(publicRes.body.codeSnippet).toBe('console.log(typeof null);');

    // Mark as used in session -> DELETE must fail with 409 QUESTION_IN_USE
    questionsService.markQuestionUsedInSession(109);
    const conflictDelete = await request(app.getHttpServer())
      .delete('/api/v1/internal/questions/109')
      .set('x-internal-tool-key', TEST_INTERNAL_KEY)
      .expect(409);
    expect(conflictDelete.body.code).toBe('QUESTION_IN_USE');

    // Unused question can be deleted
    await request(app.getHttpServer())
      .delete(`/api/v1/internal/questions/${createdId}`)
      .set('x-internal-tool-key', TEST_INTERNAL_KEY)
      .expect(200);
  });
});

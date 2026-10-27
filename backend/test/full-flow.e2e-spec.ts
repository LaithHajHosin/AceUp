import { Test } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';

const integrationTest =
  process.env.RUN_FULL_FLOW === 'true' ? it : it.skip;

describe('full application flow (integration day)', () => {
  integrationTest(
    'registers two users and verifies the complete interview flow',
    async () => {
      const testingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      const app: INestApplication = testingModule.createNestApplication();

      app.setGlobalPrefix('api/v1');
      app.useGlobalPipes(
        new ValidationPipe({
          whitelist: true,
          forbidNonWhitelisted: true,
          transform: true,
        }),
      );

      await app.init();

      try {
        const api = request(app.getHttpServer());
        const suffix = Date.now().toString();

        const registerA = await api.post('/api/v1/auth/register').send({
          username: `flowa${suffix}`,
          email: `flowa${suffix}@example.com`,
          password: 'FlowPassword123',
          displayName: 'Flow User A',
        });

        expect(registerA.status).toBe(201);

        const tokenA = registerA.body.accessToken;
        const userAId = registerA.body.user.id;

        const registerB = await api.post('/api/v1/auth/register').send({
          username: `flowb${suffix}`,
          email: `flowb${suffix}@example.com`,
          password: 'FlowPassword123',
          displayName: 'Flow User B',
        });

        expect(registerB.status).toBe(201);

        const tokenB = registerB.body.accessToken;
        const userBId = registerB.body.user.id;

        const createQuestion = await api
          .post('/api/v1/questions')
          .set('Authorization', `Bearer ${tokenA}`)
          .send({
            prompt: 'What is the time complexity of accessing an array element by index?',
            category: 'arrays',
            difficulty: 'easy',
            type: 'multiple_choice',
            choices: [
              { id: 'a', text: 'O(1)', isCorrect: true },
              { id: 'b', text: 'O(n)', isCorrect: false },
            ],
          });

        expect(createQuestion.status).toBe(201);

        const questionId = createQuestion.body.id;

        const createInterview = await api
          .post('/api/v1/interviews')
          .set('Authorization', `Bearer ${tokenA}`)
          .send({
            title: 'Full flow arrays interview',
            description: 'Integration test interview',
            category: 'arrays',
            difficulty: 'easy',
            questionIds: [questionId],
            timeLimitSeconds: 600,
          });

        expect(createInterview.status).toBe(201);

        const interviewId = createInterview.body.id;

        const publicQuestion = await api
          .get(`/api/v1/questions/${questionId}`)
          .set('Authorization', `Bearer ${tokenB}`);

        expect(publicQuestion.status).toBe(200);
        expect(
          publicQuestion.body.choices.every(
            (choice: { isCorrect?: boolean }) =>
              !Object.hasOwn(choice, 'isCorrect'),
          ),
        ).toBe(true);

        const publicInterview = await api
          .get(`/api/v1/interviews/${interviewId}`)
          .set('Authorization', `Bearer ${tokenB}`);

        expect(publicInterview.status).toBe(200);
        expect(publicInterview.body.questions[0].id).toBe(questionId);

        const forbiddenEdit = await api
          .patch(`/api/v1/questions/${questionId}`)
          .set('Authorization', `Bearer ${tokenB}`)
          .send({ prompt: 'User B should not be allowed to edit this question' });

        expect(forbiddenEdit.status).toBe(403);
        expect(forbiddenEdit.body.code).toBe('NOT_OWNER');

        const startAttempt = await api
          .post('/api/v1/attempts')
          .set('Authorization', `Bearer ${tokenB}`)
          .send({ interviewId });

        expect(startAttempt.status).toBe(201);

        const attemptId = startAttempt.body.id;

        const answer = await api
          .post(`/api/v1/attempts/${attemptId}/answers`)
          .set('Authorization', `Bearer ${tokenB}`)
          .send({
            questionId,
            answer: { type: 'multiple_choice', choiceId: 'a' },
          });

        expect(answer.status).toBe(201);
        expect(answer.body.accepted).toBe(true);

        const finishAttempt = await api
          .post(`/api/v1/attempts/${attemptId}/finish`)
          .set('Authorization', `Bearer ${tokenB}`);

        expect(finishAttempt.status).toBe(200);
        expect(finishAttempt.body.status).toBe('finished');

        const resultsBeforeEdit = await api
          .get(`/api/v1/attempts/${attemptId}/results`)
          .set('Authorization', `Bearer ${tokenB}`);

        expect(resultsBeforeEdit.status).toBe(200);
        expect(resultsBeforeEdit.body.status).toBe('finished');

        const savedResultItems = JSON.parse(
          JSON.stringify(resultsBeforeEdit.body.items),
        );

        const profile = await api
          .get(`/api/v1/users/${userBId}/profile`)
          .set('Authorization', `Bearer ${tokenB}`);

        expect(profile.status).toBe(200);
        expect(profile.body.stats.attemptsCompleted).toBeGreaterThanOrEqual(1);

        const ownerEdit = await api
          .patch(`/api/v1/questions/${questionId}`)
          .set('Authorization', `Bearer ${tokenA}`)
          .send({ prompt: 'Updated question after the attempt' });

        expect(ownerEdit.status).toBe(200);
        expect(ownerEdit.body.prompt).toBe(
          'Updated question after the attempt',
        );

        const resultsAfterEdit = await api
          .get(`/api/v1/attempts/${attemptId}/results`)
          .set('Authorization', `Bearer ${tokenB}`);

        expect(resultsAfterEdit.status).toBe(200);
        expect(resultsAfterEdit.body.items).toEqual(savedResultItems);

        expect(userAId).toBeGreaterThan(0);
      } finally {
        await app.close();
      }
    },
  );
});
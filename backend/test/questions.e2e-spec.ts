import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module.js';

describe('QuestionsController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  it('lists questions without requiring authentication', () => {
    return request(app.getHttpServer())
      .get('/api/v1/questions')
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual({ items: [] });
      });
  });

  it('keeps question creation protected', () => {
    return request(app.getHttpServer())
      .post('/api/v1/questions')
      .send({})
      .expect(401);
  });

  afterEach(async () => {
    await app.close();
  });
});

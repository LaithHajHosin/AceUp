import { INestApplication } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { validateEnv } from '../src/config/env.validation.js';
import { configureApp } from '../src/main.js';

describe('Auth & Platform Foundation (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let registeredToken = '';

  beforeAll(async () => {
    process.env.MONGODB_URI =
      process.env.MONGODB_URI || 'mongodb://localhost:27017/preppressure_test';
    process.env.JWT_SECRET =
      process.env.JWT_SECRET || 'test-jwt-secret-preppressure-v3';
    process.env.JWT_EXPIRES_IN = '1h';
    process.env.PORT = '3000';
    process.env.CORS_ORIGIN = 'http://localhost:5173';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();

    const connection = moduleFixture.get<any>(getConnectionToken());
    await connection.collection('users').deleteMany({});
    await connection.collection('counters').deleteMany({});

    jwtService = moduleFixture.get<JwtService>(JwtService);
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('Environment Validation (validateEnv)', () => {
    it('refuses to start when JWT_SECRET is missing', () => {
      expect(() =>
        validateEnv({
          MONGODB_URI: 'mongodb://localhost:27017/preppressure',
        }),
      ).toThrow(/JWT_SECRET/);
    });

    it('refuses to start when MONGODB_URI is missing', () => {
      expect(() =>
        validateEnv({
          JWT_SECRET: 'super-secret',
        }),
      ).toThrow(/MONGODB_URI/);
    });

    it('applies defaults for JWT_EXPIRES_IN, PORT, and CORS_ORIGIN', () => {
      const validated = validateEnv({
        MONGODB_URI: 'mongodb://localhost:27017/preppressure',
        JWT_SECRET: 'super-secret',
      });
      expect(validated.JWT_EXPIRES_IN).toBe('1h');
      expect(validated.PORT).toBe(3000);
      expect(validated.CORS_ORIGIN).toBe('http://localhost:5173');
    });
  });

  describe('Swagger Documentation (/docs)', () => {
    it('serves Swagger UI at /docs and lists all auth and users endpoints with Bearer auth', async () => {
      const htmlRes = await request(app.getHttpServer()).get('/docs').redirects(1);
      expect(htmlRes.status).toBe(200);
      expect(htmlRes.text).toContain('Swagger UI');

      const jsonRes = await request(app.getHttpServer()).get('/docs-json');
      expect(jsonRes.status).toBe(200);
      const paths = Object.keys(jsonRes.body.paths ?? {});
      expect(paths).toContain('/api/v1/auth/register');
      expect(paths).toContain('/api/v1/auth/login');
      expect(paths).toContain('/api/v1/auth/me');
      expect(paths).toContain('/api/v1/users/me');
      expect(paths).toContain('/api/v1/users/{id}/profile');
      expect(jsonRes.body.components?.securitySchemes?.bearer).toBeDefined();
    });
  });

  describe('POST /api/v1/auth/register', () => {
    it('registers a user, normalizes username/email to lowercase, returns 201 login shape, and hides passwordHash', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          username: '  Alex_Dev  ',
          email: '  Alex@Example.COM ',
          password: 'secret123',
          displayName: '  Alex  ',
        });

      expect(res.status).toBe(201);
      expect(res.body.accessToken).toEqual(expect.any(String));
      expect(res.body.tokenType).toBe('Bearer');
      expect(res.body.expiresIn).toBe(3600);
      expect(res.body.user).toEqual({
        id: expect.any(Number),
        username: 'alex_dev',
        email: 'alex@example.com',
        displayName: 'Alex',
        bio: null,
        createdAt: expect.any(String),
      });
      expect(res.body.user.passwordHash).toBeUndefined();
      expect(JSON.stringify(res.body)).not.toContain('passwordHash');
      expect(JSON.stringify(res.body)).not.toContain('secret123');

      registeredToken = res.body.accessToken;
    });

    it('returns 409 USERNAME_TAKEN when username already exists (case-insensitive)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          username: 'ALEX_DEV',
          email: 'other@example.com',
          password: 'secret123',
          displayName: 'Another Alex',
        });

      expect(res.status).toBe(409);
      expect(res.body.code).toBe('USERNAME_TAKEN');
    });

    it('returns 409 EMAIL_TAKEN when email already exists (case-insensitive)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          username: 'unique_alex',
          email: 'ALEX@EXAMPLE.COM',
          password: 'secret123',
          displayName: 'Unique Alex',
        });

      expect(res.status).toBe(409);
      expect(res.body.code).toBe('EMAIL_TAKEN');
    });

    it('rejects unknown body fields with 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          username: 'valid_user',
          email: 'valid@example.com',
          password: 'secret123',
          displayName: 'Valid User',
          role: 'admin',
        });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('logs in with username or email and returns 200 with JWT token and PrivateUser', async () => {
      const byUsername = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          usernameOrEmail: 'alex_dev',
          password: 'secret123',
        });

      expect(byUsername.status).toBe(200);
      expect(byUsername.body.accessToken).toEqual(expect.any(String));
      expect(byUsername.body.tokenType).toBe('Bearer');
      expect(byUsername.body.user.username).toBe('alex_dev');
      expect(byUsername.body.user.email).toBe('alex@example.com');
      expect(byUsername.body.user.passwordHash).toBeUndefined();

      const byEmail = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          usernameOrEmail: 'ALEX@EXAMPLE.COM',
          password: 'secret123',
        });

      expect(byEmail.status).toBe(200);
      expect(byEmail.body.user.id).toBe(byUsername.body.user.id);
    });

    it('returns the exact same 401 INVALID_CREDENTIALS response for unknown user and wrong password', async () => {
      const unknownUserRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          usernameOrEmail: 'nonexistent_user',
          password: 'secret123',
        });

      const wrongPassRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          usernameOrEmail: 'alex_dev',
          password: 'wrong_password',
        });

      expect(unknownUserRes.status).toBe(401);
      expect(wrongPassRes.status).toBe(401);
      expect(unknownUserRes.body.code).toBe('INVALID_CREDENTIALS');
      expect(wrongPassRes.body.code).toBe('INVALID_CREDENTIALS');
      expect(unknownUserRes.body.message).toBe(wrongPassRes.body.message);
    });
  });

  describe('Global JwtAuthGuard & GET /api/v1/auth/me', () => {
    it('returns 401 UNAUTHORIZED on every non-public route when token is missing, invalid, or expired', async () => {
      const expiredToken = await jwtService.signAsync(
        { sub: 1, username: 'alex_dev' },
        { expiresIn: -10 },
      );

      for (const route of [
        { method: 'get' as const, path: '/api/v1/auth/me' },
        { method: 'patch' as const, path: '/api/v1/users/me' },
        { method: 'get' as const, path: '/api/v1/users/1/profile' },
      ]) {
        const noToken = await request(app.getHttpServer())[route.method](
          route.path,
        );
        expect(noToken.status).toBe(401);
        expect(noToken.body.code).toBe('UNAUTHORIZED');

        const badToken = await request(app.getHttpServer())
          [route.method](route.path)
          .set('Authorization', 'Bearer invalid.jwt.token');
        expect(badToken.status).toBe(401);
        expect(badToken.body.code).toBe('UNAUTHORIZED');

        const expiredRes = await request(app.getHttpServer())
          [route.method](route.path)
          .set('Authorization', `Bearer ${expiredToken}`);
        expect(expiredRes.status).toBe(401);
        expect(expiredRes.body.code).toBe('UNAUTHORIZED');
      }
    });

    it('returns 200 PrivateUser for GET /api/v1/auth/me with valid Bearer token', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${registeredToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        id: expect.any(Number),
        username: 'alex_dev',
        email: 'alex@example.com',
        displayName: 'Alex',
        bio: null,
        createdAt: expect.any(String),
      });
      expect(res.body.passwordHash).toBeUndefined();
    });
  });
});

/**
 * PrepPressure Full-Stack Entry Point
 * Bootstraps NestJS Modular Application + Swagger UI + Vite Middleware on Port 3000
 */

import 'reflect-metadata';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './backend/src/app.module.js';
import { configuration } from './backend/src/config/configuration.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function bootstrap() {
  const server = express();
  const config = configuration();
  const isProduction = process.env.NODE_ENV === 'production';

  // 1. CORS Middleware
  server.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', config.corsOrigin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    next();
  });

  // 2. Meaningful Event Logger (Spec Section 13)
  server.use((req, res, next) => {
    const originalSend = res.send;
    res.send = function (body) {
      if (req.originalUrl.startsWith('/api/v1')) {
        const method = req.method;
        const url = req.originalUrl;
        const status = res.statusCode;

        if (
          url.includes('/auth/register') ||
          url.includes('/attempts') ||
          (url.includes('/questions') && method !== 'GET') ||
          (url.includes('/interviews') && method !== 'GET') ||
          status >= 400
        ) {
          console.log(`[EVENT] ${method} ${url} -> ${status}`);
        }
      }
      return originalSend.call(this, body);
    };
    next();
  });

  // 3. Initialize NestJS on the Express Adapter
  const app = await NestFactory.create(AppModule, new ExpressAdapter(server), {
    logger: ['error', 'warn', 'log'],
  });

  // Global Prefix: /api/v1 (Contract Section 1)
  app.setGlobalPrefix('api/v1');

  // Global Validation Pipe (Spec Section 9)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global Exception Logger & Formatter
  app.useGlobalFilters({
    catch(exception: any, host: any) {
      const ctx = host.switchToHttp();
      const response = ctx.getResponse();
      const status = exception?.status || (exception?.getStatus ? exception.getStatus() : 500);
      console.error('[Nest Exception]', exception);
      const resBody = exception?.getResponse ? exception.getResponse() : {
        statusCode: status,
        message: exception?.message || 'Internal server error',
        stack: exception?.stack,
      };
      response.status(status).json(resBody);
    }
  });

  // 4. OpenAPI / Swagger Setup (Spec Section 8)
  const swaggerConfig = new DocumentBuilder()
    .setTitle('AceUp API (v4 Modular)')
    .setDescription('AceUp technical interview simulation and assessment engine with JWT authentication, deterministic scoring, and RBAC.')
    .setVersion('4.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        in: 'header',
      },
      'bearer',
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);

  // Serve JSON at /docs-json (outside /api/v1)
  server.get('/docs-json', (_req, res) => {
    res.json(document);
  });

  // Serve Swagger UI at /docs
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  // Health check endpoint
  server.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      framework: 'NestJS',
      app: 'AceUp',
      timestamp: new Date().toISOString(),
    });
  });

  // Initialize the Nest application pipeline before attaching SPA fallbacks
  await app.init();

  // 5. Mount Vite Frontend
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        port: config.port,
      },
      appType: 'spa',
    });

    // Pass only non-API / non-Docs requests to Vite
    server.use((req, res, next) => {
      if (req.url.startsWith('/api') || req.url.startsWith('/docs')) {
        return next();
      }
      vite.middlewares(req, res, next);
    });

    console.log('[AceUp] Vite development middleware attached.');
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    server.use(express.static(distPath));
    server.use((req, res, next) => {
      if (req.url.startsWith('/api') || req.url.startsWith('/docs')) {
        return next();
      }
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  // 6. Listen on Port 3000
  server.listen(config.port, '0.0.0.0', () => {
    console.log(`🚀 [NestJS] AceUp server ready at http://0.0.0.0:${config.port}`);
    console.log(`📖 [NestJS] Swagger API documentation available at http://0.0.0.0:${config.port}/docs`);
    console.log(`⚡ [NestJS] OpenAPI JSON available at http://0.0.0.0:${config.port}/docs-json`);
  });
}

bootstrap().catch(err => {
  console.error('Fatal bootstrap error:', err);
  process.exit(1);
});

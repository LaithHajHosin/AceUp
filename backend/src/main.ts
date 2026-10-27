import {
  type INestApplication,
  Logger,
  ValidationPipe,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';

export function configureApp(app: INestApplication): void {
  const corsOrigin = process.env.CORS_ORIGIN || '*';
  app.enableCors({
    origin: corsOrigin === '*' ? true : corsOrigin.split(',').map((o) => o.trim()),
    credentials: true,
  });

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('PrepPressure API')
    .setDescription(
      'PrepPressure — API Contract (v3) — Authentication, Users, Profile Statistics, Questions, Interviews, and Attempts',
    )
    .setVersion('3.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });
}

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  configureApp(app);

  const httpAdapter = app.getHttpAdapter();
  const instance = httpAdapter.getInstance();
  if (instance && typeof instance.get === 'function') {
    instance.get(
      '/',
      (_req: unknown, res: { redirect: (url: string) => void }) => {
        res.redirect('/docs');
      },
    );
  }

  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  await app.listen(port, '0.0.0.0');
  logger.log(`PrepPressure backend listening on http://0.0.0.0:${port}/api/v1`);
  logger.log(
    `Swagger OpenAPI documentation available at http://0.0.0.0:${port}/docs`,
  );
}

if (!process.env.VITEST && process.env.NODE_ENV !== 'test') {
  await bootstrap();
}

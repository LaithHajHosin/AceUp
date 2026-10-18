import {
  HttpStatus,
  type INestApplication,
  Logger,
  ValidationError,
  ValidationPipe,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { AppHttpException } from './common/exceptions/app-http.exception.js';
import { GlobalHttpExceptionFilter } from './common/filters/http-exception.filter.js';
import { INTERNAL_TOOL_KEY_HEADER } from './common/guards/internal-tool.guard.js';

function flattenValidationErrors(errors: ValidationError[]): string[] {
  const messages: string[] = [];
  for (const error of errors) {
    if (error.constraints) {
      messages.push(...Object.values(error.constraints));
    }
    if (error.children && error.children.length > 0) {
      messages.push(...flattenValidationErrors(error.children));
    }
  }
  return messages;
}

export function configureApp(app: INestApplication): void {
  app.enableCors();

  app.setGlobalPrefix('api/v1', {
    exclude: ['/'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors: ValidationError[]) => {
        const messages = flattenValidationErrors(errors);
        const summary =
          messages.length > 0
            ? messages.join('; ')
            : 'Invalid request payload or query parameters.';
        return new AppHttpException(
          HttpStatus.BAD_REQUEST,
          'VALIDATION_ERROR',
          summary,
          { errors: messages },
        );
      },
    }),
  );

  app.useGlobalFilters(new GlobalHttpExceptionFilter());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('PrepPressure API')
    .setDescription(
      'Canonical REST API for PrepPressure Technical Interview Simulation Platform (Version 1.0)',
    )
    .setVersion('1.0')
    .addApiKey(
      {
        type: 'apiKey',
        in: 'header',
        name: INTERNAL_TOOL_KEY_HEADER,
        description:
          'Internal administrative tool key matching backend INTERNAL_TOOL_KEY environment variable',
      },
      'internal-tool-key',
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);
}

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  configureApp(app);

  const port = 3000;
  await app.listen(port, '0.0.0.0');
  logger.log(`PrepPressure backend listening on http://0.0.0.0:${port}`);
  logger.log(
    `Swagger OpenAPI documentation available at http://0.0.0.0:${port}/api/docs`,
  );
}

if (!process.env.VITEST && process.env.NODE_ENV !== 'test') {
  await bootstrap();
}

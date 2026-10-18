import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { AppHttpException } from '../exceptions/app-http.exception.js';

/**
 * Global exception filter enforcing the PrepPressure API Contract error envelope:
 * { statusCode: number, code: string, message: string, details?: object }
 */
@Catch()
export class GlobalHttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalHttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof AppHttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse() as Record<string, unknown>;
      response.status(status).json(body);
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const rawResponse = exception.getResponse();

      let message = exception.message;
      let code = this.mapStatusToDefaultCode(status);
      let details: Record<string, unknown> | undefined;

      if (typeof rawResponse === 'object' && rawResponse !== null) {
        const resObj = rawResponse as Record<string, unknown>;
        if (typeof resObj.code === 'string') {
          code = resObj.code;
        }
        if (Array.isArray(resObj.message)) {
          message = resObj.message.join('; ');
          details = { errors: resObj.message };
        } else if (typeof resObj.message === 'string') {
          message = resObj.message;
        }
        if (
          typeof resObj.details === 'object' &&
          resObj.details !== null &&
          !Array.isArray(resObj.details)
        ) {
          details = resObj.details as Record<string, unknown>;
        }
      }

      response.status(status).json({
        statusCode: status,
        code,
        message,
        ...(details ? { details } : {}),
      });
      return;
    }

    this.logger.error(
      'Unhandled exception encountered',
      exception instanceof Error ? exception.stack : String(exception),
    );

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected internal server error occurred.',
    });
  }

  private mapStatusToDefaultCode(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'VALIDATION_ERROR';
      case HttpStatus.UNAUTHORIZED:
        return 'UNAUTHORIZED';
      case HttpStatus.NOT_FOUND:
        return 'QUESTION_NOT_FOUND';
      case HttpStatus.CONFLICT:
        return 'CONFLICT';
      default:
        return 'VALIDATION_ERROR';
    }
  }
}

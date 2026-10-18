import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import type { Request } from 'express';
import { AppHttpException } from '../exceptions/app-http.exception.js';

export const INTERNAL_TOOL_KEY_HEADER = 'x-internal-tool-key';

/**
 * Guard protecting internal question-management routes (/api/v1/internal/*).
 * Reads the expected key from process.env.INTERNAL_TOOL_KEY and compares it
 * against the incoming 'x-internal-tool-key' request header.
 * Fails closed (401 UNAUTHORIZED) when INTERNAL_TOOL_KEY is unset, empty, or mismatched.
 */
@Injectable()
export class InternalToolGuard implements CanActivate {
  private readonly logger = new Logger(InternalToolGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const expectedKey = process.env.INTERNAL_TOOL_KEY?.trim();

    // Fail closed if the server environment has not configured INTERNAL_TOOL_KEY
    if (!expectedKey) {
      this.logger.warn(
        `Rejected internal route access (${request.method} ${request.originalUrl || request.url}): INTERNAL_TOOL_KEY is not configured.`,
      );
      throw new AppHttpException(
        HttpStatus.UNAUTHORIZED,
        'UNAUTHORIZED',
        'Internal tool access is disabled or unauthorized.',
      );
    }

    const rawHeader = request.headers[INTERNAL_TOOL_KEY_HEADER];
    const providedKey = Array.isArray(rawHeader)
      ? rawHeader[0]?.trim()
      : rawHeader?.trim();

    if (!providedKey || providedKey !== expectedKey) {
      this.logger.warn(
        `Unauthorized internal route attempt (${request.method} ${request.originalUrl || request.url}): missing or invalid ${INTERNAL_TOOL_KEY_HEADER} header.`,
      );
      throw new AppHttpException(
        HttpStatus.UNAUTHORIZED,
        'UNAUTHORIZED',
        'Missing or invalid x-internal-tool-key header.',
      );
    }

    return true;
  }
}

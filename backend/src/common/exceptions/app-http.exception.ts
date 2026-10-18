import { HttpException, HttpStatus } from '@nestjs/common';

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'QUESTION_NOT_FOUND'
  | 'SESSION_NOT_FOUND'
  | 'INSUFFICIENT_QUESTIONS'
  | 'SESSION_NOT_ACTIVE'
  | 'SESSION_NOT_ENDED'
  | 'DUPLICATE_ANSWER'
  | 'QUESTION_NOT_IN_SESSION'
  | 'ANSWER_TYPE_MISMATCH'
  | 'INVALID_CHOICE'
  | 'QUESTION_IN_USE'
  | 'INTERNAL_SERVER_ERROR';

export interface ErrorEnvelope {
  statusCode: number;
  code: ErrorCode | string;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Canonical application HTTP exception producing the contract-mandated envelope:
 * { statusCode: number, code: string, message: string, details?: object }
 */
export class AppHttpException extends HttpException {
  public readonly code: ErrorCode | string;
  public readonly details?: Record<string, unknown>;

  constructor(
    statusCode: HttpStatus | number,
    code: ErrorCode | string,
    message: string,
    details?: Record<string, unknown>,
  ) {
    const body: ErrorEnvelope = {
      statusCode,
      code,
      message,
      ...(details !== undefined ? { details } : {}),
    };
    super(body, statusCode);
    this.code = code;
    this.details = details;
  }
}

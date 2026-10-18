import { HttpStatus } from '@nestjs/common';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { AppHttpException } from '../../common/exceptions/app-http.exception.js';
import {
  DIFFICULTIES,
  QUESTION_TYPES,
  type Difficulty,
  type QuestionChoice,
  type QuestionType,
} from '../schemas/question.schema.js';
import { QuestionChoiceInputDto } from './create-question.dto.js';

/**
 * DTO for PATCH /api/v1/internal/questions/:id (guarded by InternalToolGuard).
 * Partial updates are merged with the existing question and validated holistically
 * via `validateQuestionShape` so PATCH can never produce an invalid type/field combination.
 */
export class UpdateQuestionDto {
  @ApiPropertyOptional({
    example: 'Why does React require a unique key prop when rendering dynamic lists?',
    description: 'Updated question prompt (trimmed, 1-2000 chars)',
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty({ message: 'prompt cannot be empty when provided' })
  @MaxLength(2000, { message: 'prompt cannot exceed 2000 characters' })
  prompt?: string;

  @ApiPropertyOptional({
    example: 'react',
    description: 'Updated topic category (trimmed, non-empty)',
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty({ message: 'category cannot be empty when provided' })
  category?: string;

  @ApiPropertyOptional({
    enum: DIFFICULTIES,
    example: 'medium',
    description: 'Updated difficulty level',
  })
  @IsOptional()
  @IsIn(DIFFICULTIES, {
    message: `difficulty must be one of: ${DIFFICULTIES.join(', ')}`,
  })
  difficulty?: Difficulty;

  @ApiPropertyOptional({
    enum: QUESTION_TYPES,
    example: 'multiple_choice',
    description: 'Updated question type',
  })
  @IsOptional()
  @IsIn(QUESTION_TYPES, {
    message: `type must be one of: ${QUESTION_TYPES.join(', ')}`,
  })
  type?: QuestionType;

  @ApiPropertyOptional({
    example: true,
    description: 'Updated active flag',
  })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({
    type: [QuestionChoiceInputDto],
    description: 'Updated choices (2-6 choices, unique IDs, exactly one isCorrect=true)',
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(2, { message: 'multiple_choice questions must have at least 2 choices' })
  @ArrayMaxSize(6, { message: 'multiple_choice questions can have at most 6 choices' })
  @ValidateNested({ each: true })
  @Type(() => QuestionChoiceInputDto)
  choices?: QuestionChoiceInputDto[];

  @ApiPropertyOptional({
    type: [String],
    description: 'Updated expectedKeywords (2-6 non-empty strings for short_answer)',
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(2, {
    message: 'short_answer questions must have at least 2 expectedKeywords',
  })
  @ArrayMaxSize(6, {
    message: 'short_answer questions can have at most 6 expectedKeywords',
  })
  @IsString({ each: true })
  expectedKeywords?: string[];

  @ApiPropertyOptional({
    example: 2,
    description: 'Updated requiredKeywordCount (1 .. expectedKeywords.length)',
  })
  @IsOptional()
  @IsInt({ message: 'requiredKeywordCount must be an integer' })
  @Min(1, { message: 'requiredKeywordCount must be at least 1' })
  requiredKeywordCount?: number;

  @ApiPropertyOptional({
    example: 'function',
    description: 'Updated expectedOutput (1-1000 chars for code_output)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000, {
    message: 'expectedOutput cannot exceed 1000 characters',
  })
  expectedOutput?: string;

  @ApiPropertyOptional({
    description: 'Updated display-only codeSnippet for code_output questions',
  })
  @IsOptional()
  @IsString()
  codeSnippet?: string;
}

export interface ValidatedQuestionShape {
  prompt: string;
  category: string;
  difficulty: Difficulty;
  type: QuestionType;
  active: boolean;
  choices?: QuestionChoice[];
  expectedKeywords?: string[];
  requiredKeywordCount?: number;
  expectedOutput?: string;
  codeSnippet?: string;
}

/**
 * Deterministic cross-field and type-consistency validator required by API-CONTRACT.md:
 * - Trims prompt and category and ensures non-empty (prompt <= 2000 chars).
 * - Rejects fields irrelevant to the selected question type.
 * - multiple_choice: 2-6 choices, unique choice IDs, non-empty choice text, exactly 1 isCorrect=true.
 * - short_answer: 2-6 non-empty expectedKeywords, requiredKeywordCount integer in 1..keywords.length.
 * - code_output: non-empty expectedOutput (<= 1000 chars), optional inert codeSnippet.
 */
export function validateQuestionShape(input: {
  prompt?: string;
  category?: string;
  difficulty?: Difficulty;
  type?: QuestionType;
  active?: boolean;
  choices?: QuestionChoice[];
  expectedKeywords?: string[];
  requiredKeywordCount?: number;
  expectedOutput?: string;
  codeSnippet?: string;
}): ValidatedQuestionShape {
  const prompt = typeof input.prompt === 'string' ? input.prompt.trim() : '';
  if (!prompt || prompt.length > 2000) {
    throw new AppHttpException(
      HttpStatus.BAD_REQUEST,
      'VALIDATION_ERROR',
      'prompt must be a non-empty string of at most 2000 characters.',
    );
  }

  const category =
    typeof input.category === 'string' ? input.category.trim().toLowerCase() : '';
  if (!category) {
    throw new AppHttpException(
      HttpStatus.BAD_REQUEST,
      'VALIDATION_ERROR',
      'category must be a non-empty string.',
    );
  }

  if (!input.difficulty || !DIFFICULTIES.includes(input.difficulty)) {
    throw new AppHttpException(
      HttpStatus.BAD_REQUEST,
      'VALIDATION_ERROR',
      `difficulty must be one of: ${DIFFICULTIES.join(', ')}.`,
    );
  }

  if (!input.type || !QUESTION_TYPES.includes(input.type)) {
    throw new AppHttpException(
      HttpStatus.BAD_REQUEST,
      'VALIDATION_ERROR',
      `type must be one of: ${QUESTION_TYPES.join(', ')}.`,
    );
  }

  const active = input.active ?? true;

  if (input.type === 'multiple_choice') {
    if (
      input.expectedKeywords !== undefined ||
      input.requiredKeywordCount !== undefined ||
      input.expectedOutput !== undefined ||
      input.codeSnippet !== undefined
    ) {
      throw new AppHttpException(
        HttpStatus.BAD_REQUEST,
        'VALIDATION_ERROR',
        'multiple_choice questions must not include expectedKeywords, requiredKeywordCount, expectedOutput, or codeSnippet.',
      );
    }

    if (
      !Array.isArray(input.choices) ||
      input.choices.length < 2 ||
      input.choices.length > 6
    ) {
      throw new AppHttpException(
        HttpStatus.BAD_REQUEST,
        'VALIDATION_ERROR',
        'multiple_choice questions must provide between 2 and 6 choices.',
      );
    }

    const normalizedChoices: QuestionChoice[] = [];
    const seenIds = new Set<string>();
    let correctCount = 0;

    for (const rawChoice of input.choices) {
      const id = typeof rawChoice?.id === 'string' ? rawChoice.id.trim() : '';
      const text =
        typeof rawChoice?.text === 'string' ? rawChoice.text.trim() : '';
      const isCorrect = rawChoice?.isCorrect;

      if (!id || !text || typeof isCorrect !== 'boolean') {
        throw new AppHttpException(
          HttpStatus.BAD_REQUEST,
          'VALIDATION_ERROR',
          'Each choice must have a non-empty id, non-empty text, and boolean isCorrect.',
        );
      }

      if (seenIds.has(id)) {
        throw new AppHttpException(
          HttpStatus.BAD_REQUEST,
          'VALIDATION_ERROR',
          `Duplicate choice id "${id}" is not allowed within a question.`,
        );
      }
      seenIds.add(id);

      if (isCorrect) {
        correctCount += 1;
      }

      normalizedChoices.push({ id, text, isCorrect });
    }

    if (correctCount !== 1) {
      throw new AppHttpException(
        HttpStatus.BAD_REQUEST,
        'VALIDATION_ERROR',
        'multiple_choice questions must have exactly one choice with isCorrect=true.',
      );
    }

    return {
      prompt,
      category,
      difficulty: input.difficulty,
      type: 'multiple_choice',
      active,
      choices: normalizedChoices,
    };
  }

  if (input.type === 'short_answer') {
    if (
      input.choices !== undefined ||
      input.expectedOutput !== undefined ||
      input.codeSnippet !== undefined
    ) {
      throw new AppHttpException(
        HttpStatus.BAD_REQUEST,
        'VALIDATION_ERROR',
        'short_answer questions must not include choices, expectedOutput, or codeSnippet.',
      );
    }

    if (
      !Array.isArray(input.expectedKeywords) ||
      input.expectedKeywords.length < 2 ||
      input.expectedKeywords.length > 6
    ) {
      throw new AppHttpException(
        HttpStatus.BAD_REQUEST,
        'VALIDATION_ERROR',
        'short_answer questions must provide between 2 and 6 expectedKeywords.',
      );
    }

    const normalizedKeywords: string[] = [];
    const seenLower = new Set<string>();
    for (const kw of input.expectedKeywords) {
      const trimmed = typeof kw === 'string' ? kw.trim() : '';
      if (!trimmed) {
        throw new AppHttpException(
          HttpStatus.BAD_REQUEST,
          'VALIDATION_ERROR',
          'All expectedKeywords must be non-empty strings.',
        );
      }
      const lower = trimmed.toLowerCase();
      if (seenLower.has(lower)) {
        throw new AppHttpException(
          HttpStatus.BAD_REQUEST,
          'VALIDATION_ERROR',
          `Duplicate expected keyword "${trimmed}" is not allowed.`,
        );
      }
      seenLower.add(lower);
      normalizedKeywords.push(trimmed);
    }

    const reqCount = input.requiredKeywordCount;
    if (
      typeof reqCount !== 'number' ||
      !Number.isInteger(reqCount) ||
      reqCount < 1 ||
      reqCount > normalizedKeywords.length
    ) {
      throw new AppHttpException(
        HttpStatus.BAD_REQUEST,
        'VALIDATION_ERROR',
        `requiredKeywordCount must be an integer between 1 and ${normalizedKeywords.length}.`,
      );
    }

    return {
      prompt,
      category,
      difficulty: input.difficulty,
      type: 'short_answer',
      active,
      expectedKeywords: normalizedKeywords,
      requiredKeywordCount: reqCount,
    };
  }

  // code_output
  if (
    input.choices !== undefined ||
    input.expectedKeywords !== undefined ||
    input.requiredKeywordCount !== undefined
  ) {
    throw new AppHttpException(
      HttpStatus.BAD_REQUEST,
      'VALIDATION_ERROR',
      'code_output questions must not include choices, expectedKeywords, or requiredKeywordCount.',
    );
  }

  const expectedOutput =
    typeof input.expectedOutput === 'string' ? input.expectedOutput.trim() : '';
  if (!expectedOutput || expectedOutput.length > 1000) {
    throw new AppHttpException(
      HttpStatus.BAD_REQUEST,
      'VALIDATION_ERROR',
      'code_output questions require a non-empty expectedOutput of at most 1000 characters.',
    );
  }

  const codeSnippet =
    typeof input.codeSnippet === 'string' && input.codeSnippet.trim().length > 0
      ? input.codeSnippet
      : undefined;

  return {
    prompt,
    category,
    difficulty: input.difficulty,
    type: 'code_output',
    active,
    expectedOutput,
    ...(codeSnippet !== undefined ? { codeSnippet } : {}),
  };
}

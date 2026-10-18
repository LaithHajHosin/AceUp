import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import {
  DIFFICULTIES,
  QUESTION_TYPES,
  type Difficulty,
  type Question,
  type QuestionType,
} from '../schemas/question.schema.js';

/**
 * Query parameter filter DTO for GET /api/v1/questions.
 * Validates optional category, difficulty, and type filters and works with
 * global ValidationPipe (whitelist + forbidNonWhitelisted) to reject unknown fields.
 */
export class QuestionFilterDto {
  @ApiPropertyOptional({
    example: 'react',
    description:
      'Filter active questions by category (e.g., react, typescript, nodejs, mongodb)',
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty({ message: 'category filter must not be empty when provided' })
  category?: string;

  @ApiPropertyOptional({
    enum: DIFFICULTIES,
    example: 'medium',
    description: 'Filter active questions by difficulty level',
  })
  @IsOptional()
  @IsIn(DIFFICULTIES, {
    message: `difficulty must be one of: ${DIFFICULTIES.join(', ')}`,
  })
  difficulty?: Difficulty;

  @ApiPropertyOptional({
    enum: QUESTION_TYPES,
    example: 'multiple_choice',
    description: 'Filter active questions by question type',
  })
  @IsOptional()
  @IsIn(QUESTION_TYPES, {
    message: `type must be one of: ${QUESTION_TYPES.join(', ')}`,
  })
  type?: QuestionType;
}

export class QuestionChoicePublicDto {
  @ApiProperty({ example: 'a', description: 'Unique choice identifier' })
  id: string;

  @ApiProperty({
    example:
      'To help React identify which items changed, were added, or were removed',
    description: 'Candidate-visible choice text',
  })
  text: string;
}

export class QuestionPublicDto {
  @ApiProperty({ example: 101, description: 'Numeric application question ID' })
  id: number;

  @ApiProperty({
    example:
      'Why does React require a unique key prop when rendering a list of elements?',
    description: 'Question prompt text',
  })
  prompt: string;

  @ApiProperty({ example: 'react', description: 'Question topic category' })
  category: string;

  @ApiProperty({
    enum: DIFFICULTIES,
    example: 'medium',
    description: 'Question difficulty level',
  })
  difficulty: Difficulty;

  @ApiProperty({
    enum: QUESTION_TYPES,
    example: 'multiple_choice',
    description: 'Question format type',
  })
  type: QuestionType;

  @ApiPropertyOptional({
    type: [QuestionChoicePublicDto],
    description:
      'Candidate-safe answer choices (present for multiple_choice only; isCorrect is redacted)',
  })
  choices?: QuestionChoicePublicDto[];

  @ApiPropertyOptional({
    example:
      'const [count, setCount] = useState(0);\nconsole.log(typeof setCount);',
    description:
      'Display-only inert code snippet (present for code_output questions if defined)',
  })
  codeSnippet?: string;
}

export class QuestionListResponseDto {
  @ApiProperty({
    type: [QuestionPublicDto],
    description: 'List of active, candidate-safe questions',
  })
  items: QuestionPublicDto[];
}

/**
 * Pure redaction mapper converting an internal Question record into a candidate-safe
 * QuestionPublicDto, strictly omitting isCorrect, expectedKeywords,
 * requiredKeywordCount, expectedOutput, and MongoDB internal fields.
 */
export function toQuestionPublicDto(
  question: Pick<
    Question,
    | 'id'
    | 'prompt'
    | 'category'
    | 'difficulty'
    | 'type'
    | 'choices'
    | 'codeSnippet'
  >,
): QuestionPublicDto {
  const dto: QuestionPublicDto = {
    id: question.id,
    prompt: question.prompt,
    category: question.category,
    difficulty: question.difficulty,
    type: question.type,
  };

  if (question.type === 'multiple_choice' && Array.isArray(question.choices)) {
    dto.choices = question.choices.map((choice) => ({
      id: choice.id,
      text: choice.text,
    }));
  }

  if (
    question.type === 'code_output' &&
    typeof question.codeSnippet === 'string' &&
    question.codeSnippet.trim().length > 0
  ) {
    dto.codeSnippet = question.codeSnippet;
  }

  return dto;
}

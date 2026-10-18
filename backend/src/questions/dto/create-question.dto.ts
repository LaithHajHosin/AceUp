import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
import {
  DIFFICULTIES,
  QUESTION_TYPES,
  type Difficulty,
  type QuestionType,
} from '../schemas/question.schema.js';

export class QuestionChoiceInputDto {
  @ApiProperty({ example: 'a', description: 'Unique choice ID within the question' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty({ message: 'Choice id must be a non-empty string' })
  id: string;

  @ApiProperty({
    example: 'Keys give elements a stable identity across re-renders',
    description: 'Choice text shown to candidate',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty({ message: 'Choice text must be a non-empty string' })
  text: string;

  @ApiProperty({
    example: true,
    description: 'Whether this choice is the single correct answer',
  })
  @IsBoolean({ message: 'Choice isCorrect must be a boolean' })
  isCorrect: boolean;
}

/**
 * DTO for POST /api/v1/internal/questions (guarded by InternalToolGuard).
 * Validates common fields and type-specific grading fields.
 */
export class CreateQuestionDto {
  @ApiProperty({
    example: 'Why does React require a unique key prop when rendering lists?',
    description: 'Main question prompt text (trimmed, 1-2000 chars)',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty({ message: 'prompt is required and cannot be empty' })
  @MaxLength(2000, { message: 'prompt cannot exceed 2000 characters' })
  prompt: string;

  @ApiProperty({
    example: 'react',
    description: 'Topic category (trimmed, non-empty)',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty({ message: 'category is required and cannot be empty' })
  category: string;

  @ApiProperty({
    enum: DIFFICULTIES,
    example: 'medium',
    description: 'Difficulty level (easy = 1pt, medium = 2pts, hard = 3pts)',
  })
  @IsIn(DIFFICULTIES, {
    message: `difficulty must be one of: ${DIFFICULTIES.join(', ')}`,
  })
  difficulty: Difficulty;

  @ApiProperty({
    enum: QUESTION_TYPES,
    example: 'multiple_choice',
    description: 'Question type (multiple_choice, short_answer, or code_output)',
  })
  @IsIn(QUESTION_TYPES, {
    message: `type must be one of: ${QUESTION_TYPES.join(', ')}`,
  })
  type: QuestionType;

  @ApiPropertyOptional({
    example: true,
    default: true,
    description: 'Whether the question is active in the public bank and session selection',
  })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({
    type: [QuestionChoiceInputDto],
    description:
      'Required for multiple_choice only: 2-6 choices with unique IDs and exactly one isCorrect=true',
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
    example: ['identity', 're-render', 'reorder'],
    description: 'Required for short_answer only: 2-6 non-empty expected keywords',
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
    description:
      'Required for short_answer only: integer from 1 through expectedKeywords.length',
  })
  @IsOptional()
  @IsInt({ message: 'requiredKeywordCount must be an integer' })
  @Min(1, { message: 'requiredKeywordCount must be at least 1' })
  requiredKeywordCount?: number;

  @ApiPropertyOptional({
    example: 'function',
    description:
      'Required for code_output only: expected console/expression output (1-1000 chars)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000, {
    message: 'expectedOutput cannot exceed 1000 characters',
  })
  expectedOutput?: string;

  @ApiPropertyOptional({
    example: 'const [state, setState] = useState(0);\nconsole.log(typeof setState);',
    description: 'Optional for code_output only: inert display-only code snippet',
  })
  @IsOptional()
  @IsString()
  codeSnippet?: string;
}

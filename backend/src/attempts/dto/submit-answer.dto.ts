import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export type QuestionTypeEnum = 'multiple_choice' | 'short_answer' | 'code_output';

export class AnswerPayloadDto {
  @ApiProperty({
    description: 'Type of the question being answered',
    enum: ['multiple_choice', 'short_answer', 'code_output'],
    example: 'multiple_choice',
  })
  @IsNotEmpty()
  @IsEnum(['multiple_choice', 'short_answer', 'code_output'])
  type: QuestionTypeEnum;

  @ApiPropertyOptional({
    description: 'Selected choice ID for multiple_choice questions',
    example: 'a',
  })
  @IsOptional()
  @IsString()
  choiceId?: string;

  @ApiPropertyOptional({
    description: 'Submitted text for short_answer or code_output questions (max 2000 chars)',
    example: 'A stack is LIFO: push and pop',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  text?: string;
}

export class SubmitAnswerDto {
  @ApiProperty({
    description: 'The numeric ID of the question in this attempt',
    example: 104,
  })
  @IsNotEmpty()
  @IsInt()
  @IsPositive()
  questionId: number;

  @ApiProperty({
    description: 'The user answer payload',
    type: AnswerPayloadDto,
  })
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => AnswerPayloadDto)
  answer: AnswerPayloadDto;
}

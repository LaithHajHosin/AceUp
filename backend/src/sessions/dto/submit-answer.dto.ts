import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

class AnswerPayloadDto {
  @ApiProperty({
    enum: ['multiple_choice', 'short_answer', 'code_output'],
    example: 'multiple_choice',
  })
  @IsIn(['multiple_choice', 'short_answer', 'code_output'])
  type!: 'multiple_choice' | 'short_answer' | 'code_output';

  @ApiPropertyOptional({ example: 'b', maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  choiceId?: string;

  @ApiPropertyOptional({
    example: 'Stack follows last-in, first-out order.',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  text?: string;
}

export class SubmitAnswerDto {
  @ApiProperty({ example: 101, minimum: 1 })
  @IsInt()
  @Min(1)
  questionId!: number;

  @ApiProperty({
    oneOf: [
      {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['multiple_choice'] },
          choiceId: { type: 'string' },
        },
        required: ['type', 'choiceId'],
      },
      {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['short_answer', 'code_output'] },
          text: { type: 'string' },
        },
        required: ['type', 'text'],
      },
    ],
  })
  @ValidateNested()
  @Type(() => AnswerPayloadDto)
  answer!: AnswerPayloadDto;
}

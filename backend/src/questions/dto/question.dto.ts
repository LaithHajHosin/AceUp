import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsIn, Length, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ChoiceDto {
  @ApiProperty({ example: 'a' })
  @IsString()
  id!: string;

  @ApiProperty({ example: 'O(1)' })
  @IsString()
  text!: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  isCorrect?: boolean;
}

export class CreateQuestionDto {
  @ApiProperty({ example: 'Why does React require keys when rendering lists?', description: 'Prompt 5-2000 chars' })
  @IsString()
  @Length(5, 2000)
  prompt!: string;

  @ApiProperty({ example: 'react', description: 'Category 2-40 chars' })
  @IsString()
  @Length(2, 40)
  category!: string;

  @ApiProperty({ example: 'medium', enum: ['easy', 'medium', 'hard'] })
  @IsIn(['easy', 'medium', 'hard'])
  difficulty!: 'easy' | 'medium' | 'hard';

  @ApiProperty({ example: 'multiple_choice', enum: ['multiple_choice', 'short_answer', 'code_output'] })
  @IsIn(['multiple_choice', 'short_answer', 'code_output'])
  type!: 'multiple_choice' | 'short_answer' | 'code_output';

  @ApiPropertyOptional({ type: [ChoiceDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChoiceDto)
  choices?: ChoiceDto[];

  @ApiPropertyOptional({ example: ['re-render', 'identity'] })
  @IsOptional()
  @IsArray()
  expectedKeywords?: string[];

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  requiredKeywordCount?: number;

  @ApiPropertyOptional({ example: 'console.log(1)' })
  @IsOptional()
  @IsString()
  codeSnippet?: string;

  @ApiPropertyOptional({ example: '1' })
  @IsOptional()
  @IsString()
  expectedOutput?: string;
}

export class UpdateQuestionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  prompt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ enum: ['easy', 'medium', 'hard'] })
  @IsOptional()
  difficulty?: 'easy' | 'medium' | 'hard';

  @ApiPropertyOptional({ enum: ['multiple_choice', 'short_answer', 'code_output'] })
  @IsOptional()
  type?: 'multiple_choice' | 'short_answer' | 'code_output';

  @ApiPropertyOptional({ type: [ChoiceDto] })
  @IsOptional()
  choices?: ChoiceDto[];

  @ApiPropertyOptional()
  @IsOptional()
  expectedKeywords?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  requiredKeywordCount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  codeSnippet?: string;

  @ApiPropertyOptional()
  @IsOptional()
  expectedOutput?: string;
}

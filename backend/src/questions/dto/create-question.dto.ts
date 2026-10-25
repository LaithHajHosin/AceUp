import { IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class ChoiceDto {
  @IsString() @MinLength(1) @MaxLength(10) id!: string;
  @IsString() @MinLength(1) text!: string;
  @IsBoolean() isCorrect!: boolean;
}

export class CreateQuestionDto {
  @IsString() @MinLength(5) @MaxLength(2000) prompt!: string;
  @IsString() @MinLength(2) @MaxLength(40) category!: string;
  @IsIn(['easy', 'medium', 'hard']) difficulty!: 'easy' | 'medium' | 'hard';
  @IsIn(['multiple_choice', 'short_answer', 'code_output']) type!: 'multiple_choice' | 'short_answer' | 'code_output';

  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ChoiceDto)
  choices?: ChoiceDto[];

  @IsOptional() @IsArray() @IsString({each:true}) expectedKeywords?: string[];
  @IsOptional() @IsInt() @Min(1) requiredKeywordCount?: number;
  @IsOptional() @IsString() @MaxLength(5000) codeSnippet?: string;
  @IsOptional() @IsString() expectedOutput?: string;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PublicQuestionDto {
  @ApiProperty() id!: number;
  @ApiProperty() ownerId!: number;
  @ApiProperty({ nullable: true }) ownerUsername!: string | null;
  @ApiProperty() prompt!: string;
  @ApiProperty() category!: string;
  @ApiProperty({ enum: ['easy', 'medium', 'hard'] }) difficulty!: string;
  @ApiProperty({ enum: ['multiple_choice', 'short_answer', 'code_output'] }) type!: string;
  @ApiProperty({ nullable: true, type: 'array', items: { type: 'object' } }) choices!: Array<{id:string;text:string}> | null;
  @ApiProperty({ nullable: true }) codeSnippet!: string | null;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
}

export class OwnerQuestionDto extends PublicQuestionDto {
  @ApiPropertyOptional({ type: 'array', items: { type: 'object' } }) expectedKeywords?: string[];
  @ApiPropertyOptional() requiredKeywordCount?: number;
  @ApiPropertyOptional() expectedOutput?: string;
}

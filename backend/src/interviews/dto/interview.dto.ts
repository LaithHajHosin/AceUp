import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, Length, IsIn, IsArray, IsNumber, Min, Max, IsOptional } from 'class-validator';

export class CreateInterviewDto {
  @ApiProperty({ example: 'React & Frontend Warm-up', description: 'Title 3-100 chars' })
  @IsString()
  @Length(3, 100)
  title!: string;

  @ApiPropertyOptional({ example: 'Five quick React questions', description: 'Description 0-1000 chars' })
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  description?: string;

  @ApiProperty({ example: 'react', description: 'Category 2-40 chars' })
  @IsString()
  @Length(2, 40)
  category!: string;

  @ApiProperty({ example: 'easy', enum: ['easy', 'medium', 'hard'] })
  @IsIn(['easy', 'medium', 'hard'])
  difficulty!: 'easy' | 'medium' | 'hard';

  @ApiProperty({ example: [101, 102, 103], description: '1-20 distinct integers' })
  @IsArray()
  questionIds!: number[];

  @ApiProperty({ example: 600, description: 'Time limit 30-3600 seconds' })
  @IsNumber()
  @Min(30)
  @Max(3600)
  timeLimitSeconds!: number;
}

export class UpdateInterviewDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ enum: ['easy', 'medium', 'hard'] })
  @IsOptional()
  difficulty?: 'easy' | 'medium' | 'hard';

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  questionIds?: number[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  timeLimitSeconds?: number;
}

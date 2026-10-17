import { ApiProperty } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateSessionDto {
  @ApiProperty({ example: 'Esmaeel', minLength: 1, maxLength: 80 })
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  displayName!: string;

  @ApiProperty({ example: 'arrays' })
  @IsString()
  @MinLength(1)
  category!: string;

  @ApiProperty({ enum: ['easy', 'medium', 'hard'], example: 'medium' })
  @IsIn(['easy', 'medium', 'hard'])
  difficulty!: 'easy' | 'medium' | 'hard';

  @ApiProperty({ minimum: 5, maximum: 10, example: 5 })
  @IsInt()
  @Min(5)
  @Max(10)
  questionCount!: number;
}

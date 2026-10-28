import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, Length, MaxLength } from 'class-validator';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Alex B' })
  @IsOptional()
  @IsString()
  @Length(2, 50)
  displayName?: string;

  @ApiPropertyOptional({ example: 'Backend learner', nullable: true })
  @IsOptional()
  @MaxLength(300)
  bio?: string | null;
}

import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsPositive } from 'class-validator';

export class AttemptFilterDto {
  @ApiPropertyOptional({
    description: 'Filter attempts by status',
    enum: ['in_progress', 'finished', 'timed_out'],
    example: 'finished',
  })
  @IsOptional()
  @IsEnum(['in_progress', 'finished', 'timed_out'], {
    message: 'status must be one of: in_progress, finished, timed_out',
  })
  status?: 'in_progress' | 'finished' | 'timed_out';

  @ApiPropertyOptional({
    description: 'Filter attempts by interview ID',
    example: 7,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  interviewId?: number;
}

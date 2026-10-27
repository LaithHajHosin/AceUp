import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsPositive } from 'class-validator';

export class CreateAttemptDto {
  @ApiProperty({
    description: 'The numeric ID of the interview to take',
    example: 7,
  })
  @IsNotEmpty()
  @IsInt()
  @IsPositive()
  interviewId: number;
}

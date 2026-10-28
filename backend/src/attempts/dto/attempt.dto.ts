import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsObject } from 'class-validator';

export class StartAttemptDto {
  @ApiProperty({ example: 1, description: 'Interview track ID' })
  @IsNumber()
  interviewId!: number;
}

export class SubmitAnswerDto {
  @ApiProperty({ example: 104, description: 'Question ID' })
  @IsNumber()
  questionId!: number;

  @ApiProperty({
    example: { type: 'multiple_choice', choiceId: 'a' },
    description: 'Answer object conforming to question type',
  })
  @IsObject()
  answer!: {
    type: 'multiple_choice' | 'short_answer' | 'code_output';
    choiceId?: string;
    text?: string;
  };
}

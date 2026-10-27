import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SafeChoiceDto {
  @ApiProperty({ example: 'a' })
  id: string;

  @ApiProperty({ example: 'O(1)' })
  text: string;
}

export class AttemptQuestionDto {
  @ApiProperty({ example: 104 })
  questionId: number;

  @ApiProperty({ example: 1 })
  position: number;

  @ApiProperty({ example: 'What is the time complexity of array lookup by index?' })
  prompt: string;

  @ApiProperty({ enum: ['multiple_choice', 'short_answer', 'code_output'], example: 'multiple_choice' })
  type: 'multiple_choice' | 'short_answer' | 'code_output';

  @ApiProperty({ enum: ['easy', 'medium', 'hard'], example: 'easy' })
  difficulty: 'easy' | 'medium' | 'hard';

  @ApiProperty({ example: 'arrays' })
  category: string;

  @ApiPropertyOptional({
    type: [SafeChoiceDto],
    nullable: true,
    description: 'Choices list without isCorrect flag for multiple choice questions',
  })
  choices: SafeChoiceDto[] | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Code snippet to examine for code_output questions',
    example: "console.log(1 + '1')",
  })
  codeSnippet: string | null;
}

export class AttemptResponseDto {
  @ApiProperty({ example: 33 })
  id: number;

  @ApiProperty({ example: 7 })
  interviewId: number;

  @ApiProperty({ example: 'Arrays warm-up' })
  interviewTitle: string;

  @ApiProperty({ example: 2 })
  userId: number;

  @ApiProperty({ enum: ['in_progress', 'finished', 'timed_out'], example: 'in_progress' })
  status: 'in_progress' | 'finished' | 'timed_out';

  @ApiProperty({ example: '2026-10-25T10:00:00.000Z' })
  startedAt: string;

  @ApiProperty({ example: '2026-10-25T10:10:00.000Z' })
  deadlineAt: string;

  @ApiPropertyOptional({ nullable: true, example: null })
  finishedAt: string | null;

  @ApiProperty({ example: 600 })
  timeLimitSeconds: number;

  @ApiProperty({ type: [AttemptQuestionDto] })
  questions: AttemptQuestionDto[];

  @ApiProperty({ type: [Number], example: [104] })
  answeredQuestionIds: number[];
}

export class AttemptListItemDto {
  @ApiProperty({ example: 33 })
  id: number;

  @ApiProperty({ example: 7 })
  interviewId: number;

  @ApiProperty({ example: 'Arrays warm-up' })
  interviewTitle: string;

  @ApiProperty({ enum: ['in_progress', 'finished', 'timed_out'], example: 'finished' })
  status: 'in_progress' | 'finished' | 'timed_out';

  @ApiProperty({ example: '2026-10-25T10:00:00.000Z' })
  startedAt: string;

  @ApiPropertyOptional({ nullable: true, example: '2026-10-25T10:08:30.000Z' })
  finishedAt: string | null;

  @ApiPropertyOptional({ nullable: true, example: 3.5 })
  score: number | null;

  @ApiPropertyOptional({ nullable: true, example: 5 })
  maxScore: number | null;

  @ApiPropertyOptional({ nullable: true, example: 70.0 })
  percentage: number | null;

  @ApiPropertyOptional({ enum: ['needs_practice', 'almost_ready', 'ready', null], nullable: true, example: 'almost_ready' })
  readiness: 'needs_practice' | 'almost_ready' | 'ready' | null;
}

export class SubmitAnswerReceiptDto {
  @ApiProperty({ example: 104 })
  questionId: number;

  @ApiProperty({ example: true })
  accepted: boolean;

  @ApiProperty({ example: '2026-10-25T10:02:15.000Z' })
  submittedAt: string;
}

export class AttemptResultItemDto {
  @ApiProperty({ example: 105 })
  questionId: number;

  @ApiProperty({ example: 2 })
  position: number;

  @ApiProperty({ example: 'What is a stack?' })
  prompt: string;

  @ApiProperty({ enum: ['multiple_choice', 'short_answer', 'code_output'], example: 'short_answer' })
  type: string;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Submitted answer object, null if question was unanswered',
    example: { text: 'A stack is LIFO' },
  })
  submitted: Record<string, any> | null;

  @ApiProperty({
    description: 'Expected answer details (correct choice, keywords, or output)',
    example: { expectedKeywords: ['lifo', 'push', 'pop'], requiredKeywordCount: 2 },
  })
  expected: Record<string, any>;

  @ApiProperty({ example: 0.5 })
  points: number;

  @ApiProperty({ example: 1 })
  maxPoints: number;

  @ApiProperty({ example: 'Matched 1 of 2 required keywords (lifo): half credit.' })
  explanation: string;
}

export class AttemptResultsResponseDto {
  @ApiProperty({ example: 33 })
  attemptId: number;

  @ApiProperty({ example: 7 })
  interviewId: number;

  @ApiProperty({ example: 'Arrays warm-up' })
  interviewTitle: string;

  @ApiProperty({ enum: ['finished', 'timed_out'], example: 'finished' })
  status: 'finished' | 'timed_out';

  @ApiProperty({ example: '2026-10-25T10:00:00.000Z' })
  startedAt: string;

  @ApiPropertyOptional({ nullable: true, example: '2026-10-25T10:08:30.000Z' })
  finishedAt: string | null;

  @ApiProperty({ example: 3.5 })
  score: number;

  @ApiProperty({ example: 5 })
  maxScore: number;

  @ApiProperty({ example: 70.0 })
  percentage: number;

  @ApiProperty({ enum: ['needs_practice', 'almost_ready', 'ready'], example: 'almost_ready' })
  readiness: 'needs_practice' | 'almost_ready' | 'ready';

  @ApiProperty({ type: [AttemptResultItemDto] })
  items: AttemptResultItemDto[];
}

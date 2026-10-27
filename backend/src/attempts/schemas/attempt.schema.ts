import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { Document } from 'mongoose';

export type AttemptStatus = 'in_progress' | 'finished' | 'timed_out';
export type ReadinessLevel = 'needs_practice' | 'almost_ready' | 'ready';
export type QuestionType = 'multiple_choice' | 'short_answer' | 'code_output';
export type Difficulty = 'easy' | 'medium' | 'hard';

@Schema({ _id: false })
export class QuestionChoice {
  @Prop({ type: String, required: true })
  id: string;

  @Prop({ type: String, required: true })
  text: string;

  @Prop({ type: Boolean, required: true })
  isCorrect: boolean;
}

@Schema({ _id: false })
export class AttemptQuestionSnapshot {
  @Prop({ type: Number, required: true })
  questionId: number;

  @Prop({ type: Number, required: true })
  position: number;

  @Prop({ type: String, required: true })
  prompt: string;

  @Prop({ type: String, required: true, enum: ['multiple_choice', 'short_answer', 'code_output'] })
  type: QuestionType;

  @Prop({ type: String, required: true, enum: ['easy', 'medium', 'hard'] })
  difficulty: Difficulty;

  @Prop({ type: String, required: true })
  category: string;

  @Prop({ type: [QuestionChoice], default: null })
  choices: QuestionChoice[] | null;

  @Prop({ type: String, default: null })
  codeSnippet: string | null;

  // Private scoring data stored in the snapshot (never revealed while in progress)
  @Prop({ type: [String], default: null })
  expectedKeywords: string[] | null;

  @Prop({ type: Number, default: null })
  requiredKeywordCount: number | null;

  @Prop({ type: String, default: null })
  expectedOutput: string | null;
}

@Schema({ _id: false })
export class AttemptAnswerData {
  @Prop({ type: String, required: true, enum: ['multiple_choice', 'short_answer', 'code_output'] })
  type: QuestionType;

  @Prop({ type: String, default: null })
  choiceId?: string;

  @Prop({ type: String, default: null })
  text?: string;
}

@Schema({ _id: false })
export class AttemptAnswerRecord {
  @Prop({ type: Number, required: true })
  questionId: number;

  @Prop({ type: AttemptAnswerData, required: true })
  answer: AttemptAnswerData;

  @Prop({ type: String, required: true })
  submittedAt: string;
}

export type AttemptDocument = Attempt & Document;

@Schema({ collection: 'attempts', timestamps: false, versionKey: false })
export class Attempt {
  @Prop({ type: Number, required: true, unique: true, index: true })
  id: number;

  @Prop({ type: Number, required: true })
  interviewId: number;

  @Prop({ type: String, required: true })
  interviewTitle: string;

  @Prop({ type: Number, required: true, index: true })
  userId: number;

  @Prop({
    type: String,
    required: true,
    enum: ['in_progress', 'finished', 'timed_out'],
    default: 'in_progress',
  })
  status: AttemptStatus;

  @Prop({ type: String, required: true })
  startedAt: string; // ISO 8601 UTC

  @Prop({ type: String, required: true })
  deadlineAt: string; // ISO 8601 UTC

  @Prop({ type: String, default: null })
  finishedAt: string | null;

  @Prop({ type: Number, required: true })
  timeLimitSeconds: number;

  // Score fields (null while in progress)
  @Prop({ type: Number, default: null })
  score: number | null;

  @Prop({ type: Number, default: null })
  maxScore: number | null;

  @Prop({ type: Number, default: null })
  percentage: number | null;

  @Prop({ type: String, default: null, enum: ['needs_practice', 'almost_ready', 'ready', null] })
  readiness: ReadinessLevel | null;

  @Prop({ type: [AttemptQuestionSnapshot], required: true })
  questions: AttemptQuestionSnapshot[];

  @Prop({ type: [AttemptAnswerRecord], default: [] })
  answers: AttemptAnswerRecord[];
}

export const AttemptSchema = SchemaFactory.createForClass(Attempt);

// Indexes according to API Contract Section 8 (page 11)
// 1. unique id (handled via @Prop({ unique: true }))
// 2. { userId: 1, startedAt: -1 }
AttemptSchema.index({ userId: 1, startedAt: -1 });
// 3. { "questions.questionId": 1 }
AttemptSchema.index({ 'questions.questionId': 1 });

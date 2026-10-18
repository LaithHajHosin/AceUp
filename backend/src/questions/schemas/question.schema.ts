import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export const QUESTION_TYPES = [
  'multiple_choice',
  'short_answer',
  'code_output',
] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

export const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

/**
 * Embedded sub-schema for multiple-choice options.
 * Includes private grading field `isCorrect` which is stripped in public DTOs.
 */
@Schema({ _id: false })
export class QuestionChoice {
  @Prop({ type: String, required: true, trim: true })
  id: string;

  @Prop({ type: String, required: true, trim: true })
  text: string;

  @Prop({ type: Boolean, required: true })
  isCorrect: boolean;
}

export const QuestionChoiceSchema =
  SchemaFactory.createForClass(QuestionChoice);

export type QuestionDocument = HydratedDocument<Question>;

/**
 * Master Question Bank Mongoose Schema.
 * Uses numeric application-level `id` and includes the agreed compound index
 * `{ active: 1, category: 1, difficulty: 1 }` for fast session selection and public filtering.
 */
@Schema({
  collection: 'questions',
  timestamps: true,
  versionKey: false,
})
export class Question {
  @Prop({ type: Number, required: true, unique: true, index: true })
  id: number;

  @Prop({ type: String, required: true, trim: true, maxlength: 2000 })
  prompt: string;

  @Prop({ type: String, required: true, trim: true })
  category: string;

  @Prop({ type: String, required: true, enum: DIFFICULTIES })
  difficulty: Difficulty;

  @Prop({ type: String, required: true, enum: QUESTION_TYPES })
  type: QuestionType;

  @Prop({ type: Boolean, required: true, default: true })
  active: boolean;

  @Prop({ type: [QuestionChoiceSchema], required: false })
  choices?: QuestionChoice[];

  @Prop({ type: [String], required: false })
  expectedKeywords?: string[];

  @Prop({ type: Number, required: false })
  requiredKeywordCount?: number;

  @Prop({ type: String, required: false, maxlength: 1000 })
  expectedOutput?: string;

  @Prop({ type: String, required: false })
  codeSnippet?: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export const QuestionSchema = SchemaFactory.createForClass(Question);

// Agreed compound index supporting public filtering and session question selection
QuestionSchema.index({ active: 1, category: 1, difficulty: 1 });

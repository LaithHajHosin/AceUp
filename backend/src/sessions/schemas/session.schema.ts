import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type SessionDocument = HydratedDocument<Session>;

@Schema({ _id: false })
export class SnapshotChoice {
  @Prop({ required: true })
  id!: string;

  @Prop({ required: true })
  text!: string;

  @Prop()
  isCorrect?: boolean;
}

const SnapshotChoiceSchema = SchemaFactory.createForClass(SnapshotChoice);

@Schema({ _id: false })
export class QuestionSnapshot {
  @Prop({ required: true })
  id!: number;

  @Prop({ required: true })
  prompt!: string;

  @Prop({ required: true })
  category!: string;

  @Prop({ required: true })
  difficulty!: 'easy' | 'medium' | 'hard';

  @Prop({ required: true })
  type!: 'multiple_choice' | 'short_answer' | 'code_output';

  @Prop({ type: [SnapshotChoiceSchema], default: [] })
  choices!: SnapshotChoice[];

  @Prop({ type: [String], default: [] })
  expectedKeywords!: string[];

  @Prop()
  requiredKeywordCount?: number;

  @Prop()
  expectedOutput?: string;

  @Prop()
  codeSnippet?: string;
}

const QuestionSnapshotSchema = SchemaFactory.createForClass(QuestionSnapshot);

@Schema({ _id: false })
export class SavedAnswer {
  @Prop({ required: true })
  questionId!: number;

  @Prop({ required: true })
  type!: 'multiple_choice' | 'short_answer' | 'code_output';

  @Prop()
  choiceId?: string;

  @Prop()
  text?: string;

  @Prop({ required: true })
  submittedAt!: Date;
}

const SavedAnswerSchema = SchemaFactory.createForClass(SavedAnswer);

@Schema({ _id: false })
export class SessionScore {
  @Prop({ required: true })
  earnedPoints!: number;

  @Prop({ required: true })
  possiblePoints!: number;

  @Prop({ required: true })
  percentage!: number;

  @Prop({ required: true })
  readiness!: 'Ready' | 'Almost ready' | 'Needs practice';
}

const SessionScoreSchema = SchemaFactory.createForClass(SessionScore);

@Schema({ timestamps: true })
export class Session {
  @Prop({ required: true, unique: true, index: true })
  id!: number;

  @Prop({ required: true, trim: true, minlength: 1, maxlength: 80 })
  displayName!: string;

  @Prop({ required: true, lowercase: true, trim: true, index: true })
  displayNameNormalized!: string;

  @Prop({ required: true })
  category!: string;

  @Prop({ required: true })
  difficulty!: 'easy' | 'medium' | 'hard';

  @Prop({ required: true, enum: ['in_progress', 'finished', 'timed_out'] })
  status!: 'in_progress' | 'finished' | 'timed_out';

  @Prop({ required: true })
  startedAt!: Date;

  @Prop({ required: true })
  deadlineAt!: Date;

  @Prop()
  finishedAt?: Date;

  @Prop({ required: true })
  timePerQuestionSeconds!: number;

  @Prop({ type: [QuestionSnapshotSchema], required: true })
  questions!: QuestionSnapshot[];

  @Prop({ type: [SavedAnswerSchema], default: [] })
  answers!: SavedAnswer[];

  @Prop({ type: SessionScoreSchema })
  score?: SessionScore;
}

export const SessionSchema = SchemaFactory.createForClass(Session);
SessionSchema.index({ displayNameNormalized: 1, startedAt: -1 });

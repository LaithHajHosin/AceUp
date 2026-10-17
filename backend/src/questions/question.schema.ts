import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ _id: false })
export class QuestionChoice {
  @Prop({ required: true })
  id!: string;

  @Prop({ required: true })
  text!: string;

  @Prop({ required: true })
  isCorrect!: boolean;
}

const QuestionChoiceSchema = SchemaFactory.createForClass(QuestionChoice);

@Schema({ timestamps: true })
export class Question {
  @Prop({ required: true, unique: true, index: true })
  id!: number;

  @Prop({ required: true, trim: true })
  prompt!: string;

  @Prop({ required: true, trim: true })
  category!: string;

  @Prop({ required: true, enum: ['easy', 'medium', 'hard'] })
  difficulty!: 'easy' | 'medium' | 'hard';

  @Prop({
    required: true,
    enum: ['multiple_choice', 'short_answer', 'code_output'],
  })
  type!: 'multiple_choice' | 'short_answer' | 'code_output';

  @Prop({ default: true })
  active!: boolean;

  @Prop({ type: [QuestionChoiceSchema], default: [] })
  choices!: QuestionChoice[];

  @Prop({ type: [String], default: [] })
  expectedKeywords!: string[];

  @Prop()
  requiredKeywordCount?: number;

  @Prop()
  expectedOutput?: string;

  @Prop()
  codeSnippet?: string;

  createdAt!: Date;
  updatedAt!: Date;
}

export const QuestionSchema = SchemaFactory.createForClass(Question);

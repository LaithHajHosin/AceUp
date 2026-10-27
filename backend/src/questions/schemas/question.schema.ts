import { Schema } from 'mongoose';

export const QuestionSchema = new Schema({
  id: { type: Number, required: true, unique: true, index: true },
  ownerId: { type: Number, required: true, index: true },
  prompt: { type: String, required: true },
  category: { type: String, required: true },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], required: true },
  type: { type: String, enum: ['multiple_choice', 'short_answer', 'code_output'], required: true },
  choices: { type: [Schema.Types.Mixed], default: null },
  codeSnippet: { type: String, default: null },
  expectedKeywords: { type: [String], default: undefined },
  requiredKeywordCount: { type: Number, default: undefined },
  expectedOutput: { type: String, default: undefined },
  createdAt: { type: Date, required: true },
  updatedAt: { type: Date, required: true },
}, { collection: 'questions', versionKey: false });
QuestionSchema.index({ category: 1, difficulty: 1, type: 1 });
QuestionSchema.index({ ownerId: 1 });

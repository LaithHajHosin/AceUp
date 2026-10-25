import { Schema } from 'mongoose';
export const InterviewSchema = new Schema({
  id: { type: Number, required: true, unique: true, index: true },
  ownerId: { type: Number, required: true, index: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  category: { type: String, required: true },
  difficulty: { type: String, enum: ['easy','medium','hard'], required: true },
  questionIds: { type: [Number], required: true },
  timeLimitSeconds: { type: Number, required: true },
  createdAt: { type: Date, required: true },
  updatedAt: { type: Date, required: true },
}, { collection: 'interviews', versionKey: false });
InterviewSchema.index({ ownerId: 1 });
InterviewSchema.index({ questionIds: 1 });

import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';
import { normalizeCategory, validateQuestionPatch, validateQuestionPayload } from './question-validation.js';

@Injectable()
export class QuestionsService implements OnModuleInit {
  private get questions() { return this.connection.collection('questions'); }
  constructor(@InjectConnection() private readonly connection: Connection) {}

  async onModuleInit() {
    await this.questions.createIndex({ id: 1 }, { unique: true });
    await this.questions.createIndex({ category: 1, difficulty: 1, type: 1 });
    await this.questions.createIndex({ ownerId: 1 });
  }

  private async nextId(): Promise<number> {
    const result = await this.connection.collection<any>('counters').findOneAndUpdate(
      { _id: 'questions' }, { $inc: { seq: 1 } }, { upsert: true, returnDocument: 'after' },
    );
    return result?.seq ?? 1;
  }
  private async ownerNames(ownerIds: number[]): Promise<Map<number, string>> {
    const users = await this.connection.collection('users').find({ id: { $in: [...new Set(ownerIds)] } }, { projection: { id: 1, username: 1 } }).toArray();
    return new Map(users.map((u: any) => [u.id, u.username]));
  }
  private async serialize(q: any, requesterId: number) {
    const names = await this.ownerNames([q.ownerId]);
    const base: any = {
      id: q.id, ownerId: q.ownerId, ownerUsername: names.get(q.ownerId) ?? null,
      prompt: q.prompt, category: q.category, difficulty: q.difficulty, type: q.type,
      choices: q.type === 'multiple_choice' ? (q.choices ?? []).map(({ id, text }: any) => ({ id, text })) : null,
      codeSnippet: q.type === 'code_output' ? (q.codeSnippet ?? null) : null,
      createdAt: new Date(q.createdAt).toISOString(), updatedAt: new Date(q.updatedAt).toISOString(),
    };
    if (q.ownerId === requesterId) {
      if (q.type === 'multiple_choice') base.choices = q.choices;
      if (q.type === 'short_answer') { base.expectedKeywords = q.expectedKeywords; base.requiredKeywordCount = q.requiredKeywordCount; }
      if (q.type === 'code_output') base.expectedOutput = q.expectedOutput;
    }
    return base;
  }
  async list(query: any, requesterId: number) {
    const filter: any = {};
    if (query.category) filter.category = normalizeCategory(query.category);
    if (query.difficulty) filter.difficulty = query.difficulty;
    if (query.type) filter.type = query.type;
    if (query.ownerId) filter.ownerId = Number(query.ownerId);
    if (query.search) filter.prompt = { $regex: escapeRegex(query.search), $options: 'i' };
    const rows = await this.questions.find(filter).sort({ createdAt: -1 }).toArray();
    const names = await this.ownerNames(rows.map((q: any) => q.ownerId));
    return rows.map((q: any) => {
      const own = q.ownerId === requesterId;
      const result: any = { id:q.id, ownerId:q.ownerId, ownerUsername:names.get(q.ownerId) ?? null, prompt:q.prompt, category:q.category, difficulty:q.difficulty, type:q.type,
        choices:q.type === 'multiple_choice' ? (own ? q.choices : (q.choices ?? []).map(({id,text}:any)=>({id,text}))) : null,
        codeSnippet:q.type === 'code_output' ? (q.codeSnippet ?? null) : null, createdAt:new Date(q.createdAt).toISOString(), updatedAt:new Date(q.updatedAt).toISOString() };
      if (own && q.type === 'short_answer') { result.expectedKeywords=q.expectedKeywords; result.requiredKeywordCount=q.requiredKeywordCount; }
      if (own && q.type === 'code_output') result.expectedOutput=q.expectedOutput;
      return result;
    });
  }
  async get(id: number, requesterId: number) {
    const q = await this.questions.findOne({ id });
    if (!q) throw new NotFoundException({ statusCode:404, error:'Not Found', code:'NOT_FOUND', message:'Question not found' });
    return this.serialize(q, requesterId);
  }
  async create(body: any, requesterId: number) {
    validateQuestionPayload(body);
    const now = new Date();
    const q = { ...body, id: await this.nextId(), ownerId: requesterId, prompt: body.prompt.trim(), category: normalizeCategory(body.category), createdAt: now, updatedAt: now };
    await this.questions.insertOne(q);
    return this.serialize(q, requesterId);
  }
  async update(id: number, patch: any, requesterId: number) {
    const current = await this.questions.findOne({ id });
    if (!current) throw new NotFoundException({ statusCode:404, error:'Not Found', code:'NOT_FOUND', message:'Question not found' });
    if (current.ownerId !== requesterId) throw new ForbiddenException({ statusCode:403, error:'Forbidden', code:'NOT_OWNER', message:'You do not own this question' });
    const cleanPatch = { ...patch };
    const merged = validateQuestionPatch(current, cleanPatch);
    merged.category = normalizeCategory(merged.category);
    merged.prompt = merged.prompt.trim();
    merged.updatedAt = new Date();
    delete merged._id;
    await this.questions.updateOne({ id }, { $set: merged });
    return this.serialize(merged, requesterId);
  }
  async remove(id: number, requesterId: number): Promise<void> {
    const current = await this.questions.findOne({ id });
    if (!current) throw new NotFoundException({ statusCode:404, error:'Not Found', code:'NOT_FOUND', message:'Question not found' });
    if (current.ownerId !== requesterId) throw new ForbiddenException({ statusCode:403, error:'Forbidden', code:'NOT_OWNER', message:'You do not own this question' });
    const inInterview = await this.connection.collection('interviews').findOne({ questionIds: id });
    const inAttempt = await this.connection.collection('attempts').findOne({ 'questions.questionId': id });
    if (inInterview || inAttempt) throw new ConflictException({ statusCode:409, error:'Conflict', code:'QUESTION_IN_USE', message:'Question is used by an interview or attempt' });
    await this.questions.deleteOne({ id });
  }
}
function escapeRegex(value: string) { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

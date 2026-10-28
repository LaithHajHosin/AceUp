/**
 * Database Service
 * Provides MongoDB collections or durable local disk fallback
 * Section 8: users, questions, interviews, attempts, counters
 */

import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import fs from 'fs';
import path from 'path';
import { MongoClient, Db } from 'mongodb';
import { SEED_USERS, SEED_QUESTIONS, SEED_INTERVIEWS } from './seedData.js';
import { configuration } from '../config/configuration.js';

export interface UserEntity {
  id: number;
  username: string;
  email: string;
  passwordHash: string;
  salt: string;
  displayName: string;
  bio: string | null;
  role: 'user' | 'author' | 'admin';
  createdAt: string;
  updatedAt: string;
}

export interface QuestionEntity {
  id: number;
  ownerId: number;
  ownerUsername: string;
  prompt: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  type: 'multiple_choice' | 'short_answer' | 'code_output';
  choices?: { id: string; text: string; isCorrect?: boolean }[] | null;
  codeSnippet?: string | null;
  expectedOutput?: string | null;
  expectedKeywords?: string[] | null;
  requiredKeywordCount?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface InterviewEntity {
  id: number;
  ownerId: number;
  ownerUsername: string;
  title: string;
  description: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  questionIds: number[];
  timeLimitSeconds: number;
  createdAt: string;
  updatedAt: string;
}

export interface AttemptAnswerEntity {
  questionId: number;
  answer: {
    type: 'multiple_choice' | 'short_answer' | 'code_output';
    choiceId?: string;
    text?: string;
  };
  submittedAt: string;
}

export interface AttemptQuestionSnapshotEntity {
  questionId: number;
  position: number;
  prompt: string;
  type: 'multiple_choice' | 'short_answer' | 'code_output';
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
  choices?: { id: string; text: string; isCorrect?: boolean }[] | null;
  codeSnippet?: string | null;
  expectedOutput?: string | null;
  expectedKeywords?: string[] | null;
  requiredKeywordCount?: number | null;
}

export interface AttemptEntity {
  id: number;
  interviewId: number;
  interviewTitle: string;
  userId: number;
  status: 'in_progress' | 'finished' | 'timed_out';
  startedAt: string;
  deadlineAt: string;
  finishedAt: string | null;
  timeLimitSeconds: number;
  questions: AttemptQuestionSnapshotEntity[];
  answeredQuestionIds: number[];
  answers: AttemptAnswerEntity[];
  score: number | null;
  maxScore: number | null;
  percentage: number | null;
  readiness: 'needs_practice' | 'almost_ready' | 'ready' | null;
}

const DATA_DIR = path.resolve(process.cwd(), '.data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private mongoClient: MongoClient | null = null;
  private mongoDb: Db | null = null;
  public isConnectedToMongo: boolean = false;

  // In-memory / durable local state
  public users: UserEntity[] = [];
  public questions: QuestionEntity[] = [];
  public interviews: InterviewEntity[] = [];
  public attempts: AttemptEntity[] = [];
  public counters: Record<string, number> = {
    users: 10,
    questions: 200,
    interviews: 10,
    attempts: 50,
  };

  async onModuleInit() {
    this.loadFromDisk();
    await this.connectMongo();
  }

  async onModuleDestroy() {
    if (this.mongoClient) {
      await this.mongoClient.close();
    }
  }

  private loadFromDisk() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed.users && parsed.questions && parsed.interviews && parsed.attempts) {
          this.users = parsed.users;
          this.questions = parsed.questions;
          this.interviews = parsed.interviews;
          this.attempts = parsed.attempts;
          this.counters = parsed.counters || this.counters;
          return;
        }
      }
    } catch {}

    // Initial default seed
    this.users = [...(SEED_USERS as UserEntity[])];
    this.questions = [...(SEED_QUESTIONS as QuestionEntity[])];
    this.interviews = [...(SEED_INTERVIEWS as InterviewEntity[])];
    this.attempts = [];
    this.saveToDisk();
  }

  public saveToDisk() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(
        DB_FILE,
        JSON.stringify(
          {
            users: this.users,
            questions: this.questions,
            interviews: this.interviews,
            attempts: this.attempts,
            counters: this.counters,
          },
          null,
          2,
        ),
        'utf-8',
      );
    } catch (e: any) {
      console.error('[Database] Failed to save db.json:', e.message);
    }
  }

  private async connectMongo() {
    const config = configuration();
    try {
      console.log(`[NestJS Database] Connecting to MongoDB at ${config.mongoUri}...`);
      this.mongoClient = new MongoClient(config.mongoUri, {
        serverSelectionTimeoutMS: 2500,
        connectTimeoutMS: 2500,
      });

      await this.mongoClient.connect();
      const parsedUrl = new URL(config.mongoUri.replace('mongodb://', 'http://'));
      const dbName = parsedUrl.pathname.replace(/^\//, '') || 'AceUp';
      this.mongoDb = this.mongoClient.db(dbName);
      this.isConnectedToMongo = true;
      console.log(`✅ [NestJS Database] Connected to MongoDB database: "${dbName}"`);

      await this.ensureIndexes();
      await this.seedMongoIfEmpty(dbName);
      await this.loadFromMongo();
    } catch (err: any) {
      this.isConnectedToMongo = false;
      console.log(`ℹ️  [NestJS Database] MongoDB offline (${err.message}). Using persistent local document store (.data/db.json).`);
    }
  }

  private async ensureIndexes() {
    if (!this.mongoDb) return;
    try {
      await this.mongoDb.collection('users').createIndex({ username: 1 }, { unique: true });
      await this.mongoDb.collection('users').createIndex({ email: 1 }, { unique: true });
      await this.mongoDb.collection('users').createIndex({ id: 1 }, { unique: true });

      await this.mongoDb.collection('questions').createIndex({ id: 1 }, { unique: true });
      await this.mongoDb.collection('questions').createIndex({ category: 1, difficulty: 1, type: 1 });
      await this.mongoDb.collection('questions').createIndex({ ownerId: 1 });

      await this.mongoDb.collection('interviews').createIndex({ id: 1 }, { unique: true });
      await this.mongoDb.collection('interviews').createIndex({ ownerId: 1 });
      await this.mongoDb.collection('interviews').createIndex({ questionIds: 1 });

      await this.mongoDb.collection('attempts').createIndex({ id: 1 }, { unique: true });
      await this.mongoDb.collection('attempts').createIndex({ userId: 1, startedAt: -1 });
      await this.mongoDb.collection('attempts').createIndex({ 'questions.questionId': 1 });
    } catch {}
  }

  private async seedMongoIfEmpty(dbName: string) {
    if (!this.mongoDb) return;
    try {
      const qCol = this.mongoDb.collection('questions');
      const count = await qCol.countDocuments();
      if (count === 0) {
        console.log(`🌱 [NestJS Database] Seeding database "${dbName}" with 43 questions, tracks, and accounts...`);
        await this.mongoDb.collection('users').insertMany(SEED_USERS as any);
        await this.mongoDb.collection('questions').insertMany(SEED_QUESTIONS as any);
        await this.mongoDb.collection('interviews').insertMany(SEED_INTERVIEWS as any);
        await this.mongoDb.collection('counters').insertMany([
          { _id: 'users' as any, seq: 10 },
          { _id: 'questions' as any, seq: 200 },
          { _id: 'interviews' as any, seq: 10 },
          { _id: 'attempts' as any, seq: 50 },
        ]);
        console.log(`✨ [NestJS Database] Seeding completed successfully.`);
      }
    } catch (e: any) {
      console.warn('[NestJS Database] Seed note:', e.message);
    }
  }

  private async loadFromMongo() {
    if (!this.mongoDb) return;
    try {
      const users = await this.mongoDb.collection<UserEntity>('users').find({}, { projection: { _id: 0 } }).toArray();
      const questions = await this.mongoDb.collection<QuestionEntity>('questions').find({}, { projection: { _id: 0 } }).toArray();
      const interviews = await this.mongoDb.collection<InterviewEntity>('interviews').find({}, { projection: { _id: 0 } }).toArray();
      const attempts = await this.mongoDb.collection<AttemptEntity>('attempts').find({}, { projection: { _id: 0 } }).toArray();

      if (users.length > 0 && questions.length > 0) {
        this.users = users;
        this.questions = questions;
        this.interviews = interviews;
        this.attempts = attempts;
        this.saveToDisk();
      }
    } catch {}
  }

  public getNextId(key: 'users' | 'questions' | 'interviews' | 'attempts'): number {
    if (typeof this.counters[key] !== 'number') {
      this.counters[key] = 1;
    } else {
      this.counters[key] += 1;
    }
    this.saveToDisk();

    if (this.isConnectedToMongo && this.mongoDb) {
      this.mongoDb.collection('counters').findOneAndUpdate(
        { _id: key as any },
        { $inc: { seq: 1 } },
        { upsert: true },
      ).catch(() => {});
    }

    return this.counters[key];
  }

  public resetAllToSeeds() {
    this.users = [...(SEED_USERS as UserEntity[])];
    this.questions = [...(SEED_QUESTIONS as QuestionEntity[])];
    this.interviews = [...(SEED_INTERVIEWS as InterviewEntity[])];
    this.attempts = [];
    this.counters = {
      users: 10,
      questions: 200,
      interviews: 10,
      attempts: 50,
    };
    this.saveToDisk();

    if (this.isConnectedToMongo && this.mongoDb) {
      const db = this.mongoDb;
      Promise.all([
        db.collection('users').deleteMany({}),
        db.collection('questions').deleteMany({}),
        db.collection('interviews').deleteMany({}),
        db.collection('attempts').deleteMany({}),
        db.collection('counters').deleteMany({}),
      ]).then(() => this.seedMongoIfEmpty('AceUp')).catch(() => {});
    }
  }
}

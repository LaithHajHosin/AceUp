import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import type { Connection, Model } from 'mongoose';
import { UpdateMeDto } from './dto/update-me.dto.js';
import { PrivateUserDto, PublicUserDto } from './dto/user-response.dto.js';
import { User, UserDocument } from './schemas/user.schema.js';

export interface CreateUserInput {
  username: string;
  email: string;
  passwordHash: string;
  displayName: string;
}

export interface UserWithPasswordRecord {
  id: number;
  username: string;
  email: string;
  passwordHash: string;
  displayName: string;
  bio: string | null;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class UsersService {
  private readonly memoryUsers = new Map<number, UserWithPasswordRecord>();
  private memorySeq = 0;

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  private isDbConnected(): boolean {
    return Number(this.connection.readyState) === 1;
  }

  private async getNextUserId(): Promise<number> {
    if (this.isDbConnected()) {
      const result = await this.connection
        .collection<{ _id: string; seq: number }>('counters')
        .findOneAndUpdate(
          { _id: 'users' },
          { $inc: { seq: 1 } },
          { upsert: true, returnDocument: 'after' },
        );
      const doc =
        result && typeof result === 'object' && 'value' in result
          ? (result as { value: { seq?: number } | null }).value
          : (result as { seq?: number } | null);
      if (doc && typeof doc.seq === 'number') {
        return doc.seq;
      }
    }

    this.memorySeq += 1;
    return this.memorySeq;
  }

  toPrivateUser(user: {
    id: number;
    username: string;
    email: string;
    displayName: string;
    bio: string | null;
    createdAt: Date | string;
  }): PrivateUserDto {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: user.displayName,
      bio: user.bio ?? null,
      createdAt:
        user.createdAt instanceof Date
          ? user.createdAt.toISOString()
          : new Date(user.createdAt).toISOString(),
    };
  }

  toPublicUser(user: {
    id: number;
    username: string;
    displayName: string;
    bio: string | null;
    createdAt: Date | string;
  }): PublicUserDto {
    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      bio: user.bio ?? null,
      createdAt:
        user.createdAt instanceof Date
          ? user.createdAt.toISOString()
          : new Date(user.createdAt).toISOString(),
    };
  }

  async createUser(input: CreateUserInput): Promise<PrivateUserDto> {
    const normalizedUsername = input.username.trim().toLowerCase();
    const normalizedEmail = input.email.trim().toLowerCase();
    const trimmedDisplayName = input.displayName.trim();

    if (this.isDbConnected()) {
      const existingByUsername = await this.userModel
        .findOne({ username: normalizedUsername })
        .lean()
        .exec();
      if (existingByUsername) {
        throw new ConflictException({
          statusCode: 409,
          error: 'Conflict',
          code: 'USERNAME_TAKEN',
          message: 'Username is already taken.',
        });
      }

      const existingByEmail = await this.userModel
        .findOne({ email: normalizedEmail })
        .lean()
        .exec();
      if (existingByEmail) {
        throw new ConflictException({
          statusCode: 409,
          error: 'Conflict',
          code: 'EMAIL_TAKEN',
          message: 'Email is already registered.',
        });
      }

      const nextId = await this.getNextUserId();
      try {
        const created = await this.userModel.create({
          id: nextId,
          username: normalizedUsername,
          email: normalizedEmail,
          passwordHash: input.passwordHash,
          displayName: trimmedDisplayName,
          bio: null,
        });
        return this.toPrivateUser(created);
      } catch (err: unknown) {
        if (
          err &&
          typeof err === 'object' &&
          'code' in err &&
          (err as { code?: number }).code === 11000
        ) {
          const keyPattern = (
            err as { keyPattern?: Record<string, unknown> }
          ).keyPattern;
          if (keyPattern?.email) {
            throw new ConflictException({
              statusCode: 409,
              error: 'Conflict',
              code: 'EMAIL_TAKEN',
              message: 'Email is already registered.',
            });
          }
          throw new ConflictException({
            statusCode: 409,
            error: 'Conflict',
            code: 'USERNAME_TAKEN',
            message: 'Username is already taken.',
          });
        }
        throw err;
      }
    }

    for (const u of this.memoryUsers.values()) {
      if (u.username === normalizedUsername) {
        throw new ConflictException({
          statusCode: 409,
          error: 'Conflict',
          code: 'USERNAME_TAKEN',
          message: 'Username is already taken.',
        });
      }
      if (u.email === normalizedEmail) {
        throw new ConflictException({
          statusCode: 409,
          error: 'Conflict',
          code: 'EMAIL_TAKEN',
          message: 'Email is already registered.',
        });
      }
    }

    const nextId = await this.getNextUserId();
    const now = new Date();
    const record: UserWithPasswordRecord = {
      id: nextId,
      username: normalizedUsername,
      email: normalizedEmail,
      passwordHash: input.passwordHash,
      displayName: trimmedDisplayName,
      bio: null,
      createdAt: now,
      updatedAt: now,
    };
    this.memoryUsers.set(nextId, record);
    return this.toPrivateUser(record);
  }

  async findByUsernameOrEmailWithPassword(
    usernameOrEmail: string,
  ): Promise<UserWithPasswordRecord | null> {
    const normalized = usernameOrEmail.trim().toLowerCase();

    if (this.isDbConnected()) {
      const user = await this.userModel
        .findOne({
          $or: [{ username: normalized }, { email: normalized }],
        })
        .select('+passwordHash')
        .lean()
        .exec();
      return user ? (user as unknown as UserWithPasswordRecord) : null;
    }

    for (const u of this.memoryUsers.values()) {
      if (u.username === normalized || u.email === normalized) {
        return { ...u };
      }
    }
    return null;
  }

  async findPrivateById(userId: number): Promise<PrivateUserDto | null> {
    if (this.isDbConnected()) {
      const user = await this.userModel.findOne({ id: userId }).lean().exec();
      return user ? this.toPrivateUser(user) : null;
    }

    const record = this.memoryUsers.get(userId);
    return record ? this.toPrivateUser(record) : null;
  }

  async findPublicByIdOrThrow(userId: number): Promise<PublicUserDto> {
    if (this.isDbConnected()) {
      const user = await this.userModel.findOne({ id: userId }).lean().exec();
      if (!user) {
        throw new NotFoundException({
          statusCode: 404,
          error: 'Not Found',
          code: 'NOT_FOUND',
          message: `User with id ${userId} not found.`,
        });
      }
      return this.toPublicUser(user);
    }

    const record = this.memoryUsers.get(userId);
    if (!record) {
      throw new NotFoundException({
        statusCode: 404,
        error: 'Not Found',
        code: 'NOT_FOUND',
        message: `User with id ${userId} not found.`,
      });
    }
    return this.toPublicUser(record);
  }

  async updateMe(userId: number, dto: UpdateMeDto): Promise<PrivateUserDto> {
    const updates: Partial<{ displayName: string; bio: string | null }> = {};
    if (dto.displayName !== undefined) {
      updates.displayName = dto.displayName.trim();
    }
    if (dto.bio !== undefined) {
      updates.bio = dto.bio === null ? null : dto.bio.trim();
    }

    if (this.isDbConnected()) {
      const updated = await this.userModel
        .findOneAndUpdate(
          { id: userId },
          { $set: updates },
          { new: true },
        )
        .lean()
        .exec();

      if (!updated) {
        throw new NotFoundException({
          statusCode: 404,
          error: 'Not Found',
          code: 'NOT_FOUND',
          message: `User with id ${userId} not found.`,
        });
      }
      return this.toPrivateUser(updated);
    }

    const existing = this.memoryUsers.get(userId);
    if (!existing) {
      throw new NotFoundException({
        statusCode: 404,
        error: 'Not Found',
        code: 'NOT_FOUND',
        message: `User with id ${userId} not found.`,
      });
    }

    if (updates.displayName !== undefined) {
      existing.displayName = updates.displayName;
    }
    if (updates.bio !== undefined) {
      existing.bio = updates.bio;
    }
    existing.updatedAt = new Date();
    return this.toPrivateUser(existing);
  }
}

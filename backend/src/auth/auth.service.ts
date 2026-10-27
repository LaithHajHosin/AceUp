import { Injectable, UnauthorizedException, BadRequestException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { InMemoryStore, type UserRecord } from '../common/store.service.js';

export interface RegisterInput {
  username: string;
  email: string;
  password: string;
  displayName: string;
}

export interface LoginInput {
  usernameOrEmail: string;
  password: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly store: InMemoryStore,
    private readonly jwtService: JwtService,
  ) {}

  normalizeUsername(value: string) {
    return value.trim().toLowerCase();
  }

  private async hashPassword(password: string) {
    return bcrypt.hash(password, 10);
  }

  private ensureValidUsername(username: string) {
    const normalized = this.normalizeUsername(username);
    if (!/^[a-z0-9_]+$/.test(normalized) || normalized.length < 3 || normalized.length > 30) {
      throw new BadRequestException({
        code: 'VALIDATION_FAILED',
        message: 'Username must be 3-30 chars using lowercase letters, numbers or underscores.',
      });
    }
    return normalized;
  }

  private ensureValidEmail(email: string) {
    const value = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      throw new BadRequestException({ code: 'VALIDATION_FAILED', message: 'Email is invalid.' });
    }
    return value.toLowerCase();
  }

  private ensureValidPassword(password: string) {
    if (password.length < 8 || password.length > 72) {
      throw new BadRequestException({ code: 'VALIDATION_FAILED', message: 'Password must be 8-72 characters.' });
    }
  }

  private ensureValidDisplayName(displayName: string) {
    const trimmed = displayName.trim();
    if (trimmed.length < 2 || trimmed.length > 50) {
      throw new BadRequestException({ code: 'VALIDATION_FAILED', message: 'Display name must be 2-50 characters.' });
    }
    return trimmed;
  }

  async register(input: RegisterInput) {
    const username = this.ensureValidUsername(input.username);
    const email = this.ensureValidEmail(input.email);
    this.ensureValidPassword(input.password);
    const displayName = this.ensureValidDisplayName(input.displayName);

    if (this.store.users.some((user) => user.username === username)) {
      throw new ConflictException({ code: 'USERNAME_TAKEN', message: 'Username is already taken.' });
    }
    if (this.store.users.some((user) => user.email === email)) {
      throw new ConflictException({ code: 'EMAIL_TAKEN', message: 'Email is already taken.' });
    }

    const now = new Date().toISOString();
    const created: UserRecord = {
      id: this.store.nextId('users'),
      username,
      email,
      passwordHash: await this.hashPassword(input.password),
      displayName,
      bio: null,
      createdAt: now,
      updatedAt: now,
    };

    this.store.users.push(created);
    return this.toAuthResponse(created);
  }

  async login(input: LoginInput) {
    const lookup = this.normalizeUsername(input.usernameOrEmail);
    const user = this.store.users.find(
      (candidate) => candidate.username === lookup || candidate.email === lookup,
    );

    if (!user) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid username/email or password.',
      });
    }

    const passwordMatches = await bcrypt.compare(input.password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid username/email or password.',
      });
    }

    return this.toAuthResponse(user);
  }

  async validateUser(userId: number) {
    const user = this.store.getUserById(userId);
    if (!user) {
      throw new UnauthorizedException({ code: 'UNAUTHORIZED', message: 'Token is invalid.' });
    }
    return user;
  }

  signToken(user: UserRecord) {
    return this.jwtService.sign({ sub: user.id, username: user.username });
  }

  toAuthResponse(user: UserRecord) {
    const accessToken = this.signToken(user);
    const expiresIn = Number(process.env.JWT_EXPIRES_IN ?? 3600);
    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        bio: user.bio,
        createdAt: user.createdAt,
      },
    };
  }
}

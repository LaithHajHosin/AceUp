import { Injectable, ConflictException, UnauthorizedException, NotFoundException, Inject } from '@nestjs/common';
import crypto from 'crypto';
import { DatabaseService, UserEntity } from '../database/database.service.js';
import { RegisterDto, LoginDto } from './dto/auth.dto.js';
import { configuration } from '../config/configuration.js';

function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

@Injectable()
export class AuthService {
  constructor(@Inject(DatabaseService) private db: DatabaseService) {}

  public hashPassword(password: string, existingSalt?: string): { salt: string; hash: string } {
    const salt = existingSalt || crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, salt, 32).toString('hex');
    return { salt, hash };
  }

  public verifyPassword(password: string, salt: string, expectedHash: string): boolean {
    const hash = crypto.scryptSync(password, salt, 32).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(expectedHash, 'hex'));
  }

  public signToken(payload: { sub: number; username: string }): string {
    const config = configuration();
    const header = { alg: 'HS256', typ: 'JWT' };
    const exp = Math.floor(Date.now() / 1000) + config.jwtExpiresIn;
    const fullPayload = { ...payload, exp, iat: Math.floor(Date.now() / 1000) };

    const headerB64 = base64UrlEncode(JSON.stringify(header));
    const payloadB64 = base64UrlEncode(JSON.stringify(fullPayload));
    const dataToSign = `${headerB64}.${payloadB64}`;

    const signature = crypto
      .createHmac('sha256', config.jwtSecret)
      .update(dataToSign)
      .digest('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    return `${dataToSign}.${signature}`;
  }

  async register(dto: RegisterDto) {
    const cleanUsername = dto.username.trim().toLowerCase();
    const cleanEmail = dto.email.trim().toLowerCase();

    if (this.db.users.some(u => u.username.toLowerCase() === cleanUsername)) {
      throw new ConflictException({
        statusCode: 409,
        error: 'Conflict',
        code: 'USERNAME_TAKEN',
        message: 'Username is already taken',
      });
    }

    if (this.db.users.some(u => u.email.toLowerCase() === cleanEmail)) {
      throw new ConflictException({
        statusCode: 409,
        error: 'Conflict',
        code: 'EMAIL_TAKEN',
        message: 'Email is already taken',
      });
    }

    const { salt, hash } = this.hashPassword(dto.password);
    const newUserId = this.db.getNextId('users');
    const now = new Date().toISOString();
    const role = cleanUsername === 'admin' ? 'admin' : 'user';

    const newUser: UserEntity = {
      id: newUserId,
      username: cleanUsername,
      email: cleanEmail,
      passwordHash: hash,
      salt,
      displayName: dto.displayName.trim(),
      bio: null,
      role,
      createdAt: now,
      updatedAt: now,
    };

    this.db.users.push(newUser);
    this.db.saveToDisk();

    const token = this.signToken({ sub: newUser.id, username: newUser.username });

    return {
      accessToken: token,
      tokenType: 'Bearer',
      expiresIn: configuration().jwtExpiresIn,
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        displayName: newUser.displayName,
        bio: newUser.bio,
        role: newUser.role,
        createdAt: newUser.createdAt,
      },
    };
  }

  async login(dto: LoginDto) {
    const target = (dto.usernameOrEmail || dto.username || dto.email || '').trim().toLowerCase();
    if (!target) {
      throw new UnauthorizedException({
        statusCode: 401,
        error: 'Unauthorized',
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid username/email or password',
      });
    }

    const user = this.db.users.find(u => u.username.toLowerCase() === target || u.email.toLowerCase() === target);

    if (!user || !this.verifyPassword(dto.password, user.salt, user.passwordHash)) {
      throw new UnauthorizedException({
        statusCode: 401,
        error: 'Unauthorized',
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid username/email or password',
      });
    }

    const token = this.signToken({ sub: user.id, username: user.username });

    return {
      accessToken: token,
      tokenType: 'Bearer',
      expiresIn: configuration().jwtExpiresIn,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        bio: user.bio,
        role: user.role,
        createdAt: user.createdAt,
      },
    };
  }

  async getMe(userId: number) {
    const user = this.db.users.find(u => u.id === userId);
    if (!user) {
      throw new NotFoundException({
        statusCode: 404,
        error: 'Not Found',
        code: 'NOT_FOUND',
        message: 'User not found',
      });
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: user.displayName,
      bio: user.bio,
      role: user.role,
      createdAt: user.createdAt,
    };
  }
}

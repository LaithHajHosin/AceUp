import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { PrivateUserDto } from '../users/dto/user-response.dto.js';
import { UsersService } from '../users/users.service.js';
import { AuthResponseDto } from './dto/auth-response.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';

const BCRYPT_SALT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS);
    const user = await this.usersService.createUser({
      username: dto.username,
      email: dto.email,
      passwordHash,
      displayName: dto.displayName,
    });

    return this.buildAuthResponse(user);
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.usersService.findByUsernameOrEmailWithPassword(
      dto.usernameOrEmail,
    );

    if (!user) {
      throw this.invalidCredentialsError();
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      throw this.invalidCredentialsError();
    }

    return this.buildAuthResponse(this.usersService.toPrivateUser(user));
  }

  async getMe(userId: number): Promise<PrivateUserDto> {
    const user = await this.usersService.findPrivateById(userId);
    if (!user) {
      throw new UnauthorizedException({
        statusCode: 401,
        error: 'Unauthorized',
        code: 'UNAUTHORIZED',
        message: 'Authenticated user no longer exists.',
      });
    }
    return user;
  }

  private async buildAuthResponse(
    user: PrivateUserDto,
  ): Promise<AuthResponseDto> {
    const payload = { sub: user.id, username: user.username };
    const accessToken = await this.jwtService.signAsync(payload);
    const rawExpiresIn =
      this.configService.get<string>('JWT_EXPIRES_IN') ?? '1h';

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: this.parseExpiresInSeconds(rawExpiresIn),
      user,
    };
  }

  private parseExpiresInSeconds(value: string): number {
    const trimmed = value.trim();
    const numeric = Number(trimmed);
    if (Number.isFinite(numeric) && numeric > 0) {
      return Math.floor(numeric);
    }

    const match = /^(\d+)\s*([smhd])$/i.exec(trimmed);
    if (!match) {
      return 3600;
    }

    const amount = Number(match[1]);
    const unit = match[2].toLowerCase();
    switch (unit) {
      case 's':
        return amount;
      case 'm':
        return amount * 60;
      case 'h':
        return amount * 3600;
      case 'd':
        return amount * 86400;
      default:
        return 3600;
    }
  }

  private invalidCredentialsError(): UnauthorizedException {
    return new UnauthorizedException({
      statusCode: 401,
      error: 'Unauthorized',
      code: 'INVALID_CREDENTIALS',
      message: 'Invalid username/email or password.',
    });
  }
}

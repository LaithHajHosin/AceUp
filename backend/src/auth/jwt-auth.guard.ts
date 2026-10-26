import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { IS_PUBLIC_KEY } from './public.decorator.js';

interface JwtPayloadShape {
  sub: number;
  username: string;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      headers?: { authorization?: string };
      user?: { userId: number; username: string };
    }>();

    const token = this.extractBearerToken(request.headers?.authorization);
    if (!token) {
      throw this.unauthorizedError();
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayloadShape>(token);
      if (
        !payload ||
        typeof payload.sub !== 'number' ||
        typeof payload.username !== 'string'
      ) {
        throw this.unauthorizedError();
      }

      request.user = {
        userId: payload.sub,
        username: payload.username,
      };
      return true;
    } catch {
      throw this.unauthorizedError();
    }
  }

  private extractBearerToken(authHeader?: string): string | null {
    if (!authHeader || typeof authHeader !== 'string') {
      return null;
    }
    const [scheme, token, ...rest] = authHeader.trim().split(/\s+/);
    if (rest.length > 0 || scheme !== 'Bearer' || !token) {
      return null;
    }
    return token;
  }

  private unauthorizedError(): UnauthorizedException {
    return new UnauthorizedException({
      statusCode: 401,
      error: 'Unauthorized',
      code: 'UNAUTHORIZED',
      message: 'Missing, invalid, or expired authentication token.',
    });
  }
}

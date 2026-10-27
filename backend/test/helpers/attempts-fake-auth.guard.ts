import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

@Injectable()
export class AttemptsFakeAuthGuard implements CanActivate {
  // Configurable for tests
  public static currentUserId: number = 1;
  public static currentUsername: string = 'tester';
  public static enforceAuth: boolean = true;

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const authHeader = req.headers['authorization'];

    if (AttemptsFakeAuthGuard.enforceAuth) {
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new UnauthorizedException({
          statusCode: 401,
          error: 'Unauthorized',
          code: 'UNAUTHORIZED',
          message: 'No or invalid bearer token provided',
        });
      }
    }

    req.user = {
      userId: AttemptsFakeAuthGuard.currentUserId,
      username: AttemptsFakeAuthGuard.currentUsername,
    };

    return true;
  }
}

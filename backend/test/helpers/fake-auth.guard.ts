import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
@Injectable()
export class FakeAuthGuard implements CanActivate {
  canActivate(context:ExecutionContext):boolean {
    const request=context.switchToHttp().getRequest();
    const userId=Number(request.headers['x-test-user-id']??1);
    request.user={userId,username:userId===1?'tester':'other'};
    return true;
  }
}

import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ExecutionContext } from '@nestjs/common';

@Injectable()
export class JwtAccessTokenGuard extends AuthGuard('jwt-access-token') {
  async canActivate(context: ExecutionContext) {
    const isValid = await super.canActivate(context);
    if (!isValid) {
      return false;
    }
    const request = context.switchToHttp().getRequest();
    return !request.user.twofa;
  }
}

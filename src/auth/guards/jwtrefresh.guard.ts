// jwt-refresh-token-auth.guard.ts
import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtRefreshTokenGuard extends AuthGuard('jwt-refresh-token') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }
}

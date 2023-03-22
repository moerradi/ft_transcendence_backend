// jwt-refresh-token-auth.guard.ts
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAccessTokenGuard extends AuthGuard('jwt-access-token') {}

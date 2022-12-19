import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class IntraGuard extends AuthGuard('intra42') {
  constructor() {
    super();
  }
  handleRequest(
    err: any,
    user: any,
    info: any,
    context: ExecutionContext,
    status?: any,
  ) {
    console.log('user', user);
    console.log('info', info);
    return user;
  }
}

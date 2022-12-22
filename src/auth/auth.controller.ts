import { Controller, Req, Res, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Get } from '@nestjs/common';
import { Response } from 'express';
import { IntraGuard } from './intra.guard';
import { IntraUser } from 'src/types';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('login')
  @UseGuards(IntraGuard)
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  async login() {}

  @Get('callback')
  @UseGuards(IntraGuard)
  async callback(
    @Req() req: Request & { user: IntraUser },
    // @Res() res: Response,
  ) {
    const user = await this.authService.validateUser(req.user);
    return user;
    // sign user using jwt
    // const token = this.authService.signUser(user);
    // redirect to frontend with token
    // res.redirect(301, `${process.env.FRONTEND_URL}/auth?token=${token}`);
  }
}

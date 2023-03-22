import { Controller, Post, Req, Res, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Get } from '@nestjs/common';
import { Response } from 'express';
import { IntraGuard } from './intra.guard';
import { IntraUser } from 'src/types';
import { User } from '@prisma/client';
import { JwtRefreshTokenGuard } from './jwtrefresh.guard';
import { JwtAccessTokenGuard } from './jwtaccess.guard';

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
    // sign user using jwt
    const token = this.authService.signUser(user);
    console.log(token);
    return token;
    // redirect to frontend with token
    // res.redirect(301, `${process.env.FRONTEND_URL}/auth?token=${token}`);
  }

  @Post('refresh')
  @UseGuards(JwtRefreshTokenGuard)
  async refresh(@Req() req: any) {
    const token = this.authService.refreshUser(req.id, req.refreshToken);
    return token;
  }

  @Get('testaccess')
  @UseGuards(JwtAccessTokenGuard)
  async testaccess(@Req() req: Request & { user: User }) {
    return this.authService.testAccess(req.user.id);
  }
}

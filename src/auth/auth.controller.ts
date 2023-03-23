import { Controller, Post, Req, Res, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Get } from '@nestjs/common';
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
  async callback(@Req() req: Request & { user: IntraUser }) {
    const user = await this.authService.validateUser(req.user);
    const token = await this.authService.signUser(user);
    console.log(token);
  }

  @Post('refresh')
  @UseGuards(JwtRefreshTokenGuard)
  async refresh(@Req() req: any) {
    const token = this.authService.refreshUser(
      req.user.id,
      req.user.refreshToken,
    );
    return token;
  }

  @Get('testaccess')
  @UseGuards(JwtAccessTokenGuard)
  async testaccess(@Req() req: Request & { user: User }) {
    return this.authService.testAccess(req.user.id);
  }
}

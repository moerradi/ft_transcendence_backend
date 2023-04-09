import {
  Body,
  Controller,
  ForbiddenException,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { Get } from '@nestjs/common';
import { IntraGuard } from './guards/intra.guard';
import { IntraUser } from 'src/types';
import { User } from '@prisma/client';
import { JwtAccessTokenGuard } from './guards/jwtaccess.guard';
import { ConfigService } from '@nestjs/config';
import { JwtAccessTokenNo2FAGuard } from './guards/jwtAccessNo2FA.guard';
import { Response } from 'express';
import { userPayload } from './types/userPayload';
import twoFaDto from './dto/twoFa.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Get('login')
  @UseGuards(IntraGuard)
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  async login() {}

  @Get('callback')
  @UseGuards(IntraGuard)
  async callback(
    @Req() req: Request & { user: IntraUser },
    @Res() res: Response,
  ) {
    const user = await this.authService.validateUser(req.user);
    const tokens = await this.authService.signUser(
      user,
      user.two_factor_auth_enabled,
    );
    const frontEndUrl = this.configService.get('FRONTEND_URL');

    res.cookie('accessToken', tokens.accessToken);
    if (user.two_factor_auth_enabled) {
      res.cookie('2fa', 'true');
    }
    res.redirect(frontEndUrl);
  }

  @Post('enable2fa')
  @UseGuards(JwtAccessTokenGuard)
  async enable2fa(@Req() req: Request & { user: User }) {
    return await this.authService.enable2FA(req.user.id);
  }

  @Post('disable2fa')
  @UseGuards(JwtAccessTokenGuard)
  async disable2fa(@Req() req: Request & { user: User }) {
    return await this.authService.disable2FA(req.user.id);
  }

  @Post('verify2fa')
  @UseGuards(JwtAccessTokenNo2FAGuard)
  async verify2fa(
    @Req() req: Request & { user: userPayload },
    @Body() twoFaBody: twoFaDto,
  ) {
    const is2faValid = await this.authService.verify2FA(
      req.user.id,
      twoFaBody.code,
    );
    if (!is2faValid) {
      throw new ForbiddenException('Invalid 2FA code');
    }
    return await this.authService.signUser(req.user, false);
  }

  @Post('confirm2fa')
  @UseGuards(JwtAccessTokenGuard)
  async confirm2fa(
    @Req() req: Request & { user: userPayload },
    @Body('code') token: string,
  ) {
    if (token === 'undefined') throw new ForbiddenException('Invalid 2FA code');

    if (await this.authService.confirm2FA(req.user.id, token)) {
      return {
        success: true,
      };
    } else {
      throw new ForbiddenException('Invalid 2FA code');
    }
  }

  @Get('testaccess')
  @UseGuards(JwtAccessTokenGuard)
  async testaccess(@Req() req: Request & { user: userPayload }) {
    return await this.authService.testAccess(req.user.id);
  }
}

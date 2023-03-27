import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { IntraUser } from 'src/types';
import * as argon2 from 'argon2';
import * as speakeasy from 'speakeasy';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  private tempSecrets = new Map<number, string>();

  async validateUser(user: IntraUser) {
    const { login, first_name, last_name, id, image } = user;
    const existingUser = await this.prisma.user.findUnique({
      where: {
        intra_id: id,
      },
    });
    if (!existingUser) {
      const newUser = await this.prisma.user.create({
        data: {
          intra_id: id,
          login,
          first_name,
          last_name,
          avatar_url: image.versions.medium,
        },
      });
      return newUser;
    }
    return existingUser;
  }

  async createAccessToken(user: User, twofa: boolean) {
    const accessToken = this.jwtService.sign(
      {
        id: user.id,
        login: user.login,
        twofa,
      },
      {
        expiresIn: '15m',
        secret: this.configService.get('JWT_ACCESS_TOKEN_SECRET'),
      },
    );
    return accessToken;
  }

  async createRefreshToken(user: User) {
    const payload = {
      id: user.id,
      login: user.login,
    };
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: '7d',
      secret: this.configService.get('JWT_REFRESH_TOKEN_SECRET'),
    });
    const hashedRefreshToken = await this.hashData(refreshToken);
    await this.prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        refresh_token: hashedRefreshToken,
      },
    });
    return refreshToken;
  }

  async hashData(data: string) {
    return await argon2.hash(data);
  }

  async signUser(user: User, twofa: boolean) {
    const accessToken = await this.createAccessToken(user, twofa);
    if (twofa) {
      return {
        accessToken,
      };
    }
    const refreshToken = await this.createRefreshToken(user);
    return {
      accessToken,
      refreshToken,
    };
  }

  async refreshUser(userId: number, refreshToken: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
    });
    if (!user || !user.refresh_token)
      throw new ForbiddenException('Access Denied');
    const refreshTokenMatches = await argon2.verify(
      user.refresh_token,
      refreshToken,
    );
    if (refreshTokenMatches) {
      return this.createAccessToken(user, false);
    } else throw new ForbiddenException('Access Denied');
  }

  generate2FASecret() {
    const secret = speakeasy.generateSecret({
      name: '42',
      length: 20,
    });
    return {
      base32: secret.base32,
      otpauth: secret.otpauth_url,
    };
  }

  validate2FAToken(secret: string, token: string) {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
    });
  }

  generate2FArecoveryCodes() {
    const codes = [];
    for (let i = 0; i < 10; i++) {
      codes.push(speakeasy.generateSecret({ length: 20 }).base32);
    }
    return codes;
  }

  async enable2FA(userId: number) {
    const { base32, otpauth } = this.generate2FASecret();
    // add recovery codes generation later
    this.tempSecrets.set(userId, base32);
    return otpauth;
  }

  async confirm2FA(userId: number, code: string) {
    const tmpSecret = this.tempSecrets.get(userId);
    if (!tmpSecret) {
      throw new UnauthorizedException('2FA not enabled');
    }
    const isValid = this.validate2FAToken(tmpSecret, code);
    if (isValid) {
      await this.prisma.user.update({
        where: {
          id: userId,
        },
        data: {
          two_factor_auth_enabled: true,
          two_factor_auth_secret: tmpSecret,
        },
      });
      this.tempSecrets.delete(userId);
    } else throw new BadRequestException('Invalid token');
    return isValid;
  }

  async disable2FA(userId: number) {
    await this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        two_factor_auth_enabled: false,
        two_factor_auth_secret: null,
      },
    });
  }

  async verify2FA(userId: number, code: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
    });
    if (
      !user ||
      !user.two_factor_auth_enabled ||
      !user.two_factor_auth_secret
    ) {
      throw new BadRequestException('2FA is not enabled for this user.');
    }
    const isValid = this.validate2FAToken(user.two_factor_auth_secret, code);
    return isValid;
  }

  async logout(userId: number) {
    await this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        refresh_token: null,
      },
    });
  }

  async testAccess(userId: number) {
    return await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
    });
  }
}

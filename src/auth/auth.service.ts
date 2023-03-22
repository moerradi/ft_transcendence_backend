import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { IntraUser } from 'src/types';
import * as argon2 from 'argon2';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async validateUser(user: IntraUser) {
    const { login, first_name, last_name, id, image } = user;
    const existingUser = await this.prisma.user.findUnique({
      where: {
        intra_id: id,
      },
    });
    if (!existingUser) {
      console.log('existingUser');
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
    console.log('newUser');
    return existingUser;
  }

  createRefreshToken(user: User) {
    const payload = {
      id: user.id,
      login: user.login,
    };
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: '7d',
      secret: this.configService.get('JWT_REFRESH_TOKEN_SECRET'),
    });
    this.prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        refresh_token: refreshToken,
      },
    });
    return refreshToken;
  }

  hashData(data: string) {
    return argon2.hash(data);
  }

  signUser(user: User) {
    const payload = {
      id: user.id,
      login: user.login,
    };
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: '15s',
      secret: this.configService.get('JWT_ACCESS_TOKEN_SECRET'),
    });
    const refreshToken = this.createRefreshToken(user);
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
    if (user.refresh_token === refreshToken) {
      return this.signUser(user);
    }
  }

  testAccess(userId: number) {
    return this.prisma.user.findUnique({
      where: {
        id: userId,
      },
    });
  }
}

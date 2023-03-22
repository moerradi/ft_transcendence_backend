import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { IntraStrategy } from './intra.strategy';
import { PassportModule } from '@nestjs/passport';
import { HttpModule } from '@nestjs/axios';
import { JwtModule } from '@nestjs/jwt';
import { jwtAccessTokenStrategy } from './strategies/jwtaccess.strategy';
import { jwtRefreshTokenStrategy } from './strategies/jwtrefresh.strategy';

@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    IntraStrategy,
    jwtAccessTokenStrategy,
    jwtRefreshTokenStrategy,
  ],
  imports: [
    PrismaModule,
    PassportModule,
    HttpModule.registerAsync({
      useFactory: () => ({
        timeout: 5000,
        maxRedirects: 5,
      }),
    }),
    JwtModule.registerAsync({
      useFactory: () => ({}),
    }),
  ],
})
export class AuthModule {}

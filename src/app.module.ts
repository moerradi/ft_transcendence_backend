import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { ProfileModule } from './profile/profile.module';
import { GameModule } from './game/game.module';
import { FriendModule } from './friend/friend.module';
import { HomeModule } from './home/home.module';
import { ChannelModule } from './channel/channel.module';
import { MessageModule } from './message/message.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    PrismaModule,
    ProfileModule,
    GameModule,
    FriendModule,
    HomeModule,
    ChannelModule,
    MessageModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}

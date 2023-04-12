import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { FriendService } from './friend.service';
import { JwtAccessTokenGuard } from 'src/auth/guards/jwtaccess.guard';
import { userPayload } from 'src/auth/types/userPayload';
import { Request } from 'express';
import { isNumberString } from 'class-validator';

@Controller('friend')
export class FriendController {
  constructor(private readonly friendService: FriendService) {}

  @Get('/')
  @UseGuards(JwtAccessTokenGuard)
  async getFriends(@Req() req: Request & { user: userPayload }) {
    return await this.friendService.getFriends(req.user.login);
  }

  @Get('requests')
  @UseGuards(JwtAccessTokenGuard)
  async getFriendRequests(@Req() req: Request & { user: userPayload }) {
    return await this.friendService.getFriendRequests(req.user.login);
  }

  @Get('requests/sent')
  @UseGuards(JwtAccessTokenGuard)
  async getSentFriendRequests(@Req() req: Request & { user: userPayload }) {
    return await this.friendService.getSentFriendRequests(req.user.login);
  }

  @Post('add/:login')
  @UseGuards(JwtAccessTokenGuard)
  async addFriend(
    @Req() req: Request & { user: userPayload },
    @Param('login') login: string,
  ) {
    return await this.friendService.sendFriendRequest(req.user.login, login);
  }

  @Post('accept/:login')
  @UseGuards(JwtAccessTokenGuard)
  async acceptFriendRequest(
    @Req() req: Request & { user: userPayload },
    @Param('login') login: string,
  ) {
    return await this.friendService.acceptFriendRequest(req.user.id, login);
  }

  @Post('decline/:login')
  @UseGuards(JwtAccessTokenGuard)
  async declineFriendRequest(
    @Req() req: Request & { user: userPayload },
    @Param('login') login: string,
  ) {
    return await this.friendService.deleteFriendRequest(req.user.id, login);
  }

  @Post('unfirend/:login')
  @UseGuards(JwtAccessTokenGuard)
  async unfriend(
    @Req() req: Request & { user: userPayload },
    @Param('login') login: string,
  ) {
    return await this.friendService.unfriend(req.user.id, login);
  }

  @Post('block/:login')
  @UseGuards(JwtAccessTokenGuard)
  async block(
    @Req() req: Request & { user: userPayload },
    @Param('login') login: string,
  ) {
    return await this.friendService.blockFriend(req.user.id, login);
  }

  @Post('unblock/:login')
  @UseGuards(JwtAccessTokenGuard)
  async unblock(
    @Req() req: Request & { user: userPayload },
    @Param('login') login: string,
  ) {
    return await this.friendService.unblockFriend(req.user.id, login);
  }
}

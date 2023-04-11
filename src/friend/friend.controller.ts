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

  @Post('accept/:requesterId')
  @UseGuards(JwtAccessTokenGuard)
  async acceptFriendRequest(
    @Req() req: Request & { user: userPayload },
    @Param('requesterId') requesterId: string,
  ) {
    if (!isNumberString(requesterId)) {
      throw new BadRequestException('Invalid requesterId');
    }
    return await this.friendService.acceptFriendRequest(
      req.user.id,
      parseInt(requesterId),
    );
  }

  @Post('decline/:requesterId')
  @UseGuards(JwtAccessTokenGuard)
  async declineFriendRequest(
    @Req() req: Request & { user: userPayload },
    @Param('requesterId') requesterId: string,
  ) {
    if (!isNumberString(requesterId)) {
      throw new BadRequestException('Invalid requesterId');
    }
    return await this.friendService.deleteFriendRequest(
      req.user.id,
      parseInt(requesterId),
    );
  }

  @Post('unfirend/:friendId')
  @UseGuards(JwtAccessTokenGuard)
  async unfriend(
    @Req() req: Request & { user: userPayload },
    @Param('friendId') friendId: string,
  ) {
    if (!isNumberString(friendId)) {
      throw new BadRequestException('Invalid friendId');
    }
    return await this.friendService.unfriend(req.user.id, parseInt(friendId));
  }

  @Post('block/:friendId')
  @UseGuards(JwtAccessTokenGuard)
  async block(
    @Req() req: Request & { user: userPayload },
    @Param('friendId') friendId: string,
  ) {
    if (!isNumberString(friendId)) {
      throw new BadRequestException('Invalid friendId');
    }
    return await this.friendService.blockFriend(
      req.user.id,
      parseInt(friendId),
    );
  }
}

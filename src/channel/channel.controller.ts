import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ChannelService } from './channel.service';
import { CreateChannelDto, UpdateChannelDto } from './dto/channel.dto';
import { JwtAccessTokenGuard } from 'src/auth/guards/jwtaccess.guard';

@Controller('channels')
export class ChannelController {
  constructor(private readonly channelService: ChannelService) {}

  @Get('')
  @UseGuards(JwtAccessTokenGuard)
  async all(@Req() req) {
    return this.channelService.getAllChannels(req.user.id);
  }

  @Post()
  @UseGuards(JwtAccessTokenGuard)
  async createChannel(@Req() req, @Body() data: CreateChannelDto) {
    return this.channelService.createChannel(data, req.user.id);
  }

  @Get(':id')
  @UseGuards(JwtAccessTokenGuard)
  async getChannel(@Param('id', ParseIntPipe) id: number) {
    return this.channelService.getChannel(id);
  }

  @Get(':id/messages')
  @UseGuards(JwtAccessTokenGuard)
  async messages(@Param('id', ParseIntPipe) id: number) {
    return this.channelService.getChannelMessages(id);
  }

  @Get(':id/members')
  @UseGuards(JwtAccessTokenGuard)
  async members(@Param('id', ParseIntPipe) id: number) {
    return this.channelService.getChannelMembers(id);
  }

  @Get(':id/nonmembers')
  @UseGuards(JwtAccessTokenGuard)
  async nonMembers(@Param('id', ParseIntPipe) id: number) {
    return this.channelService.getNonMembers(id);
  }

  @Post(':id/members')
  @UseGuards(JwtAccessTokenGuard)
  async addMembers(
    @Param('id', ParseIntPipe) id: number,
    @Req() req,
    @Body() data: { members: number[] },
  ) {
    if (!(await this.channelService.isOwner(req.user.id, id)))
      throw new BadRequestException('You are not the owner of this channel');
    return this.channelService.addMembersToChannel(id, data.members);
  }

  @Delete(':id/members/:memberId')
  @UseGuards(JwtAccessTokenGuard)
  async removeMember(
    @Param('id', ParseIntPipe) id: number,
    @Param('memberId', ParseIntPipe) memberId: number,
    @Req() req,
  ) {
    if (!(await this.channelService.isOwner(req.user.id, id)))
      throw new BadRequestException('You are not the owner of this channel');
    return this.channelService.removeMemberFromChannel(id, memberId);
  }

  @Post(':id/join')
  @UseGuards(JwtAccessTokenGuard)
  async joinChannel(@Param('id', ParseIntPipe) id: number, @Req() req) {
    if (await this.channelService.isBanned(req.user.id, id))
      throw new BadRequestException('You are banned from this channel');
    if (await this.channelService.isMember(req.user.id, id))
      throw new BadRequestException('You are already a member of this channel');
    return this.channelService.addMembersToChannel(id, [req.user.id]);
  }

  @Post(':id/leave')
  @UseGuards(JwtAccessTokenGuard)
  async leaveChannel(@Param('id', ParseIntPipe) id: number, @Req() req) {
    if (await this.channelService.isBanned(req.user.id, id))
      throw new BadRequestException('You are banned from this channel');
    if (!(await this.channelService.isMember(req.user.id, id)))
      throw new BadRequestException('You are not a member of this channel');
    if (await this.channelService.isOwner(req.user.id, id))
      throw new BadRequestException('You are the owner of this channel');
    return this.channelService.removeMemberFromChannel(id, req.user.id);
  }

  @Put(':id')
  @UseGuards(JwtAccessTokenGuard)
  async updateChannel(
    @Param('id', ParseIntPipe) id: number,
    @Req() req,
    @Body() data: UpdateChannelDto,
  ) {
    if (!(await this.channelService.isOwner(req.user.id, id)))
      throw new BadRequestException('You are not the owner of this channel');
    return this.channelService.updateChannel(id, data, req.user.id);
  }

  @Delete(':id')
  @UseGuards(JwtAccessTokenGuard)
  async deleteChannel(@Param('id', ParseIntPipe) id: number, @Req() req) {
    if (!(await this.channelService.isOwner(req.user.id, id)))
      throw new BadRequestException('You are not the owner of this channel');
    return this.channelService.deleteChannel(id, req.user.id);
  }
}

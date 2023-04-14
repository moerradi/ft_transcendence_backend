import { BadRequestException, Injectable } from '@nestjs/common';
import { ChannelType, ChannelUserStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import * as argon2 from 'argon2';
import { CreateChannelDto, UpdateChannelDto } from './dto/channel.dto';

@Injectable()
export class ChannelService {
  constructor(private prisma: PrismaService) {}

  async getAllChannels(userId: number) {
    const userChannels = await this.prisma.channel_user.findMany({
      where: {
        user_id: userId,
      },
      select: {
        channel: {
          select: {
            id: true,
            name: true,
            icon_url: true,
            type: true,
            owner_id: true,
            messages: {
              select: {
                sent_at: true,
              },
            },
          },
        },
        status: true,
      },
    });
    const channelsWithAdminOwnerInfo = userChannels.map(
      ({ channel, status }) => {
        const latestMessageSentAt = channel.messages.reduce(
          (latest, message) => {
            return latest > message.sent_at ? latest : message.sent_at;
          },
          new Date(0),
        );

        return {
          ...channel,
          isAdmin: status === 'ADMIN',
          isOwner: channel.owner_id === userId,
          latestMessageSentAt: latestMessageSentAt,
        };
      },
    );
    const sortedChannels = channelsWithAdminOwnerInfo.sort(
      (a, b) =>
        b.latestMessageSentAt.getTime() - a.latestMessageSentAt.getTime(),
    );
    return sortedChannels.map((channel) => {
      delete channel.messages;
      return channel;
    });
  }

  async getChannelMeInfo(channelId: number, userId: number) {
    const user = await this.prisma.channel_user.findFirst({
      where: {
        channel_id: channelId,
        user_id: userId,
      },
      select: {
        status: true,
      },
    });
    if (!user) {
      throw new BadRequestException('User is not a member of this channel');
    }
    const channels = await this.prisma.channel.findUnique({
      where: {
        id: channelId,
      },
    });
    if (!channels) {
      throw new BadRequestException('Channel does not exist');
    }
    return {
      isAdmin: user.status === 'ADMIN',
      isOwner: channels.owner_id === userId,
    };
  }

  async searchChannels(userId: number, query: string) {
    const channels = await this.prisma.channel.findMany({
      where: {
        OR: [
          {
            type: 'PUBLIC',
            name: {
              contains: query,
              mode: 'insensitive',
            },
          },
          {
            users: {
              some: {
                user_id: userId,
                status: 'MEMBER',
              },
            },
            name: {
              contains: query,
              mode: 'insensitive',
            },
          },
        ],
      },
      include: {
        users: {
          select: {
            user_id: true,
            status: true,
          },
        },
      },
    });
    // inject wether user is admin or owner
    return channels.map((channel) => ({
      id: channel.id,
      name: channel.name,
      icon_url: channel.icon_url,
      type: channel.type,
      owner_id: channel.owner_id,
      isAdmin: channel.users.some(
        (user) => user.user_id === userId && user.status === 'ADMIN',
      ),
      isOwner: channel.users.some(
        (user) => user.user_id === userId && user.status === 'OWNER',
      ),
    }));
  }

  async getChannelMessages(channelId: number) {
    return await this.prisma.channel_message.findMany({
      where: {
        channel_id: channelId,
      },
      include: {
        author: {
          select: {
            login: true,
            id: true,
            avatar_url: true,
          },
        },
      },
      orderBy: {
        sent_at: 'asc',
      },
    });
  }

  async hashPassword(password: string) {
    return await argon2.hash(password);
  }

  async addMemberToChannel(channelId: number, userId: number) {
    return await this.prisma.channel_user.create({
      data: {
        user_id: userId,
        channel_id: channelId,
        status: 'OWNER',
      },
    });
  }

  async addMembersToChannel(channelId: number, userIds: number[]) {
    return await this.prisma.channel_user.createMany({
      data: userIds.map((userId) => ({
        user_id: userId,
        channel_id: channelId,
        status: 'MEMBER',
      })),
    });
  }

  async createChannel(data: CreateChannelDto, userId: number) {
    const { name, type, password, icon_url, users } = data;

    if (
      type === ChannelType.PROTECTED &&
      (password === undefined || password === '')
    ) {
      throw new BadRequestException(
        'Password is required for protected channels',
      );
    }

    const newPassword =
      type === ChannelType.PROTECTED ? await this.hashPassword(password) : '';

    // Create the channel
    const channel = await this.prisma.channel.create({
      data: {
        name: name,
        type: type,
        password: newPassword,
        icon_url: icon_url,
        owner: {
          connect: {
            id: userId,
          },
        },
      },

      select: {
        id: true,
        name: true,
        type: true,
        icon_url: true,
        owner_id: true,
      },
    });

    // Add the owner to the channel
    await this.addMemberToChannel(channel.id, userId);

    // Add the users to the channel
    if (users) {
      // maybe add a check if the user is friends with the owner
      await this.addMembersToChannel(channel.id, users);
    }
    return channel;
  }

  async updateChannel(
    channelId: number,
    data: UpdateChannelDto,
    userId: number,
  ) {
    const { name, password, icon_url } = data;
    const channel = await this.prisma.channel.findUnique({
      where: {
        id: channelId,
      },
    });
    if (!channel) {
      throw new BadRequestException('Channel not found');
    }
    if (channel.owner_id !== userId) {
      throw new BadRequestException('You are not the owner of this channel');
    }
    if (
      channel.type === ChannelType.PROTECTED &&
      (password === '' || password === undefined)
    ) {
      throw new BadRequestException(
        'Password is required for protected channels',
      );
    }
    const newPassword =
      channel.type === ChannelType.PROTECTED
        ? await this.hashPassword(password)
        : '';
    return await this.prisma.channel.update({
      where: {
        id: channelId,
      },
      data: {
        name: name,
        password: newPassword,
        icon_url: icon_url,
      },
      select: {
        id: true,
        name: true,
        type: true,
        icon_url: true,
        owner_id: true,
      },
    });
  }

  async deleteChannel(channelId: number, userId: number) {
    const channel = await this.prisma.channel.findUnique({
      where: {
        id: channelId,
      },
    });
    if (!channel) {
      throw new BadRequestException('Channel not found');
    }
    if (channel.owner_id !== userId) {
      throw new BadRequestException('You are not the owner of this channel');
    }
    // delete messages and memberships first
    await this.prisma.channel_message.deleteMany({
      where: {
        channel_id: channelId,
      },
    });
    await this.prisma.channel_user.deleteMany({
      where: {
        channel_id: channelId,
      },
    });
    await this.prisma.channel.delete({
      where: {
        id: channelId,
      },
    });
    return { message: 'Channel deleted', success: true };
  }

  async getChannelMembers(channelId: number) {
    const channel = await this.prisma.channel_user.findMany({
      where: {
        channel_id: channelId,
      },
      select: {
        status: true,
        user: {
          select: {
            id: true,
            login: true,
            avatar_url: true,
            created_at: true,
          },
        },
      },
    });
    return channel;
  }

  getNonMembers(channelId: number) {
    return this.prisma.user.findMany({
      where: {
        NOT: {
          channel_memberships: {
            some: {
              channel_id: channelId,
            },
          },
        },
      },
      select: {
        id: true,
        login: true,
        avatar_url: true,
        created_at: true,
      },
    });
  }

  async removeMemberFromChannel(channelId: number, memberId: number) {
    const channel = await this.prisma.channel.findUnique({
      where: {
        id: channelId,
      },
    });
    if (!channel) {
      throw new BadRequestException('Channel not found');
    }
    try {
      await this.prisma.channel_user.delete({
        where: {
          cid: {
            channel_id: channelId,
            user_id: memberId,
          },
        },
      });

      return { message: 'Member removed', success: true };
    } catch (e) {
      throw new BadRequestException('Member not found');
    }
  }

  async getChannel(channelId: number) {
    const channel = await this.prisma.channel.findUnique({
      where: {
        id: channelId,
      },
      select: {
        id: true,
        name: true,
        type: true,
        icon_url: true,
        owner_id: true,
      },
    });
    return channel;
  }

  async getMyChannels(userId: number) {
    const channels = await this.prisma.channel.findMany({
      where: {
        owner_id: userId,
      },
      select: {
        id: true,
        name: true,
        type: true,
        icon_url: true,
        owner_id: true,
      },
    });
    return channels;
  }

  async getChannels(userId: number) {
    const channels = await this.prisma.channel_user.findMany({
      where: {
        user_id: userId,
      },
      select: {
        channel: {
          select: {
            id: true,
            name: true,
            type: true,
            icon_url: true,
            owner_id: true,
          },
        },
      },
    });
    return channels.map((c) => c.channel);
  }

  async isOwner(userId: number, channelId: number) {
    const channel = await this.prisma.channel.findUnique({
      where: {
        id: channelId,
      },
    });
    if (!channel) {
      throw new BadRequestException('Channel not found');
    }
    return channel.owner_id === userId;
  }

  async isAdmin(userId: number, channelId: number) {
    const channeluser = await this.prisma.channel_user.findUnique({
      where: {
        cid: {
          channel_id: channelId,
          user_id: userId,
        },
      },
    });
    if (!channeluser) {
      throw new BadRequestException('User not found');
    }
    return channeluser.status === ChannelUserStatus.ADMIN;
  }

  async isBanned(userId: number, channelId: number) {
    const channeluser = await this.prisma.channel_user.findUnique({
      where: {
        cid: {
          channel_id: channelId,
          user_id: userId,
        },
      },
    });
    if (!channeluser) {
      throw new BadRequestException('User not found');
    }
    return channeluser.status === ChannelUserStatus.BANNED;
  }

  async isMember(userId: number, channelId: number) {
    const channeluser = await this.prisma.channel_user.findUnique({
      where: {
        cid: {
          channel_id: channelId,
          user_id: userId,
        },
      },
    });
    if (!channeluser) {
      throw new BadRequestException('User not found');
    }
    return (
      channeluser.status === ChannelUserStatus.MEMBER ||
      channeluser.status === ChannelUserStatus.ADMIN ||
      channeluser.status === ChannelUserStatus.OWNER
    );
  }
}
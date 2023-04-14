import {
  SubscribeMessage,
  WebSocketGateway,
  OnGatewayInit,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Socket, Server } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { userPayload } from 'src/auth/types/userPayload';
import { Channel, User } from '@prisma/client';

interface mutedUntil {
  mutedUntil: number;
  mutedBy: number;
  userId: number;
}

@Injectable()
@WebSocketGateway({ namespace: '/chat', cors: true })
export class ChannelGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  constructor(
    private prismaservice: PrismaService,
    private configService: ConfigService,
  ) {
    console.log('ChatGateway');
  }

  public mutedUsers = new Map<number, mutedUntil[]>();

  @WebSocketServer() server: Server;

  afterInit() {
    Logger.log('Initialized!');
  }
  async handleConnection(client: Socket & { userData: Partial<User> }) {
    try {
      if (!client.handshake.auth.token) {
        client.disconnect();
        return;
      }

      const { login, id, twofa } = jwt.verify(
        client.handshake.auth.token,
        this.configService.get('JWT_ACCESS_TOKEN_SECRET'),
      ) as userPayload;
      if (twofa) {
        client.disconnect();
        return;
      }
      const userData = await this.prismaservice.user.findUnique({
        where: { id },
        select: {
          id: true,
          login: true,
          avatar_url: true,
        },
      });
      if (!userData) {
        client.disconnect();
        return;
      }
      client.userData = userData;
    } catch (ex) {
      console.error(ex);
      client.disconnect();
      return;
    }
    console.log(`Client connected to chat: ${client.userData.id}`);
  }

  handleDisconnect(client: Socket & { userData: Partial<User> }) {
    // console.log(`Client disconnected from chat: ${client.userData.id}`);
  }

  @SubscribeMessage('message')
  async handleMessage(
    client: Socket & {
      userData: Partial<User>;
      currentChannel: Partial<Channel>;
    },
    payload: any,
  ) {
    const muted = this.mutedUsers.get(client.userData.id);
    if (muted) {
      const mutedUntil = muted.find(
        (muted) => muted.userId === client.userData.id,
      );
      if (mutedUntil) {
        if (mutedUntil.mutedUntil > Date.now()) {
          return;
        } else {
          muted.splice(muted.indexOf(mutedUntil), 1);
        }
      }
    }
    // GET USER BY ID
    // @TODO: verify that user can send message to channel
    if (payload.message == '') {
      return;
    }
    await this.prismaservice.channel_message.create({
      data: {
        channel_id: payload.id,
        author_id: client.userData.id,
        content: payload.message,
      },
    });
    this.server.to(payload.id).emit('message', {
      channel_id: payload.id,
      author_id: client.userData.id,
      content: payload.message,
      sent_at: new Date(),
      author: {
        login: client.userData.login,
        avatar_url: client.userData.avatar_url,
      },
    });
  }

  @SubscribeMessage('join')
  async handleJoin(
    client: Socket & {
      userData: Partial<User>;
      currentChannel: Partial<Channel>;
    },
    payload: any,
  ) {
    client.currentChannel = await this.prismaservice.channel.findUnique({
      where: { id: payload },
      select: {
        id: true,
        name: true,
        type: true,
      },
    });
    // check if user is in channel
    const userInChannel = await this.prismaservice.channel_user.findFirst({
      where: {
        channel_id: payload,
        user_id: client.userData.id,
      },
    });
    if (!userInChannel && client.currentChannel.type == 'PUBLIC') {
      await this.prismaservice.channel_user.create({
        data: {
          channel_id: payload,
          user_id: client.userData.id,
          status: 'MEMBER',
        },
      });
    }

    client.join(payload);
  }

  @SubscribeMessage('leave')
  handleLeave(client: Socket, payload: any) {
    client.leave(payload);
  }
}

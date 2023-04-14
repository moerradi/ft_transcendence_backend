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

  @WebSocketServer() server: Server;

  afterInit() {
    Logger.log('Initialized!');
  }

  handleConnection(
    client: Socket & { userData: { id: number; login: string } },
  ) {
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
      client.userData = { login, id };
    } catch (ex) {
      console.error(ex);
      client.disconnect();
      return;
    }
    console.log(`Client connected to chat: ${client.userData.id}`);
  }

  handleDisconnect(client: Socket & { userData: { id: number } }) {
    console.log(`Client disconnected from chat: ${client.userData.id}`);
  }

  @SubscribeMessage('message')
  async handleMessage(
    client: Socket & { userData: { id: number } },
    payload: any,
  ) {
    // @TODO: verify that user can send message to channel
    await this.prismaservice.channel_message.create({
      data: {
        channel_id: payload.id,
        author_id: client.userData.id,
        unsent: false,
        content: payload.message,
      },
    });
    this.server.to(payload.id).emit('message', payload);
  }

  @SubscribeMessage('join')
  handleJoin(client: Socket, payload: any) {
    client.join(payload);
  }

  @SubscribeMessage('leave')
  handleLeave(client: Socket, payload: any) {
    client.leave(payload);
  }
}

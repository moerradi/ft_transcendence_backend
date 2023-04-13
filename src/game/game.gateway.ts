import { UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  SubscribeMessage,
  WebSocketGateway,
  OnGatewayInit,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Socket, Server } from 'socket.io';
import { game } from './game';
import { GameService } from './game.service';
import { waitingPlayer } from './interfaces';
import * as jwt from 'jsonwebtoken';
import { PrismaService } from 'src/prisma/prisma.service';
import { GameMode } from '@prisma/client';
import { userPayload } from '../auth/types/userPayload';
import { v4 as uuidv4 } from 'uuid';

type status = 'Online' | 'InGame';

@WebSocketGateway({ cors: true })
export class GameGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  constructor(
    private gameService: GameService,
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    console.log('GameGateway constructor');
  }

  public games: game[] = [];
  public CustonGames = new Map<
    string,
    { player1: waitingPlayer; player2: waitingPlayer }
  >();
  public playersStatus: { playerId: number; status: status }[] = [];
  public sockets = new Map<number, string>();
  public waitingPlayers: waitingPlayer[] = [];
  public debug_stop = true;
  public spectators: { [gameId: string]: Socket[] } = {};
  handleConnection(
    client: Socket & { userData: { id: string; login: string } },
    ...args: any[]
  ) {
    try {
      if (!client.handshake.auth.token) {
        client.disconnect();
        return;
      }
      // check if already present in sockets
      // if yes, add the socket to the array of sockets in the map with key userdata.id
      // else add the socket to the map with key userdata.id and value as an array of sockets

      const { login, id, twofa } = jwt.verify(
        client.handshake.auth.token,
        this.configService.get('JWT_ACCESS_TOKEN_SECRET'),
      ) as userPayload;
      if (twofa) {
        client.disconnect();
        return;
      }
      //   console.log('payload', payload);
      client.userData = { login, id: id.toString() };
      const el = this.sockets.set(id, client.id);
      //   this.sockets.set(client.userData.id, parseInt(id));
    } catch (ex) {
      console.error(ex);
      client.disconnect();
      return;
    }
    console.log(`Client connected: ${client.userData.id}`);
  }

  handleConnectionError(
    client: Socket & { userData: { id: string } },
    ...args: any[]
  ) {
    console.log(`Client connection error: ${client.userData.id}`);
  }

  handleDisconnect(client: Socket & { userData: { id: string } }) {
    // remove the socket from the map
    const el = this.sockets.delete(parseInt(client.userData.id));
    console.log(`Client disconnected: ${client.userData.id}`);
  }

  afterInit(server: Server) {
    console.log('WebSocket initialized');
  }

  getGameIdByPlayerId(playerId: string): string | null {
    for (const game of this.games) {
      if (game._player1.id === playerId || game._player2.id === playerId) {
        return game._id.toString();
      }
    }
    return null;
  }

  getGameIndexByGameId(gameId: string): string | null {
    for (const idx in this.games) {
      if (this.games[idx]._id === gameId) {
        return idx;
      }
    }
    return null;
  }

  @SubscribeMessage('paddleMove')
  handlePaddleMove(
    client: Socket & { userData: { id: string; login: string } },
    payload: { player: string; position: number },
  ): void {
    if (client.userData.id !== "1") console.log('paddleMove', payload);
    const gameId = this.getGameIdByPlayerId(client.userData.id);
    if (gameId) {
      this.server.to(gameId).emit('paddleMove', payload);
    }
  }

  @SubscribeMessage('ballMove')
  handleBallMove(
    client: Socket & { userData: { id: string; login: string } },
    payload: { x: number; y: number },
  ): void {
    const gameId = this.getGameIdByPlayerId(client.userData.id);
    if (gameId) {
      this.server.to(gameId).emit('ballMove', payload);
    }
  }

  @SubscribeMessage('startGame')
  handleStartGame(client: Socket, payload: { gameId: string }): void {
    //print the game id
    // this.games[0].startGame();
  }

  @SubscribeMessage('movePlayer')
  handleMovePlayer(
    client: Socket & { userData: { id: string; login: string } },
    payload: { playerY: number },
  ): void {
    this.games[0].movePlayer(payload.playerY, client.userData.id);
  }

  @SubscribeMessage('join_queue')
  handleJoinQueue(
    client: Socket & { userData: { id: string; login: string } },
    payload: { player: string; gameMode: string },
  ): void {
    // check if the player is already in the queue
    if (this.gameService.isPlayerInQueue(client.userData.id)) {
      return;
    }
    this.gameService.joinQueue(client.userData.id, client, payload.gameMode);
    console.log('client id: ' + client.userData.id);
    const matchedPlayers = this.gameService.matchPlayersByGameMode(
      payload.gameMode,
    );

    if (matchedPlayers) {
      const [player1, player2] = matchedPlayers;
      const new_game = new game(player1.id, player2.id, this);
      new_game._gameMode = payload.gameMode as GameMode;
      player1.client.join(new_game._id.toString());
      player2.client.join(new_game._id.toString());

      this.games.push(new_game);
      this.games[0].startGame();
      this.gameService.removePlayersFromQueue([player1, player2]);

      player1.client.emit('gameReady');
      player2.client.emit('gameReady');
    }
  }

  @SubscribeMessage('leave_queue')
  handleLeaveQueue(
    client: Socket & { userData: { id: string; login: string } },
    payload: { player: string },
  ): void {
    this.gameService.leaveQueue(client.userData.id);
  }

  async handleGameOver(gameId: string) {
    const game: game = this.games[this.getGameIndexByGameId(gameId)];
    this.games = this.games.filter((game) => game._id.toString() !== gameId);
    // // console.log(game._gameMode);
    // // calculate exp based on who winned also update level based on factor required exp to level up grows by 10% every level
    // const winner =
    //   game._player1.score > game._player2.score ? game._player1 : game._player2;
    // const loser =
    //   game._player1.score > game._player2.score ? game._player2 : game._player1;
    // const winnerExp = 100 + loser.score * 10;
    // const loserExp = 50 + winner.score * 10;
    // const { level: winnerLevel } = await this.prisma.user.findUnique({
    //   where: {
    //     id: parseInt(winner.id),
    //   },
    //   select: {
    //     level: true,
    //   },
    // });
    // const { level: loserLevel } = await this.prisma.user.findUnique({
    //   where: {
    //     id: parseInt(loser.id),
    //   },
    //   select: {
    //     level: true,
    //   },
    // });
    // await this.prisma.$transaction([
    //     this.prisma.user.update({
    //         where: {
    //             id: parseInt(winner.id),

    await this.prisma.match.create({
      data: {
        player_one_id: parseInt(game._player1.id),
        player_two_id: parseInt(game._player2.id),
        player_one_score: game._player1.score,
        player_two_score: game._player2.score,
        // player_one_exp: winnerExp,
        // player_two_exp: loserExp,
        finished_at: new Date(),
        game_mode: game._gameMode,
        started_at: new Date(),
        status: 'FINISHED',
      },
    });
  }

  @SubscribeMessage('invite')
  async handleInvite(
    client: Socket & { userData: { id: string; login: string } },
    payload: { userId: string },
  ): Promise<void> {
    console.log('invite from gateway');
    console.log(payload);
    console.log(client.userData);
    const { id } = client.userData;
    // get player by login
    const socketId = this.sockets.get(parseInt(payload.userId));
    if (socketId) {
      // this.server.to(socketId).emit('invite', { id, login: client.userData.login });
      const uid = uuidv4();
      this.CustonGames.set(uid, {
        player1: { id, client, gameMode: 'Frisky' },
        player2: {
          id: payload.userId,
          client: this.server.sockets.sockets.get(socketId),
          gameMode: 'Frisky',
        },
      });
      this.server
        .to(socketId)
        .emit('invited', { uid, login: client.userData.login });
    }
  }

  @SubscribeMessage('accept_invite')
  async handleAcceptInvite(
    client: Socket & { userData: { id: string; login: string } },
    payload: { uid: string },
  ): Promise<void> {
    // starting custom game
    console.log('accept_invite from gateway');
    const { player1 } = this.CustonGames.get(payload.uid);
    // console.log(player2);
    // if (client != player1.client) return;
    const new_game = new game(player1.id, client.userData.id, this);
    new_game._gameMode = player1.gameMode as GameMode;
    player1.client.join(new_game._id.toString());
    client.join(new_game._id.toString());

    this.games.push(new_game);
    new_game.startGame();
    // this.gameService.removePlayersFromQueue([player1, player2]);

    player1.client.emit('gameReady');
    client.emit('gameReady');
  }
}

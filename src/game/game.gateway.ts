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
  public sockets = new Map<string, number>();
  public waitingPlayers: waitingPlayer[] = [];
  public debug_stop = true;
  public spectators: { [gameId: string]: Socket[] } = {};
  handleConnection(client: Socket, ...args: any[]) {
    try {
      const { id } = jwt.verify(
        client.handshake.auth.token,
        this.configService.get('JWT_ACCESS_TOKEN_SECRET'),
      ) as { id: string };
      this.sockets.set(client.id, parseInt(id));
    } catch (ex) {
      console.error(ex);
      client.disconnect();
    }
    console.log(`Client connected: ${client.id}`);
  }

  handleConnectionError(client: Socket, ...args: any[]) {
    console.log(`Client connection error: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.sockets.delete(client.id);
    console.log(`Client disconnected: ${client.id}`);
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
    client: Socket,
    payload: { player: string; position: number },
  ): void {
    const gameId = this.getGameIdByPlayerId(client.id);
    if (gameId) {
      this.server.to(gameId).emit('paddleMove', payload);
    }
  }

  @SubscribeMessage('ballMove')
  handleBallMove(client: Socket, payload: { x: number; y: number }): void {
    const gameId = this.getGameIdByPlayerId(client.id);
    if (gameId) {
      this.server.to(gameId).emit('ballMove', payload);
    }
  }

  @SubscribeMessage('startGame')
  handleStartGame(client: Socket, payload: { gameId: string }): void {
    console.log('startGame from gateway');
    //print the game id

    // this.games[0].startGame();
  }

  @SubscribeMessage('movePlayer')
  handleMovePlayer(client: Socket, payload: { playerY: number }): void {
    console.log('movePlayer from gateway');
    this.games[0].movePlayer(payload.playerY, client.id);
  }

  @SubscribeMessage('join_queue')
  handleJoinQueue(
    client: Socket,
    payload: { player: string; gameMode: string },
  ): void {
    this.gameService.joinQueue(client.id, client, payload.gameMode);

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
  handleLeaveQueue(client: Socket, payload: { player: string }): void {
    this.gameService.leaveQueue(client.id);
  }

  async handleGameOver(gameId: string) {
    console.log('gameOver from gateway');
    const game: game = this.games[this.getGameIndexByGameId(gameId)];
    this.games = this.games.filter((game) => game._id.toString() !== gameId);
    console.log(game._gameMode);
    await this.prisma.match.create({
      data: {
        player_one_id: this.sockets.get(game._player1.id),
        player_two_id: this.sockets.get(game._player2.id),
        player_one_score: game._player1.score,
        player_two_score: game._player2.score,
        finished_at: new Date(),
        game_mode: game._gameMode,
        started_at: new Date(),
        status: 'FINISHED',
      },
    });
  }
}

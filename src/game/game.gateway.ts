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

@WebSocketGateway({ cors: true })
export class GameGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  constructor(private gameService: GameService) {
    console.log('GameGateway constructor');
  }

  public games: game[] = [];
  public waitingPlayers: waitingPlayer[] = [];
  public debug_stop = true;
  public spectators: { [gameId: string]: Socket[] } = {};
  handleConnection(client: Socket, ...args: any[]) {
    console.log(`Client connected: ${client.id}`);
  }

  handleConnectionError(client: Socket, ...args: any[]) {
    console.log(`Client connection error: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
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

    // print game mode
    console.log(payload.gameMode);
    console.log('join_queue from gateway');
    console.table('QUEUE:\n' + this.gameService.getQueue());

    const matchedPlayers = this.gameService.matchPlayersByGameMode(
      payload.gameMode,
    );

    if (matchedPlayers) {
      const [player1, player2] = matchedPlayers;
      const new_game = new game(player1.id, player2.id, this);
      player1.client.join(new_game._id.toString());
      player2.client.join(new_game._id.toString());

      this.games.push(new_game);
      this.games[0].startGame();
      this.gameService.removePlayersFromQueue([player1, player2]);
    }
  }

  @SubscribeMessage('leave_queue')
  handleLeaveQueue(client: Socket, payload: { player: string }): void {
    this.gameService.leaveQueue(client.id);
    // console.log('leave_queue from gateway');

    console.table('Leave:\n' + this.gameService.getQueue());
  }

  handleGameOver(id: string): void {
    console.log('gameOver from gateway');
    const gameId = this.getGameIdByPlayerId(id);

    this.games = this.games.filter((game) => game._id.toString() !== gameId);
  }
}

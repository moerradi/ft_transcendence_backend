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
import * as jwt from 'jsonwebtoken';
import { userPayload } from '../auth/types/userPayload';
import { GameMode } from '@prisma/client';

type status = 'Online' | 'InGame';

interface Player {
  id: number;
  mode: string;
}
interface UserData {
  id: number;
  login: string;
}

@WebSocketGateway({ cors: true })
export class GameGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  constructor(
    private gameService: GameService,
    private configService: ConfigService,
  ) {
    console.log('GameGateway constructor');
  }

  //   public games: game[] = [];
  public games = new Map<string, game>();
//   public waitingPlayers: Player[] = [];
 public waitingPlayers = new Map<string, number[]>();
 
public connectedUsers = new Map<number, string>();

  handleConnection(client: Socket & { userData: UserData }, ...args: any[]) {
    try {
      const token = client.handshake.auth.token;
      if (!client.handshake.auth.token) {
        client.disconnect();
        return;
      }
      const decoded = jwt.verify(
        token,
        this.configService.get('JWT_ACCESS_TOKEN_SECRET'),
      ) as userPayload;
      client.userData = {
        id: decoded.id,
        login: decoded.login,
      };
      const existingUser = this.connectedUsers.get(client.userData.id);
      if (existingUser) {
        client.disconnect();
        return;
      }
      this.connectedUsers.set(client.userData.id, client.id);
    } catch (err) {
      console.log(err);
      client.disconnect();
      return;
    }
  }

  handleConnectionError(
    client: Socket & { userData: { id: string } },
    ...args: any[]
  ) {
    console.log('Connection error');
  }

  handleDisconnect(client: Socket & { userData: UserData }) {
    console.log('disconnected', client.userData.id);
    this.connectedUsers.delete(client.userData.id);
    const playerIndex = this.waitingPlayers.forEach((mode) => {
	  const playerIndex = mode.findIndex(
		(player) => player === client.userData.id,
	  );
	  if (playerIndex !== -1) {
		mode.splice(playerIndex, 1);
	  }
	});
    // check if in game and stop it
    const game = this.games.forEach((game) => {
      if (
        game._player1.id === client.userData.id.toString() ||
        game._player2.id === client.userData.id.toString()
      ) {
        console.log('game found', game._id);
        game.gameOver(true);
      }
    });
  }

  afterInit(server: Server) {
    console.log('WebSocket initialized');
  }

  @SubscribeMessage('movePlayer')
  handleMovePlayer(
    client: Socket & { userData: UserData },
    payload: { playerY: number; gameId: string },
  ): void {
    const game = this.games.get(payload.gameId);
    if (!game) {
      // console.log('game not found wtf', payload.gameId)
      return;
    }
    game.movePlayer(payload.playerY, client.userData.id.toString());
  }

  @SubscribeMessage('join_queue')
  handleJoinQueue(
    client: Socket & { userData: UserData },
    payload: { gameMode: string },
  ): void {
	const queue = this.waitingPlayers.get(payload.gameMode);
	if (!queue) {
	  this.waitingPlayers.set(payload.gameMode, [client.userData.id]);
	  return;
	}
	const existingPlayer = queue.find(id => id === client.userData.id);
	if (existingPlayer) {
      console.log('existingPlayer', existingPlayer);
      return;
    }
	queue.push(client.userData.id);
	if (queue.length >= 2) {
		const player1 = queue.pop();
		const player2 = queue.pop();
		const socketId1 = this.connectedUsers.get(player1);
		const socketId2 = this.connectedUsers.get(player2);
		if (!socketId1 || !socketId2) {
			console.log('socketId not found');
			return;
		}
      const newGame = new game(
		player1.toString(),
		player2.toString(),
		this);
	  newGame._gameMode = payload.gameMode as GameMode;
	  this.games.set(newGame._id, newGame);
	  this.server.sockets.sockets.get(socketId1).join(newGame._id);
	  this.server.sockets.sockets.get(socketId2).join(newGame._id);
	  this.games.get(newGame._id).startGame();
	  this.server.to(socketId1).emit('gameReady', {
		gameId: newGame._id,
	  });
	  this.server.to(socketId2).emit('gameReady', {
		gameId: newGame._id,
	  });
	}
  }

  @SubscribeMessage('leave_queue')
  handleLeaveQueue(client: Socket & { userData: UserData }): void {
    this.waitingPlayers.forEach((mode) => {
	  const playerIndex = mode.findIndex(
		(player) => player === client.userData.id,
	  );
	  if (playerIndex !== -1) {
		mode.splice(playerIndex, 1);
	  }
	});
  }

  async handleGameOver(gameId: string) {
    console.log(this.games);
    // emit game over to both
    const game = this.games.get(gameId);
    if (!game) {
      return;
    }
    const socketId1 = this.connectedUsers.get(parseInt(game._player1.id));
    const socketId2 = this.connectedUsers.get(parseInt(game._player2.id));
    if (socketId1) {
      this.server.to(socketId1).emit('gameOver', { gameId });
      this.server.sockets.sockets.get(socketId1).leave(gameId);
    }
    if (socketId2) {
      this.server.to(socketId2).emit('gameOver', { gameId });
      this.server.sockets.sockets.get(socketId2).leave(gameId);
    }
    // unjoin the players from the game room
    this.games.delete(gameId);
  }

  @SubscribeMessage('invite')
  async handleInvite(
    client: Socket & { userData: { id: string; login: string } },
    payload: { userId: string },
  ): Promise<void> {
    const { id } = client.userData;
    // get player by login
    const socketId = this.connectedUsers.get(parseInt(payload.userId));
    if (socketId) {
      const newGame = new game(id, payload.userId, this);
      newGame._gameMode = 'Frisky';
      this.games.set(newGame._id, newGame);
      this.server
        .to(socketId)
        .emit('invited', { gameId: newGame._id, login: client.userData.login });
    }
  }

  @SubscribeMessage('accept_invite')
  async handleAcceptInvite(
    client: Socket & { userData: UserData },
    payload: { gameId: string },
  ): Promise<void> {
    const game = this.games.get(payload.gameId);
    if (game) {
      const socketId = this.connectedUsers.get(parseInt(game._player1.id));
      console.log('player2', socketId);
      console.log('player1', client.id);
      if (socketId) {
        this.server.sockets.sockets.get(socketId).join(game._id);
        client.join(game._id);
        game.startGame();
        client.emit('gameReady', {
          gameId: game._id,
        });
        this.server.to(socketId).emit('gameReady', {
          gameId: game._id,
        });
      } else {
        console.log('socketId not found');
      }
    }
  }
  @SubscribeMessage('leaveGame')
  async handleLeaveGame(
    client: Socket & { userData: { id: string; login: string } },
    payload: { gameId: string },
  ): Promise<void> {
    const game = this.games.get(payload.gameId);
    console.log(this.games);
    if (game) {
      game.gameOver(true);
    }
  }
}

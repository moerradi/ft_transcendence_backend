import { Injectable } from '@nestjs/common';
import { Socket } from 'socket.io';
import { game } from './game';
import { waitingPlayer } from './interfaces';

@Injectable()
export class GameService {
  private queue: waitingPlayer[] = [];
  private games: game[] = [];
  joinQueue(playerId: string, client: Socket, gameMode: string) {
    if (this.queue.find((player) => player.id === playerId)) {
      return;
    } else {
      this.queue.push({
        id: playerId,
        client,
        gameMode,
      });
    }
    console.log('queue', this.queue);
    // return this.matchPlayers();
  }

  leaveQueue(playerId: string) {
    const playerIndex = this.queue.findIndex(
      (player) => player.id === playerId,
    );
    if (playerIndex !== -1) {
      this.queue.splice(playerIndex, 1);
    }
    // console.log('Leave_queue', this.queue);
  }
  matchPlayers() {
    if (this.queue.length >= 2) {
      const player1 = this.queue.shift();
      const player2 = this.queue.shift();
      return [player1, player2];
    }
  }

  gameOver(gameId: string) {
    const gameIndex = this.games.findIndex((game) => game._id === gameId);
    if (gameIndex !== -1) {
      this.games.splice(gameIndex, 1);
    }
  }

  //   startGame(player1: waitingPlayer, player2: waitingPlayer) {
  // 	const new_game = new game(player1.id, player2.id, this);
  // 	player1.client.join(new_game._id.toString());
  // 	player2.client.join(new_game._id.toString());
  // 	this.games.push(new_game);

  //   }

  getQueue() {
    return this.queue;
  }
  getGamesIndex(id: string) {
    return this.games.findIndex((game) => game._id === id);
  }

  clearQueue(): void {
    this.queue = [];
  }
  matchPlayersByGameMode(gameMode: string): waitingPlayer[] | null {
    const matchedPlayers = this.queue.filter(
      (player) => player.gameMode === gameMode,
    );

    if (matchedPlayers.length >= 2) {
      return [matchedPlayers[0], matchedPlayers[1]];
    }
    return null;
  }

  removePlayersFromQueue(playersToRemove: waitingPlayer[]): void {
    this.queue = this.queue.filter(
      (player) =>
        !playersToRemove.some(
          (playerToRemove) => playerToRemove.id === player.id,
        ),
    );
  }
}

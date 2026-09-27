import { Injectable } from "@nestjs/common";
import { GameId, MultiplayerGame } from "@arcadenet/shared";
import { TicTacToeEngine } from "./tictactoe/tictactoe.engine";
@Injectable()
export class GameRegistry {
  private readonly games = new Map<GameId, MultiplayerGame>([
    ["tic-tac-toe", new TicTacToeEngine()],
  ]);
  get(id: GameId) {
    return this.games.get(id);
  }
  list() {
    return [...this.games.keys()];
  }
}

import { Injectable } from "@nestjs/common";
import { GameId, MultiplayerGame } from "@arcadenet/shared";
import { TicTacToeEngine } from "./tictactoe/tictactoe.engine";
import {
  BattleshipEngine,
  ChessEngine,
  ConnectFourEngine,
  DamaEngine,
  PongEngine,
  SnakeBattleEngine,
  TankBattleEngine,
  TetrisBattleEngine,
  TypingRaceEngine,
} from "./additional.engines";

@Injectable()
export class GameRegistry {
  private readonly games = new Map<GameId, MultiplayerGame>([
    ["tic-tac-toe", new TicTacToeEngine()],
    ["connect-four", new ConnectFourEngine()],
    ["dama", new DamaEngine()],
    ["pong", new PongEngine()],
    ["snake-battle", new SnakeBattleEngine()],
    ["battleship", new BattleshipEngine()],
    ["chess", new ChessEngine()],
    ["tetris-battle", new TetrisBattleEngine()],
    ["typing-race", new TypingRaceEngine()],
    ["tank-battle", new TankBattleEngine()],
  ]);

  get(id: GameId) {
    return this.games.get(id);
  }
  list() {
    return [...this.games.keys()];
  }
}

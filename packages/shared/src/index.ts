export const GAME_IDS = [
  "tic-tac-toe",
  "connect-four",
  "dama",
  "pong",
  "snake-battle",
  "battleship",
  "chess",
  "tetris-battle",
  "typing-race",
  "tank-battle",
] as const;
export type GameId = (typeof GAME_IDS)[number];
export type RoomStatus =
  | "WAITING"
  | "READY"
  | "COUNTDOWN"
  | "PLAYING"
  | "PAUSED"
  | "FINISHED"
  | "CLOSED";
export interface PlayerSummary {
  id: string;
  username: string;
  ready: boolean;
}
export interface RoomSnapshot {
  code: string;
  gameId: GameId;
  status: RoomStatus;
  players: PlayerSummary[];
  hostId: string;
  scores: Record<string, number>;
  roundLimit?: number;
  roundsCompleted: number;
  seriesComplete: boolean;
  seriesWinnerId?: string;
}
export interface GameResult {
  status: "WIN" | "DRAW";
  winnerId?: string;
  scores?: Record<string, number>;
}
export interface MultiplayerGame<S = unknown, I = unknown, P = unknown> {
  readonly id: GameId;
  createInitialState(playerIds: string[]): S;
  validateInput(state: S, playerId: string, input: I): boolean;
  applyInput(state: S, playerId: string, input: I): S;
  update(state: S, deltaMs: number): S;
  checkWinCondition(state: S): GameResult | null;
  serializeState(state: S, playerId: string): P;
}

import { GameId, GameResult, MultiplayerGame } from "@arcadenet/shared";
export type Mark = "X" | "O";
export type TicTacToeInput = { index: number };
export interface TicTacToeState {
  board: Array<Mark | null>;
  turnPlayerId: string;
  marks: Record<string, Mark>;
  winnerId?: string;
  draw?: boolean;
}
export class TicTacToeEngine implements MultiplayerGame<
  TicTacToeState,
  TicTacToeInput,
  TicTacToeState
> {
  readonly id: GameId = "tic-tac-toe";
  createInitialState(ids: string[]): TicTacToeState {
    if (ids.length !== 2) throw new Error("Tic-Tac-Toe requires two players.");
    return {
      board: Array(9).fill(null),
      turnPlayerId: ids[0],
      marks: { [ids[0]]: "X", [ids[1]]: "O" },
    };
  }
  validateInput(s: TicTacToeState, p: string, i: TicTacToeInput) {
    return (
      !s.winnerId &&
      !s.draw &&
      s.turnPlayerId === p &&
      Number.isInteger(i.index) &&
      i.index >= 0 &&
      i.index < 9 &&
      s.board[i.index] === null
    );
  }
  applyInput(s: TicTacToeState, p: string, i: TicTacToeInput) {
    if (!this.validateInput(s, p, i)) return s;
    const board = [...s.board];
    board[i.index] = s.marks[p];
    const other = Object.keys(s.marks).find((id) => id !== p) ?? p;
    const n: {
      board: Array<Mark | null>;
      turnPlayerId: string;
      marks: Record<string, Mark>;
      winnerId?: string;
      draw?: boolean;
    } = { ...s, board, turnPlayerId: other };
    const r = this.checkWinCondition(n);
    if (r?.status === "WIN") n.winnerId = r.winnerId;
    if (r?.status === "DRAW") n.draw = true;
    return n;
  }
  update(s: TicTacToeState) {
    return s;
  }
  checkWinCondition(s: TicTacToeState): GameResult | null {
    for (const [a, b, c] of [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8],
      [0, 4, 8],
      [2, 4, 6],
    ]) {
      const m = s.board[a];
      if (m && m === s.board[b] && m === s.board[c]) {
        const w = Object.entries(s.marks).find(([, v]) => v === m)?.[0];
        return w ? { status: "WIN", winnerId: w } : null;
      }
    }
    return s.board.every(Boolean) ? { status: "DRAW" } : null;
  }
  serializeState(s: TicTacToeState) {
    return s;
  }
}

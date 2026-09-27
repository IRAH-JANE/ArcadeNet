import { GameId, GameResult, MultiplayerGame } from "@arcadenet/shared";

type Point = { row: number; col: number };
type TurnState = {
  players: [string, string];
  turnPlayerId: string;
  winnerId?: string;
  draw?: boolean;
};
const other = (s: TurnState, id: string) =>
  s.players.find((player) => player !== id)!;
const win = (winnerId: string): GameResult => ({ status: "WIN", winnerId });
const TANK_DELTAS: Record<string, number[]> = {
  up: [-1, 0],
  right: [0, 1],
  down: [1, 0],
  left: [0, -1],
};

abstract class TurnEngine implements MultiplayerGame<any, any, any> {
  abstract readonly id: GameId;
  abstract createInitialState(playerIds: string[]): any;
  abstract validateInput(state: any, playerId: string, input: any): boolean;
  abstract applyInput(state: any, playerId: string, input: any): any;
  update(state: any) {
    return state;
  }
  checkWinCondition(state: any): GameResult | null {
    if (state.winnerId) return win(state.winnerId);
    if (state.draw) return { status: "DRAW" };
    return null;
  }
  serializeState(state: any) {
    return state;
  }
  protected players(ids: string[]): [string, string] {
    if (ids.length !== 2) throw new Error(`${this.id} requires two players.`);
    return [ids[0], ids[1]];
  }
}

export class ConnectFourEngine extends TurnEngine {
  readonly id = "connect-four" as const;
  createInitialState(ids: string[]) {
    const players = this.players(ids);
    return {
      players,
      board: Array(42).fill(null),
      marks: { [players[0]]: "R", [players[1]]: "Y" },
      turnPlayerId: players[0],
    };
  }
  validateInput(s: any, p: string, i: any) {
    return (
      s.turnPlayerId === p &&
      Number.isInteger(i?.column) &&
      i.column >= 0 &&
      i.column < 7 &&
      s.board[i.column] === null
    );
  }
  applyInput(s: any, p: string, i: any) {
    if (!this.validateInput(s, p, i)) return s;
    const board = [...s.board];
    let row = 0;
    while (row < 5 && board[(row + 1) * 7 + i.column] === null) row++;
    board[row * 7 + i.column] = s.marks[p];
    const next = {
      ...s,
      board,
      moves: (s.moves ?? 0) + 1,
      turnPlayerId: other(s, p),
    };
    if (this.hasFour(board, row, i.column, s.marks[p])) next.winnerId = p;
    else if (board.every(Boolean)) next.draw = true;
    return next;
  }
  private hasFour(board: any[], row: number, col: number, mark: string) {
    const directions = [
      [0, 1],
      [1, 0],
      [1, 1],
      [1, -1],
    ];
    return directions.some(([dr, dc]) => {
      let count = 1;
      for (const sign of [-1, 1])
        for (let step = 1; step < 4; step++) {
          const r = row + dr * step * sign,
            c = col + dc * step * sign;
          if (r < 0 || r >= 6 || c < 0 || c >= 7 || board[r * 7 + c] !== mark)
            break;
          count++;
        }
      return count >= 4;
    });
  }
}

export class DamaEngine extends TurnEngine {
  readonly id = "dama" as const;
  createInitialState(ids: string[]) {
    const players = this.players(ids),
      board = Array(64).fill(null);
    for (let r = 0; r < 3; r++)
      for (let c = 0; c < 8; c++)
        if ((r + c) % 2 === 1)
          board[r * 8 + c] = { owner: players[1], king: false };
    for (let r = 5; r < 8; r++)
      for (let c = 0; c < 8; c++)
        if ((r + c) % 2 === 1)
          board[r * 8 + c] = { owner: players[0], king: false };
    return { players, board, turnPlayerId: players[0] };
  }
  validateInput(s: any, p: string, i: any) {
    if (s.turnPlayerId !== p || !this.point(i?.from) || !this.point(i?.to))
      return false;
    const { row: r, col: c } = i.from,
      { row: nr, col: nc } = i.to,
      piece = s.board[r * 8 + c];
    if (
      !piece ||
      piece.owner !== p ||
      s.board[nr * 8 + nc] ||
      Math.abs(nc - c) !== Math.abs(nr - r)
    )
      return false;
    const distance = Math.abs(nr - r),
      forward = piece.king ? 1 : p === s.players[0] ? -1 : 1;
    if (distance === 1) return nr - r === forward;
    if (distance !== 2 || nr - r !== 2 * forward) return false;
    const jumped = s.board[((r + nr) / 2) * 8 + (c + nc) / 2];
    return Boolean(jumped && jumped.owner !== p);
  }
  applyInput(s: any, p: string, i: any) {
    if (!this.validateInput(s, p, i)) return s;
    const board = [...s.board],
      from = i.from.row * 8 + i.from.col,
      to = i.to.row * 8 + i.to.col,
      piece = { ...board[from] };
    board[from] = null;
    board[to] = piece;
    if (Math.abs(i.to.row - i.from.row) === 2)
      board[((i.from.row + i.to.row) / 2) * 8 + (i.from.col + i.to.col) / 2] =
        null;
    if (
      (p === s.players[0] && i.to.row === 0) ||
      (p === s.players[1] && i.to.row === 7)
    )
      piece.king = true;
    const next = {
      ...s,
      board,
      moves: (s.moves ?? 0) + 1,
      turnPlayerId: other(s, p),
    };
    if (!board.some((x: any) => x?.owner === other(s, p))) next.winnerId = p;
    return next;
  }
  private point(p: any): p is Point {
    return (
      Number.isInteger(p?.row) &&
      p.row >= 0 &&
      p.row < 8 &&
      Number.isInteger(p?.col) &&
      p.col >= 0 &&
      p.col < 8
    );
  }
}

export class PongEngine extends TurnEngine {
  readonly id = "pong" as const;
  createInitialState(ids: string[]) {
    const players = this.players(ids);
    return {
      players,
      turnPlayerId: players[0],
      ballLane: 1,
      score: { [players[0]]: 0, [players[1]]: 0 },
      rally: 0,
    };
  }
  validateInput(s: any, p: string, i: any) {
    return (
      s.turnPlayerId === p &&
      Number.isInteger(i?.lane) &&
      i.lane >= 0 &&
      i.lane < 3
    );
  }
  applyInput(s: any, p: string, i: any) {
    if (!this.validateInput(s, p, i)) return s;
    const score = { ...s.score },
      hit = i.lane === s.ballLane;
    if (!hit) score[other(s, p)] += 1;
    const winnerId =
      score[playersWinner(s.players, score)] >= 5
        ? playersWinner(s.players, score)
        : undefined;
    return {
      ...s,
      score,
      rally: hit ? s.rally + 1 : 0,
      ballLane: hit
        ? (s.ballLane + 1 + (s.rally % 2)) % 3
        : (s.ballLane + 2) % 3,
      turnPlayerId: other(s, p),
      winnerId,
    };
  }
}
function playersWinner(players: string[], score: Record<string, number>) {
  return score[players[0]] >= score[players[1]] ? players[0] : players[1];
}

export class SnakeBattleEngine extends TurnEngine {
  readonly id = "snake-battle" as const;
  createInitialState(ids: string[]) {
    const players = this.players(ids);
    return {
      players,
      turnPlayerId: players[0],
      snakes: {
        [players[0]]: [{ row: 8, col: 2 }],
        [players[1]]: [{ row: 0, col: 6 }],
      },
      food: { row: 4, col: 4 },
      moves: 0,
    };
  }
  validateInput(s: any, p: string, i: any) {
    return (
      s.turnPlayerId === p &&
      ["up", "down", "left", "right"].includes(i?.direction)
    );
  }
  applyInput(s: any, p: string, i: any) {
    if (!this.validateInput(s, p, i)) return s;
    const snakes = { ...s.snakes, [p]: [...s.snakes[p]] },
      body = snakes[p],
      head = { ...body[0] },
      d = i.direction;
    if (d === "up") head.row--;
    if (d === "down") head.row++;
    if (d === "left") head.col--;
    if (d === "right") head.col++;
    const collision =
      head.row < 0 ||
      head.row > 8 ||
      head.col < 0 ||
      head.col > 8 ||
      Object.values(snakes).some((parts: any) =>
        parts.some(
          (part: Point) => part.row === head.row && part.col === head.col,
        ),
      );
    if (collision) return { ...s, winnerId: other(s, p) };
    body.unshift(head);
    const ate = head.row === s.food.row && head.col === s.food.col;
    if (!ate) body.pop();
    const next = {
      ...s,
      snakes,
      food: ate
        ? { row: (s.food.row + 3) % 9, col: (s.food.col + 5) % 9 }
        : s.food,
      moves: s.moves + 1,
      turnPlayerId: other(s, p),
    };
    return next;
  }
}

const FLEET: Point[] = [
  ...Array.from({ length: 5 }, (_, i) => ({ row: 0, col: i })),
  ...Array.from({ length: 4 }, (_, i) => ({ row: 2, col: i })),
  ...Array.from({ length: 3 }, (_, i) => ({ row: 4, col: i })),
  ...Array.from({ length: 3 }, (_, i) => ({ row: 6, col: i })),
  { row: 7, col: 6 },
  { row: 7, col: 7 },
];
export class BattleshipEngine extends TurnEngine {
  readonly id = "battleship" as const;
  createInitialState(ids: string[]) {
    const players = this.players(ids);
    return {
      players,
      turnPlayerId: players[0],
      shots: { [players[0]]: [], [players[1]]: [] },
      hits: { [players[0]]: 0, [players[1]]: 0 },
      lastShot: null,
    };
  }
  validateInput(s: any, p: string, i: any) {
    return (
      s.turnPlayerId === p &&
      Number.isInteger(i?.row) &&
      i.row >= 0 &&
      i.row < 8 &&
      Number.isInteger(i?.col) &&
      i.col >= 0 &&
      i.col < 8 &&
      !s.shots[p].some((x: Point) => x.row === i.row && x.col === i.col)
    );
  }
  applyInput(s: any, p: string, i: any) {
    if (!this.validateInput(s, p, i)) return s;
    const hit = FLEET.some((x) => x.row === i.row && x.col === i.col),
      shot = { row: i.row, col: i.col, hit },
      shots = { ...s.shots, [p]: [...s.shots[p], shot] },
      hits = { ...s.hits, [p]: s.hits[p] + Number(hit) };
    return {
      ...s,
      shots,
      hits,
      lastShot: { playerId: p, ...shot },
      turnPlayerId: other(s, p),
      winnerId: hits[p] >= FLEET.length ? p : undefined,
    };
  }
}

type ChessPiece = { owner: string; type: "K" | "Q" | "R" | "B" | "N" | "P" };
export class ChessEngine extends TurnEngine {
  readonly id = "chess" as const;
  createInitialState(ids: string[]) {
    const players = this.players(ids),
      board = Array(64).fill(null),
      back: ChessPiece["type"][] = ["R", "N", "B", "Q", "K", "B", "N", "R"];
    for (let c = 0; c < 8; c++) {
      board[c] = { owner: players[1], type: back[c] };
      board[8 + c] = { owner: players[1], type: "P" };
      board[48 + c] = { owner: players[0], type: "P" };
      board[56 + c] = { owner: players[0], type: back[c] };
    }
    return { players, board, turnPlayerId: players[0] };
  }
  validateInput(s: any, p: string, i: any) {
    if (s.turnPlayerId !== p || !this.square(i?.from) || !this.square(i?.to))
      return false;
    const { row: r, col: c } = i.from,
      { row: nr, col: nc } = i.to,
      from = s.board[r * 8 + c] as ChessPiece | null,
      to = s.board[nr * 8 + nc] as ChessPiece | null;
    if (!from || from.owner !== p || to?.owner === p || (r === nr && c === nc))
      return false;
    const dr = nr - r,
      dc = nc - c,
      ar = Math.abs(dr),
      ac = Math.abs(dc);
    let shape = false;
    if (from.type === "P") {
      const dir = p === s.players[0] ? -1 : 1;
      shape =
        (dc === 0 && !to && dr === dir) ||
        (dc === 0 &&
          !to &&
          dr === 2 * dir &&
          r === (p === s.players[0] ? 6 : 1) &&
          !s.board[(r + dir) * 8 + c]) ||
        (ac === 1 && dr === dir && Boolean(to));
    } else if (from.type === "N")
      shape = (ar === 2 && ac === 1) || (ar === 1 && ac === 2);
    else if (from.type === "K") shape = ar <= 1 && ac <= 1;
    else if (from.type === "R") shape = dr === 0 || dc === 0;
    else if (from.type === "B") shape = ar === ac;
    else shape = dr === 0 || dc === 0 || ar === ac;
    if (!shape) return false;
    if (from.type !== "N" && this.blocked(s.board, r, c, nr, nc)) return false;
    return true;
  }
  applyInput(s: any, p: string, i: any) {
    if (!this.validateInput(s, p, i)) return s;
    const board = [...s.board],
      from = i.from.row * 8 + i.from.col,
      to = i.to.row * 8 + i.to.col,
      captured = board[to];
    board[to] = board[from];
    board[from] = null;
    if (board[to].type === "P" && (i.to.row === 0 || i.to.row === 7))
      board[to] = { ...board[to], type: "Q" };
    const next = {
      ...s,
      board,
      moves: (s.moves ?? 0) + 1,
      turnPlayerId: other(s, p),
    };
    if (captured?.type === "K") next.winnerId = p;
    return next;
  }
  private square(p: any): p is Point {
    return (
      Number.isInteger(p?.row) &&
      p.row >= 0 &&
      p.row < 8 &&
      Number.isInteger(p?.col) &&
      p.col >= 0 &&
      p.col < 8
    );
  }
  private blocked(board: any[], r: number, c: number, nr: number, nc: number) {
    const dr = Math.sign(nr - r),
      dc = Math.sign(nc - c);
    let y = r + dr,
      x = c + dc;
    while (y !== nr || x !== nc) {
      if (board[y * 8 + x]) return true;
      y += dr;
      x += dc;
    }
    return false;
  }
}

const SHAPES = [
  [
    [0, 0],
    [0, 1],
    [1, 0],
    [1, 1],
  ],
  [
    [0, 0],
    [0, 1],
    [0, 2],
    [0, 3],
  ],
  [
    [0, 0],
    [1, 0],
    [1, 1],
    [1, 2],
  ],
  [
    [0, 2],
    [1, 0],
    [1, 1],
    [1, 2],
  ],
];
export class TetrisBattleEngine extends TurnEngine {
  readonly id = "tetris-battle" as const;
  createInitialState(ids: string[]) {
    const players = this.players(ids);
    return {
      players,
      turnPlayerId: players[0],
      boards: {
        [players[0]]: Array(120).fill(null),
        [players[1]]: Array(120).fill(null),
      },
      lines: { [players[0]]: 0, [players[1]]: 0 },
      pieceIndex: 0,
    };
  }
  validateInput(s: any, p: string, i: any) {
    return (
      s.turnPlayerId === p &&
      Number.isInteger(i?.column) &&
      i.column >= 0 &&
      i.column < 10
    );
  }
  applyInput(s: any, p: string, i: any) {
    if (!this.validateInput(s, p, i)) return s;
    const boards = { ...s.boards, [p]: [...s.boards[p]] },
      board = boards[p],
      shape = SHAPES[s.pieceIndex % SHAPES.length];
    let row = 0;
    const fits = (y: number) =>
      shape.every(
        ([dy, dx]) =>
          y + dy < 12 &&
          board[(y + dy) * 10 + i.column + dx] === null &&
          i.column + dx < 10,
      );
    if (!fits(0)) return { ...s, winnerId: other(s, p) };
    while (fits(row + 1)) row++;
    shape.forEach(
      ([dy, dx], n) =>
        (board[(row + dy) * 10 + i.column + dx] = n % 2 ? "B" : "A"),
    );
    const remaining = [];
    for (let r = 0; r < 12; r++) {
      const line = board.slice(r * 10, r * 10 + 10);
      if (!line.every(Boolean)) remaining.push(...line);
    }
    const cleared = 12 - remaining.length / 10;
    while (remaining.length < 120) remaining.unshift(...Array(10).fill(null));
    boards[p] = remaining;
    const lines = { ...s.lines, [p]: s.lines[p] + cleared };
    return {
      ...s,
      boards,
      lines,
      pieceIndex: s.pieceIndex + 1,
      turnPlayerId: other(s, p),
      winnerId: lines[p] >= 5 ? p : undefined,
    };
  }
}

const RACE_TEXT =
  "The best way to learn is to play, practice, and keep moving forward.";
export class TypingRaceEngine extends TurnEngine {
  readonly id = "typing-race" as const;
  createInitialState(ids: string[]) {
    const players = this.players(ids);
    return {
      players,
      turnPlayerId: players[0],
      text: RACE_TEXT,
      progress: { [players[0]]: "", [players[1]]: "" },
      winnerId: undefined,
    };
  }
  validateInput(s: any, p: string, i: any) {
    return (
      s.players.includes(p) &&
      !s.winnerId &&
      typeof i?.text === "string" &&
      i.text.length >= s.progress[p].length &&
      i.text.length <= s.text.length &&
      i.text === s.text.slice(0, i.text.length) &&
      i.text.startsWith(s.progress[p])
    );
  }
  applyInput(s: any, p: string, i: any) {
    if (!this.validateInput(s, p, i)) return s;
    const progress = { ...s.progress, [p]: i.text };
    return { ...s, progress, winnerId: i.text === s.text ? p : undefined };
  }
}

export class TankBattleEngine extends TurnEngine {
  readonly id = "tank-battle" as const;
  createInitialState(ids: string[]) {
    const players = this.players(ids);
    return {
      players,
      turnPlayerId: players[0],
      tanks: {
        [players[0]]: { row: 7, col: 0, direction: "up", health: 1 },
        [players[1]]: { row: 0, col: 7, direction: "down", health: 1 },
      },
    };
  }
  validateInput(s: any, p: string, i: any) {
    return (
      s.turnPlayerId === p &&
      ["move", "left", "right", "fire"].includes(i?.action)
    );
  }
  applyInput(s: any, p: string, i: any) {
    if (!this.validateInput(s, p, i)) return s;
    const tanks = { ...s.tanks, [p]: { ...s.tanks[p] } },
      tank = tanks[p],
      dirs = ["up", "right", "down", "left"],
      turn = dirs.indexOf(tank.direction);
    if (i.action === "left") tank.direction = dirs[(turn + 3) % 4];
    if (i.action === "right") tank.direction = dirs[(turn + 1) % 4];
    if (i.action === "move") {
      const delta = TANK_DELTAS[tank.direction];
      const row = tank.row + delta[0],
        col = tank.col + delta[1];
      if (
        row >= 0 &&
        row < 8 &&
        col >= 0 &&
        col < 8 &&
        !Object.values(tanks).some((x: any) => x.row === row && x.col === col)
      ) {
        tank.row = row;
        tank.col = col;
      }
    }
    let winnerId;
    if (i.action === "fire") {
      const foe = tanks[other(s, p)],
        delta = TANK_DELTAS[tank.direction];
      let row = tank.row + delta[0],
        col = tank.col + delta[1];
      while (row >= 0 && row < 8 && col >= 0 && col < 8) {
        if (row === foe.row && col === foe.col) {
          winnerId = p;
          break;
        }
        row += delta[0];
        col += delta[1];
      }
    }
    return {
      ...s,
      tanks,
      moves: (s.moves ?? 0) + 1,
      turnPlayerId: other(s, p),
      winnerId,
    };
  }
}

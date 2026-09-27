import { Injectable } from "@nestjs/common";
import { GameId, RoomSnapshot, RoomStatus } from "@arcadenet/shared";
import { randomBytes } from "crypto";
import { GameRegistry } from "../games/game.registry";

interface Room {
  code: string;
  gameId: GameId;
  hostId: string;
  players: {
    id: string;
    username: string;
    ready: boolean;
  }[];
  status: RoomStatus;
  gameState?: unknown;
  scores: Map<string, number>;
  roundsStarted: number;
  roundsCompleted: number;
  roundLimit?: number;
}

@Injectable()
export class RoomsService {
  private readonly rooms = new Map<string, Room>();

  constructor(private readonly games: GameRegistry) {}

  create(pid: string, user: string, g: GameId) {
    if (!this.games.get(g)) {
      throw new Error("Game is not available.");
    }

    const code = this.newCode();

    const room: Room = {
      code,
      gameId: g,
      hostId: pid,
      players: [
        {
          id: pid,
          username: user,
          ready: false,
        },
      ],
      status: "WAITING",
      scores: new Map([[pid, 0]]),
      roundsStarted: 0,
      roundsCompleted: 0,
      roundLimit: undefined,
    };

    this.rooms.set(code, room);

    return this.snapshot(room);
  }

  join(code: string, pid: string, user: string) {
    const room = this.require(code);

    if (room.players.some((p) => p.id === pid)) {
      return this.snapshot(room);
    }

    if (room.players.length >= 2) {
      throw new Error("Room is full.");
    }

    if (!["WAITING", "READY"].includes(room.status)) {
      throw new Error("Match has already started.");
    }

    room.players.push({
      id: pid,
      username: user,
      ready: false,
    });
    room.scores.set(pid, 0);
    room.roundsStarted = 0;
    room.roundsCompleted = 0;

    return this.snapshot(room);
  }

  ready(code: string, pid: string, value: boolean) {
    const room = this.require(code);

    if (!(["WAITING", "FINISHED"] as RoomStatus[]).includes(room.status)) {
      throw new Error("Players can only change readiness while the room is waiting for a match.");
    }

    if (["tic-tac-toe", "connect-four", "tank-battle", "chess", "battleship", "snake-battle", "pong", "dama"].includes(room.gameId) && room.roundLimit === undefined) {
      throw new Error("The room host must choose the number of rounds before players ready up.");
    }

    if (
      room.status === "FINISHED" &&
      (room.roundLimit === undefined || room.roundsCompleted >= room.roundLimit)
    ) {
      throw new Error("This match is complete.");
    }

    const player = room.players.find((p) => p.id === pid);

    if (!player) {
      throw new Error("You are not in this room.");
    }

    player.ready = value;

    room.status =
      room.players.length === 2 && room.players.every((p) => p.ready)
        ? "READY"
        : "WAITING";

    return this.snapshot(room);
  }

  setRoundLimit(code: string, pid: string, rounds: number) {
    const room = this.require(code);

    if (!["tic-tac-toe", "connect-four", "tank-battle", "chess", "battleship", "snake-battle", "pong", "dama"].includes(room.gameId)) {
      throw new Error("This game does not use a round series.");
    }
    if (room.hostId !== pid) {
      throw new Error("Only the room host can choose the number of rounds.");
    }
    if (room.status !== "WAITING" || room.players.some((player) => player.ready)) {
      throw new Error("Round count can only be set before either player is ready.");
    }
    if (!Number.isInteger(rounds) || rounds < 1 || rounds > 99) {
      throw new Error("Choose between 1 and 99 rounds.");
    }

    room.roundLimit = rounds;
    return this.snapshot(room);
  }

  rematch(code: string, pid: string) {
    const room = this.require(code);
    if (!room.players.some((player) => player.id === pid)) {
      throw new Error("You are not in this room.");
    }
    if (room.status !== "FINISHED") {
      throw new Error("A rematch is only available after the match ends.");
    }

    room.roundsStarted = 0;
    room.roundsCompleted = 0;
    room.scores = new Map(room.players.map((player) => [player.id, 0]));
    room.gameState = undefined;
    room.players.forEach((player) => { player.ready = player.id === pid; });
    room.status = "WAITING";
    return this.snapshot(room);
  }

  start(code: string, pid: string) {
    const room = this.require(code);

    if (room.hostId !== pid) {
      throw new Error("Only the room host can start the match.");
    }

    if (room.status !== "READY") {
      throw new Error("Room is not ready to start a match.");
    }

    if (room.roundLimit !== undefined && room.roundsCompleted >= room.roundLimit) {
      throw new Error("This match series is already complete.");
    }

    if (room.players.length !== 2 || !room.players.every((p) => p.ready)) {
      throw new Error("Both players must be ready.");
    }

    const engine = this.games.get(room.gameId);

    if (!engine) {
      throw new Error("Game is unavailable.");
    }

    room.status = "COUNTDOWN";

    const starterIndex = room.roundsStarted % room.players.length;
    const playerIds = room.players.map(
      (_, index) => room.players[(starterIndex + index) % room.players.length].id,
    );
    room.gameState = engine.createInitialState(playerIds);
    room.roundsStarted += 1;

    return {
      snapshot: this.snapshot(room),
      state: room.gameState,
    };
  }

  input(code: string, pid: string, input: unknown) {
    const room = this.require(code);

    const engine = this.games.get(room.gameId);

    if (!engine || room.status !== "PLAYING" || !room.gameState) {
      throw new Error("Match is not active.");
    }

    if (!room.players.some((p) => p.id === pid)) {
      throw new Error("Not a room member.");
    }

    if (!engine.validateInput(room.gameState, pid, input)) {
      throw new Error("Invalid move.");
    }

    room.gameState = engine.applyInput(room.gameState, pid, input);

    const result = engine.checkWinCondition(room.gameState);
    if (result) this.finishRound(room, result);

    return {
      snapshot: this.snapshot(room),
      state: engine.serializeState(room.gameState, pid),
      result,
    };
  }

  advance(code: string, deltaMs: number) {
    const room = this.require(code);
    const engine = this.games.get(room.gameId);
    if (!engine || room.status !== "PLAYING" || !room.gameState) {
      throw new Error("Match is not active.");
    }
    room.gameState = engine.update(room.gameState, deltaMs);
    const result = engine.checkWinCondition(room.gameState);
    if (result) this.finishRound(room, result);
    return {
      snapshot: this.snapshot(room),
      state: room.gameState,
      result,
    };
  }

  getSnapshot(code: string) {
    return this.snapshot(this.require(code));
  }

  leave(code: string, pid: string) {
    const room = this.require(code);
    const playerIndex = room.players.findIndex((player) => player.id === pid);

    if (playerIndex < 0) {
      throw new Error("You are not in this room.");
    }

    room.players.splice(playerIndex, 1);

    if (room.players.length === 0) {
      this.rooms.delete(room.code);
      return undefined;
    }

    room.hostId = room.players[0].id;
    room.scores = new Map([[room.hostId, 0]]);
    room.roundsStarted = 0;
    room.roundsCompleted = 0;
    room.players[0].ready = false;
    room.status = "WAITING";
    room.gameState = undefined;

    return this.snapshot(room);
  }

  setPlaying(code: string) {
    const room = this.require(code);

    if (room.status !== "COUNTDOWN") {
      return;
    }

    room.status = "PLAYING";
  }

  private finishRound(room: Room, result: { status: "WIN" | "DRAW"; winnerId?: string }) {
    room.status = "FINISHED";
    room.roundsCompleted += 1;
    room.players.forEach((player) => { player.ready = false; });
    if (result.status === "WIN" && result.winnerId) {
      room.scores.set(result.winnerId, (room.scores.get(result.winnerId) ?? 0) + 1);
    }
  }

  private require(code: string) {
    const room = this.rooms.get(code.toUpperCase());

    if (!room) {
      throw new Error("Room not found.");
    }

    return room;
  }

  private snapshot(room: Room): RoomSnapshot {
    const firstPlayer = room.players[0];
    const secondPlayer = room.players[1];
    const firstScore = firstPlayer ? room.scores.get(firstPlayer.id) ?? 0 : 0;
    const secondScore = secondPlayer ? room.scores.get(secondPlayer.id) ?? 0 : 0;
    const seriesComplete = room.roundLimit === undefined
      ? room.status === "FINISHED"
      : room.roundsCompleted >= room.roundLimit;

    return {
      code: room.code,
      gameId: room.gameId,
      status: room.status,
      players: room.players,
      hostId: room.hostId,
      scores: Object.fromEntries(room.scores),
      roundLimit: room.roundLimit,
      roundsCompleted: room.roundsCompleted,
      seriesComplete,
      seriesWinnerId: seriesComplete && firstScore !== secondScore
        ? (firstScore > secondScore ? firstPlayer?.id : secondPlayer?.id)
        : undefined,
    };
  }

  private newCode() {
    let code = "";

    do {
      code = randomBytes(4).toString("hex").slice(0, 5).toUpperCase();
    } while (this.rooms.has(code));

    return code;
  }

}

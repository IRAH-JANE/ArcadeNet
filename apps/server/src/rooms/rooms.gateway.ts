import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { RoomsService } from "./rooms.service";

@WebSocketGateway({ cors: { origin: "*" } })
export class RoomsGateway {
  @WebSocketServer()
  server!: Server;

  private readonly gameTimers = new Map<string, NodeJS.Timeout>();

  constructor(private readonly rooms: RoomsService) {}

  @SubscribeMessage("room:create")
  create(
    @MessageBody()
    b: {
      playerId: string;
      username: string;
      gameId: any;
    },
    @ConnectedSocket() s: Socket,
  ) {
    const r = this.rooms.create(b.playerId, b.username, b.gameId);

    s.join(r.code);

    this.server.to(r.code).emit("room:state", r);

    return r;
  }

  @SubscribeMessage("room:join")
  join(
    @MessageBody()
    b: {
      code: string;
      playerId: string;
      username: string;
    },
    @ConnectedSocket() s: Socket,
  ) {
    const r = this.rooms.join(b.code, b.playerId, b.username);

    s.join(r.code);

    this.server.to(r.code).emit("room:state", r);

    return r;
  }

  @SubscribeMessage("room:leave")
  leave(
    @MessageBody() b: { code: string; playerId: string },
    @ConnectedSocket() s: Socket,
  ) {
    const snapshot = this.rooms.leave(b.code, b.playerId);
    this.stopGameTimer(b.code);
    s.leave(b.code.toUpperCase());

    if (snapshot) {
      this.server.to(snapshot.code).emit("room:state", snapshot);
    }

    return { left: true };
  }

  @SubscribeMessage("room:ready")
  ready(
    @MessageBody()
    b: {
      code: string;
      playerId: string;
      ready: boolean;
    },
  ) {
    const r = this.rooms.ready(b.code, b.playerId, b.ready);

    this.server.to(r.code).emit("room:state", r);

    return r;
  }

  @SubscribeMessage("room:rounds")
  rounds(@MessageBody() b: { code: string; playerId: string; rounds: number }) {
    const r = this.rooms.setRoundLimit(b.code, b.playerId, b.rounds);
    this.server.to(r.code).emit("room:state", r);
    return r;
  }

  @SubscribeMessage("room:rematch")
  rematch(@MessageBody() b: { code: string; playerId: string }) {
    const r = this.rooms.rematch(b.code, b.playerId);
    this.server.to(r.code).emit("room:state", r);
    this.server.to(r.code).emit("game:rematch");
    return r;
  }

  @SubscribeMessage("room:start")
  start(@MessageBody() b: { code: string; playerId: string }) {
    const result = this.rooms.start(b.code, b.playerId);

    this.server.to(result.snapshot.code).emit("room:state", result.snapshot);

    this.server.to(result.snapshot.code).emit("game:start");

    this.server.to(result.snapshot.code).emit("game:state", result.state);

    setTimeout(() => {
      try {
        const current = this.rooms.getSnapshot(result.snapshot.code);

        if (current.status !== "COUNTDOWN") {
          return;
        }

        this.rooms.setPlaying(result.snapshot.code);

        this.server
          .to(result.snapshot.code)
          .emit("room:state", this.rooms.getSnapshot(result.snapshot.code));

        this.server.to(result.snapshot.code).emit("game:countdown:complete");
        if (current.gameId === "tetris-battle") this.startGameTimer(result.snapshot.code, 100);
        if (current.gameId === "pong") this.startGameTimer(result.snapshot.code, 33);
        if (current.gameId === "snake-battle") this.startGameTimer(result.snapshot.code, 180);
      } catch {
        // Room may have been closed during countdown.
      }
    }, 3000);

    return result;
  }

  @SubscribeMessage("game:input")
  input(
    @MessageBody()
    b: {
      code: string;
      playerId: string;
      input: unknown;
    },
  ) {
    const x = this.rooms.input(b.code, b.playerId, b.input);

    this.server.to(x.snapshot.code).emit("game:state", x.state);
    this.server.to(x.snapshot.code).emit("room:state", x.snapshot);

    if (x.result) {
      this.stopGameTimer(x.snapshot.code);
      this.server.to(x.snapshot.code).emit("game:end", x.result);
    }

    return x;
  }

  private startGameTimer(code: string, intervalMs: number) {
    this.stopGameTimer(code);
    const timer = setInterval(() => {
      try {
        const next = this.rooms.advance(code, intervalMs);
        this.server.to(next.snapshot.code).emit("game:state", next.state);
        if (next.result) {
          this.stopGameTimer(code);
          this.server.to(next.snapshot.code).emit("room:state", next.snapshot);
          this.server.to(next.snapshot.code).emit("game:end", next.result);
        }
      } catch {
        this.stopGameTimer(code);
      }
    }, intervalMs);
    this.gameTimers.set(code.toUpperCase(), timer);
  }

  private stopGameTimer(code: string) {
    const key = code.toUpperCase();
    const timer = this.gameTimers.get(key);
    if (timer) clearInterval(timer);
    this.gameTimers.delete(key);
  }
}

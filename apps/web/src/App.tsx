import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Check,
  Copy,
  Gamepad2,
  LoaderCircle,
  RotateCcw,
  Trophy,
  Users,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Analytics } from "@vercel/analytics/react";
import { socket } from "./lib/socket";
import { useArcadeStore } from "./stores/useArcadeStore";
import type { RoomSnapshot } from "@arcadenet/shared";
import GameBoard from "./components/GameBoard";

const games = [
  {
    id: "tic-tac-toe",
    name: "Tic-Tac-Toe",
    category: "Strategy",
    description: "A classic 3×3 duel.",
  },
  {
    id: "connect-four",
    name: "Connect Four",
    category: "Strategy",
    description: "Connect four pieces before your rival.",
  },
  {
    id: "dama",
    name: "Dama",
    category: "Board",
    description: "Capture, crown, and outplay.",
  },
  {
    id: "pong",
    name: "Pong",
    category: "Arcade",
    description: "Classic real-time paddle action.",
  },
  {
    id: "snake-battle",
    name: "Snake Battle",
    category: "Arcade",
    description: "Survive longer than your opponent.",
  },
  {
    id: "battleship",
    name: "Battleship",
    category: "Strategy",
    description: "Find and sink the hidden fleet.",
  },
  {
    id: "chess",
    name: "Chess",
    category: "Board",
    description: "A full competitive chess match.",
  },
  {
    id: "tetris-battle",
    name: "Tetris Battle",
    category: "Puzzle",
    description: "Clear lines and send garbage.",
  },
  {
    id: "typing-race",
    name: "Typing Race",
    category: "Skill",
    description: "Race across the same text.",
  },
  {
    id: "tank-battle",
    name: "Tank Battle",
    category: "Action",
    description: "Top-down two-player combat.",
  },
];
const roundSeriesGames = [
  "tic-tac-toe",
  "connect-four",
  "tank-battle",
  "chess",
  "battleship",
  "snake-battle",
  "pong",
  "dama",
];
const gameSkin: Record<string, string> = {
  "tic-tac-toe": "border-violet-300/15 bg-[#111116]",
  "connect-four": "border-blue-300/20 bg-[#09131f]",
  dama: "border-amber-200/20 bg-[#17120e]",
  pong: "border-emerald-300/20 bg-[#071613]",
  "snake-battle": "border-lime-300/20 bg-[#0c160d]",
  battleship: "border-sky-300/20 bg-[#09131c]",
  chess: "border-stone-200/20 bg-[#171613]",
  "tetris-battle": "border-cyan-300/25 bg-[#070a10]",
  "typing-race": "border-fuchsia-300/20 bg-[#160d18]",
  "tank-battle": "border-orange-300/20 bg-[#17110d]",
};

export default function App() {
  const { playerId, username, room, setRoom } = useArcadeStore();
  const [selectedGame, setSelectedGame] = useState("tic-tac-toe");
  const [roundLimit, setRoundLimit] = useState(3);
  const [joinCode, setJoinCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [gameState, setGameState] = useState<any>();
  const [result, setResult] = useState<{
    status: "WIN" | "DRAW";
    winnerId?: string;
  }>();
  const [connected, setConnected] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [startedAt, setStartedAt] = useState<number>();
  const [notice, setNotice] = useState("");

  useEffect(() => {
    socket.connect();
    const c = () => {
      setConnected(true);
      setNotice("");
    };
    const d = () => {
      setConnected(false);
      setNotice("Connection lost. Trying to reconnect…");
    };
    const r = (x: RoomSnapshot) => {
      if (x.status === "COUNTDOWN") setResult(undefined);
      if (x.roundLimit !== undefined) setRoundLimit(x.roundLimit);
      setRoom(x);
    };
    const s = (x: any) => setGameState(x);
    const e = (x: { status: "WIN" | "DRAW"; winnerId?: string }) =>
      setResult(x);
    const g = () => {
      setResult(undefined);
      setElapsed(0);
      setStartedAt(undefined);
    };
    const rematch = () => {
      setGameState(undefined);
      setResult(undefined);
      setElapsed(0);
      setStartedAt(undefined);
    };
    socket.on("connect", c);
    socket.on("disconnect", d);
    socket.on("connect_error", d);
    socket.on("room:state", r);
    socket.on("game:state", s);
    socket.on("game:end", e);
    socket.on("game:rematch", rematch);
    socket.on("game:start", g);
    return () => {
      socket.off("connect", c);
      socket.off("disconnect", d);
      socket.off("connect_error", d);
      socket.off("room:state", r);
      socket.off("game:state", s);
      socket.off("game:end", e);
      socket.off("game:rematch", rematch);
      socket.disconnect();
      socket.off("game:start", g);
    };
  }, [setRoom]);

  useEffect(() => {
    if (room?.status === "PLAYING" && !startedAt) setStartedAt(Date.now());
    if (room?.status === "WAITING" || !room) {
      setStartedAt(undefined);
      setElapsed(0);
    }
  }, [room?.status, room, startedAt]);
  useEffect(() => {
    if (!startedAt || room?.status !== "PLAYING") return;
    const tick = () => setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [startedAt, room?.status]);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 5000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const moveCount = useMemo(() => {
    if (!gameState) return 0;
    if (typeof gameState.moves === "number") return gameState.moves;
    if (typeof gameState.pieceIndex === "number") return gameState.pieceIndex;
    if (gameState.shots)
      return Object.values(gameState.shots).reduce(
        (total: number, shots: any) => total + shots.length,
        0,
      );
    if (gameState.board) return gameState.board.filter(Boolean).length;
    if (gameState.progress)
      return Object.values(gameState.progress).reduce(
        (total: number, text: any) => total + text.length,
        0,
      );
    return gameState.rally ?? 0;
  }, [gameState]);
  const players = room?.players ?? [];
  const playerNames = Object.fromEntries(
    players.map((player) => [player.id, player.username]),
  );
  const opponent = players.find((p) => p.id !== playerId);
  const currentPlayer = players.find((p) => p.id === playerId);
  const gameName =
    games.find((game) => game.id === room?.gameId)?.name ?? "Arcade match";
  const myMark =
    gameState?.marks?.[playerId] ??
    (
      {
        dama: "●",
        pong: "▰",
        "snake-battle": "●",
        battleship: "⚓",
        chess: "♟",
        "tetris-battle": "▦",
        "typing-race": "⌨",
        "tank-battle": "▣",
      } as Record<string, string>
    )[room?.gameId ?? ""];
  const rules: Record<string, string> = {
    "tic-tac-toe":
      "Take turns placing your mark. Be first to line up three horizontally, vertically, or diagonally. The starting player alternates each round.",
    "connect-four":
      "Drop a disc into a column. Connect four horizontally, vertically, or diagonally to win.",
    dama: "Move diagonally and jump an opponent piece to capture it. Reach the far side to crown a king.",
    pong: "Move your paddle up and down over the court to return the ball. Miss it and your opponent scores. First to five points wins.",
    "snake-battle":
      "Steer your snake continuously with the arrow keys or WASD. Eat the glowing food to grow; crash into a wall or either snake and you lose.",
    battleship:
      "Take turns firing at the grid. Find all 17 hidden fleet squares to win.",
    chess:
      "Move pieces by their standard movement patterns and capture the opposing king to win. Check, castling, and en passant are not included yet.",
    "tetris-battle":
      "Your pieces fall in real time. Move, rotate, or hard drop to clear five lines before your opponent.",
    "typing-race": "Type the shared passage exactly. First to finish wins.",
    "tank-battle":
      "Take one action each turn: move one square forward, turn left or right, or fire straight ahead. Use the arrow keys or WASD to act; press Space or F to fire. Line up your tank before shooting.",
  };
  const turnText = result
    ? room?.seriesComplete
      ? room.seriesWinnerId === playerId
        ? "Series champion"
        : room.seriesWinnerId
          ? "Opponent wins the series"
          : "Series tied"
      : result.status === "DRAW"
        ? "Round drawn"
        : result.winnerId === playerId
          ? "You won this round"
          : "Opponent won this round"
    : room?.gameId === "tetris-battle" && room.status === "PLAYING"
      ? "Pieces are falling · move, rotate, and drop at the same time"
      : room?.gameId === "typing-race" && room.status === "PLAYING"
        ? "Type the passage · first to finish wins"
        : room?.status === "COUNTDOWN"
          ? gameState?.turnPlayerId === playerId
            ? "You start this round · get ready…"
            : "Opponent starts this round · get ready…"
          : room?.status === "PLAYING"
            ? gameState?.turnPlayerId === playerId
              ? "Your turn"
              : "Opponent’s turn"
            : "Waiting for players";

  const create = () => {
    setNotice("");
    setRoundLimit(3);
    setResult(undefined);
    setGameState(undefined);
    setStartedAt(undefined);
    socket.emit("room:create", { playerId, username, gameId: selectedGame });
  };
  const join = () => {
    if (joinCode.trim()) {
      setNotice("");
      socket.emit("room:join", { code: joinCode.trim(), playerId, username });
    }
  };
  const ready = () =>
    room &&
    socket.emit("room:ready", { code: room.code, playerId, ready: true });
  const playAgain = () =>
    room && socket.emit("room:rematch", { code: room.code, playerId });
  const start = () => {
    if (!room) return;
    setResult(undefined);
    setGameState(undefined);
    setElapsed(0);
    setStartedAt(undefined);
    socket.emit("room:start", { code: room.code, playerId });
  };
  const play = (input: unknown) =>
    room && socket.emit("game:input", { code: room.code, playerId, input });
  const copy = async () => {
    if (!room) return;
    try {
      await navigator.clipboard.writeText(room.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setNotice("Couldn’t copy the room code. Select it to copy manually.");
    }
  };
  const leave = () => {
    if (room) socket.emit("room:leave", { code: room.code, playerId });
    setRoom(undefined);
    setGameState(undefined);
    setResult(undefined);
    setStartedAt(undefined);
    setElapsed(0);
    setNotice("");
  };
  const time = `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`;

  return (
    <main className="min-h-screen overflow-y-auto px-4 pb-8 sm:px-6">
      <header className="mx-auto flex h-[68px] max-w-6xl items-center justify-between border-b border-white/[.08]">
        <a
          href="#"
          onClick={(event) => {
            event.preventDefault();
            leave();
          }}
          className="flex items-center gap-2.5 text-zinc-100"
        >
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-violet-400/15 text-violet-300">
            <Gamepad2 size={19} />
          </span>
          <span className="font-bold tracking-tight">ArcadeNet</span>
        </a>
        <div
          className="flex items-center gap-2 text-xs text-zinc-400"
          aria-live="polite"
        >
          {connected ? (
            <Wifi size={14} className="text-emerald-400" />
          ) : (
            <WifiOff size={14} className="text-rose-400" />
          )}
          <span>{connected ? "Connected" : "Offline"}</span>
        </div>
      </header>

      {notice && (
        <div
          role="status"
          className="mx-auto mt-4 flex max-w-6xl items-center gap-2 rounded-lg border border-amber-300/20 bg-amber-300/[.07] px-3 py-2 text-sm text-amber-100"
        >
          <LoaderCircle size={15} className="shrink-0" />
          {notice}
        </div>
      )}

      {!room ? (
        <section className="mx-auto grid max-w-6xl gap-8 py-9 md:grid-cols-[.9fr_1.1fr] md:gap-12 md:py-12">
          <div className="self-center">
            <p className="text-xs font-semibold uppercase tracking-[.18em] text-violet-300">
              Two-player arcade
            </p>
            <h1 className="mt-3 max-w-lg text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl">
              A good game is better together.
            </h1>
            <p className="mt-3 max-w-md text-sm leading-6 text-zinc-400">
              Pick a game, invite a friend, and meet at the board.
            </p>
            <div className="mt-6 flex flex-wrap gap-2.5">
              <button
                onClick={create}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-violet-500 px-4 text-sm font-semibold text-white transition hover:bg-violet-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-300"
              >
                Create room
              </button>
              <form
                className="flex"
                onSubmit={(event) => {
                  event.preventDefault();
                  join();
                }}
              >
                <label className="sr-only" htmlFor="room-code">
                  Room code
                </label>
                <input
                  id="room-code"
                  value={joinCode}
                  onChange={(e) =>
                    setJoinCode(e.target.value.toUpperCase().slice(0, 5))
                  }
                  placeholder="ROOM CODE"
                  maxLength={5}
                  className="min-h-11 w-36 rounded-l-lg border border-white/10 bg-white/[.04] px-3 text-sm tracking-widest text-white outline-none placeholder:text-zinc-600 focus:border-violet-400"
                />
                <button
                  type="submit"
                  className="min-h-11 rounded-r-lg border border-l-0 border-white/10 px-4 text-sm font-semibold text-zinc-200 transition hover:bg-white/[.07]"
                >
                  Join
                </button>
              </form>
            </div>
          </div>
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-200">
                Choose your game
              </h2>
              <span className="text-xs text-zinc-500">2 players</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {games.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setSelectedGame(g.id)}
                  aria-pressed={selectedGame === g.id}
                  className={`min-h-[84px] rounded-xl border p-3.5 text-left transition focus-visible:outline-2 focus-visible:outline-violet-300 ${selectedGame === g.id ? "border-violet-400/60 bg-violet-400/[.09]" : "border-white/[.08] bg-white/[.025] hover:border-white/20 hover:bg-white/[.045]"}`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-zinc-100">
                      {g.name}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider text-zinc-500">
                      {g.category}
                    </span>
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-zinc-500">
                    {g.description}
                  </span>
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs text-zinc-600">
              Choose a game, create a room, and invite a friend to play.
            </p>
          </div>
        </section>
      ) : (
        <section
          className={`mx-auto pt-5 sm:pt-7 ${room.gameId === "tetris-battle" ? "w-full max-w-[1900px]" : "max-w-4xl"}`}
        >
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <button
              onClick={leave}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg px-2 text-sm text-zinc-400 transition hover:bg-white/[.05] hover:text-white"
            >
              <ArrowLeft size={16} />
              Leave room
            </button>
            <button
              onClick={copy}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-white/[.09] px-3 text-xs text-zinc-300 transition hover:bg-white/[.05]"
              title="Copy room code"
            >
              Room{" "}
              <span className="font-mono font-bold tracking-[.15em] text-white">
                {room.code}
              </span>
              {copied ? (
                <Check size={14} className="text-emerald-400" />
              ) : (
                <Copy size={14} />
              )}
            </button>
          </div>

          <div
            className={`grid gap-4 ${room.gameId === "tetris-battle" ? "grid-cols-1" : "md:grid-cols-[minmax(0,1fr)_220px]"}`}
          >
            <section
              className={`rounded-xl border p-4 sm:p-6 ${gameSkin[room.gameId]}`}
              aria-label={`${gameName} match`}
            >
              {room.gameId !== "tetris-battle" && (
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[.16em] text-violet-300">
                      {gameName}
                    </div>
                    <h1 className="mt-1 text-xl font-semibold tracking-tight text-white">
                      Match room
                    </h1>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[.05] px-2.5 py-1 text-[11px] text-zinc-400">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${room.status === "PLAYING" ? "bg-emerald-400" : room.status === "FINISHED" ? "bg-violet-300" : "bg-amber-300"}`}
                    />
                    {room.status === "PLAYING"
                      ? "In progress"
                      : room.status === "FINISHED"
                        ? "Complete"
                        : room.status === "COUNTDOWN"
                          ? "Starting"
                          : "Waiting"}
                  </span>
                </div>
              )}

              {room.gameId !== "tetris-battle" && (
                <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-lg border border-white/[.06] bg-black/20 p-3 sm:p-4">
                  <div
                    className={`min-w-0 ${gameState?.turnPlayerId === playerId && !result ? "" : "opacity-65"}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-sky-400/10 text-sm font-bold text-sky-300">
                        {myMark ?? "·"}
                      </span>
                      <span className="truncate text-sm font-semibold text-white">
                        {currentPlayer?.username ?? username}
                        <span className="ml-1.5 text-[10px] font-normal text-zinc-500">
                          you
                        </span>
                      </span>
                    </div>
                    <div className="ml-10 mt-0.5 text-[11px] text-zinc-500">
                      {gameState?.turnPlayerId === playerId &&
                      room.status === "PLAYING" &&
                      !result
                        ? "Playing now"
                        : "Player 1"}
                    </div>
                  </div>
                  <div className="px-1 text-center">
                    <div className="text-lg font-bold tabular-nums text-white">
                      {room.scores[opponent?.id ?? ""] ?? 0}
                      <span className="mx-1.5 text-zinc-600">–</span>
                      {room.scores[playerId] ?? 0}
                    </div>
                    <div className="mt-0.5 text-[9px] uppercase tracking-wider text-zinc-600">
                      Opponent · You
                    </div>
                  </div>
                  <div
                    className={`min-w-0 text-right ${gameState?.turnPlayerId !== playerId && room.status === "PLAYING" && !result ? "" : "opacity-65"}`}
                  >
                    <div className="flex items-center justify-end gap-2">
                      <span className="truncate text-sm font-semibold text-white">
                        {opponent?.username ?? "Waiting for player"}
                      </span>
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-rose-400/10 text-sm font-bold text-rose-300">
                        {opponent
                          ? (gameState?.marks?.[opponent.id] ?? myMark)
                          : "·"}
                      </span>
                    </div>
                    <div className="mr-10 mt-0.5 text-[11px] text-zinc-500">
                      {opponent ? "Player 2" : "Invite with room code"}
                    </div>
                  </div>
                </div>
              )}

              {room.gameId !== "tetris-battle" && (
                <div
                  className="my-4 flex min-h-12 items-center justify-center rounded-lg bg-violet-400/[.07] px-3 text-center"
                  aria-live="polite"
                >
                  <span className="text-sm font-semibold text-violet-100">
                    {turnText}
                  </span>
                  {!connected && (
                    <span className="ml-2 text-xs text-rose-300">
                      · reconnecting
                    </span>
                  )}
                </div>
              )}

              <GameBoard
                gameId={room.gameId}
                state={gameState}
                playerId={playerId}
                status={room.status}
                onMove={play}
                onPlayAgain={playAgain}
                waitingForRematch={currentPlayer?.ready}
                playerNames={playerNames}
              />

              <div className="mt-4 flex items-center justify-center gap-6 text-xs text-zinc-500">
                <span>
                  <span className="text-zinc-300">{moveCount}</span> moves
                </span>
                <span>
                  <span className="text-zinc-300">{time}</span> elapsed
                </span>
              </div>
              {result && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 rounded-lg border border-violet-300/15 bg-violet-300/[.06] p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-white">
                        {turnText}
                      </div>
                      <div className="mt-0.5 text-xs text-zinc-400">
                        {moveCount} moves · {time} played · Series score{" "}
                        {room.scores[opponent?.id ?? ""] ?? 0}–
                        {room.scores[playerId] ?? 0}
                      </div>
                    </div>
                    {!room.seriesComplete && (
                      <div className="flex flex-wrap items-center gap-2">
                        {currentPlayer && !currentPlayer.ready && (
                          <button
                            onClick={ready}
                            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-white/10 px-3 text-xs font-semibold text-zinc-200 hover:bg-white/[.06]"
                          >
                            <Check size={14} />
                            Ready for next round
                          </button>
                        )}
                        {currentPlayer?.ready && room.status !== "READY" && (
                          <span className="text-xs text-zinc-400">
                            Waiting for opponent to ready up
                          </span>
                        )}
                        {room.hostId === playerId &&
                          room.status === "READY" && (
                            <button
                              onClick={start}
                              className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-violet-500 px-3 text-xs font-semibold text-white hover:bg-violet-400"
                            >
                              <RotateCcw size={14} />
                              Start next round
                            </button>
                          )}
                      </div>
                    )}
                  </div>
                  {room.seriesComplete && (
                    <div className="mt-3 flex items-start gap-3 rounded-lg border border-amber-300/15 bg-amber-200/[.06] p-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-amber-300/10 text-amber-200">
                        <Trophy size={18} />
                      </span>
                      <div>
                        <div className="text-sm font-semibold text-amber-100">
                          {room.seriesWinnerId === playerId
                            ? "A brilliant series victory!"
                            : room.seriesWinnerId
                              ? "A hard-fought series"
                              : "A well-matched series"}
                        </div>
                        <p className="mt-1 text-xs leading-5 text-zinc-300">
                          {room.seriesWinnerId === playerId
                            ? "You outplayed a worthy opponent across the series. Excellent focus and strategy—you earned this win!"
                            : room.seriesWinnerId
                              ? "Your opponent took this series, but you made them work for every round. Bring that focus into the next match."
                              : "You were evenly matched through all the rounds. A well-earned draw for both players!"}
                        </p>
                      </div>
                      {room.gameId !== "tetris-battle" && (
                        <button
                          onClick={playAgain}
                          disabled={currentPlayer?.ready}
                          className="ml-auto inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg bg-violet-500 px-3 text-xs font-semibold text-white transition hover:bg-violet-400 disabled:cursor-default disabled:bg-white/10 disabled:text-zinc-400"
                        >
                          <RotateCcw size={14} />
                          {currentPlayer?.ready ? "Waiting…" : "Play again"}
                        </button>
                      )}
                    </div>
                  )}
                </motion.div>
              )}
            </section>

            <aside
              className={`grid content-start gap-3 ${room.gameId === "tetris-battle" ? "md:grid-cols-3" : ""}`}
            >
              <section className="rounded-xl border border-white/[.09] bg-[#111116] p-4">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Match details
                </h2>
                <dl className="mt-3 space-y-3 text-xs">
                  <div className="flex justify-between">
                    <dt className="text-zinc-500">Room</dt>
                    <dd className="font-mono tracking-wider text-zinc-200">
                      {room.code}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-zinc-500">Format</dt>
                    <dd className="text-zinc-200">
                      {room.roundLimit
                        ? `${room.roundLimit} rounds`
                        : "Single match"}
                    </dd>
                  </div>
                  {room.roundLimit && (
                    <div className="flex justify-between">
                      <dt className="text-zinc-500">Rounds played</dt>
                      <dd className="text-zinc-200">
                        {room.roundsCompleted}/{room.roundLimit}
                      </dd>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <dt className="text-zinc-500">Moves</dt>
                    <dd className="text-zinc-200">{moveCount}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-zinc-500">Duration</dt>
                    <dd className="text-zinc-200">{time}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-zinc-500">Players</dt>
                    <dd className="inline-flex items-center gap-1 text-zinc-200">
                      <Users size={13} />
                      {players.length}/2
                    </dd>
                  </div>
                </dl>
              </section>
              {!gameState && (
                <section className="rounded-xl border border-white/[.09] bg-[#111116] p-4">
                  <h2 className="text-xs font-semibold text-zinc-200">
                    Set up this match
                  </h2>
                  <p className="mt-1 text-xs leading-5 text-zinc-500">
                    Both players need to ready up before the host can start.
                  </p>
                  {roundSeriesGames.includes(room.gameId) && (
                    <div className="mt-3 rounded-lg border border-violet-300/15 bg-violet-300/[.045] p-3">
                      <div className="text-xs font-semibold text-zinc-200">
                        {games.find((game) => game.id === room.gameId)?.name ??
                          "Game"}{" "}
                        series length
                      </div>
                      {room.hostId === playerId ? (
                        <>
                          <p className="mt-1 text-[11px] leading-4 text-zinc-500">
                            Choose the number of rounds before either player
                            readies up.
                          </p>
                          <div className="mt-2 flex items-center gap-2">
                            <label
                              htmlFor="room-round-count"
                              className="text-xs text-zinc-400"
                            >
                              Rounds
                            </label>
                            <input
                              id="room-round-count"
                              type="number"
                              min={1}
                              max={99}
                              value={roundLimit}
                              disabled={
                                players.some((player) => player.ready) ||
                                room.status !== "WAITING"
                              }
                              onChange={(event) =>
                                setRoundLimit(
                                  Math.max(
                                    1,
                                    Math.min(
                                      99,
                                      Number(event.target.value) || 1,
                                    ),
                                  ),
                                )
                              }
                              className="h-9 w-20 rounded-md border border-white/10 bg-black/20 px-2 text-center text-sm font-semibold text-white outline-none focus:border-violet-400 disabled:opacity-50"
                            />
                            <button
                              onClick={() =>
                                socket.emit("room:rounds", {
                                  code: room.code,
                                  playerId,
                                  rounds: roundLimit,
                                })
                              }
                              disabled={
                                players.some((player) => player.ready) ||
                                room.status !== "WAITING"
                              }
                              className="min-h-9 rounded-md border border-violet-300/20 px-3 text-xs font-semibold text-violet-100 hover:bg-violet-300/10 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              {room.roundLimit ? "Update rounds" : "Set rounds"}
                            </button>
                          </div>
                        </>
                      ) : (
                        <p className="mt-1 text-xs text-zinc-400">
                          {room.roundLimit
                            ? `${room.roundLimit} rounds selected by the host`
                            : "Waiting for the host to choose the number of rounds."}
                        </p>
                      )}
                    </div>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {players.map((p) => (
                      <span
                        key={p.id}
                        className="rounded-md bg-white/[.05] px-2 py-1 text-[11px] text-zinc-300"
                      >
                        {p.username} · {p.ready ? "Ready" : "Waiting"}
                      </span>
                    ))}
                  </div>
                  {currentPlayer &&
                    !currentPlayer.ready &&
                    (!roundSeriesGames.includes(room.gameId) ||
                      room.roundLimit !== undefined) && (
                      <button
                        onClick={ready}
                        className="mt-3 min-h-10 w-full rounded-lg bg-white px-3 text-xs font-semibold text-zinc-900 transition hover:bg-zinc-200"
                      >
                        Ready up
                      </button>
                    )}
                  {roundSeriesGames.includes(room.gameId) &&
                    room.roundLimit === undefined && (
                      <p className="mt-3 text-[11px] text-amber-200/80">
                        The host must set the round count before players can
                        ready up.
                      </p>
                    )}
                  {room.hostId === playerId &&
                    players.length === 2 &&
                    players.every((p) => p.ready) && (
                      <button
                        onClick={start}
                        disabled={room.status === "COUNTDOWN"}
                        className="mt-2 min-h-10 w-full rounded-lg bg-violet-500 px-3 text-xs font-semibold text-white transition hover:bg-violet-400 disabled:opacity-50"
                      >
                        {room.status === "COUNTDOWN"
                          ? "Starting…"
                          : "Start match"}
                      </button>
                    )}
                </section>
              )}
              <section className="rounded-xl border border-white/[.09] bg-[#111116] p-4">
                <h2 className="text-xs font-semibold text-zinc-200">
                  How to play
                </h2>
                <p className="mt-1 text-xs leading-5 text-zinc-500">
                  {rules[room.gameId] ??
                    "Play by the game’s rules and outscore your opponent."}
                </p>
              </section>
              {room.seriesComplete && (
                <div className="rounded-lg border border-amber-300/15 bg-amber-200/[.06] p-3 text-xs text-amber-100">
                  Series complete ·{" "}
                  {room.seriesWinnerId
                    ? `${players.find((p) => p.id === room.seriesWinnerId)?.username} wins`
                    : "Draw"}
                </div>
              )}
            </aside>
          </div>
        </section>
      )}
      <footer className="mx-auto mt-8 flex max-w-6xl justify-between border-t border-white/[.07] pt-4 text-[11px] text-zinc-600">
        <span>ArcadeNet</span>
        <span>Play fair. Have fun.</span>
      </footer>
      <Analytics />
    </main>
  );
}

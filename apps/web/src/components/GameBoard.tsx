import { useEffect, useState, type PointerEvent, type ReactNode } from "react";
import type { GameId, RoomStatus } from "@arcadenet/shared";

type Props = {
  gameId: GameId;
  state: any;
  playerId: string;
  status: RoomStatus;
  onMove: (input: any) => void;
  onPlayAgain?: () => void;
  waitingForRematch?: boolean;
  playerNames?: Record<string, string>;
};
type Square = { row: number; col: number };
const chessGlyph: Record<string, string> = {
  K: "♚",
  Q: "♛",
  R: "♜",
  B: "♝",
  N: "♞",
  P: "♟",
};
const tetrominoes = [
  [
    [1, 0],
    [1, 1],
    [1, 2],
    [1, 3],
  ],
  [
    [0, 0],
    [0, 1],
    [1, 0],
    [1, 1],
  ],
  [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, 2],
  ],
  [
    [0, 1],
    [0, 2],
    [1, 0],
    [1, 1],
  ],
  [
    [0, 0],
    [0, 1],
    [1, 1],
    [1, 2],
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
const tetrominoColors = [
  "bg-cyan-300 border-cyan-100/60",
  "bg-yellow-300 border-yellow-100/60",
  "bg-violet-400 border-violet-100/60",
  "bg-emerald-400 border-emerald-100/60",
  "bg-rose-400 border-rose-100/60",
  "bg-blue-400 border-blue-100/60",
  "bg-orange-400 border-orange-100/60",
];
const tetrominoGhostColors = [
  "#67e8f9",
  "#fde047",
  "#c4b5fd",
  "#6ee7b7",
  "#fda4af",
  "#93c5fd",
  "#fdba74",
];
function tetrisShape(type: number, turns: number) {
  let shape = tetrominoes[type % tetrominoes.length].map(([row, col]) => [
    row,
    col,
  ]);
  for (let turn = 0; turn < turns; turn++) {
    const maxRow = Math.max(...shape.map(([row]) => row));
    shape = shape.map(([row, col]) => [col, maxRow - row]);
    const minRow = Math.min(...shape.map(([row]) => row)),
      minCol = Math.min(...shape.map(([, col]) => col));
    shape = shape.map(([row, col]) => [row - minRow, col - minCol]);
  }
  const minRow = Math.min(...shape.map(([row]) => row)),
    minCol = Math.min(...shape.map(([, col]) => col));
  return shape.map(([row, col]) => [row - minRow, col - minCol]);
}

export default function GameBoard({
  gameId,
  state,
  playerId,
  status,
  onMove,
  onPlayAgain,
  waitingForRematch = false,
  playerNames = {},
}: Props) {
  const [selected, setSelected] = useState<Square | null>(null);
  const [typingDraft, setTypingDraft] = useState("");
  const [bestScore, setBestScore] = useState(() =>
    Number(localStorage.getItem(`arcadenet:tetris-best:${playerId}`) ?? 0),
  );
  useEffect(() => {
    setTypingDraft("");
  }, [gameId, state?.text]);
  useEffect(() => {
    const score = state?.scores?.[playerId] ?? 0;
    if (score > bestScore) {
      setBestScore(score);
      localStorage.setItem(`arcadenet:tetris-best:${playerId}`, String(score));
    }
  }, [state?.scores, playerId, bestScore]);
  const canAct =
    status === "PLAYING" &&
    (gameId === "tetris-battle" ||
      gameId === "pong" ||
      gameId === "snake-battle" ||
      state?.turnPlayerId === playerId) &&
    !state?.winnerId &&
    !state?.draw;
  useEffect(() => {
    if (
      (gameId !== "tetris-battle" &&
        gameId !== "snake-battle" &&
        gameId !== "tank-battle") ||
      status !== "PLAYING" ||
      state?.winnerId ||
      state?.draw
    )
      return;
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement)?.matches("input, textarea")) return;
      const key = event.key.toLowerCase();
      const tetrisActions: Record<string, string> = {
        ArrowLeft: "left",
        a: "left",
        ArrowRight: "right",
        d: "right",
        ArrowDown: "down",
        s: "down",
        ArrowUp: "rotate",
        w: "rotate",
        c: "hold",
        " ": "hard-drop",
        Enter: "hard-drop",
      };
      const snakeDirections: Record<string, string> = {
        ArrowLeft: "left",
        a: "left",
        ArrowRight: "right",
        d: "right",
        ArrowDown: "down",
        s: "down",
        ArrowUp: "up",
        w: "up",
      };
      const tankActions: Record<string, string> = {
        ArrowUp: "move",
        w: "move",
        ArrowLeft: "left",
        a: "left",
        ArrowRight: "right",
        d: "right",
        " ": "fire",
        f: "fire",
      };
      const direction = snakeDirections[event.key] ?? snakeDirections[key];
      if (gameId === "snake-battle" && !direction) return;
      const action =
        gameId === "snake-battle"
          ? undefined
          : (tetrisActions[event.key] ?? tetrisActions[key]);
      const tankAction = tankActions[event.key] ?? tankActions[key];
      if (gameId === "tetris-battle" && !action) return;
      if (gameId === "tank-battle" && !tankAction) return;
      event.preventDefault();
      onMove(
        gameId === "snake-battle"
          ? { direction }
          : gameId === "tank-battle"
            ? { action: tankAction }
            : { action },
      );
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [gameId, status, state?.winnerId, onMove]);
  if (!state && gameId === "tetris-battle") {
    const opponentId =
      Object.keys(playerNames).find((id) => id !== playerId) ?? "opponent";
    const previewPlayers = [playerId, opponentId];
    return (
      <div className="tetris-duel mx-auto w-full rounded-2xl border border-cyan-300/25 p-3 shadow-[0_16px_60px_rgba(8,145,178,.12)] sm:p-6">
        <header className="tetris-game-title">
          <h2>Tetris</h2>
          <span>DUEL MODE · FIRST TO 5 LINES</span>
        </header>
        <div className="tetris-stage">
          <aside className="tetris-side tetris-side--player">
            <HudCard label="HOLD">
              <PiecePreview type={null} />
            </HudCard>
            <HudCard label="SCORE">
              <strong className="tetris-number">0</strong>
            </HudCard>
            <HudCard label="BEST">
              <strong className="tetris-number tetris-number--gold">
                {bestScore.toLocaleString()}
              </strong>
            </HudCard>
            <HudCard label="CONTROLS">
              <div className="tetris-key-hints">
                <span>
                  <kbd>← →</kbd> Move
                </span>
                <span>
                  <kbd>↑</kbd> Rotate
                </span>
                <span>
                  <kbd>↓</kbd> Soft drop
                </span>
                <span>
                  <kbd>SPC</kbd> Hard drop
                </span>
                <span>
                  <kbd>C</kbd> Hold
                </span>
              </div>
            </HudCard>
          </aside>
          <div className="tetris-boards">
            {previewPlayers.map((id, index) => {
              const isMe = index === 0;
              return (
                <section className="tetris-board-player" key={id}>
                  <div
                    className={`tetris-player-name ${isMe ? "is-you" : "is-rival"}`}
                  >
                    {playerNames[id] ?? (isMe ? "You" : "Waiting for player")}
                  </div>
                  <div
                    className="tetris-board-frame"
                    role="img"
                    aria-label={`${isMe ? "Your" : "Opponent's"} empty Tetris playfield preview`}
                  >
                    <div className="tetris-board-cells">
                      {Array.from({ length: 200 }, (_, cell) => (
                        <i key={cell} />
                      ))}
                    </div>
                  </div>
                  <span className="tetris-board-caption">
                    10 × 20 PLAYFIELD
                  </span>
                </section>
              );
            })}
          </div>
          <aside className="tetris-side tetris-side--opponent">
            <HudCard label="NEXT">
              <PiecePreview type={null} />
            </HudCard>
            <HudCard label="LEVEL">
              <strong className="tetris-number tetris-number--cyan">1</strong>
            </HudCard>
            <HudCard label="LINES">
              <strong className="tetris-number">0</strong>
            </HudCard>
            <HudCard label="PROGRESS">
              <div className="tetris-progress">
                <i />
                <span>0 / 5 LINES</span>
              </div>
            </HudCard>
          </aside>
        </div>
        <div className="tetris-lobby-status">
          <span className="tetris-status-dot" />
          Waiting for both players to ready up
        </div>
      </div>
    );
  }
  if (!state)
    return (
      <div className="mx-auto flex min-h-28 w-full max-w-[420px] items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[.015] px-4 text-center text-xs text-zinc-500">
        The {gameId === "tic-tac-toe" ? "board" : "game board"} will be ready
        when the match starts.
      </div>
    );

  if (gameId === "tic-tac-toe")
    return (
      <div
        className="mx-auto grid w-full max-w-[342px] grid-cols-3 gap-2"
        role="group"
        aria-label="Tic-Tac-Toe board"
      >
        {state.board.map((mark: string | null, index: number) => (
          <button
            key={index}
            disabled={!canAct || Boolean(mark)}
            onClick={() => onMove({ index })}
            aria-label={`Square ${index + 1}${mark ? `: ${mark}` : ""}`}
            className={`aspect-square min-h-[76px] rounded-lg border text-4xl font-semibold transition sm:text-5xl ${mark === "X" ? "border-sky-300/15 bg-sky-300/[.06] text-sky-300" : mark === "O" ? "border-rose-300/15 bg-rose-300/[.06] text-rose-300" : canAct ? "border-white/[.09] bg-white/[.025] hover:border-violet-300/40" : "border-white/[.07] bg-white/[.02]"}`}
          >
            {mark}
          </button>
        ))}
      </div>
    );

  if (gameId === "connect-four")
    return (
      <div
        className="mx-auto grid w-full max-w-[420px] grid-cols-7 gap-1 rounded-xl border border-blue-300/15 bg-blue-950/50 p-2 sm:gap-2 sm:p-3"
        role="group"
        aria-label="Connect Four board"
      >
        {state.board.map((mark: string | null, index: number) => (
          <button
            key={index}
            disabled={!canAct || state.board[index % 7] !== null}
            onClick={() => onMove({ column: index % 7 })}
            aria-label={`Row ${Math.floor(index / 7) + 1}, column ${(index % 7) + 1}${mark ? `: ${mark}` : ""}`}
            className="aspect-square rounded-full border border-white/10 bg-[#09090b] disabled:cursor-default"
          >
            {mark && (
              <span
                className={`mx-auto block h-4/5 w-4/5 rounded-full ${mark === "R" ? "bg-rose-400" : "bg-amber-300"}`}
              />
            )}
          </button>
        ))}
      </div>
    );

  if (gameId === "dama")
    return (
      <div className="mx-auto grid w-full max-w-[400px] grid-cols-8 overflow-hidden rounded-lg border border-white/10">
        {state.board.map((piece: any, index: number) => {
          const row = Math.floor(index / 8),
            col = index % 8,
            active = selected?.row === row && selected?.col === col;
          return (
            <button
              key={index}
              disabled={!canAct}
              onClick={() => {
                if (!canAct) return;
                if (selected) {
                  if (selected.row === row && selected.col === col) {
                    setSelected(null);
                    return;
                  }
                  onMove({ from: selected, to: { row, col } });
                  setSelected(null);
                } else if (piece?.owner === playerId) setSelected({ row, col });
              }}
              aria-label={`Row ${row + 1}, column ${col + 1}${piece ? `, ${piece.king ? "king " : ""}piece` : ""}`}
              className={`aspect-square grid place-items-center ${(row + col) % 2 ? "bg-zinc-700" : "bg-zinc-300"} ${active ? "ring-2 ring-inset ring-violet-400" : ""}`}
            >
              {piece && (
                <span
                  className={`grid h-[70%] w-[70%] place-items-center rounded-full border-2 shadow ${piece.owner === playerId ? "border-sky-200 bg-sky-500 text-white" : "border-rose-200 bg-rose-500 text-white"}`}
                >
                  {piece.king ? "♛" : ""}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );

  if (gameId === "pong") {
    const myIndex = state.players.indexOf(playerId),
      myColor = myIndex === 0 ? "#67e8f9" : "#fb7185",
      rivalColor = myIndex === 0 ? "#fb7185" : "#67e8f9";
    const movePaddle = (event: PointerEvent<SVGSVGElement>) => {
      if (!canAct) return;
      const rect = event.currentTarget.getBoundingClientRect();
      onMove({
        paddleY: Math.max(
          58,
          Math.min(542, ((event.clientY - rect.top) / rect.height) * 600),
        ),
      });
    };
    return (
      <div className="mx-auto w-full max-w-[760px] rounded-2xl border border-emerald-300/20 bg-[#06120f] p-3 shadow-[0_18px_55px_rgba(16,185,129,.08)] sm:p-5">
        <div className="mb-3 flex items-center justify-between text-xs text-zinc-400">
          <span>
            RALLY <b className="ml-1 text-emerald-200">{state.rally ?? 0}</b>
          </span>
          <span className="text-[10px] uppercase tracking-[.18em]">
            First to 5
          </span>
        </div>
        <div className="mb-3 grid grid-cols-[1fr_auto_1fr] items-center rounded-lg border border-white/[.07] bg-black/20 px-4 py-2 text-center">
          <div className="text-left">
            <span className="block text-[9px] font-bold tracking-[.18em] text-cyan-200">
              {state.players[0] === playerId ? "YOU" : "OPPONENT"}
            </span>
            <b className="text-2xl text-white">
              {state.score[state.players[0]]}
            </b>
          </div>
          <span className="text-zinc-600">—</span>
          <div className="text-right">
            <span className="block text-[9px] font-bold tracking-[.18em] text-rose-300">
              {state.players[1] === playerId ? "YOU" : "OPPONENT"}
            </span>
            <b className="text-2xl text-white">
              {state.score[state.players[1]]}
            </b>
          </div>
        </div>
        <svg
          viewBox="0 0 1000 600"
          preserveAspectRatio="none"
          role="img"
          aria-label="Real-time Pong match. Move your pointer up and down over the court to control your paddle."
          onPointerMove={movePaddle}
          onPointerDown={movePaddle}
          className={`block aspect-[5/3] w-full rounded-xl border border-emerald-200/20 bg-[#03100d] ${canAct ? "cursor-none touch-none" : ""}`}
        >
          <defs>
            <linearGradient id="pongCourt" x1="0" y1="0" x2="0" y2="1">
              <stop stopColor="#0a2820" />
              <stop offset="1" stopColor="#04120f" />
            </linearGradient>
            <filter
              id="pongGlow"
              x="-200%"
              y="-200%"
              width="500%"
              height="500%"
            >
              <feGaussianBlur stdDeviation="12" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <rect width="1000" height="600" fill="url(#pongCourt)" />
          <path
            d="M500 0V600"
            stroke="#a7f3d0"
            strokeOpacity=".22"
            strokeWidth="4"
            strokeDasharray="12 14"
          />
          <circle
            cx="500"
            cy="300"
            r="88"
            fill="none"
            stroke="#a7f3d0"
            strokeOpacity=".13"
            strokeWidth="4"
          />
          <rect
            x="22"
            y="8"
            width="12"
            height="584"
            rx="6"
            fill={myIndex === 0 ? rivalColor : myColor}
            opacity=".17"
          />
          <rect
            x="966"
            y="8"
            width="12"
            height="584"
            rx="6"
            fill={myIndex === 1 ? rivalColor : myColor}
            opacity=".17"
          />
          <rect
            x="30"
            y={state.paddles[state.players[0]] - 58}
            width="20"
            height="116"
            rx="10"
            fill={state.players[0] === playerId ? myColor : rivalColor}
            filter="url(#pongGlow)"
          />
          <rect
            x="950"
            y={state.paddles[state.players[1]] - 58}
            width="20"
            height="116"
            rx="10"
            fill={state.players[1] === playerId ? myColor : rivalColor}
            filter="url(#pongGlow)"
          />
          <circle
            cx={state.ball.x}
            cy={state.ball.y}
            r="12"
            fill="#f8fafc"
            filter="url(#pongGlow)"
          />
        </svg>
        <div className="mt-3 flex items-center justify-between text-[10px] uppercase tracking-wider text-zinc-500">
          <span
            style={{
              color: state.players[0] === playerId ? myColor : rivalColor,
            }}
          >
            {state.players[0] === playerId ? "Your paddle" : "Opponent"}
          </span>
          <span>Move pointer up and down over the court</span>
          <span
            style={{
              color: state.players[1] === playerId ? myColor : rivalColor,
            }}
          >
            {state.players[1] === playerId ? "Your paddle" : "Opponent"}
          </span>
        </div>
      </div>
    );
  }

  if (gameId === "snake-battle")
    return (
      <div className="mx-auto w-full max-w-[520px] rounded-2xl border border-lime-300/20 bg-[#07150d] p-3 shadow-[0_16px_50px_rgba(132,204,22,.08)] sm:p-5">
        <div className="mb-3 flex items-center justify-between text-[10px] font-bold uppercase tracking-[.18em]">
          <span className="text-emerald-300">
            {playerNames[playerId] ?? "You"} ·{" "}
            {state.snakes[playerId]?.length ?? 0} segments
          </span>
          <span className="text-amber-200">Snake Battle</span>
          <span className="text-rose-300">
            {playerNames[
              state.players.find((id: string) => id !== playerId) ?? ""
            ] ?? "Opponent"}{" "}
            ·{" "}
            {state.snakes[
              state.players.find((id: string) => id !== playerId) ?? ""
            ]?.length ?? 0}{" "}
            segments
          </span>
        </div>
        <div
          className="grid aspect-square grid-cols-[repeat(15,minmax(0,1fr))] overflow-hidden rounded-lg border border-lime-200/20 bg-[#06100a] shadow-[inset_0_0_30px_rgba(0,0,0,.55)]"
          role="img"
          aria-label="Snake Battle arena. Use the arrow keys or WASD to steer your snake."
        >
          {Array.from({ length: state.width * state.height }, (_, index) => {
            const row = Math.floor(index / state.width),
              col = index % state.width,
              food = state.food.row === row && state.food.col === col,
              snake = state.players.find((id: string) =>
                state.snakes[id].some(
                  (part: Square) => part.row === row && part.col === col,
                ),
              ),
              segment = snake
                ? state.snakes[snake].findIndex(
                    (part: Square) => part.row === row && part.col === col,
                  )
                : -1,
              head = segment === 0;
            return (
              <div
                key={index}
                className={`grid place-items-center border border-lime-100/[.045] ${snake ? (snake === playerId ? (head ? "bg-emerald-300 shadow-[0_0_12px_rgba(52,211,153,.6)]" : "bg-emerald-500/80") : head ? "bg-rose-300 shadow-[0_0_12px_rgba(251,113,133,.55)]" : "bg-rose-500/80") : food ? "bg-amber-300 shadow-[0_0_16px_rgba(252,211,77,.7)]" : ""}`}
              >
                {food
                  ? "✦"
                  : head
                    ? state.directions[snake] === "up"
                      ? "▲"
                      : state.directions[snake] === "down"
                        ? "▼"
                        : state.directions[snake] === "left"
                          ? "◀"
                          : "▶"
                    : ""}
              </div>
            );
          })}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 sm:hidden">
          <span />
          <button
            disabled={!canAct}
            onClick={() => onMove({ direction: "up" })}
            className="min-h-11 rounded-lg border border-lime-100/15 text-lg disabled:opacity-40"
          >
            ↑
          </button>
          <span />
          <button
            disabled={!canAct}
            onClick={() => onMove({ direction: "left" })}
            className="min-h-11 rounded-lg border border-lime-100/15 text-lg disabled:opacity-40"
          >
            ←
          </button>
          <button
            disabled={!canAct}
            onClick={() => onMove({ direction: "down" })}
            className="min-h-11 rounded-lg border border-lime-100/15 text-lg disabled:opacity-40"
          >
            ↓
          </button>
          <button
            disabled={!canAct}
            onClick={() => onMove({ direction: "right" })}
            className="min-h-11 rounded-lg border border-lime-100/15 text-lg disabled:opacity-40"
          >
            →
          </button>
        </div>
        <p className="mt-3 text-center text-[10px] uppercase tracking-wider text-zinc-500">
          Arrow keys or WASD to steer · Eat ✦ and avoid walls and snakes
        </p>
      </div>
    );

  if (gameId === "battleship")
    return (
      <div className="mx-auto w-full max-w-[400px]">
        <p className="mb-2 text-center text-xs text-zinc-400">
          Select a square to fire · Hits {state.hits[playerId]}/17
        </p>
        <div className="grid grid-cols-8 gap-1">
          {Array.from({ length: 64 }, (_, index) => {
            const row = Math.floor(index / 8),
              col = index % 8,
              shot = state.shots[playerId].find(
                (x: any) => x.row === row && x.col === col,
              );
            return (
              <button
                key={index}
                disabled={!canAct || Boolean(shot)}
                onClick={() => onMove({ row, col })}
                aria-label={`Fire at row ${row + 1}, column ${col + 1}${shot ? (shot.hit ? ", hit" : ", miss") : ""}`}
                className={`aspect-square rounded border text-xs ${shot ? (shot.hit ? "border-rose-300/20 bg-rose-400/30 text-rose-100" : "border-sky-300/10 bg-sky-400/15 text-sky-200") : "border-white/10 bg-sky-950/35 hover:bg-sky-800/40"}`}
              >
                {shot ? (shot.hit ? "×" : "·") : ""}
              </button>
            );
          })}
        </div>
      </div>
    );

  if (gameId === "chess")
    return (
      <div className="mx-auto grid w-full max-w-[420px] grid-cols-8 overflow-hidden rounded-lg border border-white/10">
        {state.board.map((piece: any, index: number) => {
          const row = Math.floor(index / 8),
            col = index % 8,
            active = selected?.row === row && selected?.col === col;
          return (
            <button
              key={index}
              disabled={!canAct}
              onClick={() => {
                if (!canAct) return;
                if (selected) {
                  if (selected.row === row && selected.col === col) {
                    setSelected(null);
                    return;
                  }
                  if (piece?.owner === playerId) setSelected({ row, col });
                  else {
                    onMove({ from: selected, to: { row, col } });
                    setSelected(null);
                  }
                } else if (piece?.owner === playerId) setSelected({ row, col });
              }}
              aria-label={`Row ${row + 1}, column ${col + 1}${piece ? `, ${piece.type}` : ""}`}
              className={`grid aspect-square place-items-center text-[clamp(1.1rem,5vw,2.3rem)] ${(row + col) % 2 ? "bg-[#64706b]" : "bg-[#d3d8ca]"} ${active ? "ring-2 ring-inset ring-violet-500" : ""} ${piece?.owner === playerId ? "text-sky-100" : "text-zinc-900"}`}
            >
              {piece ? chessGlyph[piece.type] : ""}
            </button>
          );
        })}
      </div>
    );

  if (gameId === "tetris-battle") {
    const opponentId = state.players.find((id: string) => id !== playerId);
    const opponentNext =
      ((state.piecesPlaced?.[opponentId] ?? 0) + 1) % tetrominoes.length;
    return (
      <div className="tetris-duel mx-auto w-full rounded-2xl border border-cyan-300/25 p-3 shadow-[0_16px_60px_rgba(8,145,178,.12)] sm:p-6">
        <header className="tetris-game-title">
          <h2>Tetris</h2>
          <span>ARCADENET · LIVE HEAD-TO-HEAD</span>
        </header>
        <div className="tetris-stage">
          <aside className="tetris-side tetris-side--player">
            <HudCard label="HOLD">
              <PiecePreview type={state.heldPieces?.[playerId] ?? null} />
            </HudCard>
            <HudCard label="SCORE">
              <strong className="tetris-number">
                {state.scores?.[playerId] ?? 0}
              </strong>
            </HudCard>
            <HudCard label="BEST">
              <strong className="tetris-number tetris-number--gold">
                {bestScore.toLocaleString()}
              </strong>
            </HudCard>
            <HudCard label="CONTROLS">
              <div className="tetris-key-hints">
                <span>
                  <kbd>← →</kbd> Move
                </span>
                <span>
                  <kbd>↑</kbd> Rotate
                </span>
                <span>
                  <kbd>↓</kbd> Soft drop
                </span>
                <span>
                  <kbd>SPC</kbd> Hard drop
                </span>
                <span>
                  <kbd>C</kbd> Hold
                </span>
              </div>
              <div className="tetris-touch-controls">
                {[
                  ["←", "left"],
                  ["↓", "down"],
                  ["→", "right"],
                  ["↻", "rotate"],
                  ["DROP", "hard-drop"],
                  ["HOLD", "hold"],
                ].map(([label, action]) => (
                  <button
                    key={action}
                    disabled={!canAct}
                    onClick={() => onMove({ action })}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </HudCard>
          </aside>
          <div className="tetris-arena-grid grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-5">
            {state.players.map((id: string) => {
              const isMe = id === playerId,
                active = canAct && isMe,
                piece = state.activePieces?.[id],
                pieceType = piece?.type ?? 0,
                shape = piece ? tetrisShape(piece.type, piece.rotation) : [],
                fallingCells = new Set<number>(
                  piece
                    ? shape.map(
                        ([row, col]) => (piece.y + row) * 10 + piece.x + col,
                      )
                    : [],
                );
              let landingY = piece?.y ?? 0;
              if (piece) {
                while (
                  shape.every(
                    ([row, col]) =>
                      landingY + row + 1 < 20 &&
                      state.boards[id][
                        (landingY + row + 1) * 10 + piece.x + col
                      ] === null,
                  )
                )
                  landingY++;
              }
              const ghostCells = new Set<number>(
                piece
                  ? shape.map(
                      ([row, col]) => (landingY + row) * 10 + piece.x + col,
                    )
                  : [],
              );
              return (
                <section
                  key={id}
                  className={`tetris-board-player ${isMe ? "tetris-board-player--you" : "tetris-board-player--opponent"}`}
                >
                  <div className="tetris-board-topline">
                    <div
                      className={`tetris-player-name ${isMe ? "is-you" : "is-rival"}`}
                    >
                      {playerNames[id] ?? (isMe ? "You" : "Opponent")}
                    </div>
                    <span className={active ? "is-falling" : "is-live"}>
                      {active ? "LIVE" : "OPPONENT"}
                    </span>
                  </div>
                  <div
                    className="mx-auto w-full"
                    style={{ maxWidth: "min(100%, 38vh)" }}
                  >
                    <div
                      className="tetris-board-grid grid grid-cols-10 gap-px rounded-md border border-cyan-100/25 bg-white/15 p-[3px]"
                      role="img"
                      aria-label={`${playerNames[id] ?? (isMe ? "Your" : "Opponent")}'s Tetris playfield, ${state.lines[id]} lines cleared`}
                    >
                      {state.boards[id].map(
                        (cell: string | null, index: number) => {
                          const isFalling =
                              cell === null && fallingCells.has(index),
                            isGhost =
                              cell === null &&
                              !isFalling &&
                              ghostCells.has(index),
                            type =
                              cell !== null
                                ? Number(cell)
                                : isFalling
                                  ? pieceType
                                  : null;
                          return (
                            <div
                              key={index}
                              className={`tetris-cell aspect-square min-w-0 rounded-[2px] border ${type !== null ? `tetris-cell--filled ${tetrominoColors[type % tetrominoColors.length]} shadow-[inset_0_0_7px_rgba(255,255,255,.18)]` : isGhost ? "tetris-cell--ghost" : "border-white/[.07] bg-[#080e14]"}`}
                              style={
                                isGhost
                                  ? {
                                      borderColor:
                                        tetrominoGhostColors[pieceType],
                                      color: tetrominoGhostColors[pieceType],
                                    }
                                  : undefined
                              }
                            />
                          );
                        },
                      )}
                    </div>
                  </div>
                  <div
                    className={`tetris-board-caption ${isMe ? "is-you" : "is-rival"}`}
                  >
                    {state.lines[id]} LINES CLEARED
                  </div>
                </section>
              );
            })}
          </div>
          <aside className="tetris-side tetris-side--opponent">
            <HudCard label="NEXT">
              <PiecePreview type={opponentNext} />
            </HudCard>
            <HudCard label="LEVEL">
              <strong className="tetris-number tetris-number--cyan">
                {state.levels?.[opponentId] ?? 1}
              </strong>
            </HudCard>
            <HudCard label="LINES">
              <strong className="tetris-number">
                {state.lines?.[opponentId] ?? 0}
              </strong>
            </HudCard>
            <HudCard label="PROGRESS">
              <div className="tetris-progress">
                <i
                  style={{
                    height: `${Math.min(100, ((state.lines?.[opponentId] ?? 0) / 5) * 100)}%`,
                  }}
                />
                <span>{5 - (state.lines?.[opponentId] ?? 0)} TO WIN</span>
              </div>
            </HudCard>
          </aside>
        </div>
        <div className="tetris-match-stats mt-4 flex flex-wrap items-center justify-center gap-4 border-t border-cyan-100/10 pt-3 text-[10px] uppercase tracking-wider text-zinc-500">
          <span>
            You{" "}
            <b className="ml-1 text-cyan-200">{state.lines[playerId] ?? 0}</b>
          </span>
          <span className="text-zinc-700">—</span>
          <span>
            Opponent{" "}
            <b className="ml-1 text-fuchsia-200">
              {state.lines[opponentId] ?? 0}
            </b>
          </span>
          <span className="text-zinc-700">·</span>
          <span>First to five lines wins</span>
        </div>
        {status === "FINISHED" && (
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3 rounded-xl border border-cyan-300/15 bg-cyan-300/[.06] p-4">
            <span className="text-sm font-semibold text-white">
              {state.winnerId === playerId
                ? "Great game—you won!"
                : "Match over. Ready for another?"}
            </span>
            <button
              onClick={onPlayAgain}
              disabled={!onPlayAgain || waitingForRematch}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-cyan-300 px-5 text-sm font-bold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-default disabled:bg-white/10 disabled:text-zinc-400"
            >
              <span aria-hidden="true">↻</span>
              {waitingForRematch ? "Waiting for opponent…" : "Play again"}
            </button>
          </div>
        )}
      </div>
    );
  }

  if (gameId === "typing-race")
    return (
      <div className="mx-auto w-full max-w-[440px]">
        <div className="rounded-xl border border-white/10 bg-white/[.03] p-4 text-sm leading-7 text-zinc-300">
          {state.text}
        </div>
        <label className="mt-3 block text-xs text-zinc-400">
          Type the passage above
          <textarea
            disabled={status !== "PLAYING" || Boolean(state.winnerId)}
            value={
              state.progress[playerId]?.length > typingDraft.length
                ? state.progress[playerId]
                : typingDraft
            }
            onChange={(e) => {
              setTypingDraft(e.target.value);
              onMove({ text: e.target.value });
            }}
            rows={3}
            className="mt-1.5 w-full resize-y rounded-lg border border-white/10 bg-black/20 p-3 text-sm leading-6 text-white outline-none focus:border-violet-400 disabled:opacity-50"
          />
        </label>
        <div className="mt-3 space-y-2">
          {state.players.map((id: string, index: number) => (
            <div key={id}>
              <div className="mb-1 flex justify-between text-[11px] text-zinc-400">
                <span>{id === playerId ? "You" : "Opponent"}</span>
                <span>
                  {state.progress[id].length}/{state.text.length}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded bg-white/10">
                <div
                  className={`h-full ${index ? "bg-rose-400" : "bg-sky-400"}`}
                  style={{
                    width: `${(state.progress[id].length / state.text.length) * 100}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    );

  if (gameId === "tank-battle") {
    const current = state.players.find(
        (id: string) => id === state.turnPlayerId,
      ),
      turnIsMine = current === playerId,
      directionGlyph: Record<string, string> = {
        up: "▲",
        right: "▶",
        down: "▼",
        left: "◀",
      };
    return (
      <div className="mx-auto w-full max-w-[540px] rounded-2xl border border-orange-300/20 bg-[#130d08] p-3 shadow-[0_16px_50px_rgba(249,115,22,.08)] sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.18em] text-orange-200">
              Tank Battle
            </p>
            <p className="mt-1 text-xs text-zinc-400">
              {turnIsMine
                ? "Your turn · blue tank"
                : "Opponent's turn · red tank"}
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-[10px] font-semibold ${turnIsMine ? "bg-cyan-300/10 text-cyan-200" : "bg-rose-300/10 text-rose-200"}`}
          >
            {turnIsMine ? "YOUR MOVE" : "WAITING"}
          </span>
        </div>
        <div
          className="grid grid-cols-8 overflow-hidden rounded-xl border border-orange-100/15 bg-[#090b0c] shadow-[inset_0_0_24px_rgba(0,0,0,.65)]"
          role="img"
          aria-label="Tank Battle 8 by 8 arena"
        >
          <div className="contents">
            {Array.from({ length: 64 }, (_, index) => {
              const row = Math.floor(index / 8),
                col = index % 8,
                tank = state.players.find(
                  (id: string) =>
                    state.tanks[id].row === row && state.tanks[id].col === col,
                ),
                tankState = tank ? state.tanks[tank] : null,
                isYou = tank === playerId;
              return (
                <div
                  key={index}
                  className={`grid aspect-square place-items-center border border-white/[.055] text-lg sm:text-2xl ${tank ? (isYou ? "bg-cyan-400/15" : "bg-rose-400/15") : (row + col) % 2 ? "bg-white/[.018]" : ""}`}
                >
                  {tank && (
                    <span
                      className={`grid h-8 w-8 place-items-center rounded-lg font-black shadow-lg sm:h-10 sm:w-10 ${isYou ? "bg-cyan-300 text-[#071116] shadow-cyan-300/20" : "bg-rose-400 text-[#18080b] shadow-rose-400/20"}`}
                      aria-label={`${isYou ? "Your" : "Opponent's"} tank facing ${tankState.direction}`}
                    >
                      {directionGlyph[tankState.direction]}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <div className="mt-3 rounded-lg border border-orange-100/10 bg-black/20 p-3">
          <p className="text-[10px] font-bold uppercase tracking-[.16em] text-zinc-400">
            Controls · one action per turn
          </p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <span />
            <button
              disabled={!canAct}
              onClick={() => onMove({ action: "move" })}
              className="min-h-11 rounded-lg border border-cyan-200/20 bg-cyan-300/10 text-xs font-semibold text-cyan-100 hover:bg-cyan-300/20 disabled:cursor-not-allowed disabled:opacity-35"
            >
              <kbd className="mr-1">↑</kbd> Move
            </button>
            <span />
            <button
              disabled={!canAct}
              onClick={() => onMove({ action: "left" })}
              className="min-h-11 rounded-lg border border-white/10 text-xs font-semibold text-zinc-200 hover:bg-white/[.06] disabled:cursor-not-allowed disabled:opacity-35"
            >
              <kbd className="mr-1">←</kbd> Turn left
            </button>
            <button
              disabled={!canAct}
              onClick={() => onMove({ action: "fire" })}
              className="min-h-11 rounded-lg border border-rose-300/20 bg-rose-400/10 text-xs font-bold text-rose-100 hover:bg-rose-400/20 disabled:cursor-not-allowed disabled:opacity-35"
            >
              <kbd className="mr-1">Space</kbd> Fire
            </button>
            <button
              disabled={!canAct}
              onClick={() => onMove({ action: "right" })}
              className="min-h-11 rounded-lg border border-white/10 text-xs font-semibold text-zinc-200 hover:bg-white/[.06] disabled:cursor-not-allowed disabled:opacity-35"
            >
              <kbd className="mr-1">→</kbd> Turn right
            </button>
          </div>
          <p className="mt-2 text-center text-[10px] leading-4 text-zinc-500">
            Move advances one square in the direction your tank faces. Turn to
            aim, then fire in a straight line.
          </p>
        </div>
      </div>
    );
  }
  return (
    <p className="text-center text-sm text-zinc-500">Game board unavailable.</p>
  );
}

function HudCard({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="tetris-hud-card">
      <span className="tetris-hud-label">{label}</span>
      {children}
    </section>
  );
}

function PiecePreview({ type }: { type: number | null }) {
  const shape = type === null ? [] : tetrisShape(type, 0);
  const color =
    type === null
      ? ""
      : tetrominoColors[type % tetrominoColors.length].split(" ")[0];
  return (
    <div className="tetris-mini-grid">
      {Array.from({ length: 16 }, (_, index) => {
        const row = Math.floor(index / 4),
          col = index % 4,
          filled = shape.some(([r, c]) => r === row && c === col);
        return <i key={index} className={filled ? color : ""} />;
      })}
    </div>
  );
}

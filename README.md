# ArcadeNet

ArcadeNet is a two-player browser game prototype. The frontend uses React, TypeScript, and Vite; the backend uses NestJS and Socket.IO. Game rooms and live match state are currently stored in server memory.

## Games

The game picker currently includes Tic-Tac-Toe, Connect Four, Dama, Pong, Snake Battle, Battleship, Chess, Tetris Battle, Typing Race, and Tank Battle. Room setup supports host-selected round series for Tic-Tac-Toe, Connect Four, Tank Battle, Chess, Battleship, Snake Battle, Pong, and Dama. Tetris and Typing Race use their own match goals.

Some game rules are still simplified prototypes. In particular, Chess does not yet implement full legal-check rules, and Battleship uses a fixed fleet layout. Review each game's instructions in the room before playing.

## Run locally

Requirements: Node.js 20+ and npm 10+.

```bash
npm install
```

The local defaults work without an environment file. The server reads `PORT` and `CLIENT_URL` from its process environment. `DATABASE_URL` and `JWT_SECRET` are present in the example configuration for Prisma and future authentication work; they are not used by the live room flow.

```bash
npm run dev
```

The Vite app runs at `http://localhost:5173` and the Socket.IO server defaults to `http://localhost:3000`. Open two browser sessions, create or join the same room, choose the round count when available, ready up, and start the match.

## Build

```bash
npm run build
```

## Deploy

The Vercel configuration in `vercel.json` deploys the Vite frontend. The Socket.IO server runs as a separate Render web service described by `render.yaml`.

1. Create a Render Blueprint from this repository's `main` branch. Set `CLIENT_URL` to the Vercel production URL when prompted.
2. In Vercel, deploy the repository from its root and set `VITE_API_URL` to the public Render service URL.

The Render blueprint uses the free plan for prototyping. Free services can spin down while idle, and live rooms are held in server memory, so a server restart clears active rooms and scores.

The project also contains a Prisma schema, seed script, and Docker Compose PostgreSQL service for persistence work. To run those tools, copy `apps/server/.env.example` to `apps/server/.env`, start PostgreSQL with `docker compose up -d`, then run `npm run prisma:generate`, `npm run prisma:migrate`, and `npm run prisma:seed`. The current room and player flow does not use the database; rooms and scores disappear when the server restarts.

## Current limitations

- Rooms are in-memory and are not shared across multiple server instances.
- The app does not yet authenticate players or restore their identity after a browser refresh.
- Some games do not yet implement every rule of their real-world counterparts.
- The Prisma schema and local PostgreSQL setup are not integrated into the live room flow.
- Production deployment still needs security hardening, persistent matches, matchmaking, and reconnection handling.


## Disclaimer

ArcadeNet was created by Irah Jane for school and educational purposes only. This project is intended for learning and demonstration purposes and is not intended for commercial or production use.

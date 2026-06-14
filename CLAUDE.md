# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

All commands run from the repo root unless noted.

**Run everything (dev mode):**
```
npm run dev
```
This starts both backend (port 3000) and frontend (port 5173) via `concurrently`.

**Backend only:**
```
npm run dev --workspace=packages/backend
```

**Frontend only:**
```
npm run dev --workspace=packages/frontend
```

**Build all packages (shared → backend → frontend):**
```
npm run build
```

**Backend tests:**
```
npm test --workspace=packages/backend          # unit tests (jest, *.spec.ts)
npm run test:e2e --workspace=packages/backend  # e2e tests
```

**Lint:**
```
npm run lint --workspace=packages/backend
npm run lint --workspace=packages/frontend
```

**Prisma (run from `packages/backend`):**
```
npx prisma migrate dev     # apply migrations
npx prisma db seed         # seed database
npx prisma studio          # open Prisma Studio
```

**Build shared package first** when making changes to `packages/shared`, as both frontend and backend depend on its compiled output (`dist/`):
```
npm run build --workspace=packages/shared
```

## Environment Variables

Backend (`packages/backend/.env`):
- `DATABASE_URL` — PostgreSQL connection string (required)
- `FRONTEND_URL` — allowed CORS origin (default: `http://localhost:5173`)
- `PORT` — server port (default: `3000`)
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` — for question image uploads

Frontend (`packages/frontend/.env`):
- `VITE_API_URL` — backend URL (default: `http://localhost:3000`)

## Architecture

This is an npm workspaces monorepo with three packages:

```
packages/
  shared/     — TypeScript types and Socket.io event interfaces (consumed by both)
  backend/    — NestJS REST + WebSocket server
  frontend/   — React + Vite SPA
```

### `packages/shared`
The single source of truth for shared types. Exports:
- **`models.ts`** — `QuestionPack`, `Category`, `Question`, `Player`, `GameState`, `GamePhase`
- **`socket-events.ts`** — typed `ClientToServerEvents` and `ServerToClientEvents` interfaces

Both packages import from `@gigaquiz/shared`. The shared package must be built (`tsc`) before changes are picked up.

### `packages/backend`
NestJS app with three modules:

- **`PrismaModule`** — wraps Prisma client as a singleton injectable service
- **`PacksModule`** — REST CRUD for question packs (`/api/packs`), plus `POST /api/packs/upload/image` for Cloudinary uploads
- **`GameModule`** — in-memory real-time game engine

**Game engine** (`game/`):
- `GameService` — holds all active rooms in a `Map<roomCode, Room>`. Rooms are entirely in-memory (no DB persistence). Game state machine progresses through phases: `lobby → question-selection → question-active → buzzer-open → awaiting-verification → game-over` (or back to `question-selection`).
- `GameGateway` — Socket.io gateway that maps socket events to `GameService` calls and broadcasts `game:state` to the room after every mutation.
- `room.types.ts` — server-only `Room` and `RoomPlayer` types (distinct from the shared `GameState` that clients receive).

Player identity is the socket ID. The host is also a player in the room's `players` Map but is excluded from score ranking. `activePlayerId` tracks whose turn it is to select a question.

**Packs update strategy**: `PacksService.update` deletes all categories (cascade-deletes questions) then re-creates them. There is no partial category update.

### `packages/frontend`
React 19 + React Router v7 SPA. Pages:

| Route | Page | Purpose |
|---|---|---|
| `/` | `MainMenu` | Entry point, links to host/join/pack-builder |
| `/host` | `HostGame` | Select a pack and create a room |
| `/join` | `JoinGame` | Enter room code and display name |
| `/game` | `Game` | In-game view (shared for host and players) |
| `/pack-builder` | `PackBuilder` | Create new pack |
| `/pack-builder/:id` | `PackBuilder` | Edit existing pack |
| `/settings` | `Settings` | App settings |

**State management**: A single `GameContext` (React context + `useGame()` hook) wraps the whole app. It holds the socket singleton, current `GameState`, `roomCode`, `isHost`, and `myId` (socket ID). Components emit socket events directly via `useGame().socket`.

**HTTP calls** go through `packages/frontend/src/lib/api.ts` — a thin `fetch` wrapper exporting an `api` object.

**Socket singleton** is created once in `packages/frontend/src/lib/socket.ts` and shared via `GameContext`.

Styling uses CSS Modules (`.module.css` per page/component). No global state library — React context is the only state layer.

### Data Flow Summary
1. Host creates room via `host:create-room` socket event → backend loads pack from DB into memory
2. Players join via `player:join` → server emits `game:state` to whole room
3. Host starts game via `host:start-game` → random non-host player gets first turn
4. Active player selects question → timer starts; after timer, buzzer opens
5. Any player buzzes → host verifies correct/incorrect → scores updated → next turn or game over

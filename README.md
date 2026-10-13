# Beacon

Lightweight project management for software teams, built around GitHub.

## Repository layout

| Path        | Description                                      |
| ----------- | ------------------------------------------------ |
| `frontend/` | React + Vite + TypeScript, Tailwind CSS, shadcn/ui |
| `backend/`  | NestJS + TypeScript, Prisma, PostgreSQL          |

## Prerequisites

- Node.js 22+
- Docker with Docker Compose

## Quick start (Docker)

```bash
cp .env.example .env
docker compose up --build
```

- Frontend: http://localhost:5173
- API health: http://localhost:3000/api/health

## Local development (without Docker for the apps)

Start only the database:

```bash
docker compose up -d postgres
```

Backend:

```bash
cd backend
npm install
npm run start:dev
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

The backend app and the Prisma CLI (via `backend/prisma.config.ts`) read the root `.env` (or `backend/.env`), and the frontend reads `VITE_*` variables from the root `.env`.

If port 5432 is already used by a local Postgres, set `POSTGRES_PORT` (for example `5433`) in `.env` and update the port in `DATABASE_URL` to match.

The dev containers run as the image's `node` user (UID 1000), so files they write into the bind-mounted source stay owned by a host user with that UID.

## Acting as a user (development only)

GitHub sign-in is not built yet. Until then, pick a user under **Acting as** in the sidebar; the frontend sends that user's id in an `X-Dev-User-Id` header, and the API uses it for write actions such as logging contributions. The header is rejected when `NODE_ENV=production`, and `GET /api/dev/users` returns 404 there.

The home page depends on who you act as. Students (project owners and members) land on **My week**: their weekly check-in, feedback to address, open tasks and upcoming milestones. Supervisors land on **Reviews**, a queue of pending entries across every group they supervise, with bulk approval. The demo seed has:

- Dr. Silva: workspace owner (the lecturer) and supervisor of both groups; edits the semester calendar
- Alice: team lead (project owner) of Beacon Capstone; Bob and Chen: members
- Dana: team lead of Campus Navigator; Eli: member

The semester calendar (teaching weeks, break and exam weeks) belongs to the workspace and is shared by all its groups. Milestones belong to a project and are managed by its owner or supervisor on the **Timeline** tab.

## Scripts

Both `frontend/` and `backend/` provide `npm run lint`, `npm run typecheck`, and `npm run build`.

Backend:

- `npm test`: unit tests (Jest)
- `npm run test:e2e`: API e2e tests (requires a running database)
- `npm run prisma:migrate`: create and apply a migration in development (run `npm run prisma:generate` afterwards; Prisma 7 no longer regenerates the client automatically)
- `npm run db:seed`: load the demo workspace (re-runnable; it replaces only the demo data)
- `npm run db:reset`: drop the database, re-apply all migrations, and seed

Frontend:

- `npm run test:e2e`: Playwright smoke test (starts the Vite dev server; the backend must be running). Run `npx playwright install chromium` once first. Set `E2E_BASE_URL` to test an already-running frontend.

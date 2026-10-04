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

## Scripts

Both `frontend/` and `backend/` provide `npm run lint`, `npm run typecheck`, and `npm run build`.

Backend:

- `npm test`: unit tests (Jest)
- `npm run test:e2e`: API e2e tests (requires a running database)
- `npm run prisma:migrate`: create and apply a migration in development

Frontend:

- `npm run test:e2e`: Playwright smoke test (starts the Vite dev server; the backend must be running). Run `npx playwright install chromium` once first. Set `E2E_BASE_URL` to test an already-running frontend.

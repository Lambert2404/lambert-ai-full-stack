# LAMBERT AI

Full-stack AI study assistant for the Nigerian curriculum. React (Vite + TypeScript) frontend and a Fastify + Prisma + SQLite backend with RAG chat, quiz generation & grading, adaptive study plans, document ingestion, voice, gamification, and an admin console.

## Repo layout

```
LAMBERT AI/
├── lambert-ai/        # Frontend — React 18 + Vite + TypeScript
└── backend/           # Backend — Fastify 5 + Prisma 6 + SQLite
```

## Tech stack

| Layer   | Stack |
|---------|-------|
| Frontend | React 18, Vite, TypeScript, TanStack Router, Tailwind CSS |
| Backend  | Node 24, Fastify 5, TypeScript (NodeNext/ESM), Prisma 6, SQLite |
| AI       | OpenAI, Gemini, Anthropic, Microsoft/OpenAI-compatible providers (configurable models, fallbacks) |
| Storage  | Local disk (`storage/uploads`) + Prisma-managed SQLite DB |
| Auth     | JWT access (15m) + refresh (30d) rotation, bcryptjs, roles (`student`/`admin`) |

## Prerequisites

- Node.js 24+ (tests run on v24.19.0)
- npm 11+ with auto-approve of build scripts:
  ```powershell
  npm config set --global approval-mode=auto-writing
  ```
- Prisma/SQLite is bundled — no separate database server needed.

## Frontend

```powershell
cd lambert-ai
npm install
npm run dev        # http://localhost:5173
```

Uses `VITE_API_URL` and `VITE_BACKEND_READY` (see `lambert-ai/.env.example`).

## Backend

```powershell
cd backend
npm install
cp .env.example .env        # or set the env vars below
npx prisma migrate dev      # create schema
npx prisma db seed          # subjects, topics, AI providers + demo accounts
npm run dev                 # http://localhost:4000
```

### Backend environment

| Variable | Default | Notes |
|----------|---------|-------|
| `NODE_ENV` | `development` | `production` enables stricter CORS/helmet |
| `HOST` / `PORT` | `0.0.0.0` / `4000` | |
| `DATABASE_URL` | `file:./dev.db` | SQLite file (or Postgres connection string) |
| `JWT_SECRET` / `REFRESH_TOKEN_SECRET` | dev defaults | ⚠️ set real values in prod |
| `JWT_ACCESS_TTL` / `JWT_REFRESH_TTL` | `15m` / `30d` | |
| `CORS_ORIGINS` | `*` | Comma-separated allowlist in prod |
| `OPENAI_API_KEY` / `GEMINI_API_KEY` / `ANTHROPIC_API_KEY` / `MICROSOFT_AI_*` | — | Provider keys |
| `WHISPER_*` / `VOICE_SYNTHESIZE_*` / `SPEECH_*` | — | Voice transcribe/synthesize endpoints |
| `STORAGE_DIR` | `./storage/uploads` | Uploaded file storage |
| `GLOBAL_RATE_LIMIT` | `120` | Requests / time window |

### Useful scripts (backend)

| Script | What it does |
|--------|--------------|
| `npm run dev` | Start dev server |
| `npm run build` | `tsc` compile to `dist/` |
| `npm start` | Run compiled `dist/` |
| `npm run seed` | Seed subjects, topics, AI providers, demo accounts |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | oxlint |
| `npm test` | `tsx --test` (unit + integration, SQLite, serialized) |

## Seeded accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@lambertai.com` | `Admin@12345` |
| Student | `demo@lambertai.com` | `Student@12345` |

## API

Full reference: [`backend/docs/API.md`](backend/docs/API.md)

Response envelope:

```json
{ "success": true, "data": {...}, "message": "..." }
```

Errors: `{ "success": false, "message": "...", "error": { "code": "..." } }` (codes like `MISSING_TOKEN`, `INVALID_CREDENTIALS`, `ACCOUNT_EXISTS`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_ERROR`, `AI_UNAVAILABLE`).

## Frontend notes

- Base URL override via `VITE_API_URL`; `VITE_BACKEND_READY=false` shows an honest "not connected" state instead of fake data.

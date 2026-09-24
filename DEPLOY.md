# DEPLOY — Lambert AI

Deployment runbook for the Lambert AI full-stack platform
(backend `backend/` + frontend `lambert-ai/`, one git repo, one GitHub remote).

**GitHub:** `Lambert2404/lambert-ai-full-stack` (HTTPS, branch `master`)
**Local roots:** `backend/` (Fastify + Prisma + tsx), `lambert-ai/` (Vite + React + TS)

---

## What is live

AI providers wired through the shared `AiProviderId` union
(`backend/src/types.ts`, `lambert-ai/src/types/index.ts`):

| code                | how it activates                      | UI label         |
| ------------------- | ------------------------------------- | ---------------- |
| `lambert_auto`      | always on (router)                    | LAMBERT Auto     |
| `openai`            | `OPENAI_API_KEY`                      | OpenAI           |
| `microsoft`         | `MICROSOFT_AI_ENDPOINT` + key         | Microsoft        |
| `google_gemini`     | `GEMINI_API_KEY`                      | Google Gemini    |
| `anthropic_claude`  | `ANTHROPIC_API_KEY`                   | Anthropic Claude |
| `openrouter`        | `OPENROUTER_API_KEY` (OpenRouter owns rust for its gateway) | OpenRouter |

OpenRouter is wired as a first-class provider (5th) using the **OpenAI-compatible
gateway** — it reuses the `openai` SDK pointed at
`config.ai.openrouter.baseUrl` (`https://openrouter.ai/api/v1` by default).

Backend wiring sites (all already pushed, `6168f48`):
`config.ts` (`ai.openrouter` block + `providerHasKey`),
`providers/openrouter.ts` (new client),
`providers/registry.ts` (capability/model/label/priority + cached defs),
`providers/router.ts` (provider map entry),
`routes/chat.ts` (`VALID_PROVIDERS`), `types.ts` union,
`prisma/seed.ts` (provider row).

Frontend wiring sites (pushed `14d99e7`):
`types/index.ts` (`AiProviderId` union),
`pages/tutor/TutorPage.tsx` (`availableProviders`),
`pages/tutor/aiModeConfig.ts` (`aiProviderLabels`).

---

## Secrets policy (read once, it matters)

- Real provider keys live **only** in the gitignored `backend/.env` —
  never in any tracked file, never in this doc, never in commit messages.
- `.env.example` holds **empty placeholders** only (names + models, no values).
- Any key pasted into chat/transcripts is treated as **compromised** —
  rotate it in the provider dashboard and drop the fresh value into
  gitignored `backend/.env`.
- `git fsck` / reflog scans have been run; the repo contains **no**
  committed token-shaped secret. Keep it that way: don't `git add -f` `.env`.

## Activating a provider (backed layer)

1. Rotate the key at the provider's dashboard (never reuse a chat-exposed key).
2. Open `backend/.env` (gitignored — `git status` must show it untracked).
3. Set the matching var, e.g.:
   `OPENROUTER_API_KEY=sk-or-v1-...`
4. Restart the backend; provider `enabled` flips on automatically
   when `config.ai.<code>.key` is non-empty.
5. Sanity: `npm run typecheck` + `npm run lint` + `npm test`.

## Re-running in dev

```powershell
cd backend
npm run dev          # Fastify API on :4000
# in a second terminal:
cd lambert-ai
npm run dev          # Vite on :5173
```

Optional DB refresh (code-first providers live in `prisma/seed.ts`):
```powershell
cd backend
npx prisma db seed
```

## Pushing changes

```powershell
git add -A
git commit -m "feat(...): ..."
git push origin master
```

`git status` must show a clean tree at the end, and `git diff` must never
contain a token-shaped string (run `Select-String` for `sk-`, `ghp_`,
`github_pat_` before pushing anything).

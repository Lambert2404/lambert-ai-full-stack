# LAMBERT AI — Frontend

Your Intelligent Study Companion. This is the **frontend only** — a React + TypeScript + Vite + Tailwind CSS application, ready to connect to the Lambert AI backend (built separately).

## Stack

- React 19 + TypeScript + Vite
- Tailwind CSS v4 (design tokens in `src/index.css`)
- React Router v7
- Axios-based API client with a typed service layer

## Getting started

```bash
npm install
npm run dev      # start the dev server
npm run build    # type-check + production build
npm run lint      # oxlint
```

## Connecting the real backend

1. Copy `.env.example` to `.env` and set `VITE_API_URL` to your backend's base URL.
2. Set `VITE_BACKEND_READY=true` once the backend is deployed and reachable.

Until `VITE_BACKEND_READY` is `true`, every service call in `src/services/` throws a
`BackendNotReadyError` instead of returning invented data, and pages render an honest
"not connected yet" state (see `src/components/ui/StateViews.tsx` and
`src/hooks/useAsync.ts`). Authentication is also not enforced in this preview mode, so
every route stays reviewable — flip `VITE_BACKEND_READY` to re-enable real auth guarding
in `src/components/layout/RequireAuth.tsx`.

## Project structure

```
src/
  components/
    ui/         Design system: Button, Input, Card, Modal, Tabs, Table, Toast, etc.
    layout/     App shells: PublicLayout, AuthLayout, AppLayout, WorkspaceLayout
  pages/        One folder per feature area (public, auth, student, tutor, quizzes,
                materials, pastpapers, teacher, admin)
  services/     Typed API service layer (authService, aiService, conversationService,
                documentService, quizService, studyPlanService, progressService,
                subjectService, notificationService, adminService) — see each file's
                header comment for its expected backend contract
  types/        Shared TypeScript types matching the documented API contracts
  hooks/        useAsync (loading/success/empty/error/pending-backend), useVoiceInput
  contexts/     AuthContext, ToastContext
  i18n/         English + Kiswahili dictionaries and the language context
  routes/       Navigation config
```

## What's fully built vs. scaffolded

**Fully built:** landing page, login/register/forgot-password, dashboard, the AI Tutor
chat interface (modes, provider selector, voice input, markdown rendering, source
citations, conversation history), materials upload, past papers, quiz generation/taking/
results, study planner, progress analytics, recommendations, bookmarks, notifications,
profile, settings, teacher workspace, and the admin AI-providers screen.

**Scaffolded (layout, routing, and data contract wired; full feature build is next):**
`/admin/subjects`, `/admin/materials`, `/admin/quizzes`, `/admin/analytics`. These use
the same `ScaffoldPage` component and are ready to be filled in against the same service
layer pattern used everywhere else.

## Design notes

- Palette and type system: deep navy ink (`--color-ink-*`), muted gold accent
  (`--color-gold-*`, used sparingly for emphasis/achievement), emerald for progress/
  success, off-white paper background. Source Serif 4 for headings/brand, Inter for UI.
- All AI-generated chat content is rendered through `react-markdown` with **no raw-HTML
  plugin registered**, so it can never inject arbitrary HTML/JS — see
  `src/pages/tutor/MessageBubble.tsx`.
- No API keys or provider secrets ever appear in this codebase; the AI provider selector
  only ever receives `{ id, label, enabled, isDefault }` from the backend.

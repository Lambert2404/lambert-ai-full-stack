# LAMBERT AI — REST API Reference

Fastify-based JSON API. All endpoints under `/api` (except `/health`) return responses wrapped in a standard envelope:

```jsonc
{
  "success": true,
  "data": { /* payload, omits on failure */ },
  "message": "human readable summary",
  "error": { "code": "NOT_FOUND" } // present only on failure
}
```

- Base URL (dev): `http://localhost:4000`
- All timestamps are ISO-8601 UTC strings.
- All request bodies and responses are `application/json` unless noted (multipart uploads).

## Authentication

Most endpoints require a bearer token:

```
Authorization: Bearer <accessToken>
```

| Code | Meaning |
|------|---------|
| `MISSING_TOKEN` | No/invalid `Authorization` header (`401`) |
| `INVALID_CREDENTIALS` | Bad email or password on login, or expired/invalid token (`401`) |
| `ACCOUNT_DISABLED` | User account is disabled (`403`) |
| `ACCOUNT_EXISTS` | Registering an already-registered email (`409`) |
| `INVALID_REFRESH_TOKEN` | Refresh token invalid/revoked/expired (`401`) |
| `FORBIDDEN` | Authenticated but not allowed (e.g. non-admin hitting admin routes) (`403`) |
| `NOT_FOUND` | Resource missing (`404`) |
| `VALIDATION_ERROR` | Schema/body validation failed (`400`) |
| `RATE_LIMIT_EXCEEDED` | Too many requests (`429`) |
| `AI_UNAVAILABLE` | AI provider disabled/error (`503`) |
| `INTERNAL_ERROR` | Unexpected server error (`500`) |

Seeded accounts:

| Role | Email | Password |
|------|-------|----------|
| admin | `admin@lambertai.com` | `Admin@12345` |
| student | `demo@lambertai.com` | `Student@12345` |

## Health

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/health` | — | `{ status: 'ok', uptime, timestamp }` |
| GET | `/api/health` | — | same payload |

## Authentication

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| POST | `/api/auth/register` | — | Body `{ name, email, password }` → `201` with session |
| POST | `/api/auth/login` | — | Body `{ email, password }` → session |
| POST | `/api/auth/refresh` | — | Body `{ refreshToken }` → new session, revokes old token |
| POST | `/api/auth/logout` | ✓ | Revokes the presented refresh token. Body `{ refreshToken }` |
| POST | `/api/auth/forgot-password` | — | Body `{ email }` → `202` (always returns success to avoid enumeration) |
| POST | `/api/auth/reset-password` | — | Body `{ token, newPassword }` |
| GET | `/api/auth/me` | ✓ | Current user (alias of `/api/users/me`) |

Session payload:

```jsonc
{
  "accessToken": "jwt",
  "refreshToken": "jwt",
  "expiresIn": 900,
  "user": { "id": "…", "email": "…", "name": "…", "role": "student" }
}
```

## Users

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/api/users/me` | ✓ | Current profile incl. role |
| PATCH | `/api/users/me/profile` | ✓ | Update `name`, `avatarUrl`, `subject` prefs, notification prefs, etc. |

## Subjects

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/api/subjects` | — | All subjects (catalog/subject/curriculum info) |
| GET | `/api/subjects/:id` | — | Single subject |
| GET | `/api/subjects/:id/topics` | — | Topics for a subject |
| GET | `/api/topics/:id` | — | Single topic |

## AI

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/api/ai/providers` | — | Public provider capabilities (4 providers) |

## Chat

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/api/conversations` | ✓ | List own conversations with preview + timestamps |
| POST | `/api/conversations` | ✓ | Create conversation. Body `{ title?, subjectId?, language?, context? }` |
| GET | `/api/conversations/:id` | ✓ | Conversation (owner only) |
| PATCH | `/api/conversations/:id` | ✓ | Rename. Body `{ title }` |
| DELETE | `/api/conversations/:id` | ✓ | Delete (owner only) |
| GET | `/api/conversations/:id/messages` | ✓ | Messages (`{ items: Message[], hasMore, nextCursor }`) |
| POST | `/api/conversations/:id/messages` | ✓ | Append user message. Body `{ content }` |
| POST | `/api/conversations/:id/messages/:msgId/regenerate` | ✓ | Regenerate last assistant turn |
| POST | `/api/conversations/:id/stop` | ✓ | Interrupt an in-flight response |
| POST | `/api/chat` | ✓ | One-shot chat (rate limited). Body: `{ message, conversationId?, subjectId?, attachments? }` → `{ message }` |
| POST | `/api/chat/stream` | ✓ | Streaming chat (SSE). Same body; emits message deltas + final `message` |

## Quizzes

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| POST | `/api/quizzes/generate` | ✓ | Generate quiz (rate limited). Body `{ subjectId?, topicId?, difficulty?, numberOfQuestions?, mode? }` |
| GET | `/api/quizzes` | ✓ | List own quizzes |
| GET | `/api/quizzes/:id` | ✓ | Quiz (owner only) |
| GET | `/api/quizzes/:id/questions` | ✓ | Questions with `options[].id` (owner only) |
| POST | `/api/quizzes/:id/attempts` | ✓ | Start attempt. Body `{ answers }` or first answer submission |
| GET | `/api/quiz-attempts` | ✓ | List own attempts |
| GET | `/api/quiz-attempts/:id` | ✓ | Attempt result (owner only) |
| PATCH | `/api/quiz-attempts/:id` | ✓ | Submit answers (rate limited). Body `{ answers: [{ questionId, selectedOptionId }] }` → graded result |

## Study Plans

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/api/study-plans/active` | ✓ | Most recent active (non-archived) plan or `null` |
| GET | `/api/study-plans` | ✓ | List own plans |
| POST | `/api/study-plans` | ✓ | Create manual plan. Body `{ title, sessions: [{ title, datetime, subjectId?, durationMinutes? }] }` |
| POST | `/api/study-plans/generate` | ✓ | AI-generated plan (rate limited). Body `{ subjectId?, goals?, sessionsPerWeek? }` |
| GET | `/api/study-plans/:id` | ✓ | Plan with sessions (owner only) |
| PATCH | `/api/study-plans/:id` | ✓ | Rename/archive (owner only) |
| DELETE | `/api/study-plans/:id` | ✓ | Delete (owner only) |
| PATCH | `/api/study-sessions/:id` | ✓ | Update session. Body `{ status?, notes? }` (owner only) |
| DELETE | `/api/study-sessions/:id` | ✓ | Remove session (owner only) |

## Progress & Gamification

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/api/progress/summary` | ✓ | Overview (hours, quizzes taken, streaks, completion %) |
| GET | `/api/progress/subjects` | ✓ | Per-subject progress |
| GET | `/api/progress/study-time` | ✓ | Study-time series |
| GET | `/api/progress/activity` | ✓ | Recent activity feed |
| GET | `/api/progress/weak-topics` | ✓ | Weakest topics |
| GET | `/api/progress` | ✓ | Composite progress view |
| GET | `/api/recommendations` | ✓ | AI study recommendations |
| POST | `/api/recommendations/:id/dismiss` | ✓ | Dismiss a recommendation |
| GET | `/api/gamification/summary` | ✓ | Points, badges, levels |

## Documents (materials + AI Q&A)

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| POST | `/api/materials/upload` | ✓ | Upload study material (multipart, rate limited, `MAX_UPLOAD_BYTES`) |
| GET | `/api/materials` | ✓ | List own materials |
| GET | `/api/materials/:id` | ✓ | Material metadata (owner only) |
| GET | `/api/materials/:id/file` | ✓ | Download stored file (owner only) |
| DELETE | `/api/materials/:id` | ✓ | Delete (owner only) |
| POST | `/api/documents/upload` | ✓ | Ingest text/PDF/DOCX: extract → chunk → embed → store (multipart, rate limited). Returns material + document |
| GET | `/api/documents` | ✓ | List analyzed documents |
| GET | `/api/documents/:id` | ✓ | Document + material (owner only) |
| GET | `/api/documents/:id/status` | ✓ | Ingestion/analysis status |
| POST | `/api/documents/:id/ask` | ✓ | RAG question about a document (rate limited). Body `{ question }` → `{ answer }` |
| DELETE | `/api/documents/:id` | ✓ | Delete document (owner only) |

## Past Papers

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| POST | `/api/past-papers/upload` | ✓ | Upload past paper PDF (multipart, bodyLimit, rate limited) |
| POST | `/api/past-papers/analyze` | ✓ | Analyze uploaded paper → questions (rate limited) |
| GET | `/api/past-papers` | ✓ | List own papers |
| GET | `/api/past-papers/:id` | ✓ | Paper detail (owner only) |
| GET | `/api/past-papers/:id/questions` | ✓ | Extracted questions |
| POST | `/api/past-papers/:id/practice` | ✓ | Start practice session on paper questions |

## Bookmarks

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/api/bookmarks` | ✓ | List own bookmarks |
| POST | `/api/bookmarks` | ✓ | Body `{ targetType, targetId }` (unique per target) |
| DELETE | `/api/bookmarks/:id` | ✓ | Remove bookmark (owner only) |

## Notifications

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/api/notifications` | ✓ | List own notifications (newest first) |
| PATCH | `/api/notifications/:id` | ✓ | Mark read. Body `{ read }` |
| POST | `/api/notifications/read-all` | ✓ | Mark all read |
| GET | `/api/notifications/preferences` | ✓ | Notification preferences |
| POST | `/api/notifications/preferences` | ✓ | Update notification preferences |

## Search

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/api/search` | ✓ | Search subjects/topics/materials. Query `?q=&type=` |

## Voice

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| POST | `/api/voice/transcribe` | ✓ | Audio → text (Whisper). Multipart `audio` file |
| POST | `/api/voice/synthesize` | ✓ | Text → audio URL. Body `{ text, voice? }` |
| GET | `/api/voice/audio/:file` | ✓ | Serve generated audio file |

## Admin (requires `role: "admin"`)

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/admin/metrics` | Dashboard: `{ students, activeUsers, aiRequests, quizAttempts, documents, errorsLast24h }` |
| GET | `/api/admin/users` | Paginated user list. Query `?page=&pageSize=` (max 100) |
| PATCH | `/api/admin/users/:id` | Update user (role, status) |
| POST | `/api/admin/subjects` | Create subject |
| PATCH | `/api/admin/subjects/:id` | Update subject |
| DELETE | `/api/admin/subjects/:id` | Delete subject |
| POST | `/api/admin/topics` | Create topic |
| PATCH | `/api/admin/topics/:id` | Update topic |
| DELETE | `/api/admin/topics/:id` | Delete topic |
| GET | `/api/admin/topics` | All topics |
| GET | `/api/admin/materials` | All materials |
| DELETE | `/api/admin/materials/:id` | Delete material |
| GET | `/api/admin/quizzes` | All quizzes |
| DELETE | `/api/admin/quizzes/:id` | Delete quiz |
| GET | `/api/admin/ai/providers` | Provider config (keys masked) |
| PATCH | `/api/admin/ai/providers/:id` | Update provider enabled/keys/models |
| GET | `/api/admin/ai/models` | Model registry |
| PATCH | `/api/admin/ai/models/:id` | Update model registry entry |
| GET | `/api/admin/ai/usage` | AI usage stats |
| GET | `/api/admin/ai/errors` | Recent AI errors |
| GET | `/api/admin/feedback` | Feedback list |
| GET | `/api/admin/logs` | Recent log lines |
| GET | `/api/admin/analytics` | Analytics |

## Rate limiting

- Global default: `GLOBAL_RATE_LIMIT` (see `src/lib/security.ts`). Endpoints that generate AI output (quiz generate, study-plan generate, chat, document ask, past-paper analyze, uploads) get tighter per-route limits (e.g. 10–30/min).

## Pagination

List endpoints accept `?page=1&pageSize=20` (`pageSize` max 100) where applicable and return `{ items, total, page, pageSize }` or cursor-based `{ items, hasMore, nextCursor }` for message streams.
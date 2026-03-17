# Tutoria API — Reference Documentation

**Base URLs**
- Production: `https://api.tutoria.ac`
- Development: `https://api-dev.tutoria.ac`

---

## Architecture Overview

Tutoria API is a **Cloudflare Worker** built with [Hono](https://hono.dev/), running on V8 isolates. It shares infrastructure with `tutoria-webapp`:

| Resource | Binding | Purpose |
|---|---|---|
| D1 (SQLite) | `DB` | Users, profiles, activities, progress, module_progress |
| R2 Object Storage | `R2_BUCKET` | Curriculum JSON files + audio assets |
| KV Namespace | `CACHE` | Rate limiting, dedup, caching |

**External Services**
- **Azure Speech** — Phoneme/pronunciation analysis
- **Google Vertex AI / Gemini** — Two-sided pronunciation validation (primary)
- **Mistral `voxtral-small-latest`** — Fallback pronunciation validator
- **Clerk** — Authentication (JWT via JWKS, no SDK)

---

## Authentication

All `/v1/*` routes require a **Clerk JWT** in the `Authorization` header:

```
Authorization: Bearer <clerk_session_token>
```

- JWTs are verified against Clerk's JWKS endpoint (cached 1 hour in memory)
- The verified `sub` claim is passed as `userId` to all route handlers
- **Exceptions** (no JWT required):
  - `GET /health`
  - `POST /v1/webhooks/clerk` — uses Svix HMAC signature verification instead

---

## CORS

Allowed origins:
- `https://app.tutoria.ac`
- `https://dev.tutoria.ac`
- `http://localhost:8081` (Expo dev)
- `http://localhost:19006` (Expo web)
- Any `exp://` scheme (Expo Go)
- Any `http://localhost:*`
- No `origin` header (native apps) → `*`

Allowed methods: `GET POST PUT DELETE OPTIONS`  
Allowed headers: `Content-Type Authorization`  
Max age: 86400s

---

## Routes

### `GET /health`
Health check. No authentication required.

**Response**
```json
{
  "status": "ok",
  "version": "1.0.0",
  "timestamp": "2026-03-17T10:00:00.000Z"
}
```

---

### Profiles — `/v1/profiles`

#### `GET /v1/profiles/list`
List all profiles for the authenticated user. Auto-creates a user record if the Clerk webhook hasn't fired yet.

**Response**
```json
{
  "profiles": [
    { "id": "uuid", "name": "Alice", "user_id": "uuid", "created_at": "..." }
  ]
}
```

---

#### `POST /v1/profiles/create`
Create a new profile for the authenticated user.

**Request body**
```json
{ "name": "Alice" }
```

- Name: max 50 chars, alphanumeric + spaces/hyphens/underscores/periods/apostrophes
- Duplicate names per user are rejected

**Response**
```json
{ "profileId": "uuid", "success": true }
```

**Errors:** `400` invalid name / duplicate, `500` server error

---

#### `POST /v1/profiles/select`
Validate profile ownership (used before activating a profile on the client side).

**Request body**
```json
{ "profileId": "uuid" }
```

**Response**
```json
{ "success": true, "profileId": "uuid", "profileName": "Alice" }
```

**Errors:** `400` invalid UUID, `403` not owned by user, `404` user not found

---

### Syllabus — `/v1/syllabus`

#### `GET /v1/syllabus/stages`
Returns the ordered list of curriculum stages from R2 (KV-cached 1 hour).

**Response**
```json
{
  "success": true,
  "stages": [
    {
      "id": "stage-1",
      "title": "Foundations",
      "description": "...",
      "preReading": "...",
      "summary": "",
      "moduleFiles": ["module-a.json", "module-b.json"],
      "items": []
    }
  ]
}
```

---

### Modules — `/v1/modules`

#### `GET /v1/modules/missions?profileId=<uuid>`
Returns up to 3 prioritised "mission" cards for the home screen.

**Query params:** `profileId` (required)

Missions are classified by priority:

| Label | Priority | Condition |
|---|---|---|
| Quick Win | 1000 | Active session with ≤ 2 words left |
| Ready to Retry | 800 | 1–2 attempts, cooldown (12h) expired |
| Continue | 600 | Active session with > 2 words left |

Each mission is enriched with the module name from R2.

**Response**
```json
[
  {
    "moduleId": "module-a",
    "moduleName": "Module A",
    "label": "Quick Win",
    "wordsLeft": "1 word left",
    "color": "primary",
    "priority": 1000,
    "completedWords": 4,
    "totalWords": 5,
    "attempts": 1
  }
]
```

---

#### `GET /v1/modules/:moduleId?profileId=<uuid>`
Get attempt status and active session for a module.

**Response**
```json
{
  "attempts": 1,
  "canAttempt": true,
  "cooldownEndsAt": 1234567890000,
  "hasActiveSession": true,
  "sessionData": { ... }
}
```

- `canAttempt` is `false` if attempts ≥ 3 or within the 12-hour cooldown
- `sessionData` is `null` if no active session exists

---

#### `POST /v1/modules/:moduleId`
Start or resume a module session.

**Request body**
```json
{ "profileId": "uuid" }
```

- If an active session exists, it is resumed (not reset)
- Otherwise a new session is created from R2 module data

**Response**
```json
{
  "words": ["word-id-1", "word-id-2"],
  "wordData": [ { "id": "word-id-1", "display_text": "cat", ... } ],
  "totalWords": 10,
  "position": 0,
  "started": 1234567890000,
  "completedWords": [],
  "remainingWords": ["word-id-1", ...],
  "moduleName": "Module A",
  "failedWords": []
}
```

---

#### `POST /v1/modules/:moduleId/word`
Mark a word as completed within the active session.

**Request body**
```json
{
  "profileId": "uuid",
  "wordId": "word-id-1",
  "isCorrect": true
}
```

- Removes the word from the active queue
- If all words completed, marks the module complete and increments attempt count

**Response**
```json
{
  "success": true,
  "completedWords": 5,
  "totalWords": 10,
  "remainingWords": 5,
  "isModuleComplete": false,
  "failedWords": ["word-id-2"]
}
```

---

#### `DELETE /v1/modules/:moduleId?profileId=<uuid>`
Clear (abandon) the active session for a module. Attempt count is **not** incremented.

**Response**
```json
{ "success": true }
```

---

#### `POST /v1/modules/status/batch`
Batch-fetch module statuses for multiple module IDs at once.

**Request body**
```json
{
  "profileId": "uuid",
  "moduleIds": ["module-a", "module-b"]
}
```

**Response**
```json
{
  "module-a": { "attempts": 1, "canAttempt": true, "hasActiveSession": false },
  "module-b": { "attempts": 0, "canAttempt": true, "hasActiveSession": false }
}
```

---

### Progress — `/v1/progress`

#### `GET /v1/progress/:profileId`
Get all activity progress for a profile, plus current streak.

**Response**
```json
{
  "items": {
    "activity-id": {
      "days_correct": 2,
      "mastered": false,
      "last_correct_date": "2026-03-17",
      "mastered_at": null
    }
  },
  "activities": [
    {
      "id": "activity-id",
      "displayText": "cat",
      "isCorrect": true,
      "daysCorrect": 2,
      "mastered": false,
      "lastDate": "2026-03-17"
    }
  ],
  "streakDays": 3
}
```

- `mastered` = true when `days_correct >= 3`
- Streak = consecutive calendar days with at least one correct answer

---

#### `POST /v1/progress/:profileId/:activityId`
Save a pronunciation attempt result.

**Request body**
```json
{
  "isCorrect": true,
  "displayText": "cat"
}
```

- `isCorrect` (or legacy `correct`) — required boolean
- `displayText` — used to auto-create an activity record if one doesn't exist
- Only increments `days_correct` once per calendar day

**Response**
```json
{ "success": true }
```

---

### Pronunciation — `/v1/pronunciation`

#### `POST /v1/pronunciation/check`
Submit a pronunciation attempt for AI validation.

**Rate limit:** 5 requests per 60 seconds per user (in-memory, resets on Worker restart)

**⚠️ Timeout:** Hard 20-second limit. Returns `500` if exceeded.

**Request body**
```json
{
  "audio": "<base64-encoded audio>",
  "displayText": "cat",
  "targetIPA": "kæt",
  "language": "english",
  "audioFormat": "wav",
  "unitType": "word",
  "validation": {
    "confused": ["k", "g"],
    "feedback": { "k": "Try a harder stop" }
  }
}
```

| Field | Required | Notes |
|---|---|---|
| `audio` | ✅ | Base64. Format auto-detected if `audioFormat` not provided |
| `displayText` | ✅ | Human-readable text |
| `targetIPA` | ✅ | IPA string of the target pronunciation |
| `language` | ❌ | Default `"english"` |
| `audioFormat` | ❌ | `"wav"` or `"mp3"`. Auto-detected otherwise |
| `unitType` | ❌ | `"phoneme"`, `"syllable"`, or `"word"` |
| `validation` | ❌ | Pre-known confusable phoneme pairs |

**Validation pipeline**
1. Azure Speech REST API → phoneme-level analysis (fast path)
2. Google Vertex AI / Gemini 3.1 Flash Lite → two-sided semantic validation
3. Mistral `voxtral-small-latest` → fallback if Gemini unavailable
4. IPA audio resolved from R2 for `acceptableIPAs` enrichment

**Response**
```json
{
  "overallIsCorrect": true,
  "highlightedSegment": "cat",
  "similarity": 0.92,
  "pronunciation_match": true,
  "ipa_transcription_reference": "kæt",
  "ipa_transcription_user": "kæt",
  "resultType": "correct",
  "azure": { ... },
  "feedback": "Good job!",
  "audioIssue": null,
  "errorType": null,
  "debug": {
    "processingTime": 1234
  }
}
```

**Errors:** `429` rate limited (includes `retryAfter` seconds), `500` timeout or internal error

---

### Audio — `/v1/audio`

#### `GET /v1/audio/proxy?path=<r2-path>`
Proxy an R2 file (audio or JSON) to the client. Falls back to the R2 public URL if the direct R2 binding returns nothing.

**Query params:** `path` (required) — R2 key, optionally prefixed with `r2:`

**Response:** Raw file bytes with appropriate `Content-Type`.  
Cache-Control: `public, max-age=3600`

---

#### `GET /v1/audio/sounds-resolve?ipa=<ipa>&compound=<bool>&refresh=<bool>`
Resolve an IPA string to its audio file path in R2.

**Query params:**
| Param | Notes |
|---|---|
| `ipa` | Required. IPA symbol(s) to resolve |
| `compound` | `true` to resolve a compound/multi-phoneme IPA string |
| `refresh` | `true` to bypass KV cache |

**Response** (single IPA)
```json
{
  "resolved": true,
  "audioPath": "tutoria/curriculums/branches/production/audio/kæt.wav",
  "acceptableIPAs": ["kæt", "kat"]
}
```

---

### Webhooks — `/v1/webhooks`

#### `POST /v1/webhooks/clerk`
Receives Clerk user lifecycle events via Svix. No JWT auth — uses HMAC-SHA256 signature verification instead.

Signature check:
- Verifies `svix-id`, `svix-timestamp`, `svix-signature` headers
- Rejects events older than 5 minutes

**Handled events:**

| Event | Action |
|---|---|
| `user.created` | Upsert user record into D1 `users` table |
| `user.updated` | Update email / name in D1 |
| `user.deleted` | Soft-delete (sets `deleted_at`) |

**Response**
```json
{ "received": true }
```

---

## Database Schema (D1)

```sql
-- Users (synced from Clerk)
users (id, clerk_id, email, name, created_at, updated_at, deleted_at)

-- Learner profiles (one user can have multiple)
profiles (id, user_id, name, created_at)

-- Vocabulary activities
activities (id, display_text, target_ipa, created_at)

-- Per-profile activity progress
progress (
  id, profile_id, activity_id,
  days_correct,          -- increments once per calendar day
  mastered,              -- 1 when days_correct >= 3
  last_correct_date,
  mastered_at,
  created_at, updated_at
)

-- Per-profile module attempt tracking
module_progress (
  id, profile_id, module_id,
  attempts,              -- max 3
  last_attempt_at,       -- unix ms
  completed_at,          -- unix ms, set when all words done
  current_session,       -- JSON blob (words, completedWords, failedWords, queue)
  created_at, updated_at
)

-- Pronunciation attempt metrics (fire-and-forget)
pronunciation_metrics (id, target_ipa, display_text, status, result, created_at)
```

---

## Curriculum / R2 Structure

```
tutoria/
  curriculums/
    branches/
      <branch>/
        .branch             ← branch marker file
        stages.json         ← ordered list of stages + moduleFiles references
        modules/
          <module-id>.json  ← module data (name, exercises[])
        audio/
          <ipa>.wav         ← reference audio files
curriculums/
  active.json               ← legacy fallback: { "curriculum": "production" }
```

Curriculum resolution priority:
1. User preference (from Clerk metadata, set by webapp)
2. `CURRICULUM_ID` env var (`production` by default)
3. `curriculums/active.json`
4. Hardcoded fallback: `production`

KV cache TTLs:
- Stages: 1 hour
- Modules: 1 hour
- Sounds index: 5 minutes

---

## Error Response Format

All errors follow this shape:
```json
{ "error": "Human-readable message" }
```

Common HTTP status codes:
| Code | Meaning |
|---|---|
| `400` | Bad request / missing required field |
| `401` | Missing or invalid JWT (or webhook signature) |
| `403` | Profile not owned by the authenticated user |
| `404` | Resource not found |
| `429` | Rate limited (pronunciation check) |
| `500` | Internal server error / timeout |

---

## Development

```bash
npm run dev          # wrangler dev (local)
npm run deploy       # Deploy to production
npm run deploy:dev   # Deploy to dev environment
npm run logs         # Tail production logs
npm run logs:dev     # Tail dev logs
```

Secrets are set via:
```bash
wrangler secret put AZURE_SPEECH_KEY
wrangler secret put CLERK_SECRET_KEY
wrangler secret put GOOGLE_SERVICE_ACCOUNT_JSON
```

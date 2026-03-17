# API Integration Guide

This document explains how the Tutoria mobile app integrates with the Tutoria API — a Cloudflare Worker built with [Hono](https://hono.dev/).

---

## 1. Base Configuration

| Environment | Base URL                    |
| ----------- | --------------------------- |
| Production  | `https://api.tutoria.ac`    |
| Development | `https://api-dev.tutoria.ac`|

The base URL is set via the `EXPO_PUBLIC_API_URL` environment variable and read at build time by Expo.

The shared Axios client lives in **`src/services/api/client.ts`** and is responsible for:

- Setting the `baseURL` from the env var.
- Attaching the `Authorization` header to every request.
- Registering response-error interceptors for centralized logging and error handling.

```ts
// src/services/api/client.ts (simplified)
import axios from "axios";

const apiClient = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
});

export function setAuthToken(token: string) {
  apiClient.defaults.headers.common["Authorization"] = `Bearer ${token}`;
}

export default apiClient;
```

---

## 2. Authentication

All routes under `/v1/*` require a valid **Clerk JWT** in the `Authorization: Bearer <token>` header.

### Token acquisition

[`@clerk/clerk-expo`](https://clerk.com/docs/references/expo/overview) provides the `useAuth()` hook:

```ts
const { getToken } = useAuth();
const token = await getToken();
setAuthToken(token);
```

### Exceptions

| Route                    | Auth          | Notes                        |
| ------------------------ | ------------- | ---------------------------- |
| `GET /health`            | None          | Health-check / uptime probe  |
| `POST /v1/webhooks/clerk`| Svix HMAC     | Clerk webhook, verified via Svix signature headers |

---

## 3. API Client Architecture

Each API domain has its own module inside `src/services/api/`:

| Module              | Key exports                                                                 |
| ------------------- | --------------------------------------------------------------------------- |
| `profiles.ts`       | `listProfiles()`, `createProfile()`, `selectProfile()`                      |
| `modules.ts`        | `getMissions()`, `getModuleStatus()`, `startOrResumeModule()`, `completeWord()`, `abandonModule()`, `batchModuleStatus()` |
| `progress.ts`       | `getProgress()`, `saveProgress()`                                           |
| `pronunciation.ts`  | `checkPronunciation()`                                                      |
| `syllabus.ts`       | `getStages()`                                                               |
| `audio.ts`          | `getAudioProxyUrl()`, `resolveSounds()`                                     |

All modules are re-exported through a barrel file at `src/services/api/index.ts`.

---

## 4. Endpoint Reference

> For every endpoint the table shows the HTTP method, path, where it is used in the mobile app, and the request/response shapes.

### Profiles

#### `GET /v1/profiles/list`

- **Usage:** Profile selection screen. Also auto-creates the Clerk user record on the API side if this is the first request for a new user.
- **Response:**
  ```json
  {
    "profiles": [
      { "id": "uuid", "name": "Sofía", "createdAt": "ISO-8601" }
    ]
  }
  ```

#### `POST /v1/profiles/create`

- **Usage:** "Add learner" flow — creates a new learner profile under the current user.
- **Request:**
  ```json
  { "name": "Sofía" }
  ```
  Name must be ≤ 50 characters.
- **Response:**
  ```json
  { "profile": { "id": "uuid", "name": "Sofía", "createdAt": "ISO-8601" } }
  ```

#### `POST /v1/profiles/select`

- **Usage:** Validates that the authenticated user owns the profile before the app activates it locally.
- **Request:**
  ```json
  { "profileId": "uuid" }
  ```
- **Response:**
  ```json
  { "profile": { "id": "uuid", "name": "Sofía" } }
  ```

---

### Syllabus

#### `GET /v1/syllabus/stages`

- **Usage:** Curriculum browser — renders the list of stages with their module references.
- **Response:**
  ```json
  {
    "stages": [
      {
        "id": "stage-1",
        "title": "Stage 1",
        "modules": [
          { "moduleId": "mod-abc", "title": "Greetings" }
        ]
      }
    ]
  }
  ```

---

### Modules

#### `GET /v1/modules/missions?profileId=<uuid>`

- **Usage:** Home screen mission cards — returns up to 3 missions sorted by priority.
- **Response:**
  ```json
  {
    "missions": [
      {
        "moduleId": "mod-abc",
        "title": "Greetings",
        "priority": 1,
        "status": "available"
      }
    ]
  }
  ```

#### `GET /v1/modules/:moduleId?profileId=<uuid>`

- **Usage:** Module detail screen — shows attempt count, cooldown state, and any active session.
- **Response:**
  ```json
  {
    "module": {
      "moduleId": "mod-abc",
      "title": "Greetings",
      "attempts": 1,
      "maxAttempts": 3,
      "canAttempt": true,
      "cooldownEndsAt": null,
      "activeSession": null
    }
  }
  ```

#### `POST /v1/modules/:moduleId`

- **Usage:** Start or resume a module session after an NFC scan.
- **Request:**
  ```json
  { "profileId": "uuid" }
  ```
- **Response:**
  ```json
  {
    "session": {
      "sessionId": "uuid",
      "words": [
        { "wordId": "w1", "text": "hola", "ipa": "ˈo.la", "completed": false }
      ]
    }
  }
  ```

#### `POST /v1/modules/:moduleId/word`

- **Usage:** Mark a word as complete during the lesson flow.
- **Request:**
  ```json
  { "profileId": "uuid", "wordId": "w1" }
  ```
- **Response:**
  ```json
  { "completed": true, "sessionComplete": false }
  ```

#### `DELETE /v1/modules/:moduleId?profileId=<uuid>`

- **Usage:** Abandon the current session without incrementing the attempt counter.
- **Response:**
  ```json
  { "abandoned": true }
  ```

#### `POST /v1/modules/status/batch`

- **Usage:** Curriculum browser — batch-checks the status of multiple modules at once.
- **Request:**
  ```json
  { "profileId": "uuid", "moduleIds": ["mod-abc", "mod-def"] }
  ```
- **Response:**
  ```json
  {
    "statuses": {
      "mod-abc": { "attempts": 2, "canAttempt": true },
      "mod-def": { "attempts": 0, "canAttempt": true }
    }
  }
  ```

---

### Progress

#### `GET /v1/progress/:profileId`

- **Usage:** Progress dashboard — displays learned items, completed activities, and streak data.
- **Response:**
  ```json
  {
    "items": 42,
    "activities": 15,
    "streak": { "current": 3, "longest": 7 }
  }
  ```

#### `POST /v1/progress/:profileId/:activityId`

- **Usage:** Saves the result of a pronunciation attempt.
- **Request:**
  ```json
  { "score": 85, "passed": true }
  ```
- **Response:**
  ```json
  { "saved": true }
  ```

---

### Pronunciation

#### `POST /v1/pronunciation/check`

- **Usage:** Submit recorded audio for AI-powered pronunciation validation.
- **Request:** `multipart/form-data` with an `audio` file field and a `text` field containing the expected word/phrase.
- **Response:**
  ```json
  { "score": 85, "passed": true, "feedback": "Good job!" }
  ```
- **Rate limit:** 5 requests per 60 seconds per user.
- **Timeout:** 20-second hard limit (server-side).

---

### Audio

#### `GET /v1/audio/proxy?path=<r2-key>`

- **Usage:** Proxy audio and JSON files stored in Cloudflare R2. Returns the file with a 1-hour cache header.
- **Response:** Binary audio data or JSON, depending on the requested path.

#### `GET /v1/audio/sounds-resolve?ipa=<ipa-string>`

- **Usage:** Resolves an IPA transcription to the corresponding audio file path in R2.
- **Response:**
  ```json
  { "path": "sounds/es/ˈo.la.mp3" }
  ```

---

## 5. Error Handling Strategy

### Standard error shape

Every error response follows the same structure:

```json
{ "error": "Human-readable error message" }
```

### Status codes

| Code | Meaning           | Typical cause                          |
| ---- | ----------------- | -------------------------------------- |
| 400  | Bad Request       | Missing or invalid parameters          |
| 401  | Unauthorized      | Missing or expired JWT                 |
| 403  | Forbidden         | Profile does not belong to the user    |
| 404  | Not Found         | Resource does not exist                |
| 429  | Too Many Requests | Rate limit exceeded (see §6)           |
| 500  | Server Error      | Unexpected failure on the API          |

### Axios interceptor

The shared client registers a response interceptor that logs every non-2xx response for debugging:

```ts
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("[API Error]", error.response?.status, error.response?.data);
    return Promise.reject(error);
  }
);
```

### Retry strategy for 429

When the API returns `429`, the response body includes a `retryAfter` field (in seconds). The app should:

1. Disable the action button (e.g., the record button for pronunciation).
2. Show a countdown timer using `retryAfter`.
3. Re-enable the button only after the countdown expires.

```ts
if (error.response?.status === 429) {
  const retryAfter = error.response.data.retryAfter ?? 60;
  // Start countdown timer, disable UI
}
```

### Timeout handling for pronunciation

The pronunciation endpoint enforces a 20-second server-side timeout. The Axios request should mirror this:

```ts
const response = await apiClient.post("/v1/pronunciation/check", formData, {
  timeout: 20_000,
  headers: { "Content-Type": "multipart/form-data" },
});
```

If the request times out, display a user-friendly message and allow the user to retry without consuming a rate-limit slot (the server discards timed-out requests).

---

## 6. Rate Limiting

| Endpoint                    | Limit                     | Window   |
| --------------------------- | ------------------------- | -------- |
| `POST /v1/pronunciation/check` | 5 requests per user   | 60 seconds |

### 429 response

```json
{ "error": "Rate limit exceeded", "retryAfter": 45 }
```

`retryAfter` is the number of seconds until the next request will be accepted.

### Mobile app behavior

- Show a **countdown timer** (e.g., "Try again in 45 s").
- **Disable the record button** until the countdown reaches zero.
- Persist the countdown across screen navigations so users cannot bypass it by navigating away and back.

---

## 7. Offline & Caching

| Data                | Strategy                                           | TTL    |
| ------------------- | -------------------------------------------------- | ------ |
| Stages & modules    | Cache locally after first fetch                    | 1 hour |
| Audio files         | Cache after first playback                         | —      |
| Progress updates    | Queue locally, sync when connectivity is restored  | —      |
| NFC tag parsing     | Entirely local — no API call needed to read the tag| —      |

### Offline queue for progress

When the device is offline, progress updates (e.g., word completions, pronunciation results) are written to a local queue. When connectivity is restored the queue is flushed in order:

```
[offline] user completes word → queue POST /v1/modules/:id/word
[offline] user records audio  → queue POST /v1/progress/:id/:activityId
[online]  flush queue → POST each item sequentially
```

---

## 8. Module Session Lifecycle

The diagram below shows the full lifecycle of a module session, from NFC scan to completion.

```
┌─────────────┐
│  NFC Scan   │  User taps phone on NFC tag
│  (local)    │  → extracts moduleId from tag payload
└─────┬───────┘
      │
      ▼
┌─────────────────────────────────────────┐
│ GET /v1/modules/:moduleId?profileId=    │
│ Check canAttempt, attempts, cooldown    │
└─────┬──────────────────────┬────────────┘
      │ canAttempt = true    │ canAttempt = false
      ▼                     ▼
┌──────────────┐    ┌──────────────────────────┐
│ POST /v1/    │    │ Show cooldown message     │
│ modules/     │    │ "Next attempt available   │
│ :moduleId    │    │  in X hours"              │
│ Start/Resume │    └──────────────────────────┘
└─────┬────────┘
      │
      ▼
┌──────────────────────────────────────┐
│         Lesson Loop                  │
│  ┌────────────────────────────────┐  │
│  │ Display word                   │  │
│  │ ↓                              │  │
│  │ User pronounces word           │  │
│  │ ↓                              │  │
│  │ POST /v1/pronunciation/check   │  │
│  │ ↓                              │  │
│  │ POST /v1/modules/:id/word      │  │
│  │ Mark word complete             │  │
│  └──────────┬─────────────────────┘  │
│             │                        │
│             ▼                        │
│     More words remaining?            │
│       yes → loop back               │
│       no  → ▼                        │
└──────────────┬───────────────────────┘
               │
               ▼
┌──────────────────────────┐
│ Session auto-completes   │
│ Attempt counter +1       │
└──────────────────────────┘
```

### Key rules

| Rule              | Detail                                                    |
| ----------------- | --------------------------------------------------------- |
| Max attempts      | **3** per module per profile                              |
| Cooldown          | **12 hours** between attempts                             |
| Abandon           | `DELETE /v1/modules/:moduleId?profileId=` — does **not** increment the attempt counter |
| Resume            | If a session is already active, `POST` returns the existing session instead of creating a new one |

### Abandon flow

At any point during the lesson loop the user can choose to quit:

```
User taps "Quit" → DELETE /v1/modules/:moduleId?profileId=
                  → Session discarded, attempt NOT counted
                  → User returns to home screen
```

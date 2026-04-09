---
name: backend-developer
description: Expert in Tutoria's backend API integration, Axios service layer, Clerk JWT authentication, and Zustand stores. Use for backend API calls, authentication flows, data fetching, service/store architecture, or any question about how the app communicates with the REST API.
---

# Backend Developer

The Tutoria Mobile App communicates with the Tutoria REST API through a set of typed Axios service modules. Authentication is handled by Clerk, which provides a JWT that is injected into every outgoing request via `setAuthToken`. All backend integration code lives under `src/services/api/`, and Zustand stores in `src/stores/` act as the in-memory state layer on top of these services.

---

## Key Concepts

| Concept | Detail |
|---|---|
| **REST API** | Tutoria API, versioned under `/v1/`. All endpoints return JSON. |
| **Axios** | HTTP client (`axios` ^1.13.6). A single pre-configured instance in `client.ts` is shared across all service modules. |
| **Clerk JWT** | `@clerk/clerk-expo` ^2.19.31. After sign-in, the app calls `getToken()` and passes it to `setAuthToken()`. The token is attached as `Authorization: Bearer <token>` on every request. |
| **Environment Config** | API base URL and Clerk keys are loaded from `.env` via `EXPO_PUBLIC_*` prefixed variables and accessed through `src/utils/constants.ts`. |
| **API Versioning** | All routes are prefixed with `/v1/`. When the API releases a breaking change under `/v2/`, update the path in the relevant service file only — not in `client.ts`. |

---

## API Client Architecture

**File:** `src/services/api/client.ts`

The file exports a single Axios instance (`apiClient`) and a helper function (`setAuthToken`). No service module creates its own Axios instance — they all import `apiClient` from this file.

```typescript
// src/services/api/client.ts
import axios from 'axios';
import { API_BASE_URL } from '../../utils/constants';

const apiClient = axios.create({
  baseURL: API_BASE_URL,   // e.g. https://api-dev.tutoria.ac
  timeout: 30_000,          // 30 s default; overridden per-request when needed
  headers: {
    'Content-Type': 'application/json',
  },
});
```

### Setting the Auth Token

`setAuthToken` mutates the Axios instance's default headers. Call it once after Clerk resolves a session token, and again with `null` when the user signs out.

```typescript
export function setAuthToken(token: string | null): void {
  if (token) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete apiClient.defaults.headers.common['Authorization'];
  }
}
```

### Response Interceptor

A single response interceptor handles all non-2xx responses consistently. It logs the HTTP status and the `error` field from the API response body, then re-rejects the promise so calling code still receives the error.

```typescript
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const { status, data } = error.response;
      console.error(`[API] ${status}: ${data?.error || 'Unknown error'}`);
    } else if (error.request) {
      console.error('[API] Network error — no response received');
    }
    return Promise.reject(error); // always re-reject
  },
);
```

> **Note:** There is intentionally no request interceptor. Token injection is done eagerly via `setAuthToken` rather than lazily inside a request interceptor — this avoids async complexity in the interceptor chain.

---

## Authentication Flow

The app uses **Clerk** for authentication. The integration is as follows:

### 1. Sign-in

Clerk handles the sign-in UI and session management via `@clerk/clerk-expo`. When the user authenticates, Clerk creates a session and exposes it through `useAuth()` / `useSession()`.

### 2. Token Retrieval

After sign-in, the app retrieves a short-lived JWT:

```typescript
import { useAuth } from '@clerk/clerk-expo';

const { getToken, userId } = useAuth();
const token = await getToken(); // resolves a fresh JWT
```

### 3. Injecting the Token

Pass the token to `setAuthToken` so all subsequent Axios requests include it:

```typescript
import { setAuthToken } from '../services/api';

const token = await getToken();
if (token) {
  setAuthToken(token);
  useAuthStore.getState().setAuth(userId!, token);
}
```

### 4. Token Refresh

Clerk JWTs are short-lived (~60 s by default). To keep the token fresh, call `getToken()` before making sensitive requests, or set up a periodic refresh loop:

```typescript
// Example: refresh before each lesson session start
const freshToken = await getToken({ skipCache: true });
setAuthToken(freshToken);
await startOrResumeModule(moduleId, profileId);
```

### 5. Sign-out

Clear the token from both Axios and the Zustand store:

```typescript
setAuthToken(null);
useAuthStore.getState().clearAuth();
await signOut(); // Clerk
```

---

## API Services Reference

All service files live in `src/services/api/` and are re-exported from `src/services/api/index.ts`.

| File | Exported Functions | Endpoints Covered |
|---|---|---|
| `client.ts` | `apiClient` (default), `setAuthToken` | — (infrastructure only) |
| `profiles.ts` | `listProfiles`, `createProfile`, `selectProfile` | `GET /v1/profiles/list`, `POST /v1/profiles/create`, `POST /v1/profiles/select` |
| `modules.ts` | `getMissions`, `getModuleStatus`, `startOrResumeModule`, `completeWord`, `abandonModule`, `batchModuleStatus` | `GET /v1/modules/missions`, `GET /v1/modules/:id`, `POST /v1/modules/:id`, `POST /v1/modules/:id/word`, `DELETE /v1/modules/:id`, `POST /v1/modules/status/batch` |
| `progress.ts` | `getProgress`, `saveProgress` | `GET /v1/progress/:profileId`, `POST /v1/progress/:profileId/:activityId` |
| `pronunciation.ts` | `checkPronunciation` | `POST /v1/pronunciation/check` |
| `audio.ts` | `getAudioProxyUrl`, `resolveSounds` | `GET /v1/audio/proxy` (URL builder), `GET /v1/audio/sounds-resolve` |
| `syllabus.ts` | `getStages` | `GET /v1/syllabus/stages` |

### Detailed Function Signatures

#### `profiles.ts`

```typescript
listProfiles(): Promise<Profile[]>
createProfile(req: CreateProfileRequest): Promise<string>      // returns profileId
selectProfile(profileId: string): Promise<{ profileId: string; profileName: string }>
```

#### `modules.ts`

```typescript
getMissions(profileId: string): Promise<Mission[]>
getModuleStatus(moduleId: string, profileId: string): Promise<ModuleStatus>
startOrResumeModule(moduleId: string, profileId: string): Promise<SessionData>
completeWord(moduleId: string, req: WordCompletionRequest): Promise<WordCompletionResponse>
abandonModule(moduleId: string, profileId: string): Promise<void>
batchModuleStatus(req: BatchModuleStatusRequest): Promise<Record<string, Omit<ModuleStatus, 'sessionData' | 'cooldownEndsAt'>>>
```

#### `progress.ts`

```typescript
getProgress(profileId: string): Promise<ProgressResponse>
saveProgress(profileId: string, activityId: string, req: SaveProgressRequest): Promise<void>
```

#### `pronunciation.ts`

```typescript
checkPronunciation(req: PronunciationCheckRequest): Promise<PronunciationCheckResponse>
// Uses PRONUNCIATION_TIMEOUT_MS (from constants) instead of the default 30s timeout
```

#### `audio.ts`

```typescript
getAudioProxyUrl(r2Path: string): string                          // pure URL builder, no network call
resolveSounds(ipa: string, compound?: boolean): Promise<SoundsResolveResponse>
```

#### `syllabus.ts`

```typescript
getStages(): Promise<Stage[]>
```

---

## Data Types & Contracts

All types are defined in `src/utils/types.ts` and mirror the Tutoria API data model.

### Profiles

```typescript
interface Profile {
  id: string;
  name: string;
  user_id: string;
  created_at: string; // ISO 8601
}

interface CreateProfileRequest {
  name: string;
}
```

### Modules & Sessions

```typescript
interface Mission {
  moduleId: string;
  moduleName: string;
  label: 'Quick Win' | 'Ready to Retry' | 'Continue';
  wordsLeft: string;
  color: string;
  priority: number;
  completedWords: number;
  totalWords: number;
  attempts: number;
}

interface ModuleStatus {
  attempts: number;
  canAttempt: boolean;
  cooldownEndsAt: number | null; // Unix timestamp ms, null if no cooldown
  hasActiveSession: boolean;
  sessionData: SessionData | null;
}

interface SessionData {
  words: string[];
  wordData: WordData[];
  totalWords: number;
  position: number;             // 0-based index of current word
  started: number;              // Unix timestamp ms
  completedWords: string[];
  remainingWords: string[];
  moduleName: string;
  failedWords: string[];
}

interface WordData {
  id: string;
  display_text: string;
  target_ipa?: string;
  audio_path?: string;
  [key: string]: unknown;       // API may return extra fields — index signature handles them
}
```

### Progress

```typescript
interface ProgressItem {
  days_correct: number;
  mastered: boolean;
  last_correct_date: string | null;
  mastered_at: string | null;
}

interface ActivityProgress {
  id: string;
  displayText: string;
  isCorrect: boolean;
  daysCorrect: number;
  mastered: boolean;
  lastDate: string | null;
}

interface ProgressResponse {
  items: Record<string, ProgressItem>; // keyed by word/activity ID
  activities: ActivityProgress[];
  streakDays: number;
}

interface SaveProgressRequest {
  isCorrect: boolean;
  displayText: string;
}
```

### Pronunciation

```typescript
interface PronunciationCheckRequest {
  audio: string;          // base64-encoded audio data
  displayText: string;    // the word being assessed, e.g. "cat"
  targetIPA: string;      // expected IPA transcription, e.g. "/kæt/"
  language?: string;      // defaults to 'en-US'
  audioFormat?: 'wav' | 'mp3';
  unitType?: 'phoneme' | 'syllable' | 'word';
  validation?: {
    confused: string[];                    // common confusion pairs for this word
    feedback: Record<string, string>;      // phoneme → hint message
  };
}

interface PronunciationCheckResponse {
  overallIsCorrect: boolean;
  highlightedSegment: string;        // which phoneme/segment failed
  similarity: number;                // 0.0–1.0
  pronunciation_match: boolean;
  ipa_transcription_reference: string;
  ipa_transcription_user: string;
  resultType: string;
  feedback: string;                  // human-readable hint for the child
  audioIssue: string | null;
  errorType: string | null;
  debug: { processingTime: number }; // ms on the server
}
```

### Audio

```typescript
interface SoundsResolveResponse {
  resolved: boolean;
  audioPath: string;          // R2 path to use with getAudioProxyUrl()
  acceptableIPAs: string[];   // valid IPA variants for this sound
}
```

### Syllabus

```typescript
interface Stage {
  id: string;
  title: string;
  description: string;
  preReading: string;
  summary: string;
  moduleFiles: string[];
  items: unknown[];
}
```

### Common API Shapes

```typescript
interface ApiError  { error: string }
interface ApiSuccess { success: boolean }
interface HealthResponse { status: string; version: string; timestamp: string }
```

---

## Adding New API Endpoints

Follow these four steps every time you add a new endpoint.

### Step 1 — Add types to `src/utils/types.ts`

```typescript
// src/utils/types.ts
export interface MyNewRequest {
  profileId: string;
  someParam: string;
}

export interface MyNewResponse {
  result: string;
  count: number;
}
```

### Step 2 — Add the service function

Create a new file (or add to an existing one if the domain already has a file):

```typescript
// src/services/api/myFeature.ts
import apiClient from './client';
import type { MyNewRequest, MyNewResponse } from '../../utils/types';

export async function doMyFeatureThing(req: MyNewRequest): Promise<MyNewResponse> {
  const { data } = await apiClient.post<MyNewResponse>('/v1/my-feature/thing', req);
  return data;
}
```

Then re-export it from the barrel:

```typescript
// src/services/api/index.ts
export * from './myFeature';
```

### Step 3 — Wire up the Zustand store

```typescript
// src/stores/useMyFeatureStore.ts
import { create } from 'zustand';
import { doMyFeatureThing } from '../services/api';
import type { MyNewResponse } from '../utils/types';

interface MyFeatureStore {
  result: MyNewResponse | null;
  isLoading: boolean;
  error: string | null;
  fetch: (profileId: string, someParam: string) => Promise<void>;
}

export const useMyFeatureStore = create<MyFeatureStore>((set) => ({
  result: null,
  isLoading: false,
  error: null,
  fetch: async (profileId, someParam) => {
    set({ isLoading: true, error: null });
    try {
      const result = await doMyFeatureThing({ profileId, someParam });
      set({ result, isLoading: false });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      set({ error: message, isLoading: false });
    }
  },
}));
```

### Step 4 — Consume in the component

```typescript
// src/screens/MyFeatureScreen.tsx
import { useMyFeatureStore } from '../stores/useMyFeatureStore';

export function MyFeatureScreen() {
  const { result, isLoading, error, fetch } = useMyFeatureStore();

  useEffect(() => {
    fetch(activeProfileId, 'someValue');
  }, [activeProfileId]);

  if (isLoading) return <LoadingSpinner />;
  if (error)     return <ErrorMessage message={error} />;
  return <ResultView data={result} />;
}
```

---

## Environment Configuration

### Variables

Copy `.env.example` to `.env` and populate:

```bash
# Clerk Authentication
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here

# Tutoria API
EXPO_PUBLIC_API_URL=https://api-dev.tutoria.ac

# Feature Flags
EXPO_PUBLIC_ENABLE_NFC_MOCK=false
```

### Rules

- All variables consumed by the app **must** be prefixed `EXPO_PUBLIC_` — Expo strips anything without this prefix from the client bundle.
- **Never commit `.env`** to source control. Only `.env.example` is committed.
- For CI/CD, inject `EXPO_PUBLIC_*` variables as environment secrets — Expo's build system picks them up automatically.

### Accessing Variables in Code

Variables are centralised in `src/utils/constants.ts` (not read inline with `process.env`). This makes it easy to mock or change values in one place:

```typescript
// src/utils/constants.ts  (example pattern)
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://api-dev.tutoria.ac';
export const CLERK_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? '';
export const PRONUNCIATION_TIMEOUT_MS = 15_000;
```

Import from constants — never call `process.env` directly in service files or components.

### Switching Environments

| Environment | `EXPO_PUBLIC_API_URL` |
|---|---|
| Development | `https://api-dev.tutoria.ac` |
| Staging | `https://api-staging.tutoria.ac` |
| Production | `https://api.tutoria.ac` |

---

## Error Handling Patterns

### Layer 1 — Interceptor (global)

The response interceptor in `client.ts` logs all errors centrally and re-rejects the promise. It handles two cases:

- **HTTP errors** (`error.response` exists): logs `[API] <status>: <message>`
- **Network errors** (`error.request` exists, no response): logs `[API] Network error — no response received`

### Layer 2 — Service function (let it throw)

Service functions do **not** catch errors themselves — they let the interceptor log and then allow the rejection to propagate. This keeps service functions thin and testable.

```typescript
// ✅ correct — no try/catch in service layer
export async function getProgress(profileId: string): Promise<ProgressResponse> {
  const { data } = await apiClient.get<ProgressResponse>(`/v1/progress/${profileId}`);
  return data;
}
```

### Layer 3 — Store (catch and surface)

Zustand stores own the error state for each domain:

```typescript
fetch: async (profileId) => {
  set({ isLoading: true, error: null });
  try {
    const data = await getProgress(profileId);
    set({ activities: data.activities, streakDays: data.streakDays, isLoading: false });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load progress';
    set({ error: message, isLoading: false });
  }
},
```

### Layer 4 — Component (display)

Components read `error` from the store and render appropriate UI:

```typescript
const { activities, isLoading, error } = useProgressStore();

if (isLoading) return <ActivityIndicator />;
if (error)     return <Text style={styles.error}>{error}</Text>;
```

### Per-request Timeout Override

For slow endpoints (e.g. pronunciation assessment), override the default 30 s timeout:

```typescript
// src/services/api/pronunciation.ts
const { data } = await apiClient.post<PronunciationCheckResponse>(
  '/v1/pronunciation/check',
  req,
  { timeout: PRONUNCIATION_TIMEOUT_MS }, // 15_000 ms
);
```

### Typing Axios Errors

When you need to inspect the error body in a store or component:

```typescript
import axios from 'axios';
import type { ApiError } from '../utils/types';

} catch (err: unknown) {
  if (axios.isAxiosError<ApiError>(err) && err.response?.data?.error) {
    set({ error: err.response.data.error });
  } else {
    set({ error: 'An unexpected error occurred' });
  }
}
```

---

## Best Practices

1. **Always type API responses generically.** Use `apiClient.get<MyResponse>(...)` so TypeScript can infer the `data` type. Never use `any` for an API response.

2. **Keep service functions thin.** A service function should do one thing: call the API and return typed data. Do not transform data, apply business logic, or catch errors inside a service function.

3. **One Axios instance.** Never create a second `axios.create(...)` call anywhere in the codebase. Import `apiClient` from `./client` (or `../services/api`). This ensures all requests share the same base URL, timeout, and interceptor chain.

4. **Centralise all `process.env` reads in `constants.ts`.** Service files and components should import from `constants.ts`, never call `process.env` directly. This makes the app easier to test and configure.

5. **Call `setAuthToken` before the first authenticated request.** Typically done in an `useEffect` that runs when Clerk's `getToken()` resolves after app launch. Without this, the first batch of API calls will 401.

6. **Use `getToken({ skipCache: true })` for sensitive operations.** Before starting a lesson session or saving progress, refresh the JWT to avoid using a token that is about to expire.

7. **Distinguish loading from error state in stores.** Always track both `isLoading: boolean` and `error: string | null` in stores that call the API. Components should render a loading indicator, an error message, or the data — never silently fail.

8. **Use `batchModuleStatus` for list screens.** If you need the status of multiple modules at once (e.g. a home screen listing all missions), use `batchModuleStatus` rather than calling `getModuleStatus` in a loop. This avoids N+1 network requests.

9. **Use `getAudioProxyUrl` for audio playback — never construct URLs manually.** The proxy URL encodes the R2 path and includes the base URL, keeping audio routing consistent if the API base URL changes.

---

## Common Pitfalls

1. **Forgetting to call `setAuthToken` after sign-in.** All API calls will return `401 Unauthorized` until `setAuthToken(token)` is called with a valid Clerk JWT. Symptoms: API calls fail immediately after the app launches or after a cold start.

2. **Reading `process.env` directly in a service file.** Expo's Metro bundler only inlines `EXPO_PUBLIC_*` variables at build time. Reading them at runtime outside of the module scope (or conditionally) can return `undefined`. Always use the constants from `src/utils/constants.ts`.

3. **Catching errors inside service functions.** If a service function swallows errors (e.g. returns `null` on failure instead of throwing), the store's `error` state will never be set, and the component will silently show empty/stale data rather than an error state.

4. **Using `apiClient` directly in a component.** Components should never import `apiClient` directly — they should call store actions, which call service functions, which use `apiClient`. Bypassing the store breaks state synchronisation and makes the component untestable.

5. **Not awaiting `abandonModule` on screen unmount.** If the user navigates away mid-session, `abandonModule` must be called to clean up the server-side session. Failing to do so leaves a ghost session active, which prevents the user from starting a new attempt until the cooldown expires.

6. **Ignoring `WordData`'s index signature.** `WordData` includes `[key: string]: unknown` because the API may return additional fields depending on the module type. Code that accesses extra fields must check for `undefined` before use.

---

## Quick Reference

| Service File | Key Functions | Associated Store | Endpoints |
|---|---|---|---|
| `profiles.ts` | `listProfiles`, `createProfile`, `selectProfile` | `useProfileStore` | `/v1/profiles/*` |
| `modules.ts` | `getMissions`, `startOrResumeModule`, `completeWord`, `batchModuleStatus` | `useLessonStore` | `/v1/modules/*` |
| `progress.ts` | `getProgress`, `saveProgress` | `useProgressStore` | `/v1/progress/*` |
| `pronunciation.ts` | `checkPronunciation` | `useLessonStore` | `/v1/pronunciation/check` |
| `audio.ts` | `getAudioProxyUrl`, `resolveSounds` | _(used directly in components)_ | `/v1/audio/*` |
| `syllabus.ts` | `getStages` | _(no dedicated store yet)_ | `/v1/syllabus/stages` |
| `client.ts` | `setAuthToken`, `apiClient` | `useAuthStore` (for token) | — |

### Import Pattern

```typescript
// Preferred — use the barrel export
import { getMissions, checkPronunciation, setAuthToken } from '../services/api';

// Acceptable — direct import when you only need one function
import { getProgress } from '../services/api/progress';
```

### Common Type Imports

```typescript
import type {
  Mission,
  ModuleStatus,
  SessionData,
  WordData,
  WordCompletionRequest,
  WordCompletionResponse,
  ProgressResponse,
  ActivityProgress,
  PronunciationCheckRequest,
  PronunciationCheckResponse,
  SoundsResolveResponse,
  Profile,
  Stage,
  ApiError,
} from '../utils/types';
```

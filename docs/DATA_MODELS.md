# Tutoria Mobile App — Data Models

## 1. Overview

All TypeScript types are defined in [`src/utils/types.ts`](../src/utils/types.ts) and mirror the Tutoria API's request/response shapes. The API is a Cloudflare Worker backed by D1 (SQLite), R2 Object Storage, and KV Namespaces.

These types are consumed by:

- **Services** (`src/services/api/`) — API client functions that send and receive typed data.
- **Stores** (`src/stores/`) — Zustand stores that hold client-side state.
- **Components** — React Native screens and UI elements.

---

## 2. Authentication Models

Authentication is handled by [Clerk](https://clerk.com). The mobile app stores session state locally.

```typescript
interface AuthState {
  isSignedIn: boolean;
  userId: string | null;   // Clerk user ID
  token: string | null;    // Clerk JWT, sent as Bearer token
}
```

- All `/v1/*` API routes require `Authorization: Bearer <token>`.
- The API client (`src/services/api/client.ts`) injects the token automatically via `setAuthToken()`.
- The API webhook (`POST /v1/webhooks/clerk`) syncs Clerk user lifecycle events to D1.

---

## 3. Profile Models

```typescript
interface Profile {
  id: string;            // UUID, primary key
  name: string;          // Max 50 characters
  user_id: string;       // UUID, references users table
  created_at: string;    // ISO 8601 timestamp
}

interface CreateProfileRequest {
  name: string;
}

interface SelectProfileRequest {
  profileId: string;
}
```

### Business Rules

| Rule | Detail |
|------|--------|
| Multiple profiles | One user can have multiple profiles (each profile = one learner/child) |
| Name validation | Alphanumeric characters plus spaces, hyphens, underscores, periods, and apostrophes |
| Max length | 50 characters |
| Uniqueness | Duplicate names per user are rejected by the API |

### API Endpoints

| Method | Endpoint | Returns |
|--------|----------|---------|
| `GET` | `/v1/profiles/list` | `Profile[]` |
| `POST` | `/v1/profiles/create` | `{ profileId: string }` |
| `POST` | `/v1/profiles/select` | `{ profileId: string; profileName: string }` |

---

## 4. Syllabus Models

```typescript
interface Stage {
  id: string;              // e.g., "stage-1"
  title: string;           // e.g., "Foundations"
  description: string;
  preReading: string;
  summary: string;
  moduleFiles: string[];   // e.g., ["module-a.json", "module-b.json"]
  items: unknown[];
}
```

- Stages are ordered curriculum levels fetched from `GET /v1/syllabus/stages`.
- Each stage references module JSON files stored in R2 under `tutoria/curriculums/branches/<branch>/modules/`.
- Stages are cached in KV with a 1-hour TTL.

---

## 5. Module Models

### Mission (Dashboard Cards)

```typescript
interface Mission {
  moduleId: string;
  moduleName: string;
  label: 'Quick Win' | 'Ready to Retry' | 'Continue';
  wordsLeft: string;
  color: string;
  priority: number;        // determines sort order
  completedWords: number;
  totalWords: number;
  attempts: number;
}
```

**Priority ranking** (higher = shown first):

| Priority | Label | Condition |
|----------|-------|-----------|
| 1000 | Quick Win | Active session with ≤ 2 words remaining |
| 800 | Ready to Retry | 1–2 prior attempts, 12-hour cooldown has expired |
| 600 | Continue | Active session with > 2 words remaining |

Up to 3 missions are returned by `GET /v1/modules/missions`.

### Module Status

```typescript
interface ModuleStatus {
  attempts: number;              // 0–3
  canAttempt: boolean;           // false if >= 3 attempts or in cooldown
  cooldownEndsAt: number | null; // Unix ms timestamp
  hasActiveSession: boolean;
  sessionData: SessionData | null;
}
```

### Session Data

```typescript
interface SessionData {
  words: string[];           // ordered word IDs for this session
  wordData: WordData[];      // full word details
  totalWords: number;
  position: number;          // current index in the word list
  started: number;           // Unix ms timestamp
  completedWords: string[];  // word IDs answered correctly
  remainingWords: string[];  // word IDs not yet attempted
  moduleName: string;
  failedWords: string[];     // word IDs answered incorrectly
}
```

### Word Data

```typescript
interface WordData {
  id: string;
  display_text: string;
  target_ipa?: string;       // IPA pronunciation target
  audio_path?: string;       // R2 path to reference audio
  [key: string]: unknown;    // additional metadata from curriculum JSON
}
```

### Word Completion

```typescript
interface WordCompletionRequest {
  profileId: string;
  wordId: string;
  isCorrect: boolean;
}

interface WordCompletionResponse {
  success: boolean;
  completedWords: number;
  totalWords: number;
  remainingWords: number;
  isModuleComplete: boolean;
  failedWords: string[];
}
```

### Batch Status

```typescript
interface BatchModuleStatusRequest {
  profileId: string;
  moduleIds: string[];
}

// Response: Record<string, Omit<ModuleStatus, 'sessionData' | 'cooldownEndsAt'>>
```

### Module API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/v1/modules/missions?profileId=<uuid>` | Get up to 3 priority-sorted missions |
| `GET` | `/v1/modules/:moduleId?profileId=<uuid>` | Get module attempt status & active session |
| `POST` | `/v1/modules/:moduleId` | Start or resume a module session |
| `POST` | `/v1/modules/:moduleId/word` | Mark a word as completed |
| `DELETE` | `/v1/modules/:moduleId?profileId=<uuid>` | Abandon active session |
| `POST` | `/v1/modules/status/batch` | Batch-fetch statuses for multiple modules |

### Business Rules

| Rule | Detail |
|------|--------|
| Max attempts | 3 per module per profile |
| Cooldown | 12 hours between attempts |
| Session persistence | Sessions persist in D1 (`current_session` JSON blob) until completed or abandoned |
| Module cache | Module JSON files cached in KV with 1-hour TTL |

---

## 6. Progress Models

```typescript
interface ProgressItem {
  days_correct: number;          // increments once per calendar day
  mastered: boolean;             // true when days_correct >= 3
  last_correct_date: string | null;  // ISO 8601 date
  mastered_at: string | null;    // ISO 8601 timestamp
}

interface ActivityProgress {
  id: string;                    // activity ID
  displayText: string;           // word/phrase display text
  isCorrect: boolean;            // latest attempt result
  daysCorrect: number;           // cumulative correct days
  mastered: boolean;             // mastery flag
  lastDate: string | null;       // last correct date
}

interface ProgressResponse {
  items: Record<string, ProgressItem>;  // keyed by activity ID
  activities: ActivityProgress[];
  streakDays: number;            // consecutive days with ≥ 1 correct answer
}

interface SaveProgressRequest {
  isCorrect: boolean;
  displayText: string;
}
```

### Business Rules

| Rule | Detail |
|------|--------|
| Mastery threshold | 3 correct days (not necessarily consecutive) |
| Daily increment | `days_correct` increments at most once per calendar day |
| Streak | Consecutive calendar days with at least one correct answer |

### API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/v1/progress/:profileId` | Get all activity progress and streak |
| `POST` | `/v1/progress/:profileId/:activityId` | Save a pronunciation attempt result |

---

## 7. Pronunciation Models

### Request

```typescript
interface PronunciationCheckRequest {
  audio: string;                 // base64-encoded WAV or MP3
  displayText: string;           // the target word/phrase
  targetIPA: string;             // expected IPA transcription
  language?: string;             // default: "english"
  audioFormat?: 'wav' | 'mp3';
  unitType?: 'phoneme' | 'syllable' | 'word';
  validation?: {
    confused: string[];          // known confusable phoneme pairs
    feedback: Record<string, string>;  // phoneme → feedback message
  };
}
```

### Response

```typescript
interface PronunciationCheckResponse {
  overallIsCorrect: boolean;
  highlightedSegment: string;    // HTML-like highlighted IPA
  similarity: number;            // 0.0–1.0 confidence score
  pronunciation_match: boolean;
  ipa_transcription_reference: string;
  ipa_transcription_user: string;
  resultType: string;            // classification of the result
  azure: unknown;                // raw Azure Speech response
  feedback: string;              // human-readable feedback
  audioIssue: string | null;     // e.g., "too quiet", "background noise"
  errorType: string | null;      // error classification if failed
  debug: {
    processingTime: number;      // milliseconds
  };
}
```

### Constraints

| Constraint | Value |
|------------|-------|
| Rate limit | 5 requests per 60 seconds (per user, enforced via KV) |
| Hard timeout | 20 seconds |
| API endpoint | `POST /v1/pronunciation/check` |
| AI pipeline | Azure Speech → Google Gemini → Mistral (fallback) |

---

## 8. Audio Models

```typescript
interface SoundsResolveResponse {
  resolved: boolean;             // true if audio file found in R2
  audioPath: string;             // R2 path to .wav file
  acceptableIPAs: string[];      // alternative acceptable pronunciations
}
```

### API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/v1/audio/sounds-resolve?ipa=<ipa>&compound=<bool>&refresh=<bool>` | Resolve IPA string to audio file |
| `GET` | `/v1/audio/proxy?path=<r2-path>` | Proxy R2-stored audio files to client |

- Audio files are stored in R2 at `tutoria/curriculums/branches/<branch>/audio/<ipa>.wav`.
- Sound resolution results are cached in KV with a 5-minute TTL.
- The proxy URL is constructed client-side via `getAudioProxyUrl(r2Path)`.

---

## 9. NFC Models

```typescript
interface NfcTagPayload {
  tagId: string;                 // hardware NFC tag ID
  moduleId: string;              // extracted from NDEF text payload
  isValid: boolean;              // true if prefix matches and moduleId is non-empty
  rawData?: string;              // original NDEF text record
}

interface NfcScanState {
  isScanning: boolean;
  isSupported: boolean;          // device has NFC hardware
  isEnabled: boolean;            // NFC is turned on
  lastTag: NfcTagPayload | null;
  error: string | null;
}
```

### Tag Format

NFC tags use NDEF Text records with the format:

```
tutoria:<moduleId>
```

For example: `tutoria:module-a`

The tag parser (`src/services/nfc/tagParser.ts`) validates the `tutoria:` prefix and extracts the module ID. Tags without the prefix or with an empty module ID are marked `isValid: false`.

---

## 10. API Common Types

```typescript
interface ApiError {
  error: string;
}

interface ApiSuccess {
  success: boolean;
}

interface HealthResponse {
  status: string;
  version: string;
  timestamp: string;
}
```

- `ApiError` is the standard error envelope returned by all API endpoints.
- The API client (`src/services/api/client.ts`) uses Axios with a 30-second default timeout and intercepts errors for consistent handling.

---

## 10b. Timestamp Standardization

The codebase uses two timestamp formats. This section clarifies when each is used.

| Format | Type | Used In | Example |
|--------|------|---------|---------|
| ISO 8601 string | `string` | D1 database columns, API responses for creation dates | `"2025-03-15T10:30:00Z"` |
| Unix milliseconds | `number` | Client-side session state, cooldown calculations | `1710499800000` |

### Conversion Guidelines

```ts
// ISO 8601 → Unix ms
const unixMs = new Date(isoString).getTime();

// Unix ms → ISO 8601
const isoString = new Date(unixMs).toISOString();
```

### Where Each Format Appears

| Field | Format | Notes |
|-------|--------|-------|
| `Profile.created_at` | ISO 8601 | From D1 |
| `ProgressItem.last_correct_date` | ISO 8601 | Date only (no time component) |
| `ProgressItem.mastered_at` | ISO 8601 | Full timestamp |
| `ModuleStatus.cooldownEndsAt` | Unix ms (`number \| null`) | Calculated client-side from `last_attempt_at + 12h` |
| `SessionData.started` | Unix ms | Session start time |
| `pronunciation_metrics.created_at` | ISO 8601 | From D1 |

> **Convention:** API responses use ISO 8601. Client-side calculations (cooldowns, session timing) use Unix ms for easier arithmetic. Always convert at the boundary.

---

## 10c. Validation Patterns

Runtime validation ensures API responses match expected shapes. Recommended approach: [Zod](https://zod.dev) schemas.

### Profile Validation

```ts
import { z } from 'zod';

const ProfileSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(50),
  created_at: z.string().datetime(),
});

const ProfileListSchema = z.object({
  profiles: z.array(ProfileSchema),
});

// Usage in API service
export async function listProfiles(): Promise<Profile[]> {
  const { data } = await apiClient.get('/v1/profiles/list');
  const parsed = ProfileListSchema.parse(data); // throws on invalid shape
  return parsed.profiles;
}
```

### NFC Tag Validation

```ts
const NfcTagSchema = z.object({
  tagId: z.string().min(1),
  moduleId: z.string().regex(/^[a-z0-9-]+$/),
  isValid: z.literal(true),
});

// Type guard alternative (no Zod dependency)
function isValidNfcPayload(raw: string): boolean {
  if (!raw.startsWith('tutoria:')) return false;
  const moduleId = raw.slice(8);
  return moduleId.length > 0 && /^[a-z0-9-]+$/.test(moduleId);
}
```

### Type Guards

For lightweight runtime checks without adding Zod:

```ts
function isApiError(value: unknown): value is { error: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'error' in value &&
    typeof (value as Record<string, unknown>).error === 'string'
  );
}

function isSessionData(value: unknown): value is SessionData {
  return (
    typeof value === 'object' &&
    value !== null &&
    'words' in value &&
    'position' in value &&
    Array.isArray((value as Record<string, unknown>).words)
  );
}
```

> **Recommendation:** Use Zod for API boundary validation (service layer). Use type guards for internal checks (stores, components). This keeps the bundle size impact minimal while ensuring safety at the network boundary.

---

## 11. Zustand Store Shapes

All stores use [Zustand](https://github.com/pmndrs/zustand) for lightweight state management.

### `useAuthStore` — `src/stores/useAuthStore.ts`

```typescript
interface AuthStore {
  // State
  isSignedIn: boolean;
  userId: string | null;
  token: string | null;

  // Actions
  setAuth: (userId: string, token: string) => void;
  clearAuth: () => void;
}
```

### `useProfileStore` — `src/stores/useProfileStore.ts`

```typescript
interface ProfileStore {
  // State
  profiles: Profile[];
  activeProfile: Profile | null;

  // Actions
  setProfiles: (profiles: Profile[]) => void;
  setActiveProfile: (profile: Profile | null) => void;
  addProfile: (profile: Profile) => void;
}
```

### `useLessonStore` — `src/stores/useLessonStore.ts`

```typescript
interface LessonStore {
  // State
  currentSession: SessionData | null;
  currentWord: WordData | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setSession: (session: SessionData | null) => void;
  setCurrentWord: (word: WordData | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}
```

### `useProgressStore` — `src/stores/useProgressStore.ts`

```typescript
interface ProgressStore {
  // State
  activities: ActivityProgress[];
  streakDays: number;
  isLoading: boolean;

  // Actions
  setActivities: (activities: ActivityProgress[]) => void;
  setStreakDays: (days: number) => void;
  setLoading: (loading: boolean) => void;
}
```

### `useNfcStore` — `src/stores/useNfcStore.ts`

```typescript
interface NfcStore {
  // State
  isScanning: boolean;
  isSupported: boolean;
  isEnabled: boolean;
  lastTag: NfcTagPayload | null;
  error: string | null;

  // Actions
  setScanning: (scanning: boolean) => void;
  setSupported: (supported: boolean) => void;
  setEnabled: (enabled: boolean) => void;
  setLastTag: (tag: NfcTagPayload | null) => void;
  setError: (error: string | null) => void;
}
```

### Data Flow

```
Clerk Auth → useAuthStore (token) → API client Bearer header
                                         │
                    ┌────────────────────┴────────────────────┐
                    ▼                                         ▼
            useProfileStore                           useLessonStore
          (profiles, active)                     (session, currentWord)
                    │                                         │
                    ▼                                         ▼
           useProgressStore                            useNfcStore
        (activities, streak)                    (lastTag → moduleId)
```

---

## 12. Database Schema Reference

The Tutoria API uses Cloudflare D1 (SQLite). Below is the schema and how mobile app types map to each table.

### `users`

| Column | Type | Notes |
|--------|------|-------|
| `id` | TEXT (UUID) | Primary key |
| `clerk_id` | TEXT | Unique, from Clerk webhook |
| `email` | TEXT | |
| `name` | TEXT | |
| `created_at` | TEXT | ISO 8601 |
| `deleted_at` | TEXT | Nullable, soft-delete |

> Not directly exposed to the mobile app. User identity flows through Clerk JWT → `useAuthStore`.

### `profiles`

| Column | Type | Notes |
|--------|------|-------|
| `id` | TEXT (UUID) | Primary key |
| `name` | TEXT | Max 50 chars |
| `user_id` | TEXT (UUID) | FK → `users.id` |
| `created_at` | TEXT | ISO 8601 |

> Maps to: `Profile` interface, `useProfileStore`.

### `activities`

| Column | Type | Notes |
|--------|------|-------|
| `id` | TEXT | Primary key |
| `display_text` | TEXT | Word or phrase shown to learner |
| `target_ipa` | TEXT | Expected IPA pronunciation |

> Maps to: `WordData` (via curriculum JSON, not queried directly).

### `progress`

| Column | Type | Notes |
|--------|------|-------|
| `id` | TEXT | Primary key |
| `profile_id` | TEXT (UUID) | FK → `profiles.id` |
| `activity_id` | TEXT | FK → `activities.id` |
| `days_correct` | INTEGER | 0–3+, increments once per calendar day |
| `mastered` | INTEGER | 0 or 1 |
| `last_correct_date` | TEXT | ISO 8601 date |
| `mastered_at` | TEXT | ISO 8601 timestamp |

> Maps to: `ProgressItem`, `ActivityProgress`, `useProgressStore`.

### `module_progress`

| Column | Type | Notes |
|--------|------|-------|
| `id` | TEXT | Primary key |
| `profile_id` | TEXT (UUID) | FK → `profiles.id` |
| `module_id` | TEXT | Module identifier |
| `attempts` | INTEGER | 0–3 |
| `current_session` | TEXT | JSON blob (`SessionData`) |
| `last_attempt_at` | TEXT | ISO 8601, used for cooldown calculation |

> Maps to: `ModuleStatus`, `SessionData`, `useLessonStore`.

### `pronunciation_metrics`

| Column | Type | Notes |
|--------|------|-------|
| `id` | TEXT | Primary key |
| `profile_id` | TEXT (UUID) | FK → `profiles.id` |
| `activity_id` | TEXT | FK → `activities.id` |
| `status` | TEXT | e.g., "success", "error" |
| `result` | TEXT | JSON blob of pronunciation response |
| `created_at` | TEXT | ISO 8601 |

> Fire-and-forget metrics. Not directly consumed by the mobile app.

### Type ↔ Table Mapping Summary

| Mobile Type | D1 Table | Relationship |
|-------------|----------|--------------|
| `AuthState` | `users` | User identity via Clerk JWT; `users` row created by webhook |
| `Profile` | `profiles` | Direct 1:1 mapping |
| `WordData` | `activities` | Curriculum JSON enriches activity data |
| `ProgressItem` | `progress` | Direct 1:1 mapping per activity per profile |
| `ModuleStatus` | `module_progress` | `sessionData` stored as JSON in `current_session` column |
| `SessionData` | `module_progress` | Embedded JSON blob within `current_session` |
| `PronunciationCheckResponse` | `pronunciation_metrics` | Stored as JSON in `result` column |

---

## Appendix: Key Constants

Defined in `src/utils/constants.ts`:

| Constant | Value | Purpose |
|----------|-------|---------|
| `API_BASE_URL` | `https://api-dev.tutoria.ac` | Base API endpoint |
| `NFC_TAG_PREFIX` | `'tutoria:'` | Expected NDEF tag prefix |
| `SUPPORTED_TAG_TECH` | `'Ndef'` | NFC technology type |
| `MAX_MODULE_ATTEMPTS` | `3` | Max attempts per module |
| `COOLDOWN_HOURS` | `12` | Hours between module attempts |
| `MASTERY_DAYS_REQUIRED` | `3` | Correct days needed for mastery |
| `PRONUNCIATION_RATE_LIMIT` | `5` | Max pronunciation checks per 60 s |
| `PRONUNCIATION_TIMEOUT_MS` | `20_000` | Pronunciation API timeout |
| `STAGES_CACHE_TTL` | `3_600_000` | 1-hour cache for syllabus stages |
| `MODULE_CACHE_TTL` | `3_600_000` | 1-hour cache for module JSON |

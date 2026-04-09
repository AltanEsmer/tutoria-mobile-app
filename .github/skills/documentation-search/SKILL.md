---
name: documentation-search
description: Expert at navigating Tutoria's codebase documentation including API contracts, TypeScript type definitions, architecture diagrams, and inline docs. Use when searching for documentation, understanding the codebase architecture, or locating specs and technical references.
---

# Documentation Search

Tutoria's codebase spans physical NFC hardware, a React Native/Expo mobile client, and a Cloudflare Worker API — which means documentation is spread across Markdown guides, auto-documented TypeScript types, inline code comments, and visual diagrams. Mastering documentation search in this project means knowing not just *where* things are written down, but also understanding how the API contract in `tutoria-api.md`, the TypeScript interfaces in `src/utils/types.ts`, and the runtime service layer in `src/services/` all act as living documentation together. This skill will help you navigate that landscape quickly and confidently.

---

## Key Concepts

### What Counts as "Documentation" in This Project

Documentation in Tutoria is **multi-layered**. It is not limited to the `docs/` folder — you should treat each of the following as an authoritative source of truth for its domain:

| Layer | Examples | Best For |
|---|---|---|
| **Prose docs** | `docs/ARCHITECTURE.md`, `docs/NFC_GUIDE.md` | High-level understanding, architecture decisions |
| **API reference** | `tutoria-api.md`, `docs/tutoria-api.md` | Endpoint signatures, request/response shapes, auth rules |
| **TypeScript types** | `src/utils/types.ts` | Canonical data shapes, field names, optionality |
| **Service layer** | `src/services/api/*.ts`, `src/services/nfc/*.ts` | How the app actually calls the API at runtime |
| **Zustand stores** | `src/stores/*.ts` | Global state shape, available setters |
| **Constants** | `src/utils/constants.ts` | Hardcoded limits, prefixes, timeouts, cache TTLs |
| **Inline comments** | Throughout `src/` | Nuanced implementation details |
| **Diagrams (Mermaid)** | `docs/diagrams/*.md` | Sequence, state machine, flow — all rendered Mermaid |
| **Diagrams (PNG)** | `diagrams/*.png` | Quick visual reference for architecture and flows |
| **App config** | `app.json`, `.env.example` | Platform config, environment variable keys |

### Search Strategies

- **Keyword search** — use `grep` or IDE search for literal terms (`moduleId`, `NDEF`, `cooldown`)
- **Type-first** — if you know a data shape, find its interface in `src/utils/types.ts` first, then trace its consumers
- **Service-first** — if you know an API endpoint, find it in `tutoria-api.md`, then map it to the service file in `src/services/api/`
- **Store-first** — if you need to understand app state, start in `src/stores/` before looking at screens
- **Diagram-first** — for flow or sequence questions, check `docs/diagrams/` before reading code

---

## Project Documentation Structure

### `docs/` — Prose Documentation

The `docs/` folder is the primary human-readable documentation hub. All files are Markdown.

```
docs/
├── ARCHITECTURE.md           # 3-tier system overview (NFC cards → app → Cloudflare Worker)
├── API_INTEGRATION.md        # How the Axios client integrates with the Tutoria API
├── NFC_GUIDE.md              # NTAG215 encoding, NDEF format, Android vs. iOS differences
├── DEVELOPMENT_SETUP.md      # Prerequisites, env setup, build & run commands
├── PROJECT_STRUCTURE.md      # Directory layout, file purposes, naming conventions
├── DATA_MODELS.md            # D1 database schema, Zustand store shapes, API types
├── ROADMAP.md                # 6 implementation phases (Foundation → Deployment)
│
├── quality/
│   └── TESTING_STRATEGY.md   # Unit/integration/E2E approach, CI integration
│
├── infrastructure/
│   ├── DEPLOYMENT.md         # Android/iOS build signing, release workflow, EAS
│   ├── SECURITY.md           # Auth model, secrets management, data privacy
│   ├── OFFLINE_STRATEGY.md   # Offline caching, sync protocol, KV TTLs
│   └── ERROR_HANDLING.md     # Error patterns, crash reporting, user messaging
│
└── diagrams/                 # Mermaid source files (renderable in GitHub/VS Code)
    ├── system-architecture.md
    ├── entity-relationship.md
    ├── class-domain-model.md
    ├── activity-user-flow.md
    ├── sequence-auth.md
    ├── sequence-nfc-lesson.md
    ├── state-module-session.md
    ├── offline-sync.md
    ├── deployment.md
    └── ci-cd-pipeline.md
```

### `tutoria-api.md` — The Primary API Reference

Located at the **project root** (and mirrored inside `docs/`), this file is the canonical contract between the mobile app and the Cloudflare Worker backend. It documents:

- **Base URLs** (`https://api.tutoria.ac`, `https://api-dev.tutoria.ac`)
- **Authentication** — Clerk JWT required as `Authorization: Bearer <token>` on all `/v1/*` routes
- Every endpoint with its HTTP method, path, request body schema, and response shape
- **Rate limits** and timeouts (e.g., 5 req/60s on `/v1/pronunciation/check`, 20s timeout)
- **D1 database schema** — all table definitions
- **R2 bucket layout** — how curriculum JSON and audio files are organized
- **KV cache rules** — TTLs per endpoint (e.g., 1 hour for `/v1/syllabus/stages`)
- **Webhook verification** — Svix HMAC-SHA256 for Clerk lifecycle events

> **Tip:** When in doubt about whether a field is required, what it's called, or what the server returns on error — consult `tutoria-api.md` first before reading service code.

### `README.md` — Project Overview

The root `README.md` provides a high-level introduction including:

- The phygital learning model (NFC card tap → phonics lesson)
- Full tech stack summary
- Core feature list (NFC, pronunciation AI, streaks, multi-profile, offline)
- Platform-specific notes (Android: background NFC; iOS: foreground NFC only, requires dev build)
- Links to the docs folder

### `diagrams/` — Visual PNG Assets

The root `diagrams/` folder contains rendered PNG exports for quick visual reference:

```
diagrams/
├── The System Architecture.png          # 3-tier system: cards, app, cloud
├── The Phygital User Journey.png        # Child's tap-to-lesson flow
├── Sequence Diagram.png                 # Full component interaction sequence
├── Deployment Diagram.png               # Infrastructure topology
├── Class Diagram (Domain Model).png     # Domain object model
└── Activity Diagram (User Experience Flow).png  # UX decision points
```

The Mermaid source equivalents live in `docs/diagrams/` and are version-controlled alongside the code.

### `src/utils/types.ts` — TypeScript as Documentation

This **206-line file** is one of the most important reference documents in the project. Every API request/response shape, every store state interface, and every NFC payload structure is defined here. When you need to know the exact field names used across the app, this is the ground truth.

```
src/utils/types.ts — Interface Inventory
├── AuthState
├── Profile, CreateProfileRequest, SelectProfileRequest
├── Stage
├── Mission, ModuleStatus, SessionData, WordData
├── WordCompletionRequest, WordCompletionResponse, BatchModuleStatusRequest
├── ProgressItem, ActivityProgress, ProgressResponse, SaveProgressRequest
├── PronunciationCheckRequest, PronunciationCheckResponse
├── SoundsResolveResponse
├── NfcTagPayload, NfcScanState
└── ApiError, ApiSuccess, HealthResponse
```

### `src/utils/constants.ts` — Named Constants as Documentation

All magic numbers and configuration values are centralized here:

```typescript
NFC_TAG_PREFIX          // "tutoria:" — prefix used in NDEF payload
MAX_MODULE_ATTEMPTS     // 3 — before cooldown triggers
COOLDOWN_HOURS          // 12 — hours between module retry attempts
MASTERY_DAYS_REQUIRED   // 3 — consecutive correct days to mark word as mastered
PRONUNCIATION_RATE_LIMIT  // 5 — requests per 60 seconds
PRONUNCIATION_TIMEOUT_MS  // 20,000 — ms before pronunciation request times out
```

When you see a hardcoded number in a store or hook, check `constants.ts` first — it is likely already named.

### Inline Code Documentation

Look for inline comments specifically in:

- **`src/services/api/client.ts`** — interceptor logic and token injection
- **`src/services/nfc/tagParser.ts`** — NDEF payload format explanation (`tutoria:<moduleId>`)
- **`src/services/nfc/nfcManager.ts`** — platform-specific NFC session handling
- **`src/stores/*.ts`** — state field semantics and action descriptions

---

## How to Search the Codebase

### Finding Files by Pattern

Use glob patterns to locate files by name when you know the domain:

```bash
# Find all Zustand stores
src/stores/**/*.ts

# Find all API service files
src/services/api/**/*.ts

# Find all Expo Router screen files
src/app/**/*.tsx

# Find all Markdown documentation
docs/**/*.md

# Find all TypeScript type definition files
src/utils/*.ts
```

### Searching File Contents with grep

Use `grep` (ripgrep) for fast content search across the codebase:

```bash
# Find all usages of a specific API function
grep -r "checkPronunciation" src/

# Find where a TypeScript interface is defined
grep -r "interface PronunciationCheckRequest" src/

# Find all files importing from the API barrel
grep -r "from.*services/api" src/

# Find usages of NFC_TAG_PREFIX constant
grep -r "NFC_TAG_PREFIX" src/

# Find all Zustand store usages in screens
grep -r "useAuthStore\|useNfcStore\|useLessonStore" src/app/

# Find Axios calls with a specific HTTP method
grep -r "apiClient\.post\|apiClient\.get" src/services/
```

### Searching for TypeScript Types and Interfaces

```bash
# Find all interface definitions
grep -r "^export interface" src/utils/types.ts

# Find all type aliases
grep -r "^export type" src/utils/

# Find where a specific type is imported
grep -r "import.*SessionData" src/

# Find all optional fields in a response type
grep -A 20 "interface ProgressResponse" src/utils/types.ts
```

### Finding React Native Component Usage

```bash
# Find all screens using a specific component
grep -r "<NfcScanner" src/app/

# Find all custom hook usages
grep -r "useNfc\|useAudio\|usePronunciation" src/

# Find all Expo Router Link/navigation usages
grep -r "router\.push\|router\.replace\|<Link" src/app/

# Find all expo-av Audio usages
grep -r "from 'expo-av'" src/
```

### Searching Documentation Files

```bash
# Find all docs mentioning NFC
grep -r "NTAG215\|NDEF\|nfc" docs/ --include="*.md" -i

# Find endpoint documentation in tutoria-api.md
grep -n "POST /v1\|GET /v1\|DELETE /v1" tutoria-api.md

# Find all files mentioning a specific concept
grep -r "cooldown\|streak\|mastery" docs/ --include="*.md" -i

# List all H2 section headings in a doc
grep "^## " docs/ARCHITECTURE.md
```

### Filtering by File Type

```bash
# Only search TypeScript source files
grep -r "pattern" src/ --include="*.ts" --include="*.tsx"

# Only search Markdown documentation
grep -r "pattern" . --include="*.md"

# Only search JSON config files
grep -r "pattern" . --include="*.json"
```

---

## API Reference Navigation

### Using `tutoria-api.md` Effectively

The file is organized into these top-level sections — jump to them directly:

| Section Heading | What's Inside |
|---|---|
| `## Authentication` | JWT header format, how Clerk tokens are attached |
| `## Endpoints` | All routes grouped by resource |
| `## Database Schema` | D1 table DDL for all tables |
| `## R2 Bucket Structure` | Curriculum and audio file layout |
| `## KV Cache` | Cache keys, TTLs, invalidation rules |
| `## Webhooks` | Clerk event types and HMAC verification |

**Quick navigation trick** — use grep to jump to a specific endpoint:

```bash
grep -n "POST /v1/pronunciation" tutoria-api.md
grep -n "## Profiles" tutoria-api.md
```

### How API Endpoints Map to Service Files

Every `/v1/*` route has a corresponding function in `src/services/api/`. The mapping is one-to-one:

| API Endpoint | Service File | Exported Function |
|---|---|---|
| `GET /v1/profiles/list` | `src/services/api/profiles.ts` | `listProfiles()` |
| `POST /v1/profiles/create` | `src/services/api/profiles.ts` | `createProfile(data)` |
| `POST /v1/profiles/select` | `src/services/api/profiles.ts` | `selectProfile(data)` |
| `GET /v1/syllabus/stages` | `src/services/api/syllabus.ts` | `getStages()` |
| `GET /v1/modules/missions` | `src/services/api/modules.ts` | `getMissions()` |
| `GET /v1/modules/:moduleId` | `src/services/api/modules.ts` | `getModuleStatus(moduleId)` |
| `POST /v1/modules/:moduleId` | `src/services/api/modules.ts` | `startOrResumeModule(moduleId)` |
| `POST /v1/modules/:moduleId/word` | `src/services/api/modules.ts` | `completeWord(moduleId, data)` |
| `DELETE /v1/modules/:moduleId` | `src/services/api/modules.ts` | `abandonModule(moduleId)` |
| `POST /v1/modules/status/batch` | `src/services/api/modules.ts` | `batchModuleStatus(data)` |
| `GET /v1/progress/:profileId` | `src/services/api/progress.ts` | `getProgress(profileId)` |
| `POST /v1/progress/:profileId/:activityId` | `src/services/api/progress.ts` | `saveProgress(profileId, activityId, data)` |
| `POST /v1/pronunciation/check` | `src/services/api/pronunciation.ts` | `checkPronunciation(data)` |
| `GET /v1/audio/proxy` | `src/services/api/audio.ts` | `getAudioProxyUrl(path)` |
| `GET /v1/audio/sounds-resolve` | `src/services/api/audio.ts` | `resolveSounds(ipa)` |
| `GET /health` | `src/services/api/client.ts` | (direct `apiClient.get('/health')`) |

### The API Client (`src/services/api/client.ts`)

The base Axios instance is configured in `client.ts`. Key things to know when reading service files:

```typescript
// Base URL comes from environment variable
EXPO_PUBLIC_API_URL  →  defaults to https://api-dev.tutoria.ac

// Auth token is injected via:
setAuthToken(token: string)   // call this after Clerk sign-in
// Uses a request interceptor to add: Authorization: Bearer <token>

// All responses go through an error interceptor that:
// - Extracts the error message from API error envelopes
// - Re-throws as a standard Error for catch blocks
```

### Barrel Exports

All service functions are re-exported from `src/services/api/index.ts`. You can import anything directly from the barrel:

```typescript
// Instead of:
import { checkPronunciation } from '../services/api/pronunciation';
import { getProgress } from '../services/api/progress';

// Use the barrel:
import { checkPronunciation, getProgress } from '../services/api';
```

The same pattern applies to NFC: `src/services/nfc/index.ts` re-exports `initNfc`, `readTag`, `cleanupNfc`, and `parseNdefPayload`.

### Pronunciation AI Pipeline

The `POST /v1/pronunciation/check` endpoint uses a **cascading AI provider chain** documented in `tutoria-api.md`:

```
Azure Cognitive Services
    ↓ (if unavailable or fails)
Google Gemini
    ↓ (if unavailable or fails)
Mistral (fallback)
```

The mobile service function `checkPronunciation()` in `pronunciation.ts` sets a **20-second timeout** (overriding the default 30s client timeout) to match the server-side limit.

---

## Best Practices

1. **Start with `src/utils/types.ts` for any data shape question.** Before reading API docs or service files, check what TypeScript interface describes the data. The interface field names, types, and optional markers (`?`) are the authoritative contract — they are kept in sync with the API.

2. **Use `tutoria-api.md` for API contracts, not just service code.** The service files are thin wrappers — they don't always document why parameters exist or what error codes mean. `tutoria-api.md` includes rate limits, caching behavior, validation rules, and error semantics that aren't visible in the service layer.

3. **Check `src/utils/constants.ts` before hardcoding any number.** Every meaningful threshold (`MAX_MODULE_ATTEMPTS`, `COOLDOWN_HOURS`, `MASTERY_DAYS_REQUIRED`) is named. Using the named constant instead of a literal number ensures your code stays consistent with the rest of the app and the API's expectations.

4. **Read the Mermaid diagrams in `docs/diagrams/` for flow questions.** Sequence questions ("what happens after an NFC scan?", "how does auth initialization work?") are answered precisely in `docs/diagrams/sequence-nfc-lesson.md` and `docs/diagrams/sequence-auth.md`. These are faster to interpret than tracing code.

5. **Treat Zustand stores as the single source of truth for runtime state shape.** When a screen or hook needs to know what data is currently available, the store interface is the answer — not the API response type. The store may hold a subset or transformation of the API data. Read `src/stores/useLessonStore.ts` for session state, `src/stores/useNfcStore.ts` for scan state, etc.

6. **Use barrel imports and check `index.ts` files to understand module surface area.** When you want to know what a service module exposes publicly, read its `index.ts` rather than each file individually. `src/services/api/index.ts` is the canonical list of all callable API functions.

7. **Match environment variable names against `.env.example`.** If you encounter a variable like `EXPO_PUBLIC_API_URL` or `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` in the code, `.env.example` lists all required environment variables with placeholder values. This is the documentation for app configuration requirements.

8. **Cross-reference `docs/DATA_MODELS.md` when the TypeScript types alone aren't enough.** The data models doc explains the *semantic* meaning of fields (e.g., why `days_correct >= 3` means mastery, what `current_session` JSON blob structure looks like in the database) that TypeScript interfaces can't convey.

9. **For NFC-related questions, read `docs/NFC_GUIDE.md` before `src/services/nfc/`.** The guide explains the NTAG215 hardware constraints and NDEF encoding format that govern *why* the code is structured the way it is. The `tutoria:<moduleId>` tag payload format is documented there with encoding examples.

10. **Use `docs/ROADMAP.md` to understand what's intentionally absent.** If you find a component directory (`src/components/ui/`, `src/components/nfc/`) that is empty, or a screen file that is a placeholder, check the roadmap. The project is being built in phases — some features are planned but not yet implemented. The roadmap tells you which phase introduces which capability.

---

## Common Pitfalls

### 1. Confusing the Two Locations of `tutoria-api.md`

The file exists in **two places**:

- `tutoria-api.md` — project root (primary, always up to date)
- `docs/tutoria-api.md` — inside the docs folder

If you find discrepancies, the **root-level file is the source of truth**. The `docs/` copy may be a mirror or older snapshot. Always reference `./tutoria-api.md` when quoting endpoint specifications.

### 2. Using Service Function Signatures as the Full API Contract

The service files (e.g., `src/services/api/modules.ts`) expose TypeScript-typed wrappers, but they do not document:

- **Rate limits** (e.g., pronunciation is 5 req/60s)
- **HTTP error codes** and their meanings
- **KV caching behavior** (e.g., `getStages()` is cached for 1 hour server-side)
- **Business rule validations** (e.g., `abandonModule()` will fail if no session is active)

Always consult `tutoria-api.md` when your question is about what the **server** does, not just how to call it.

### 3. Assuming Empty Directories Mean Missing Features

The following directories exist in the project structure but are intentionally empty placeholders at the current development phase:

```
src/components/ui/
src/components/nfc/
src/components/lesson/
src/components/progress/
src/app/(auth)/home.tsx          (placeholder)
src/app/(auth)/lesson/[id].tsx   (placeholder)
src/app/(auth)/progress.tsx      (placeholder)
src/app/(public)/login.tsx       (placeholder)
src/app/(public)/onboarding.tsx  (placeholder)
```

The absence of implementation is intentional — check `docs/ROADMAP.md` to see which phase adds these. Do not add implementations unless the relevant phase is active and requirements are confirmed.

### 4. Looking for Component Documentation in the Wrong Place

There are currently **no component-level documentation files** (no Storybook, no `*.stories.tsx`). Component documentation is written as:

- TypeScript prop types/interfaces in `src/utils/types.ts`
- JSDoc comments in the component file itself
- Usage examples in the relevant Expo Router screen that uses the component

### 5. Treating Mermaid Diagrams and PNG Diagrams as Equivalent

The `docs/diagrams/` Mermaid files and the root `diagrams/` PNG files **are not always in sync**. Mermaid sources are updated with code; PNGs are re-exported periodically. For the most up-to-date flow information, read the `.md` Mermaid files. Use the PNGs for quick visual context only.

### 6. Ignoring `docs/infrastructure/` for Architecture Questions

Questions about offline behavior, error handling strategies, and deployment process are **not** in `ARCHITECTURE.md` — they live in `docs/infrastructure/`. This subdirectory is easy to overlook:

```
docs/infrastructure/OFFLINE_STRATEGY.md   ← caching, sync, KV TTLs
docs/infrastructure/ERROR_HANDLING.md     ← error patterns, crash reporting
docs/infrastructure/SECURITY.md          ← auth model, secrets
docs/infrastructure/DEPLOYMENT.md        ← EAS build, signing, release
```

---

## Quick Reference

### Key Documentation Files

| File / Path | Purpose | Go Here When... |
|---|---|---|
| `tutoria-api.md` | Full API contract | You need endpoint signatures, error codes, rate limits, DB schema |
| `README.md` | Project overview | You need a high-level summary of what the app does and its stack |
| `docs/ARCHITECTURE.md` | System architecture | You need to understand the 3-tier system (cards, app, cloud) |
| `docs/API_INTEGRATION.md` | Axios client usage | You need to understand how the app authenticates and calls the API |
| `docs/NFC_GUIDE.md` | NFC hardware details | You need NTAG215 encoding, NDEF format, or platform-specific NFC info |
| `docs/DATA_MODELS.md` | Data schemas | You need DB table definitions or store state shapes explained in prose |
| `docs/PROJECT_STRUCTURE.md` | Directory layout | You need to understand why files are organized the way they are |
| `docs/DEVELOPMENT_SETUP.md` | Dev environment | You need to set up or onboard to the project locally |
| `docs/ROADMAP.md` | Implementation phases | You need to know what's planned vs. built |
| `docs/quality/TESTING_STRATEGY.md` | Testing approach | You need to write or understand tests |
| `docs/infrastructure/OFFLINE_STRATEGY.md` | Offline caching | You need to understand how lessons work without connectivity |
| `docs/infrastructure/ERROR_HANDLING.md` | Error patterns | You need to handle or understand error states |
| `docs/infrastructure/SECURITY.md` | Security model | You need to understand auth, token handling, or secret management |
| `docs/infrastructure/DEPLOYMENT.md` | Build & release | You need to build, sign, or release the app |

### Key Source Files (as Documentation)

| File / Path | Role as Documentation | Go Here When... |
|---|---|---|
| `src/utils/types.ts` | All TypeScript interfaces | You need exact field names, types, or optional fields for any data object |
| `src/utils/constants.ts` | Named configuration values | You need business rule thresholds, prefixes, or timeout values |
| `src/services/api/index.ts` | API barrel exports | You need a list of all callable API functions |
| `src/services/api/client.ts` | Axios client setup | You need to understand auth token injection or base URL config |
| `src/services/nfc/nfcManager.ts` | NFC session lifecycle | You need to understand how NFC reads are initiated and cleaned up |
| `src/services/nfc/tagParser.ts` | NFC tag payload format | You need to understand `tutoria:<moduleId>` payload structure |
| `src/stores/useAuthStore.ts` | Auth state shape | You need to know what authentication state the app holds |
| `src/stores/useLessonStore.ts` | Lesson session state | You need to know current session/word state structure |
| `src/stores/useNfcStore.ts` | NFC scan state | You need to know scanning status, tag data, and error state |
| `src/stores/useProfileStore.ts` | Profile state | You need to know active profile and profile list structure |
| `src/stores/useProgressStore.ts` | Progress/streak state | You need to know how activities and streaks are tracked in state |
| `.env.example` | Environment variable contract | You need to know what env vars the app requires and their names |
| `app.json` | Expo app configuration | You need bundle IDs, permissions, plugin config |

### Diagram Quick-Reference

| Diagram | Location | What It Shows |
|---|---|---|
| System Architecture | `docs/diagrams/system-architecture.md` / `diagrams/The System Architecture.png` | 3-tier: physical cards, mobile app, Cloudflare Worker + storage |
| Auth Sequence | `docs/diagrams/sequence-auth.md` | Clerk sign-in, JWT retrieval, API token injection |
| NFC → Lesson Sequence | `docs/diagrams/sequence-nfc-lesson.md` | Full flow: tap card → NDEF read → API call → lesson start |
| Module Session State Machine | `docs/diagrams/state-module-session.md` | Session states: idle → active → completed/abandoned/cooldown |
| Entity-Relationship | `docs/diagrams/entity-relationship.md` | D1 database table relationships |
| Domain Class Model | `docs/diagrams/class-domain-model.md` / `diagrams/Class Diagram (Domain Model).png` | TypeScript domain object relationships |
| User Activity Flow | `docs/diagrams/activity-user-flow.md` / `diagrams/Activity Diagram (User Experience Flow).png` | UX decision tree from app open to lesson completion |
| Phygital User Journey | `diagrams/The Phygital User Journey.png` | Child-facing experience: card tap to learning outcome |
| Offline Sync Flow | `docs/diagrams/offline-sync.md` | Offline-first caching and sync protocol |
| CI/CD Pipeline | `docs/diagrams/ci-cd-pipeline.md` | Build, test, and deploy automation flow |
| Deployment Architecture | `docs/diagrams/deployment.md` / `diagrams/Deployment Diagram.png` | Infrastructure topology (Cloudflare, R2, D1, KV) |

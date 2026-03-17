# Project Structure

Detailed overview of the Tutoria mobile app directory layout, file organization, and naming conventions. This document covers every layer of the codebase — from root configuration files through routing, components, services, state management, and utilities.

---

## 1. Root Files

| File | Purpose |
|------|---------|
| `app.json` | **Expo** project configuration — app name, slug, SDK version, splash screen, icons, and platform-specific settings. |
| `tsconfig.json` | **TypeScript** compiler options and path aliases for the project. |
| `package.json` | Dependencies, scripts (`start`, `lint`, `build`), and project metadata. |
| `index.ts` | Application entry point registered with **Expo**. |
| `App.tsx` | Root React component that bootstraps providers (auth, stores, navigation). |
| `.env.example` | Template for required environment variables (`EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`, etc.). Copy to `.env` and fill in real values. |
| `.eslintrc.json` | **ESLint** rules and plugin configuration for consistent code quality. |
| `.prettierrc` | **Prettier** formatting options (semicolons, trailing commas, print width). |
| `README.md` | High-level project overview, quick start, and links to further docs. |
| `CONTRIBUTING.md` | Contribution guidelines, code style rules, and PR process. |
| `tutoria-api.md` | Full Tutoria API reference documentation (endpoints, payloads, error codes). |

---

## 2. Source Directory (`src/`)

All application source code lives under `src/`. The directory is organized by **responsibility**, not by screen or feature:

| Directory | Responsibility |
|-----------|----------------|
| `app/` | **Framework** — Expo Router file-based routing and layout definitions. |
| `components/` | **UI** — Reusable, presentational React components grouped by domain. |
| `services/` | **Integration** — External service clients (API, NFC hardware). |
| `stores/` | **State** — Zustand global state stores. |
| `hooks/` | **Composition** — Custom React hooks that wire services, stores, and UI together. |
| `utils/` | **Shared** — Constants, TypeScript interfaces, and helper functions. |
| `assets/` | **Static** — Fonts, images, and sound files bundled with the app. |

This separation keeps UI components pure and testable, pushes side effects into services and hooks, and centralizes shared state in thin Zustand stores.

---

## 3. Routing (`src/app/`)

Tutoria uses **Expo Router** for file-based routing. The directory structure inside `src/app/` maps directly to navigation paths.

```
src/app/
├── _layout.tsx          # Root layout — wraps the entire app (providers, global styles)
├── (auth)/              # Authenticated route group
│   ├── _layout.tsx      # Auth layout (tab bar, drawer, or stack)
│   ├── home.tsx         # Dashboard / home screen
│   ├── lesson/
│   │   └── [id].tsx     # Dynamic route — lesson screen for a specific module
│   └── progress.tsx     # Progress overview
└── (public)/            # Public route group (no auth required)
    ├── _layout.tsx      # Public layout (no nav chrome)
    ├── login.tsx        # Login / sign-in screen
    └── onboarding.tsx   # First-launch onboarding flow
```

**Key concepts:**

- **Route groups** `(auth)` and `(public)` organize routes by authentication state without affecting the URL path.
- **`_layout.tsx`** files at each level define the navigation structure (stack, tabs, drawer) for their child routes.
- **Dynamic segments** like `[id].tsx` enable module-specific screens (e.g., `/lesson/abc-123`).
- Auth guards redirect unauthenticated users from `(auth)` routes to `(public)/login`.

---

## 4. Components (`src/components/`)

Components are organized by **feature domain**. Each subdirectory contains related presentational components.

```
src/components/
├── ui/          # Primitive, reusable UI atoms
├── nfc/         # NFC scanning UI
├── lesson/      # Lesson display components
└── progress/    # Progress visualization
```

### `ui/` — Primitives

Low-level building blocks reused throughout the app: buttons, cards, text/typography, input fields, and loading indicators. These components accept style props and remain stateless.

### `nfc/` — NFC Scanning

Visual feedback for the NFC scanning flow: scanning indicator animation, card-tap prompt, success/error states. Coordinates with `useNfc` hook for lifecycle events.

### `lesson/` — Lesson Display

Components for the core learning experience: word display with syllable highlighting, pronunciation prompt, audio playback controls, and IPA transcription rendering.

### `progress/` — Progress Visualization

Streak display, mastery level indicators, session history charts, and achievement badges. Consumes data from `useProgressStore`.

---

## 5. Services (`src/services/`)

Services encapsulate all external integrations. Each service file is focused on a single domain.

### `api/` — Tutoria API Client

```
src/services/api/
├── client.ts          # Axios instance + interceptors
├── profiles.ts        # Profile endpoints (create, get, update)
├── modules.ts         # Module and session endpoints
├── progress.ts        # Progress tracking endpoints
├── pronunciation.ts   # Pronunciation check endpoint
├── syllabus.ts        # Syllabus and curriculum endpoints
├── audio.ts           # Audio proxy + IPA resolution
└── index.ts           # Barrel export
```

- **`client.ts`** — Creates a configured **Axios** instance with base URL from environment, automatic **Clerk JWT** injection via request interceptor, and a response error interceptor for centralized error handling (401 → logout, network errors → retry queue).
- Each domain file (e.g., `profiles.ts`, `modules.ts`) exports async functions that call the shared client. Functions follow a **verb + noun** pattern (e.g., `getProgress`, `createProfile`, `checkPronunciation`).

### `nfc/` — NFC Service Layer

```
src/services/nfc/
├── nfcManager.ts      # NFC init, read, cleanup
├── tagParser.ts       # NDEF payload parsing
└── index.ts           # Barrel export
```

- **`nfcManager.ts`** — Wraps **react-native-nfc-manager** to handle NFC hardware initialization, tag discovery registration, read operations, and cleanup on unmount.
- **`tagParser.ts`** — Parses raw NDEF payloads into structured `NfcTagPayload` objects, validating the Tutoria tag prefix and extracting the module ID.

---

## 6. Stores (`src/stores/`)

Global app state is managed with **Zustand**. Each store is exported as a custom hook.

| Store | Responsibility |
|-------|----------------|
| `useAuthStore.ts` | Authentication state — current user, tokens, login/logout actions. |
| `useProfileStore.ts` | Active child profile — selected profile, profile list, switch action. |
| `useLessonStore.ts` | Current lesson state — active module, session progress, word queue. |
| `useNfcStore.ts` | NFC scanning state — scanning status, last scanned tag, errors. |
| `useProgressStore.ts` | Progress data — streaks, mastery levels, session history cache. |

**Design principles:**

- Stores are **thin** — they hold state and simple setters, not business logic.
- Complex operations (API calls, NFC lifecycle) live in **services** and **hooks**; stores just reflect the result.
- Stores use Zustand's `persist` middleware where offline access is needed (e.g., auth tokens via **expo-secure-store**, cached progress data).

---

## 7. Hooks (`src/hooks/`)

Custom React hooks **compose** services and stores into reusable behavior that components consume.

| Hook | Purpose |
|------|---------|
| `useNfc.ts` | Manages the full NFC scanning lifecycle — initialize hardware, start listening, parse tag, update store, clean up on unmount. Returns scanning state and a `startScan` / `stopScan` API. |
| `useAudio.ts` | Wraps **expo-av** for audio playback — load a sound URI, play/pause/stop, track playback position. Handles cleanup when the component unmounts. |
| `usePronunciation.ts` | Coordinates audio recording (microphone capture) with the pronunciation check API endpoint. Returns recording state, result (correct/incorrect + feedback), and a `checkPronunciation` action. |

Hooks keep components declarative: a screen calls `const { isScanning, startScan } = useNfc()` and renders accordingly, without knowing the underlying NFC service details.

---

## 8. Utils (`src/utils/`)

Shared constants and TypeScript type definitions used across the codebase.

### `constants.ts`

Centralized app-wide constants:

- `API_BASE_URL` — resolved from environment variable.
- `NFC_TAG_PREFIX` — expected prefix for valid Tutoria NFC tags.
- `RATE_LIMITS` — per-endpoint rate limit values.
- `CACHE_TTLS` — time-to-live durations for cached data (progress, syllabus).
- UI constants like animation durations and breakpoints.

### `types.ts`

All shared **TypeScript** interfaces and type aliases. Types mirror the API data model documented in `tutoria-api.md`:

- `Profile`, `Module`, `Session`, `Word`
- `ProgressRecord`, `PronunciationResult`
- `NfcTagPayload`, `SyllabusEntry`
- API response wrappers and error types

---

## 9. Naming Conventions

| Category | Convention | Example |
|----------|-----------|---------|
| **Module files** | camelCase | `useAuthStore.ts`, `tagParser.ts`, `client.ts` |
| **Component files** | PascalCase | `WordCard.tsx`, `ScanIndicator.tsx` |
| **Directories (source)** | camelCase | `src/services/api/`, `src/stores/` |
| **Directories (docs)** | lowercase, hyphens allowed | `docs/diagrams/` |
| **Types / Interfaces** | PascalCase, context-prefixed | `NfcTagPayload`, `PronunciationResult` |
| **Zustand stores** | `use[Domain]Store` | `useAuthStore`, `useProfileStore` |
| **Custom hooks** | `use[Feature]` | `useNfc`, `useAudio`, `usePronunciation` |
| **API functions** | verb + noun | `getProgress`, `createProfile`, `checkPronunciation` |
| **Constants** | UPPER_SNAKE_CASE | `API_BASE_URL`, `NFC_TAG_PREFIX` |
| **Environment variables** | `EXPO_PUBLIC_` prefix | `EXPO_PUBLIC_API_URL` |

---

## 10. Import Conventions

**Relative imports** — used within the same module or directory:

```typescript
// Inside src/services/api/profiles.ts
import { client } from './client';
```

**Absolute imports** — used for cross-module references from the project root:

```typescript
// Inside src/hooks/useNfc.ts
import { nfcManager } from '@/services/nfc';
import { useNfcStore } from '@/stores/useNfcStore';
```

**Barrel exports** — each service and component directory provides an `index.ts` that re-exports its public API:

```typescript
// src/services/api/index.ts
export { getProgress, updateProgress } from './progress';
export { createProfile, getProfile } from './profiles';
export { checkPronunciation } from './pronunciation';
```

This keeps import paths short (`from '@/services/api'`) and makes refactoring internal file names transparent to consumers.

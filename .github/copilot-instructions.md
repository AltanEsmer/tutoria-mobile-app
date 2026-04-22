# Copilot Instructions — Tutoria Mobile App

Tutoria is a React Native/Expo app for phonics learning. Children tap NFC cards against a device to launch word-pronunciation lessons. The app records speech, checks pronunciation via a backend API, and gives multi-sensory feedback (audio, haptics, visuals).

## Commands

```bash
npm run start           # Expo dev server (Expo Go / dev client)
npm run android         # Expo dev server targeting Android
npm run ios             # Expo dev server targeting iOS
npm run lint            # ESLint on all .ts/.tsx files
npm run format          # Prettier write (src/**/*.{ts,tsx})
npm run format:check    # Prettier validate without writing
```

No test runner is configured yet (planned for Phase 5).

## Architecture

```
src/
  app/
    (auth)/           # sign-in, sign-up, forgot-password screens
    (public)/
      (tabs)/         # home, progress, syllabus, profile tab screens
      lesson/         # [moduleId].tsx (lesson flow) + results.tsx
    _layout.tsx       # Root layout — providers, auth guard, error boundary
  components/
    lesson/           # PronunciationFeedback, ScoreBadge, WordDisplay
    nfc/              # NfcPrompt, NfcRing
    progress/         # ActivityList, ActivityRow, StreakBadge, WeeklyChart
    ui/               # Button, ErrorBoundary, LoadingSpinner, MissionCard, OfflineBanner
  hooks/              # useAudio, useHaptics, useNetworkState, useNfc, usePronunciation
  services/
    api/              # Axios-based API functions — audio, modules, profiles, progress, pronunciation, syllabus
    cache/            # AsyncStorage cache — cacheManager.ts + audioCache.ts
    nfc/              # NFC lifecycle + NDEF payload parsing
  stores/             # useAuthStore, useLessonStore, useNetworkStore, useNfcStore, useProfileStore, useProgressStore
  utils/
    types.ts          # All shared TypeScript interfaces (mirrors API data model)
    constants.ts      # API_BASE_URL, NFC_TAG_PREFIX, RATE_LIMITS, CACHE_TTLS
```

**Data flow:** Screen → custom hook → service function + Zustand store. Hooks are the bridge between services and stores; screens should not call services or mutate stores directly.

**Routing:** Expo Router v55. All screens live under `src/app/`. Tab screens are under `(public)/(tabs)/`. Lesson flow is at `(public)/lesson/[moduleId].tsx`. The root layout is `src/app/_layout.tsx`. The entry point (`index.ts` → `App.tsx`) is a stub; real app shell is built in `src/app/`.

**Auth:** Clerk (`@clerk/clerk-expo`) provides the session token. Tokens are persisted via `expo-secure-store` (`tokenCache` on `ClerkProvider`). Call `setAuthToken(token)` from `src/services/api/client.ts` after Clerk delivers a token — this injects the `Authorization: Bearer` header for all subsequent Axios requests. The token is also mirrored in `useAuthStore`.

**NFC flow:** `useNfc` hook → `src/services/nfc/nfcManager.ts` (init/read/cleanup) → `src/services/nfc/tagParser.ts` (validates `tutoria:` prefix, extracts `moduleId`) → dispatches to `useNfcStore`. Tags are NTAG215 NDEF records. `handleNfcScan` in the home screen navigates to the lesson screen.

**State:** Zustand v5 with the factory pattern (`create<Store>((set) => ...)`). Stores are thin — only state + simple setters. Business logic belongs in hooks or services, not stores. Use `useStore.getState()` to read fresh state after a `set()` call (closures capture stale values).

**API layer:** `src/services/api/client.ts` exports a single Axios instance. Domain-specific files import it and export typed async functions. Errors propagate — no try/catch inside service functions; the response interceptor logs them centrally.

**Caching:** `src/services/cache/cacheManager.ts` uses `@react-native-async-storage/async-storage` with a `CacheEntry<T>` wrapper and TTL. Import from `'../cache'` (barrel). `getCacheEntry` returns expired entries for stale-while-revalidate fallback. Audio files are cached separately via `audioCache.ts`. Syllabus and module fetches use cache-first with a 24h TTL.

**Offline:** `useNetworkStore` + `useNetworkState` hook track connectivity via `@react-native-community/netinfo`. Pending progress writes are queued in Zustand (persisted to AsyncStorage) and auto-drained on reconnect. An animated `OfflineBanner` component signals offline state.

**Audio:** Pronunciation recording produces base64-encoded audio sent in `PronunciationCheckRequest.audio`. Playback uses `expo-audio` (not `expo-av`), managed by the `useAudio` hook. The first 3 words in a module are pre-fetched on load.

**Platform notes:** NFC is unavailable on iOS simulator and Android emulator. Use `EXPO_PUBLIC_ENABLE_NFC_MOCK=true` for local dev without hardware.

## Key Conventions

**Naming:**
- Source files: `camelCase.ts` / `camelCase.tsx`
- Component files: `PascalCase.tsx`
- Zustand stores: `use[Domain]Store` (e.g., `useAuthStore`, `useLessonStore`)
- Custom hooks: `use[Feature]` (e.g., `useNfc`, `useAudio`)
- API functions: verb + noun (e.g., `getProgress`, `completeWord`, `checkPronunciation`)
- Constants: `UPPER_SNAKE_CASE`

**Imports:** Use the `@/` path alias (maps to `src/`) for all cross-directory imports (e.g., `'@/stores/useNfcStore'`, `'@/utils/types'`). Configured in both `tsconfig.json` and `babel-plugin-module-resolver`. Each `services/` subdirectory has a barrel `index.ts` — import from the directory, not individual files.

**Types:** All shared interfaces live in `src/utils/types.ts`. Add new types there, not inline or scattered. Type names are PascalCase and mirror API field names (including `snake_case` fields on backend DTOs).

**Environment variables:** Must use `EXPO_PUBLIC_` prefix to be accessible at runtime (Expo requirement). See `.env.example` for required vars: `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`, `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_ENABLE_NFC_MOCK`.

**Formatting:** Prettier enforced — single quotes, semicolons, trailing commas, 100-char line width, 2-space indent. ESLint: prefix intentionally unused parameters with `_` to silence warnings; avoid `any` (it's a warning, not an error).

**Dependencies:** Use `npm install --legacy-peer-deps` due to Clerk peer dep conflicts with react@19.2.0. `babel-preset-expo` must be in `devDependencies`. Pin `react-dom` to exact version `19.2.0` (no `^`).

## Important Notes

- Be concise and clear when providing information to user about implementation or error faced.
- **Error logging:** When you encounter errors and their fixes, append them to `docs/ERROR.md` using the established format (error description, cause, fix).
- Create a small explanation file in `docs/guidance/` every time a phase in ROADMAP.md is completed (only one doc per phase) to explain how to test the phase and if a manual approach is needed.
- Run all related tests to see if they have passed, if not fix the errors occurred.
- Do not create documents in the base directory.

### When completing tasks:

1. Analyze repository structure
2. Use relevant skills from `.github/skills` (if exists)

## About Errors:
- Before implementing, check ERRORS.md for known failure patterns 
related to project. List any that apply before writing code.
- After fixed a bug. Now:
  1. State the root cause in one sentence
  2. Write the generalized rule that prevents this class of error
  3. Append it to ERRORS.md, can be found in each module specifically.
  4. Check if copilot-instructions.md needs updating
- Do not just fix the symptom. Identify: (a) why this happened, (b) where else in the codebase this same assumption might be wrong, (c) what rule would have prevented it.
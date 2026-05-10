# CLAUDE.md — Tutoria Mobile App

## 1. Project Overview

Tutoria is a phygital phonics learning app for children with dyslexia. Children tap physical NTAG215 NFC cards to launch lessons; the app plays audio and evaluates pronunciation via an Azure Speech + Gemini + Mistral pipeline on the backend. The mobile client is built with Expo SDK 55 / React Native 0.83 / React 19 and targets iOS 16+ and Android 7+ (API 24+). The cloud API runs on Cloudflare Workers (Hono framework) with D1, R2, and KV storage; agent work is limited to the mobile app repo.

---

## 2. Quick Commands

| Task | Command |
|------|---------|
| Start dev server | `npm run start` |
| Run on Android device/emulator | `npm run android` |
| Run on iOS Simulator | `npm run ios` |
| Lint | `npm run lint` |
| Format source | `npm run format` |
| Run tests (once) | `npm run test` |
| Run tests (watch) | `npm run test:watch` |
| Run tests with coverage | `npm run test:coverage` |
| Maestro E2E suite | `./run-maestro-tests.sh` |

Notes:
- `npm run lint` runs ESLint flat config over `.ts` / `.tsx` files.
- `npm run format` runs Prettier over `src/**/*.{ts,tsx}`.
- Always run `npm run lint && npm run test` before pushing.

---

## 3. Source Map

```
src/
  app/                        expo-router file-based routes
    _layout.tsx               root layout (Clerk provider, NFC init)
    index.tsx                 entry redirect
    (auth)/                   unauthenticated routes: sign-in, sign-up, forgot-password
    (public)/                 authenticated routes
      _layout.tsx
      (tabs)/                 bottom-tab navigator: home, syllabus, progress, profile
      lesson/
        [moduleId].tsx        main lesson screen (NFC → audio → pronunciation loop)
        results.tsx           post-lesson results screen
  components/
    ui/                       generic UI primitives
    lesson/                   lesson-specific components
    nfc/                      NFC scan UI components
    progress/                 progress display components
  hooks/
    useNfc.ts                 NFC scanning lifecycle
    usePronunciation.ts       microphone recording + pronunciation grading
    useAudio.ts               expo-audio playback wrapper
    useHaptics.ts             haptic feedback helper
    useNetworkState.ts        online/offline detection
  services/
    api/
      client.ts               Axios instance (base URL, auth interceptor, retry)
      audio.ts                audio proxy URL + sounds-resolve endpoint
      pronunciation.ts        pronunciation check endpoint
      modules.ts              curriculum modules API
      profiles.ts             learner profile API
      progress.ts             progress sync API
      syllabus.ts             syllabus API
      idempotency.ts          idempotency key helpers
    nfc/
      nfcManager.ts           NFC init, tag read, mock short-circuit
      tagParser.ts            NDEF payload → moduleId parser
    cache/
      audioCache.ts           local file-system audio cache (expo-file-system)
      cacheManager.ts         generic TTL cache for API responses
  stores/                     Zustand stores (persist via AsyncStorage where noted)
    useAuthStore.ts
    useProfileStore.ts
    useLessonStore.ts
    useProgressStore.ts
    useNfcStore.ts
    useNetworkStore.ts
  utils/
    constants.ts              app-wide constants (URLs, TTLs, limits)
    types.ts                  shared TypeScript types
    pronunciation.ts          pronunciation scoring helpers
    tokenCache.ts             Clerk token cache (expo-secure-store)

__mocks__/                    Jest manual mocks (expo-audio, expo-router, nfc-manager, etc.)
docs/                         Extended documentation (see Section 8)
```

---

## 4. NFC + Audio Key Files

| File | Purpose |
|------|---------|
| `src/services/nfc/nfcManager.ts` | NFC lifecycle: init, read, cleanup; mock short-circuit via `EXPO_PUBLIC_ENABLE_NFC_MOCK` |
| `src/hooks/useNfc.ts` | React hook wrapping `nfcManager`; owns `useNfcStore` selectors for scanning state |
| `src/hooks/usePronunciation.ts` | Records audio with `expo-audio`, calls `checkPronunciation`, handles graceful degradation |
| `src/services/api/pronunciation.ts` | POST `/v1/pronunciation/check` — wraps Axios client with 20 s timeout |
| `src/services/api/audio.ts` | `getAudioProxyUrl()` for R2 paths; GET `/v1/audio/sounds-resolve` |
| `src/services/cache/audioCache.ts` | Downloads and caches audio files locally via `expo-file-system/legacy` |

---

## 5. Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `EXPO_PUBLIC_API_URL` | `https://api-dev.tutoria.ac` | API base URL |
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | _(empty)_ | Clerk auth publishable key |
| `EXPO_PUBLIC_ENABLE_NFC_MOCK` | `false` | Set `true` to bypass real NFC hardware |
| `EXPO_PUBLIC_NFC_MOCK_MODULE_ID` | `module-a` | moduleId returned by the mock NFC scan |

The API client (`src/services/api/client.ts`) currently injects a static bypass token `tutoria-integration-test-2026` in the `Authorization` header. Phase 4 will replace this with Clerk JWTs — see `TODO Phase 4` comment in `client.ts`.

---

## 6. Conventions

**Zustand selectors** — Always use individual, granular selectors to keep component renders stable:
```ts
// Correct — each selector is a stable reference
const isScanning = useNfcStore((s) => s.isScanning);
const setError   = useNfcStore((s) => s.setError);

// Avoid — destructuring a single object selector causes re-renders on any store change
const { isScanning, setError } = useNfcStore((s) => s);
```

**Hook patterns** — Hooks own their store slice; components call the hook, not the store directly. Side effects (subscriptions, cleanup) live in `useEffect` inside the hook.

**TypeScript** — `tsconfig.json` extends the Expo base config with strict-ish settings. Avoid `any`; use types from `src/utils/types.ts`.

**Prettier** — single quotes, 100-char print width, trailing commas, semi-colons. Run `npm run format` before committing.

**Tests** — Jest + jest-expo + `@testing-library/react-native`. Test files live co-located under `src/**/__tests__/`. Root `__mocks__/` holds manual mocks for native modules. Coverage is collected from `src/services/**`, `src/stores/**`, and `src/hooks/**`.

**Path alias** — `@/` maps to `src/` (configured in `jest.config.cjs` and `tsconfig.json`).

---

## 7. Commit and PR Attribution Policy

The sole contributor of record is **Altan Esmer** (`144455224+AltanEsmer@users.noreply.github.com`). Agents must preserve this attribution exactly.

- **Do not** change `git config user.name` or `git config user.email`.
- **Do not** add `Co-Authored-By: Claude ...` or any other co-author trailer to commit messages.
- **Do not** add "Generated with Claude Code" or similar lines to commit messages or PR descriptions.
- Write commit messages that are factual and scoped: one logical change per commit, imperative mood, no filler.
- Push only to the branch you were assigned (currently `claude/pensive-galileo-zn5w4`); do not push to `main` without explicit instruction.
- Run `npm run lint && npm run test` and confirm both pass before creating a PR.

---

## 8. Further Documentation

| Document | Location |
|----------|---------|
| Architecture overview | `docs/ARCHITECTURE.md` |
| API integration guide | `docs/API_INTEGRATION.md` |
| Data models | `docs/DATA_MODELS.md` |
| Development setup | `docs/DEVELOPMENT_SETUP.md` |
| NFC guide (tag encoding, mock usage) | `docs/NFC_GUIDE.md` |
| Project structure reference | `docs/PROJECT_STRUCTURE.md` |
| Roadmap (phases 1–6) | `docs/ROADMAP.md` |
| Audio API integration | `docs/audio-api-integration.md` |
| Expo audio permissions | `docs/expo-audio-permissions.md` |
| Tutoria API reference | `docs/tutoria-api.md` |
| Testing strategy | `docs/quality/TESTING_STRATEGY.md` |
| Security notes | `docs/infrastructure/SECURITY.md` |
| Offline strategy | `docs/infrastructure/OFFLINE_STRATEGY.md` |
| Release readiness | `docs/READINESS.md` _(forthcoming)_ |

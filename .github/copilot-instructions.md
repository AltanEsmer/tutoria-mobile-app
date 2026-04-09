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
  app/          # Expo Router screens & layouts (file-based routing)
  components/   # UI components — lesson/, nfc/, progress/, ui/ (scaffolded, not yet populated)
  hooks/        # Custom hooks — compose services + stores into component-ready APIs
  services/
    api/        # Axios-based API functions, one file per domain
    nfc/        # NFC lifecycle + NDEF payload parsing
  stores/       # Zustand global state, one store per domain
  utils/
    types.ts    # All shared TypeScript interfaces (mirrors API data model)
    constants.ts # API_BASE_URL, NFC_TAG_PREFIX, RATE_LIMITS, CACHE_TTLS
```

**Data flow:** Screen → custom hook → service function + Zustand store. Hooks are the bridge between services and stores; screens should not call services or mutate stores directly.

**Routing:** Expo Router v55. All screens live under `src/app/`. The root layout is `src/app/_layout.tsx`. The entry point (`index.ts` → `App.tsx`) is a stub; real app shell is built in `src/app/`.

**Auth:** Clerk (`@clerk/clerk-expo`) provides the session token. Call `setAuthToken(token)` from `src/services/api/client.ts` after Clerk delivers a token — this injects the `Authorization: Bearer` header for all subsequent Axios requests. The token is also mirrored in `useAuthStore`.

**NFC flow:** `useNfc` hook → `src/services/nfc/nfcManager.ts` (init/read/cleanup) → `src/services/nfc/tagParser.ts` (validates `tutoria:` prefix, extracts `moduleId`) → dispatches to `useNfcStore`. Tags are NTAG215 NDEF records.

**State:** Zustand v5 with the factory pattern (`create<Store>((set) => ...)`). Stores are thin — only state + simple setters. Business logic belongs in hooks or services, not stores.

**API layer:** `src/services/api/client.ts` exports a single Axios instance. Domain-specific files (`modules.ts`, `profiles.ts`, etc.) import it and export typed async functions. Errors propagate — no try/catch inside service functions; the response interceptor logs them centrally.

## Key Conventions

**Naming:**
- Source files: `camelCase.ts` / `camelCase.tsx`
- Component files: `PascalCase.tsx`
- Zustand stores: `use[Domain]Store` (e.g., `useAuthStore`, `useLessonStore`)
- Custom hooks: `use[Feature]` (e.g., `useNfc`, `useAudio`)
- API functions: verb + noun (e.g., `getProgress`, `completeWord`, `checkPronunciation`)
- Constants: `UPPER_SNAKE_CASE`

**Imports:** Use relative paths throughout. No `@/` path alias is configured. Cross-layer imports go up and across (e.g., `'../stores/useNfcStore'`). Each `services/` subdirectory has a barrel `index.ts` — import from the directory, not individual files.

**Types:** All shared interfaces live in `src/utils/types.ts`. Add new types there, not inline or scattered. Type names are PascalCase and mirror API field names (including `snake_case` fields on backend DTOs).

**Environment variables:** Must use `EXPO_PUBLIC_` prefix to be accessible at runtime (Expo requirement). See `.env.example` for required vars: `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`, `EXPO_PUBLIC_API_URL`.

**Formatting:** Prettier enforced — single quotes, semicolons, trailing commas, 100-char line width, 2-space indent. ESLint: prefix intentionally unused parameters with `_` to silence warnings; avoid `any` (it's a warning, not an error).

**Audio:** Pronunciation recording produces base64-encoded audio sent in `PronunciationCheckRequest.audio`. Playback is managed by `useAudio` wrapping `expo-av`.

**Platform notes:** NFC is unavailable on iOS simulator and Android emulator. Use `EXPO_PUBLIC_ENABLE_NFC_MOCK=true` for local dev without hardware.

## Important Notes

- Be concise and clear when providing information to user about implementation or error faced.
- Create a small explanation file in docs\guidance folder every time a phase in ROADMAP.md is completed (only one doc) to explain how to test the phase and if manual approach needed.
- Run all related tests to see if they have passed, if not fix the errors occured.
- Do not create documents in base directory.

### When completing tasks:

1. Analyze repository structure
2. Use relevant skills from .github/skills (if exists)
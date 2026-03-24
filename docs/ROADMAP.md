# Tutoria — Development Roadmap

**App:** Phygital phonics learning app for children with dyslexia. Children tap NTAG215 NFC cards to launch lessons; pronunciation is evaluated via an Azure Speech + Gemini + Mistral pipeline.  
**Stack:** Expo 55 · React Native 0.83 · TypeScript 5.9 · Zustand 5 · Clerk · Hono/Cloudflare Worker (D1 / R2 / KV)

---

## Current Status Snapshot

| Layer | Status | Notes |
|---|---|---|
| TypeScript types & constants | ✅ Complete | |
| Services (8 API modules + NFC) | ✅ Complete | |
| Zustand stores (auth, profile, lesson, nfc, progress) | ✅ Complete | |
| Custom hooks (useNfc, useAudio, usePronunciation) | ⚠️ Partial | |
| Root layout | ✅ Complete | Providers, auth guard, hydration, error boundary wired |
| Screens | ⚠️ Partial | Auth screens implemented; public screens pending |
| Components (lesson / nfc / progress / ui) | 🔴 None | Folders exist, files empty |
| Testing infrastructure | 🔴 None | |
| Persistent auth (expo-secure-store) | ✅ Complete | Clerk `tokenCache` implemented via SecureStore |
| Offline progress queue | 🔴 None | Documented but not implemented |
| Error boundaries | 🔴 None | |
| tsconfig path aliases (`@/`) | ✅ Complete | Configured in `tsconfig.json` and Babel module resolver |

---

## Phase 1 — Foundation

> Wire together the non-negotiable infrastructure that every screen and feature depends on. Nothing meaningful can be built until auth, providers, and module resolution work correctly.

### Deliverables

- [x] **tsconfig path aliases** — Add `"@/*": ["./src/*"]` (and any other documented aliases) to `compilerOptions.paths`; add matching `babel-plugin-module-resolver` entry so Metro resolves them at runtime.
- [x] **Root layout** — Replace `<Slot />` skeleton with a fully-wired `app/_layout.tsx`:
  - `<ClerkProvider>` wrapping the entire tree (publishable key from env)
  - `<GestureHandlerRootView>` and `<SafeAreaProvider>` for Reanimated 4 compatibility
  - Zustand store hydration (call each store's `hydrate()` / `rehydrate()` action on mount)
  - Top-level `<ErrorBoundary>` component (see Phase 4)
- [x] **Persistent auth tokens** — Implement `expo-secure-store` token cache for Clerk (`tokenCache` option on `ClerkProvider`); tokens must survive app restart.
- [x] **Auth guard** — `useAuth` hook-based redirect logic:
  - Unauthenticated users are redirected to `/(auth)/sign-in`
  - Authenticated users are redirected away from `/(auth)/*` to `/(public)/home`
  - Use Expo Router's `<Redirect>` or `router.replace`; guard runs inside root layout after hydration.
- [x] **Sign-in screen** — `/(auth)/sign-in`: email + password fields, Clerk `signIn.create`, error display, link to sign-up.
- [x] **Sign-up screen** — `/(auth)/sign-up`: email + password + confirm password, Clerk `signUp.create`, email verification step.
- [x] **Forgot password screen** — `/(auth)/forgot-password`: email field, Clerk `signIn.resetPassword` flow.

### Dependencies

None — this is the starting phase.

### Acceptance Criteria

- [ ] `@/services/...`, `@/stores/...`, `@/hooks/...` imports resolve correctly (`npx tsc --noEmit` passes with zero errors).
- [ ] Cold-launching the app with no stored session lands on sign-in screen.
- [ ] Signing in persists across a full app kill + relaunch (token survives).
- [ ] Signing out from any screen returns to sign-in screen.
- [ ] Auth screens display field-level validation errors returned by Clerk.
  - Status: Implementation appears in place, but these checks still need explicit verification.

### Key Technical Notes

- Clerk's `tokenCache` expects `{ getToken, saveToken, clearToken }` — wrap `SecureStore.getItemAsync / setItemAsync / deleteItemAsync`.
- Zustand stores that use `AsyncStorage` for persistence must finish rehydrating before the auth guard evaluates; gate the redirect behind a `_hasHydrated` flag.
- `babel-plugin-module-resolver` must be listed **before** `babel-preset-expo` in `babel.config.js`.

---

## Phase 2 — Core Screens & Navigation

> Build the primary screens and establish the tab/stack navigation structure. Focus on layout and data wiring; polish and animations come later.

### Deliverables

- [ ] **Tab navigator** — Bottom tabs inside `/(public)/_layout.tsx`: Home, Progress, Profile. Use `expo-router` tabs with custom icons.
- [ ] **Home screen** — `/(public)/home`:
  - Fetch and display the 3 highest-priority active missions from the missions API.
  - Mission card component (`src/components/ui/MissionCard`): title, description, progress bar, CTA button.
  - "Tap NFC card to start lesson" prompt when no active lesson.
- [ ] **Profile selector screen** — `/(public)/profile`:
  - List child profiles linked to the parent account.
  - Tap a profile to set it as the active profile in the profile store.
  - "Add profile" entry point (form screen: name, avatar, age).
- [ ] **Lesson screen scaffolding** — `/(public)/lesson/[moduleId]`:
  - Word display area (large, dyslexia-friendly font — OpenDyslexic or similar).
  - Audio play button (wired to `useAudio` hook, functional in Phase 3).
  - Pronunciation record button (wired to `usePronunciation` hook, functional in Phase 3).
  - Progress indicator: current word index / total words in module.
  - Placeholder state when navigated to directly without NFC (deep link fallback).
- [ ] **Progress dashboard screen** — `/(public)/progress`:
  - Current streak display (days).
  - Activity progress per module (list of modules with % complete).
  - Weekly activity chart (simple bar chart using `react-native-svg` or `victory-native`).
  - Data sourced from the progress store.
- [ ] **Syllabus/curriculum browser screen** — `/(public)/syllabus`:
  - List syllabuses → tap to see stages → tap to see modules.
  - Module row: title, word count, locked/unlocked state, completion badge.

### Dependencies

- Phase 1 complete (auth guard, providers, path aliases).

### Acceptance Criteria

- [ ] Authenticated user lands on Home screen with mission cards rendered from live API data.
- [ ] Switching active child profile updates displayed data across all screens.
- [ ] Navigating to a lesson screen shows the word display layout (static data acceptable at this stage).
- [ ] Progress screen renders streak and at least one module's progress from the store.
- [ ] Syllabus browser correctly renders the three-level hierarchy (syllabus → stage → module).

### Key Technical Notes

- Use `expo-router` dynamic routes (`[moduleId]`) for the lesson screen; pass `moduleId` via `router.push`.
- OpenDyslexic is not bundled in Expo by default — load via `expo-font` (`useFonts` hook in root layout).
- Keep screen components thin: data fetching belongs in hooks or stores, not directly in `useEffect` inside the screen file.

---

## Phase 3 — Core Features

> Implement the product's differentiating features: NFC-triggered lessons, audio playback, pronunciation AI feedback, and the full module session lifecycle.

### Deliverables

- [ ] **NFC scan → lesson launch**:
  - `useNfc` hook polls for tag scan; on NTAG215 detection extract `moduleId` from NDEF payload.
  - Navigate to `/(public)/lesson/[moduleId]` on successful scan.
  - Show scan overlay/modal on Home screen (animated NFC ring graphic).
  - Handle NFC unavailable (device lacks NFC) and NFC disabled (redirect to settings) gracefully.
- [ ] **Audio playback**:
  - `useAudio` hook: load audio asset URL from lesson store, play/pause/stop via `expo-av` `Audio.Sound`.
  - Auto-play word audio when a new word is displayed.
  - Show loading indicator while audio asset is fetching.
- [ ] **Pronunciation recording + AI feedback**:
  - `usePronunciation` hook: record via `expo-av` `Audio.Recording`, upload to backend pronunciation endpoint.
  - Backend pipeline: Azure Speech STT → Gemini/Mistral evaluation → score + feedback text returned.
  - Display feedback inline on the lesson screen: score badge + short feedback message.
  - Retry button on failure.
- [ ] **Haptic feedback**:
  - Correct pronunciation: `Haptics.notificationAsync(NotificationFeedbackType.Success)`.
  - Incorrect pronunciation: `Haptics.notificationAsync(NotificationFeedbackType.Warning)`.
  - NFC card detected: `Haptics.impactAsync(ImpactFeedbackStyle.Medium)`.
  - Button taps (primary actions): `Haptics.impactAsync(ImpactFeedbackStyle.Light)`.
- [ ] **Module session lifecycle**:
  1. `startSession(moduleId)` — store action, sets `currentModule`, resets word index to 0.
  2. Word-by-word loop — advance word index on successful pronunciation or manual skip.
  3. `completeWord(wordId, attempts, passed)` — store action, POST to progress API.
  4. `completeSession()` — POST module completion to API, update progress store, navigate to results screen.
  5. Results screen: words attempted, words passed, session score, confetti animation (`react-native-confetti-cannon` or Reanimated).
- [ ] **Word attempt limits**:
  - Max 3 attempts per word per session.
  - If 3 attempts are exhausted without passing: mark word as `failed`, advance automatically.
  - 12-hour cooldown before the same word can be reattempted (enforced via timestamp stored in progress store + AsyncStorage).

### Dependencies

- Phase 2 complete (lesson screen scaffolding, navigation).

### Acceptance Criteria

- [ ] Tapping an NFC card navigates to the correct lesson and begins audio playback.
- [ ] Audio plays automatically for each word; play button replays on demand.
- [ ] Pronunciation recording uploads successfully; score and feedback appear within 5 seconds.
- [ ] After 3 failed attempts on a word the session advances automatically and the word is marked failed.
- [ ] Completing all words in a module navigates to the results screen and updates the progress dashboard.
- [ ] Haptics fire on all specified interactions (verified manually on physical device).

### Key Technical Notes

- `Audio.Recording` requires `AUDIO_RECORDING` permission — request at app start via `expo-permissions` or `expo-av`'s `Audio.requestPermissionsAsync()`.
- NFC reading must be stopped (`nfcManager.cancelTechnologyRequest()`) when the lesson screen unmounts.
- The pronunciation upload should be a `multipart/form-data` POST with the recorded `.m4a` file and `{ wordId, profileId }` metadata.
- Keep the 12h cooldown timestamp in the progress store slice; persist it via `AsyncStorage` (Zustand `persist` middleware).

---

## Phase 4 — Offline & Resilience

> Make the app usable with intermittent connectivity and prevent crashes from propagating to blank screens.

### Deliverables

- [ ] **Offline progress queue**:
  - When a `completeWord` or `completeSession` API call fails due to no network, push the payload to an `offlineQueue` array in the progress store.
  - Persist `offlineQueue` to `AsyncStorage` via Zustand `persist`.
  - On reconnect (NetInfo event), drain the queue: replay each queued request in order, remove on success.
  - Queue indicator in UI (e.g., small badge on Progress tab) when queue is non-empty.
- [ ] **Curriculum/lesson caching**:
  - Cache fetched syllabus, stage, and module data in `AsyncStorage` with a TTL (24 hours).
  - On fetch failure, serve stale cache with a "last updated X ago" notice.
  - Cache key scheme: `cache:syllabus:{id}`, `cache:module:{id}`.
- [ ] **Audio asset pre-fetching**:
  - When a module is loaded, pre-fetch audio URLs for the first 3 words using `expo-file-system` `downloadAsync` into the cache directory.
  - `useAudio` hook checks local cache before making a network request for an asset.
- [ ] **Network state detection**:
  - Install and configure `@react-native-community/netinfo`.
  - Expose `isOnline` boolean via a `useNetworkState` hook.
  - Show a non-blocking banner ("You're offline — progress will sync when reconnected") when `isOnline` is false.
- [ ] **Error boundaries**:
  - `src/components/ui/ErrorBoundary.tsx` — class component implementing `componentDidCatch`; renders a "Something went wrong" fallback UI with a retry button.
  - Wrap each tab screen in its own `<ErrorBoundary>` so a crash in one tab does not affect others.
  - Log caught errors to console (and Sentry in Phase 6).
- [ ] **Graceful NFC/audio degradation**:
  - NFC unavailable: hide scan prompt on Home, show "Enter lesson code manually" text input as fallback.
  - Audio load failure: show error icon on audio button; do not block lesson progress.
  - Pronunciation upload failure: show retry button; allow skipping pronunciation step after 2 consecutive upload failures.

### Dependencies

- Phase 3 complete (session lifecycle, progress API calls in place).

### Acceptance Criteria

- [ ] Putting the device in airplane mode mid-session: word completions queue locally and sync automatically on reconnect.
- [ ] Opening the syllabus browser offline serves cached data (if previously fetched).
- [ ] A thrown error inside a screen renders the ErrorBoundary fallback, not a blank screen or RN red box.
- [ ] Offline banner appears within 2 seconds of losing connectivity and dismisses on reconnect.
- [ ] Lesson can be completed (with skipped audio) when audio assets are unavailable.

### Key Technical Notes

- Zustand `persist` middleware with `AsyncStorage` storage adapter handles queue + cache persistence.
- NetInfo's `addEventListener` should be set up once in root layout (or a `useNetworkState` hook called there), not per-screen.
- `expo-file-system`'s cache directory is cleared by the OS; treat audio cache as best-effort, not guaranteed.

---

## Phase 5 — Testing & Quality

> Establish a test suite and enforce code quality standards so the codebase can be maintained and extended safely.

### Deliverables

#### Testing Infrastructure

- [ ] **Jest + RNTL setup**:
  - Install `jest`, `@testing-library/react-native`, `@testing-library/jest-native`, `jest-expo`.
  - Configure `jest.config.ts` with `jest-expo` preset, module name mapper for `@/` aliases, and `setupFilesAfterFramework` pointing to a global setup file.
  - Mock `react-native-nfc-manager`, `expo-av`, `expo-haptics`, `expo-secure-store`, and `@clerk/clerk-expo` in `__mocks__/`.

#### Unit Tests — Services

- [ ] Auth service: token refresh, sign-out, error mapping.
- [ ] Lesson service: `getModule`, `getWord` happy path + 404/500 error cases.
- [ ] Progress service: `completeWord`, `completeSession` payload shape.
- [ ] NFC service: NDEF payload parsing (valid tag, malformed tag, unsupported tag type).

#### Unit Tests — Stores

- [ ] Auth store: hydration, sign-in action, sign-out action, token expiry handling.
- [ ] Profile store: profile list, `setActiveProfile`, empty state.
- [ ] Lesson store: `startSession`, `advanceWord`, `completeSession`, reset.
- [ ] Progress store: offline queue enqueue/dequeue, streak calculation.
- [ ] NFC store: scan state transitions (idle → scanning → success / error).

#### Unit Tests — Hooks

- [ ] `useNfc`: scan lifecycle, cleanup on unmount, NFC unavailable path.
- [ ] `useAudio`: play/pause/stop, load error path.
- [ ] `usePronunciation`: record → upload → result display, upload failure + retry.

#### Integration Tests — Screens

- [ ] Sign-in screen: valid credentials → navigates to home; invalid credentials → error message.
- [ ] Home screen: renders mission cards from mocked API; NFC prompt visible.
- [ ] Lesson screen: word display, audio button, pronunciation button, attempt counter.
- [ ] Progress screen: renders streak and module list from mocked store.

#### E2E Tests

- [ ] **Maestro** setup (`maestro` CLI, flows in `.maestro/` directory).
- [ ] Flow: launch → sign in → home screen visible.
- [ ] Flow: home → syllabus → tap module → lesson screen opens.
- [ ] Flow: lesson → complete all words → results screen.

#### Code Quality

- [ ] **ESLint enhancements**:
  - Add `eslint-plugin-react-hooks` (enforce hooks rules).
  - Add `eslint-plugin-import` with `order` rule (group: builtin → external → internal `@/` → relative).
  - Add `eslint-plugin-react-native` for RN-specific rules.
- [ ] **CI pipeline** (GitHub Actions or equivalent):

  ```
  lint → typecheck → unit tests → integration tests → [manual gate] → E2E tests → build
  ```

  | Step | Command |
  |---|---|
  | Lint | `npx eslint . --max-warnings 0` |
  | Typecheck | `npx tsc --noEmit` |
  | Unit + integration | `npx jest --coverage --ci` |
  | E2E | `maestro test .maestro/` |
  | EAS build check | `eas build --platform all --profile preview --non-interactive` |

### Dependencies

- Phases 1–4 complete (features must exist before they can be tested).

### Acceptance Criteria

- [ ] `npx jest --coverage` passes with ≥ 80% line coverage on services and stores.
- [ ] `npx tsc --noEmit` exits with code 0.
- [ ] `npx eslint .` exits with code 0 (zero warnings in CI mode).
- [ ] All three Maestro flows pass on a physical Android device.
- [ ] CI pipeline runs to completion on every PR without manual intervention.

### Key Technical Notes

- Maestro requires a running app (use `expo start` or a simulator); it cannot run in a standard CI container without an emulator — use GitHub Actions with `reactivecircus/android-emulator-runner` or a Maestro Cloud account.
- Mock `expo-router`'s `useRouter` and `useLocalSearchParams` in test setup to prevent navigation-related crashes.
- Use `jest.useFakeTimers()` for cooldown timer tests in the progress store.

---

## Phase 6 — Deployment & Release

> Configure build infrastructure, signing, OTA updates, error tracking, and submit to both app stores.

### Deliverables

- [ ] **EAS Build configuration** (`eas.json`):

  | Profile | Purpose | Distribution |
  |---|---|---|
  | `development` | Local dev client with dev tools | Internal |
  | `preview` | Stakeholder testing builds | Internal (APK/IPA) |
  | `production` | Store submission builds | Store |

- [ ] **App signing**:
  - Android: generate upload keystore via `eas credentials`; store credentials in EAS (not in repo).
  - iOS: generate distribution certificate + provisioning profile via `eas credentials`; App Store Connect app record created.
- [ ] **EAS Update (OTA)**:
  - Configure `expo-updates` in `app.json` with `runtimeVersion` policy `"sdkVersion"`.
  - Add `preview` and `production` update channels.
  - Document OTA rollout procedure: `eas update --channel production --message "..."`.
- [ ] **Sentry integration**:
  - Install `@sentry/react-native`; initialize in root layout with DSN from env.
  - Wrap root layout in `Sentry.wrap()`.
  - Upload source maps as part of EAS build (`sentry-expo` plugin in `app.json`).
  - Forward errors caught by `ErrorBoundary` (from Phase 4) to `Sentry.captureException`.
- [ ] **Performance monitoring**:
  - Enable Sentry Performance tracing (`tracesSampleRate: 0.2` in production).
  - Add custom spans for: NFC scan duration, pronunciation upload + response time, lesson load time.
- [ ] **App store submission**:
  - Android: `eas submit --platform android --profile production` to Google Play internal track.
  - iOS: `eas submit --platform ios --profile production` to TestFlight first, then production.
  - Prepare store listing assets: screenshots (phone + tablet), feature graphic, short/full description, privacy policy URL.
- [ ] **Environment variable management**:
  - All secrets (`CLERK_PUBLISHABLE_KEY`, `SENTRY_DSN`, `BACKEND_URL`) stored as EAS secrets (`eas secret:create`).
  - `.env.example` committed to repo documenting required keys (no actual values).

### Dependencies

- Phase 5 complete (CI pipeline must be green before submitting to stores).

### Acceptance Criteria

- [ ] `eas build --profile production --platform all` completes without errors.
- [ ] Production build launches, authenticates, and completes a lesson on a physical device.
- [ ] Sentry dashboard receives a test event from the production build.
- [ ] OTA update pushed via `eas update` is received by an installed preview build within 60 seconds of app foreground.
- [ ] App passes Apple App Review and Google Play review (no rejections for policy violations).

### Key Technical Notes

- Never commit `google-services.json`, `GoogleService-Info.plist`, or any keystore file to the repository; manage exclusively via EAS credentials.
- Set `runtimeVersion` to a manual string (not `sdkVersion`) if you expect to ship native changes alongside OTA updates — mixing the two without careful versioning causes update mismatches.
- Apple requires a privacy manifest (`PrivacyInfo.xcprivacy`) for apps using certain APIs (microphone for pronunciation recording, NFC); prepare this before iOS submission.

---

## Dependency Graph

```
Phase 1 (Foundation)
    └── Phase 2 (Screens & Navigation)
            └── Phase 3 (Core Features)
                    └── Phase 4 (Offline & Resilience)
                            └── Phase 5 (Testing & Quality)
                                    └── Phase 6 (Deployment & Release)
```

Phases are strictly sequential. No phase should begin until its predecessor's acceptance criteria are fully met.

---

## Immediate Next Actions (Phase 1 Validation)

1. Run `npx tsc --noEmit` and confirm zero errors.
2. Cold-launch with no session and verify redirect to `/(auth)/sign-in`.
3. Complete sign-in, kill/relaunch app, and verify session persistence.
4. Trigger sign-out and verify redirect back to sign-in.
5. Intentionally submit invalid auth inputs and verify Clerk field-level error UX.

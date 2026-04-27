# Tutoria — Development Roadmap

**App:** Phygital phonics learning app for children with dyslexia. Children tap NTAG215 NFC cards to launch lessons; pronunciation is evaluated via an Azure Speech + Gemini + Mistral pipeline.  
**Stack:** Expo 55 · React Native 0.83 · TypeScript 5.9 · Zustand 5 · Clerk · Hono/Cloudflare Worker (D1 / R2 / KV)

---

## Platform Support

| Platform | Supported | Min OS Version | Notes |
|---|---|---|---|
| **iOS** | ✅ | iOS 16.0 (Expo 55 minimum) | NFC requires iPhone 7+; NFC unavailable in Simulator — use `EXPO_PUBLIC_ENABLE_NFC_MOCK=true` |
| **Android** | ✅ | Android 7.0 (API 24) | NFC unavailable in emulator — use mock flag for dev |
| **Web** | ⚠️ Basic | — | NFC and microphone recording not available on web |

### Building for iOS (macOS)

- **Simulator (no hardware needed):** `npm run ios` — launches Expo dev server targeting the iOS Simulator.
- **Physical device via Expo Go:** `npm run start` → scan QR code with Expo Go on your iPhone.
- **Production / custom dev client:** requires EAS Build (`eas build --platform ios`). Set up in Phase 6.
- **NFC on iOS:** Core NFC entitlement must be added to `app.json` `ios.entitlements` before submitting. The `NFCReaderUsageDescription` in `infoPlist` is already configured.
- **Microphone permission:** required for pronunciation recording — `NSMicrophoneUsageDescription` must be added to `ios.infoPlist`.

---

## Current Status Snapshot

| Layer | Status | Notes |
|---|---|---|
| TypeScript types & constants | ✅ Complete | |
| Services (8 API modules + NFC) | ✅ Complete | |
| Zustand stores (auth, profile, lesson, nfc, progress) | ✅ Complete | |
| Custom hooks (useNfc, useAudio, usePronunciation, useHaptics) | ✅ Complete | All four hooks fully implemented |
| Root layout | ✅ Complete | Providers, auth guard, hydration, error boundary wired |
| Auth screens (sign-in, sign-up, forgot-password) | ✅ Complete | |
| Public screens (home, lesson, progress, profile, syllabus) | ✅ Complete | All Phase 2 screens fully implemented |
| Components (lesson / nfc / progress / ui) | ✅ Complete | All component files populated |
| Testing infrastructure | ✅ Complete | Jest + RNTL unit/integration tests + 17 Maestro E2E flows |
| Persistent auth (expo-secure-store) | ✅ Complete | Clerk `tokenCache` implemented via SecureStore |
| Offline progress queue | ✅ Complete | Zustand persist + AsyncStorage; auto-drain on reconnect |
| Error boundaries | ✅ Complete | Root + per-tab ErrorBoundary isolation |
| tsconfig path aliases (`@/`) | ✅ Complete | Configured in `tsconfig.json` and Babel module resolver |
| NFC scan → navigation | ✅ Complete | `handleNfcScan` in Home wired to `useNfc`; navigates to lesson; `NfcRing` animation active |
| Haptic feedback | ✅ Complete | `useHaptics` wired for correct/incorrect pronunciation and NFC detection |
| Module session lifecycle (completeWord / results) | ✅ Complete | Per-word API calls, word loop, `sessionComplete` → results screen with confetti |
| completeSession API call | ⚠️ Missing | Session marked complete locally; no POST to backend at end of module |
| Pronunciation feedback display | ✅ Complete | `PronunciationFeedback` component shown inline with score, retry, next-word actions |
| Word attempt limits | ✅ Complete | Max 3 attempts; auto-advance on 3 failures; 12 h cooldown (in-memory — not persisted) |
| Curriculum/lesson caching | ✅ Complete | Cache-first syllabus/module fetches with 24h TTL and stale fallback |
| Network state / offline banner | ✅ Complete | NetInfo + useNetworkState hook + animated OfflineBanner |
| Audio pre-fetching | ✅ Complete | First 3 words prefetched on module load; cache-first playback |
| Graceful degradation | ✅ Complete | Audio error icon; pronunciation skip after 2 consecutive failures |

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

- [x] **Tab navigator** — Bottom tabs inside `/(public)/_layout.tsx`: Home, Progress, Syllabus, Profile. Uses `expo-router` Tabs with emoji icons.
- [x] **Home screen** — `/(public)/home`:
  - Fetches and displays top-3 priority missions from the missions API.
  - `MissionCard` component: title, description, progress bar, CTA button.
  - `NfcPrompt` card shown when no active lesson (static display — NFC scanning wired in Phase 3).
- [x] **Profile selector screen** — `/(public)/profile`:
  - Lists child profiles; tap to set active profile in store.
  - "Add profile" screen at `/(public)/profile/add`.
- [x] **Lesson screen scaffolding** — `/(public)/lesson/[moduleId]`:
  - `WordDisplay` component with Lexend font.
  - Audio play button wired to `useAudio` hook.
  - Pronunciation record button wired to `usePronunciation` hook.
  - Progress indicator (current word / total words) with bar.
  - Placeholder state when no active session (deep link fallback).
- [x] **Progress dashboard screen** — `/(public)/progress`:
  - `StreakBadge`, `WeeklyChart`, `ActivityList` components.
  - Data fetched from progress API and stored in progress store.
- [x] **Syllabus/curriculum browser screen** — `/(public)/syllabus`:
  - Expandable stage cards → module rows (2-level: stage → modules).
  - Tapping a module navigates to the lesson screen.
  - Note: top-level syllabus grouping not yet implemented (stages are the root).

### Dependencies

- Phase 1 complete (auth guard, providers, path aliases).

### Acceptance Criteria

- [x] Authenticated user lands on Home screen with mission cards rendered from live API data.
- [x] Switching active child profile updates displayed data across all screens.
- [x] Navigating to a lesson screen shows the word display layout (static data acceptable at this stage).
- [x] Progress screen renders streak and at least one module's progress from the store.
- [x] Syllabus browser renders stages and modules (top-level syllabus grouping deferred).

### Key Technical Notes

- Use `expo-router` dynamic routes (`[moduleId]`) for the lesson screen; pass `moduleId` via `router.push`.
- OpenDyslexic is not bundled in Expo by default — load via `expo-font` (`useFonts` hook in root layout).
- Keep screen components thin: data fetching belongs in hooks or stores, not directly in `useEffect` inside the screen file.

---

## Phase 3 — Core Features

> Implement the product's differentiating features: NFC-triggered lessons, audio playback, pronunciation AI feedback, and the full module session lifecycle.

### Deliverables

- [x] **NFC scan → lesson launch**:
  - `useNfc` hook ✅ — polls for tag scan; extracts `moduleId` from NDEF payload.
  - [x] Wire `useNfc.scan()` inside Home screen so a successful scan navigates to `/(public)/lesson/[moduleId]`.
  - [x] Show animated `NfcRing` graphic on Home screen while scanning.
  - [x] Handle NFC unavailable / NFC disabled gracefully — manual lesson-code text input fallback shown.
- [x] **Audio playback**:
  - `useAudio` hook ✅ — play/stop via `expo-av` `Audio.Sound`.
  - Play button wired in lesson screen ✅.
  - [x] Auto-play word audio when a new word is displayed (via `useEffect` on `currentWordIndex`).
  - [x] Show loading indicator (`⏳`) while audio asset is fetching.
- [x] **Pronunciation recording + AI feedback**:
  - `usePronunciation` hook ✅ — records via `expo-av`, uploads to backend, returns score.
  - Record button wired in lesson screen ✅.
  - [x] Display feedback inline: `PronunciationFeedback` component with score badge and feedback message.
  - [x] Retry/skip actions available after feedback.
- [x] **Haptic feedback** (`useHaptics` hook implemented and wired):
  - [x] Correct pronunciation: `Haptics.notificationAsync(NotificationFeedbackType.Success)`.
  - [x] Incorrect pronunciation: `Haptics.notificationAsync(NotificationFeedbackType.Warning)`.
  - [x] NFC card detected: `Haptics.impactAsync(ImpactFeedbackStyle.Medium)`.
  - [ ] Button taps (primary actions): `buttonTapHaptic` exists but not wired to button `onPress` handlers.
- [x] **Module session lifecycle**:
  - `startOrResumeModule` wired in lesson screen ✅.
  1. [x] `completeWord(wordId, attempts, passed)` — POST to backend per word; store advances locally on API failure.
  2. [x] Word-by-word loop — `advanceWord` in store; `setCurrentWord` syncs displayed word.
  3. [ ] `completeSession()` — **missing**: no POST to backend when all words finish; session marked complete locally only; progress store not updated.
  4. [x] Results screen: word breakdown, session score, confetti animation (≥ 80%), try-again / back-home actions.
- [x] **Word attempt limits**:
  - [x] Max 3 attempts per word per session (`MAX_WORD_ATTEMPTS = 3`).
  - [x] 3 failed attempts: mark word as `failed`, auto-advance after 2-second delay.
  - [x] 12-hour cooldown tracked via `isModuleOnCooldown` / `setCooldown` in lesson store (in-memory only — not persisted; AsyncStorage not yet installed).

### Dependencies

- Phase 2 complete (lesson screen scaffolding, navigation).

### Acceptance Criteria

- [x] Tapping an NFC card navigates to the correct lesson and begins audio playback.
- [x] Audio plays automatically for each word; play button replays on demand.
- [x] Pronunciation recording uploads successfully; score and feedback appear within 5 seconds.
- [x] After 3 failed attempts on a word the session advances automatically and the word is marked failed.
- [x] Completing all words in a module navigates to the results screen.
- [ ] Results screen updates the progress dashboard (requires `completeSession` API call — not yet implemented).
- [x] Haptics fire on correct/incorrect pronunciation and NFC detection (verified via `useHaptics`).
- [ ] Button-tap haptics wired on all primary action buttons.

### Key Technical Notes

- `Audio.Recording` requires `AUDIO_RECORDING` permission — request at app start via `expo-permissions` or `expo-av`'s `Audio.requestPermissionsAsync()`.
- NFC reading must be stopped (`nfcManager.cancelTechnologyRequest()`) when the lesson screen unmounts.
- The pronunciation upload should be a `multipart/form-data` POST with the recorded `.m4a` file and `{ wordId, profileId }` metadata.
- Keep the 12h cooldown timestamp in the progress store slice; persist it via `AsyncStorage` (Zustand `persist` middleware).

---

## Phase 4 — Offline & Resilience

> Make the app usable with intermittent connectivity and prevent crashes from propagating to blank screens.

### Deliverables

- [x] **Offline progress queue**:
  - When a `completeWord` or `completeSession` API call fails due to no network, push the payload to an `offlineQueue` array in the progress store.
  - Persist `offlineQueue` to `AsyncStorage` via Zustand `persist`.
  - On reconnect (NetInfo event), drain the queue: replay each queued request in order, remove on success.
  - Queue indicator in UI (e.g., small badge on Progress tab) when queue is non-empty.
- [x] **Curriculum/lesson caching**:
  - Cache fetched syllabus, stage, and module data in `AsyncStorage` with a TTL (24 hours).
  - On fetch failure, serve stale cache with a "last updated X ago" notice.
  - Cache key scheme: `cache:syllabus:{id}`, `cache:module:{id}`.
- [x] **Audio asset pre-fetching**:
  - When a module is loaded, pre-fetch audio URLs for the first 3 words using `expo-file-system` `downloadAsync` into the cache directory.
  - `useAudio` hook checks local cache before making a network request for an asset.
- [x] **Network state detection**:
  - Install and configure `@react-native-community/netinfo`.
  - Expose `isOnline` boolean via a `useNetworkState` hook.
  - Show a non-blocking banner ("You're offline — progress will sync when reconnected") when `isOnline` is false.
- [x] **Error boundaries**:
  - `src/components/ui/ErrorBoundary.tsx` — ✅ class component with `componentDidCatch`; renders "Something went wrong" fallback with retry button.
  - ✅ Root layout wrapped in `<ErrorBoundary>`.
  - [x] Wrap each **tab screen** in its own `<ErrorBoundary>` so a crash in one tab does not affect others.
  - [x] Log caught errors to console (and Sentry in Phase 6).
- [x] **Graceful NFC/audio degradation**:
  - ✅ NFC unavailable: manual "Enter lesson code" text input shown in `NfcPrompt`.
  - [x] Audio load failure: show error icon on audio button; do not block lesson progress.
  - [x] Pronunciation upload failure: show retry button; allow skipping pronunciation step after 2 consecutive upload failures.

### Dependencies

- Phase 3 complete (session lifecycle, progress API calls in place).

### Acceptance Criteria

- [x] Putting the device in airplane mode mid-session: word completions queue locally and sync automatically on reconnect.
- [x] Opening the syllabus browser offline serves cached data (if previously fetched).
- [x] A thrown error inside a screen renders the ErrorBoundary fallback, not a blank screen or RN red box.
- [x] Offline banner appears within 2 seconds of losing connectivity and dismisses on reconnect.
- [x] Lesson can be completed (with skipped audio) when audio assets are unavailable.

### Key Technical Notes

- Zustand `persist` middleware with `AsyncStorage` storage adapter handles queue + cache persistence.
- NetInfo's `addEventListener` should be set up once in root layout (or a `useNetworkState` hook called there), not per-screen.
- `expo-file-system`'s cache directory is cleared by the OS; treat audio cache as best-effort, not guaranteed.

---

## Phase 5 — Testing & Quality

> Establish a test suite and enforce code quality standards so the codebase can be maintained and extended safely.

### Deliverables

#### Testing Infrastructure

- [x] **Jest + RNTL setup**:
  - Install `jest`, `@testing-library/react-native`, `jest-expo`.
  - Configure `jest.config.cjs` with `jest-expo` preset, module name mapper for `@/` aliases, and `setupFilesAfterEnv` pointing to a global setup file.
  - Mock `react-native-nfc-manager`, `expo-audio`, `expo-haptics`, `expo-secure-store`, `expo-file-system`, `expo-router`, `@clerk/clerk-expo`, `@react-native-community/netinfo`, and `@react-native-async-storage/async-storage` in `__mocks__/`.

#### Unit Tests — Services

- [ ] Auth service: token refresh, sign-out, error mapping.
- [ ] Lesson service: `getModule`, `getWord` happy path + 404/500 error cases.
- [x] Progress service: `getProgress`/`saveProgress` payload shape + validation logic.
- [x] NFC service: NDEF payload parsing (valid tag, malformed tag, unsupported tag type).

#### Unit Tests — Stores

- [x] Auth store: initial state, `setAuth`, `clearAuth` actions.
- [ ] Profile store: profile list, `setActiveProfile`, empty state.
- [x] Lesson store: `hydrateFromSession`, `recordAttempt`, `advanceWord`, cooldown, `resetSession`.
- [x] Progress store: offline queue enqueue/dequeue/drain, MAX_RETRIES, invalidate.
- [x] NFC store: scan state transitions (idle → scanning → success / error).

#### Unit Tests — Hooks

- [ ] `useNfc`: scan lifecycle, cleanup on unmount, NFC unavailable path. _(deferred — requires deep native mocking)_
- [ ] `useAudio`: play/pause/stop, load error path. _(deferred — requires deep native mocking)_
- [ ] `usePronunciation`: record → upload → result display, upload failure + retry. _(deferred — requires deep native mocking)_

#### Integration Tests — Screens

- [x] Sign-in screen: valid credentials → `setActive` called; invalid credentials → error message; not-loaded guard.
- [ ] Home screen: renders mission cards from mocked API; NFC prompt visible.
- [ ] Lesson screen: word display, audio button, pronunciation button, attempt counter.
- [ ] Progress screen: renders streak and module list from mocked store.

#### E2E Tests

- [x] **Maestro** flows (17 flows in `.maestro/flows/`).
- [x] Flow: launch → sign in → home screen visible.
- [x] Flow: home → syllabus → tap module → lesson screen opens.
- [x] Flow: lesson → complete all words → results screen.

#### Code Quality

- [x] **ESLint enhancements**:
  - `eslint-plugin-react-hooks` (enforce hooks rules) — already present.
  - `eslint-plugin-import` with `order` rule (group: builtin → external → internal `@/` → relative).
  - `eslint-plugin-react-native` registered (rules disabled pending ESLint 9 flat config support).
- [x] **CI pipeline** (GitHub Actions `.github/workflows/ci.yml`):

  ```
  lint → typecheck → unit tests (with coverage) → upload coverage artifact
  ```

  | Step | Command |
  |---|---|
  | Lint | `npx eslint . --ext .ts,.tsx --max-warnings 0` |
  | Typecheck | `npx tsc --noEmit` |
  | Unit + integration | `npx jest --coverage --ci --passWithNoTests` |

### Dependencies

- Phases 1–4 complete (features must exist before they can be tested).

### Acceptance Criteria

- [x] `npx jest --coverage` passes with ≥ 60% line coverage on services and stores.
- [x] `npx tsc --noEmit` exits with code 0.
- [ ] `npx eslint .` exits with code 0 (zero warnings in CI mode).
- [x] All 17 Maestro flows defined in `.maestro/flows/`.
- [x] CI pipeline runs on push/PR to `main` and `develop`.

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

## Immediate Next Actions

### Remaining Phase 3 gaps (complete before moving to Phase 4)

1. **`completeSession` API call** — when `sessionComplete` becomes `true` in the lesson screen, POST module completion to the backend (e.g., `PUT /v1/modules/:moduleId/complete`) and update the progress store so the progress dashboard reflects the finished module.
2. **Button-tap haptics** — call `buttonTapHaptic()` inside the `onPress` of Play, Record, Skip, and navigation buttons in the lesson screen.

### Phase 4 starting point

3. Wrap each tab screen in its own `<ErrorBoundary>` (update `src/app/(public)/(tabs)/_layout.tsx`).
4. Install `@react-native-community/netinfo`, create `useNetworkState` hook, add offline banner.
5. Implement the offline progress queue (Zustand `persist` + `AsyncStorage`); drain on reconnect.
6. Add curriculum/lesson caching with 24-hour TTL.

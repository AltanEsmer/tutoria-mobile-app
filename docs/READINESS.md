# Tutoria Mobile App — Readiness & Status

**Date:** 2026-05-10
**Branch:** `claude/vigilant-perlman-242483`
**Trigger:** Physical NTAG215 cards received — NFC moving from mock to production. Demo platform pivoted to Android (see §4).

---

## 1. Snapshot (as of 2026-05-09)

| Subsystem | Status | Notes | Key files |
|---|---|---|---|
| **Auth** | Partial | Sign-in/sign-up/forgot-password screens complete; Clerk SecureStore token cache wired; `setTokenGetter` is a no-op — static bypass token still active | `src/services/api/client.ts`, `src/utils/tokenCache.ts`, `src/stores/useAuthStore.ts` |
| **Profiles** | Ready | `listProfiles`, `createProfile`, `selectProfile` all implemented; multi-child support via `useProfileStore` | `src/services/api/profiles.ts`, `src/stores/useProfileStore.ts` |
| **Syllabus** | Ready | Cache-first stage/module fetch (1 h TTL); stale fallback; curriculum browser renders 2-level stage → module tree | `src/services/api/syllabus.ts`, `src/services/cache/cacheManager.ts` |
| **Module Session** | Partial | `startOrResumeModule`, `completeWord`, `abandonModule` wired; `completeSession` POST to backend is **missing** — session marked complete locally only | `src/services/api/modules.ts`, `src/stores/useLessonStore.ts` |
| **Pronunciation** | Partial | Recording, upload, score display, retry, skip-after-2-failures all implemented; latency on slow networks is a known risk (20 s timeout, base64-encoded WAV in JSON body); timing logs and gzip just landed on this branch | `src/hooks/usePronunciation.ts`, `src/services/api/pronunciation.ts` |
| **Audio Cache** | Ready | First 3 words prefetched on module load; `expo-file-system` local cache; cache-first playback with error icon fallback | `src/services/cache/audioCache.ts`, `src/hooks/useAudio.ts` |
| **NFC** | Dev-build ready (Android) | `react-native-nfc-manager` 3.17.2 installed; `expo-dev-client` added; Android NDEF intent filter injected via custom config plugin (`plugins/withNfcIntentFilter.cjs`); real read path uses `NfcTech.Ndef`; toggled by `EXPO_PUBLIC_ENABLE_NFC_MOCK=true`; physical-card scan UX (Phase NFC-3) and telemetry (Phase NFC-4) still pending | `src/services/nfc/nfcManager.ts`, `src/services/nfc/tagParser.ts`, `src/hooks/useNfc.ts`, `plugins/withNfcIntentFilter.cjs`, `app.json` |
| **Offline Queue** | Ready | Zustand persist + AsyncStorage; auto-drain on reconnect; offline banner via `useNetworkState` | `src/stores/useProgressStore.ts`, `src/hooks/useNetworkState.ts` |
| **Telemetry** | Not Started | No scan event logging, no Sentry, no performance spans; `ErrorBoundary` catches errors but logs to console only | `src/components/ui/ErrorBoundary.tsx` |

---

## 2. What Works Today

- NFC mock returns `tutoria:module-a` (or any `EXPO_PUBLIC_NFC_MOCK_MODULE_ID`) when `EXPO_PUBLIC_ENABLE_NFC_MOCK=true`; the 300 ms simulated delay keeps UI state transitions testable.
- `parseNdefPayload` validates the `tutoria:` prefix, rejects blank module IDs, and trims surrounding whitespace — covered by 7 unit tests in `src/services/nfc/__tests__/tagParser.test.ts`.
- The real read path in `nfcManager.ts` calls `NfcManager.requestTechnology(NfcTech.Ndef)`, reads the first NDEF record, decodes the UTF-8 payload via `Ndef.text.decodePayload`, and hands off to `parseNdefPayload` — the code path is complete and correct; it simply has not been exercised against hardware.
- `useNfc` initialises the NFC subsystem on mount, exposes `isSupported`, `isEnabled`, `isScanning`, `lastTag`, and `error` via individual Zustand selectors (stable refs, no unnecessary re-renders), and cleans up with `cancelTechnologyRequest` on unmount.
- `useNfcStore` holds the full scan-state machine: idle → scanning → tag found / error — transitions are synchronous and unit-tested.
- NFC scan on the Home screen triggers `handleNfcScan`, which navigates to `/(public)/lesson/[moduleId]` with the parsed module ID.
- `NfcRing` animation plays while scanning; haptic feedback fires via `useHaptics` on detection.
- Manual lesson-code text input is shown when NFC is unavailable (devices without NFC hardware, NFC disabled, or Expo Go).
- Clerk authentication survives full app kill and relaunch (SecureStore token cache).
- All 17 Maestro E2E flows are defined in `.maestro/flows/`; CI runs lint, typecheck, and unit tests on every push/PR to `main` and `develop`.
- Offline queue persists word completions through connectivity loss and drains automatically on reconnect.
- Audio is pre-fetched for the first 3 words of each module; playback is cache-first with a graceful error icon if the asset is unavailable.

---

## 3. Known Gaps / Risks

- **Static bypass token** — `src/services/api/client.ts` injects `tutoria-integration-test-2026` as the `Authorization` header on every request. `setTokenGetter` is a no-op. Phase 4 (Auth JWT swap) must replace this before production. See the `TODO Phase 4` comments in `client.ts`.
- **iOS NFC deferred** — `app.json` sets `NFCReaderUsageDescription` in `infoPlist` but no `ios.entitlements` block. The `com.apple.developer.nfc.readersession.formats` entitlement is required for Core NFC, and the entitlement is gated behind a paid Apple Developer Program membership ($99/yr). Demo pivoted to Android to avoid the cost; re-open this gap when iOS App Store submission is in scope.
- **`<uses-feature android:name="android.hardware.nfc">` not declared** — affects Play Store filtering only (devices without NFC will still see the app). Not needed for the sideloaded demo APK; add via a custom config plugin alongside Phase NFC-2 or NFC-4.
- **No `completeSession` backend call** — When all words in a module are finished the session is marked complete only in local Zustand state. `PUT /v1/modules/:moduleId/complete` (or equivalent) is never called. The progress dashboard will not reflect completed modules until this is fixed (noted in `docs/ROADMAP.md` §Phase 3).
- **Cooldown not persisted** — The 12-hour module cooldown is tracked in memory inside `useLessonStore`. Killing the app resets it. The value must be persisted to AsyncStorage.
- **Pronunciation upload latency** — The pronunciation check pipeline (Azure Speech → Gemini → Mistral fallback) operates on a 20-second hard timeout. On 3G or weaker connections, the base64-encoded WAV body (sent as JSON to `POST /v1/pronunciation/check`) can exhaust the window, leaving the user on a spinner. The current branch lands timing logs, a gzip Accept-Encoding header, a `POST_STOP_FLUSH_MS` constant trimmed from 100 ms to 60 ms, and a new `isUploading` flag for finer-grained UI states; a multipart upload path remains future work and requires a backend change.
- **No telemetry for NFC scan events** — Scan success, validation failure, read failure, and timeout produce no structured log line and are not observable in any dashboard.
- **Button-tap haptics not wired** — `buttonTapHaptic()` exists in `useHaptics` but is not called on Play, Record, Skip, or navigation buttons in the lesson screen.
- **`completeSession` offline queuing** — The offline queue handles `completeWord`, but the missing `completeSession` call means end-of-module state can diverge from the server even when online.

---

## 4. NFC Hardware Rollout — Phased Plan

Physical NTAG215 cards are in hand. The phases below move NFC from the working mock to production hardware. Execute one phase per PR; do not combine phases.

> Cross-reference: `docs/NFC_GUIDE.md` covers NTAG215 specs, NDEF format, platform differences, tag validation, and security considerations. This section focuses on execution tasks, not concepts.

### Demo platform decision (2026-05-10)

**Demo target: Android (Samsung Galaxy A72).** iOS Core NFC requires a paid Apple Developer Program membership ($99/year) for the `com.apple.developer.nfc.readersession.formats` entitlement; without it, Core NFC sessions fail silently even on a sideloaded build. Android NFC has no equivalent gate — a debug APK sideloaded via `adb` works end-to-end, no developer account needed. The iOS code path is **not** removed from the codebase; only the demo build/test path is Android-only. iOS will be re-scoped when App Store submission is planned.

---

### Phase NFC-1: Custom dev client + Android native config

**Goal:** Produce a development build APK that can exercise real NFC on a physical Android device for the demo. (iOS deferred — see *Demo platform decision* above.)

**Background:** `react-native-nfc-manager` links native code at build time. Expo Go strips native modules; a custom dev client is mandatory. `expo-dev-client` provides the scaffolding for this build type in the Expo managed workflow.

**Demo prerequisites:**

1. Samsung Galaxy A72 (or any NFC-capable Android 7+ device), with NFC enabled in Settings.
2. Android Studio with the Android SDK and platform-tools (`adb`) installed; the device in USB-debugging mode and authorised.
3. `EXPO_PUBLIC_ENABLE_NFC_MOCK` unset or set to `false` in `.env` so the real hardware path runs.

**Tasks:**

- [x] Add `expo-dev-client@^55.0.32` to `dependencies` in `package.json` (SDK 55-compatible).
- [x] Add `"expo-dev-client"` to the `plugins` array in `app.json`, placed first.
- [x] **Android NDEF intent filter via custom config plugin:** register `./plugins/withNfcIntentFilter.cjs` in the `plugins` array. The plugin uses `withAndroidManifest` from `@expo/config-plugins` to inject an `<intent-filter>` for `android.nfc.action.NDEF_DISCOVERED` on `MainActivity`. Expo's built-in `android.intentFilters` shortcut is **not** used here because it wrongly prepends `android.intent.action.` to the action name, which breaks the filter. The generated `AndroidManifest.xml` contains:
  ```xml
  <intent-filter>
    <action android:name="android.nfc.action.NDEF_DISCOVERED" />
    <category android:name="android.intent.category.DEFAULT" />
    <data android:mimeType="text/plain" />
  </intent-filter>
  ```
  Note: `android.permission.NFC` is already declared in `app.json`.
- [ ] **Deferred — `<uses-feature android:name="android.hardware.nfc" android:required="false" />`:** affects Play Store filtering only; not needed for the sideloaded demo APK. Add via a custom Expo config plugin alongside Phase NFC-2 or NFC-4 (whichever first needs a custom plugin).
- [ ] **Deferred — iOS Core NFC entitlement:** requires the paid Apple Developer Program ($99/yr); not in scope for the Android demo.
- [ ] Run `npx expo run:android --device` — Expo prebuilds the `android/` directory implicitly on the first run, builds the dev client APK with `react-native-nfc-manager` linked, and installs to the connected Galaxy A72 via `adb`.
- [x] Confirm `npm run lint && npm run test` still pass after the dependency addition.

**Acceptance criteria:**
- `npx expo run:android --device` produces a dev client APK that installs and launches on the Galaxy A72.
- The Home screen shows the `NfcRing` component and no "NFC not supported" banner.
- `NfcManager.isSupported()` returns `true` and `NfcManager.isEnabled()` returns `true` when NFC is on.
- The generated `android/app/src/main/AndroidManifest.xml` (after first `expo run:android`) contains the NDEF intent filter inside the main activity.

**Test plan:**
1. Build dev client: `npx expo run:android --device`; install on the Galaxy A72; open app; confirm NFC ring is visible and no error state appears.
2. Disable NFC in Android Settings; reopen app; confirm "NFC disabled" banner or manual lesson-code fallback appears.
3. Re-enable NFC; confirm the scan UI returns to its idle state.
4. Run `npm run lint && npm run test` — all existing unit tests must pass.

**Notes for follow-up:**
- The cold-tap intent filter is declared here, but the *handler* that reads intent extras and routes to a lesson on cold launch is Phase NFC-5 work. With this PR, foreground scans work end-to-end; cold-tap will launch the app to its default screen until NFC-5 lands the intent extractor.

---

### Phase NFC-2: Card writing workflow

**Goal:** Establish the payload convention and validate that physical NTAG215 cards encode and parse correctly.

**Background:** The payload format `tutoria:<moduleId>` is already enforced by `parseNdefPayload` in `src/services/nfc/tagParser.ts`. The parser is fully tested. This phase locks down the writing procedure and validates end-to-end with real cards.

**Tasks:**

- [ ] **Write a sample card using NFC Tools (mobile app):**
  1. Install "NFC Tools" on an Android phone.
  2. Tap "Write" → "Add a record" → "Text".
  3. Enter `tutoria:module-a` as the text payload (UTF-8, language `en`).
  4. Tap the NTAG215 card to write.
- [ ] Verify the written payload using a stock NFC reader app (e.g., "NFC TagInfo" by NXP) — confirm the first NDEF record's text content is exactly `tutoria:module-a`.
- [ ] Scan the card with the dev build from Phase NFC-1 (mock disabled: `EXPO_PUBLIC_ENABLE_NFC_MOCK` unset or `false`); confirm `readTag()` returns `{ isValid: true, moduleId: 'module-a' }`.
- [ ] Write and test cards for at least two distinct module IDs (e.g., `tutoria:module-a` and `tutoria:stage-1-phonics-b`) to confirm the parser handles hyphenated IDs.
- [ ] Document the writing procedure in `docs/NFC_GUIDE.md` §2 (append a "Writing cards" subsection — do not duplicate existing content).

**Optional NFC-2b (in-app writer screen, separate PR):**
- [ ] Create `src/app/tools/write-tag.tsx` — an admin screen gated behind a build flag (e.g., `__DEV__ || process.env.EXPO_PUBLIC_ENABLE_WRITE_TOOL === 'true'`).
- [ ] The screen accepts a `moduleId` text input and calls `NfcManager.writeNdefMessage([Ndef.textRecord('tutoria:' + moduleId)])`.
- [ ] The screen must not appear in production builds.

**Acceptance criteria:**
- A card written with "NFC Tools" and scanned by the Tutoria dev build navigates to the correct lesson screen (`/(public)/lesson/module-a`).
- `parseNdefPayload` returns `isValid: true` for the raw payload read from the physical card.
- Scanning a blank (non-Tutoria) card shows the "This card is not a Tutoria card" error state.

**Test plan:**
1. Write `tutoria:module-a` to card, scan with dev build — lesson screen must open.
2. Write `tutoria:stage-1-phonics-b` to a second card, scan — correct module must open.
3. Tap a blank NTAG215 card — confirm error state, not a crash.
4. Tap an NFC tag with a non-Tutoria payload (e.g., a URL) — confirm "wrong prefix" error state.

---

### Phase NFC-3: Real-card scan UX

**Goal:** Replace the mock-only code paths with production-grade scan UX states and surface clear feedback for every outcome.

**Background:** `readTag()` in `src/services/nfc/nfcManager.ts` already has the real hardware path (lines 52–68). This phase adds the missing UI states and haptics that make the real path feel polished.

**Tasks:**

- [ ] **Expand scan-state model** in `src/stores/useNfcStore.ts`: add a `scanState` field with values `idle | listening | found | parse_error | not_tutoria_card | retry`. The existing boolean flags (`isScanning`, `error`) remain for backward compatibility.
- [ ] **Update `useNfc.ts`** (`src/hooks/useNfc.ts`) to set `scanState` transitions:
  - Before `readTag()`: `listening`
  - `tag.isValid === true`: `found`
  - `tag.isValid === false` and wrong prefix: `not_tutoria_card`
  - `readTag()` returns `null`: `parse_error`
  - After a user-initiated retry: `idle` → `listening`
- [ ] **Scan UI component** — update `src/components/nfc/` to render each state visually:
  - `idle`: "Tap your Tutoria card" prompt + `NfcRing` animation
  - `listening`: animated ring at full brightness + "Listening…" label
  - `found`: brief success flash before navigation
  - `parse_error`: "Could not read card — try again" + retry button
  - `not_tutoria_card`: "This is not a Tutoria card" message
  - `retry`: same as `idle` with a "Try again" label
- [ ] **Haptics** — wire `useHaptics` in `src/hooks/useNfc.ts`:
  - `found`: `Haptics.notificationAsync(NotificationFeedbackType.Success)` (already specified in `docs/NFC_GUIDE.md` §6)
  - `parse_error` / `not_tutoria_card`: `Haptics.notificationAsync(NotificationFeedbackType.Error)`
- [ ] **Ensure `EXPO_PUBLIC_ENABLE_NFC_MOCK` is unset** in the real-device test environment; remove any residual guard that short-circuits to mock when the env var is absent.

**Acceptance criteria:**
- Tapping a valid NTAG215 card (`tutoria:module-a`) from the Home screen navigates to the lesson screen with the correct `moduleId`.
- Tapping a blank or non-Tutoria card shows the appropriate error state without crashing.
- Success haptic fires on valid scan; error haptic fires on invalid card.
- Cancelling the scan (user dismisses Core NFC sheet on iOS) returns to `idle` state gracefully.

**Test plan:**
1. Valid card → lesson screen opens, success haptic fires.
2. Non-Tutoria card → `not_tutoria_card` state, error haptic fires, retry button visible.
3. No card tapped within iOS 60-second timeout → `parse_error` state, retry available.
4. Android: NFC disabled mid-session → `parse_error` state, no crash.
5. Snapshot or visual regression test for each `scanState` UI variant.

---

### Phase NFC-4: Telemetry and validation

**Goal:** Every scan produces a structured event so the team can observe real-world success/failure rates and debug card issues in the field.

**Tasks:**

- [ ] **Define a telemetry event shape** in `src/utils/types.ts`:
  ```ts
  type NfcScanEvent = {
    eventType: 'success' | 'validation_failed' | 'read_failure' | 'timeout' | 'not_tutoria_card';
    tagId: string | null;
    rawPayload: string | null;
    moduleId: string | null;
    durationMs: number;
    platform: 'ios' | 'android';
    timestamp: string; // ISO-8601
  };
  ```
- [ ] **Emit events from `useNfc.ts`** (`src/hooks/useNfc.ts`) after every `readTag()` call — measure duration with `Date.now()` before/after, include `platform` from `Platform.OS`.
- [ ] **Wire to a telemetry endpoint** — create `src/services/api/telemetry.ts` with a `POST /v1/telemetry/nfc` call (fire-and-forget, do not block the user flow; silently swallow errors with `_silenceErrorLogging: true`). If the endpoint does not yet exist on the backend, log to console in `__DEV__` and no-op in production until the backend route is deployed.
- [ ] **Debug overlay** — in `src/components/nfc/`, render a `<NfcDebugOverlay>` component that is visible only when `__DEV__`:
  - Displays: tag ID, raw payload, parsed `moduleId`, scan duration, event type.
  - Toggled by a triple-tap on the scan button to avoid cluttering the lesson UI.
- [ ] Add a unit test in `src/services/nfc/__tests__/` that verifies the event shape is populated correctly for each `eventType`.

**Acceptance criteria:**
- Every card scan (success or failure) produces a console log in `__DEV__` with a valid `NfcScanEvent` object.
- The debug overlay appears on triple-tap and shows correct tag data for the last scan.
- Fire-and-forget telemetry call does not delay navigation; if the network is unavailable the error is swallowed silently.
- `npm run test` passes including the new event-shape unit test.

**Test plan:**
1. Scan a valid card — check Metro log for `NfcScanEvent` with `eventType: 'success'`.
2. Scan a non-Tutoria card — check log for `eventType: 'not_tutoria_card'`.
3. Triple-tap scan button — debug overlay appears with correct data.
4. Put device in airplane mode; scan card; confirm no unhandled promise rejection in telemetry call.

---

### Phase NFC-5: Hardening and background scan (Android only)

**Goal:** On Android, a cold tap of a card (app not in foreground) launches the app and routes directly to the correct lesson. On both platforms, existing safety rules (cooldown, server authorization) remain the sole gate for lesson access.

**Background:** iOS does not support background NFC reading (see `docs/NFC_GUIDE.md` §5). This phase is Android-only for background dispatch; hardening tasks apply to both platforms.

**Tasks:**

- [ ] **Android background tag dispatch** — confirm the intent filter added in Phase NFC-1 is registered on the main activity. Implement a handler in the root layout (`src/app/_layout.tsx`) or a dedicated `useNfcDeepLink` hook that:
  1. Detects launch via `android.nfc.action.NDEF_DISCOVERED` intent (use `Linking.getInitialURL()` or an Expo Router intent handler).
  2. Extracts the NDEF payload from the intent extras.
  3. Passes the payload through `parseNdefPayload`.
  4. Navigates to `/(public)/lesson/[moduleId]` if valid.
  5. Shows the `not_tutoria_card` error state if invalid.
- [ ] **Cooldown enforcement** — verify that cold-launch via tag dispatch still checks `isModuleOnCooldown` before opening the lesson. The server is the authoritative source (via `GET /v1/modules/:moduleId?profileId=`), but the local cooldown check prevents an unnecessary API call.
- [ ] **Persist the cooldown timestamp** — move the 12-hour cooldown tracking from in-memory `useLessonStore` to the persisted `useProgressStore` (AsyncStorage via Zustand `persist`). File: `src/stores/useProgressStore.ts`. This also fixes the gap noted in §3.
- [ ] **Lock down card payload** — add a server-side validation note to `docs/NFC_GUIDE.md` §9 (Security): the NFC card is a routing hint only; the server independently validates `canAttempt` and profile ownership. No changes to client code required — this is already the architecture.
- [ ] **Maestro E2E flow** — add `.maestro/flows/nfc-background-launch.yaml` that:
  1. Force-stops the app.
  2. Uses `adb shell am start -a android.nfc.action.NDEF_DISCOVERED ...` to simulate a background tag tap.
  3. Asserts the lesson screen opens with the correct `moduleId`.

**Acceptance criteria:**
- Cold-tapping a valid NTAG215 card on Android launches Tutoria and navigates to the lesson screen without any manual interaction.
- Cold-tapping a card when the module is on cooldown shows the cooldown message, not the lesson.
- Cooldown timestamp survives app kill and relaunch.
- The background launch Maestro flow passes in CI (requires Android emulator with NFC emulation or Maestro Cloud).

**Test plan:**
1. Force-stop app; tap valid card; confirm lesson screen opens.
2. Force-stop app; tap card for a module on cooldown; confirm cooldown screen, not lesson.
3. Complete a module; kill app; relaunch; confirm cooldown is still active.
4. Tap non-Tutoria card when app is closed; confirm error state on launch.
5. `npm run test` passes with cooldown persistence unit test added to `src/stores/__tests__/useProgressStore.test.ts`.

---

## 5. Other Workstreams

### Pronunciation latency improvements

The current upload flow (`src/hooks/usePronunciation.ts`) blocks on a single base64-in-JSON POST with a 20-second timeout. On slow networks this creates a poor experience. Already landed on this branch:

- Per-stage timing logs (`stop`, `flush`, `read`, `network`, `total`) on the network path so future tuning is data-driven.
- `Accept-Encoding: gzip` on the shared axios client to compress long Azure word-level breakdown responses.
- `POST_STOP_FLUSH_MS` constant — the post-stop flush wait dropped from 100 ms to 60 ms.
- New `isUploading` flag on `usePronunciation`, plumbed into the lesson screen so the button label switches between `Listening…` and `Checking…`.
- Optional `AbortSignal` parameter on `checkPronunciation` (TODO: wire it to component unmount).

Still planned:
- Switch to a multipart upload (or pre-signed R2 PUT) so the WAV does not have to be base64-encoded into JS memory; this requires a backend change.
- Lower the recorder bitrate further if file sizes still dominate the network step (currently 16 kHz / 1 channel / 128 kbps WAV — see `src/hooks/usePronunciation.ts`).
- A client-side volume threshold pre-check is already in place (silence gate); revisit only if false positives appear.
- Add a pronunciation-specific retry queue to `useProgressStore` so failed uploads are retried on reconnect without the user having to repeat the lesson word.

### Auth Phase 4 — Clerk JWT swap

`src/services/api/client.ts` uses a static bypass token (`tutoria-integration-test-2026`). To complete Phase 4:

1. Implement `setTokenGetter` to accept a `() => Promise<string | null>` callback.
2. In the request interceptor, call `_getToken()`, await the result, and inject it as the `Authorization` header.
3. Wire `setTokenGetter(() => getToken())` in the root layout after Clerk initialises.
4. Remove the `BYPASS_TOKEN` constant and all references.
5. Verify that `setSignOutHandler` correctly triggers on 401 responses from the real JWT path.

This is a prerequisite for production submission (Phase 6 in `docs/ROADMAP.md`).

### Offline queue completion

The offline queue (`src/stores/useProgressStore.ts`) handles `completeWord` payloads. Two gaps remain:

- `completeSession` — once the missing backend call is added (see §3), its payload must also be queueable.
- Cooldown persistence (resolved in Phase NFC-5 above) means the queue drain must account for a module being on cooldown when it comes online.

---

## 6. How agents should execute these phases

Pick exactly one NFC phase at a time. Branch off `main` using the naming convention in `CLAUDE.md` (e.g., `feat/nfc-phase-1-dev-client`). Follow all conventions in `CLAUDE.md` §6: granular Zustand selectors, hooks own their store slice, no `any`, Prettier single-quotes 100-char width. Run `npm run lint && npm run test` and confirm both pass before opening a PR. Keep each PR focused on a single phase — do not combine Phase NFC-2 card-writing with Phase NFC-3 UX work, even if the diff is small. Do not add `Co-Authored-By` trailers or agent attribution lines to commit messages; see `CLAUDE.md` §7 for the full attribution policy. Reference the relevant acceptance criteria from this document in the PR description so reviewers can verify each checkbox.

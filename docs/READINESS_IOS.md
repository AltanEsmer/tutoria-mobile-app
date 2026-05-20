# Tutoria Mobile App — iOS Readiness & Status

**Date:** 2026-05-16
**Branch:** `main`
**Trigger:** Apple Developer Program membership incoming — preparing the iOS path for real NFC alongside the existing Android demo.
**Companion doc:** [`docs/READINESS.md`](./READINESS.md) covers Android (current demo target). This document is iOS-only and assumes the Android path is already in flight.

---

## 1. Snapshot (as of 2026-05-16)

| Subsystem | iOS Status | Notes | Key files |
|---|---|---|---|
| **NFC (read path)** | Code complete, build blocked | `react-native-nfc-manager` 3.17.2 already supports Core NFC; `readTag()` is platform-agnostic and works on iOS without code changes. Blocker: missing entitlement and dev client build. | `src/services/nfc/nfcManager.ts`, `src/hooks/useNfc.ts` |
| **iOS native config** | Partial | `NFCReaderUsageDescription` declared in `app.json` `expo.ios.infoPlist`. `ios.entitlements` block is **not** present — `com.apple.developer.nfc.readersession.formats` must be added before Core NFC will activate. | `app.json` |
| **iOS UX polish** | Missing | `requestTechnology(NfcTech.Ndef)` is called without an `alertMessage`, so the system NFC sheet shows the default "Ready to Scan" text. `setAlertMessageIOS` is never used to update the sheet during scan. | `src/services/nfc/nfcManager.ts` |
| **iOS session lifecycle** | Adequate | `cancelTechnologyRequest()` correctly invalidates the Core NFC session in the `finally` block. iOS-specific `invalidateSessionWithErrorIOS` for error cases is optional polish, not required. | `src/services/nfc/nfcManager.ts:77` |
| **Cold-tap / background launch** | Not applicable | iOS does **not** support background NFC launch (see `docs/NFC_GUIDE.md` §5). No work needed on iOS for Phase NFC-5's cold-tap goals — only the cooldown persistence sub-task applies cross-platform. | — |
| **EAS Build profile** | Not configured | No `eas.json` in repo; `npx expo run:ios --device` requires a local Xcode provisioning profile, or `eas build --platform ios` once a paid team is linked. | _(missing `eas.json`)_ |
| **App Store privacy manifest** | Not started | Apple requires `PrivacyInfo.xcprivacy` for apps that use the microphone (pronunciation recording) and Core NFC. Will block App Store review, not demo builds. | _(missing `ios/Tutoria/PrivacyInfo.xcprivacy`)_ |
| **Everything else (auth, syllabus, audio, pronunciation, offline queue)** | Same as Android | Cross-platform JS — no iOS-specific deltas. See [`docs/READINESS.md`](./READINESS.md) §1. | — |

---

## 2. What Works Today on iOS (without any build attempts yet)

- `parseNdefPayload` is platform-agnostic and already passes its full unit test suite — the same parser handles the bytes returned by `NFCNDEFReaderSession`.
- `readTag()` in `src/services/nfc/nfcManager.ts` uses `NfcManager.requestTechnology(NfcTech.Ndef)`, which `react-native-nfc-manager` maps to `NFCNDEFReaderSession` on iOS. The single code path covers both platforms.
- `useNfc` and `useNfcStore` have no platform branches; the state machine, selectors, and cleanup all behave identically on iOS.
- `NFCReaderUsageDescription` is set, so once an entitled build runs, the iOS permission prompt will show the Tutoria string instead of a generic one.
- Manual lesson-code fallback (`NfcPrompt` text input) already covers the "iOS device without entitlement" case in the meantime.

In other words: **no JavaScript needs to change for the basic iOS scan to work.** The remaining work is native config + a real dev-client build with the entitlement signed in.

---

## 3. Known Gaps / Risks (iOS-specific)

- **Core NFC entitlement missing** — `app.json` has no `ios.entitlements` block. Without `com.apple.developer.nfc.readersession.formats`, `NFCNDEFReaderSession.init` returns an "Feature not supported" error and the scan sheet never opens. Fix below in Phase iOS-1.
- **Entitlement gated by paid Apple Developer Program** — Resolving when the user's membership clears.
- **No `alertMessage` on iOS scan** — Core NFC always shows a modal sheet during scan. The default sheet text is "Ready to Scan" with no app-specific context. Tutoria should pass `alertMessage: 'Hold your Tutoria card near the top of your iPhone'` (and update it on success/failure via `setAlertMessageIOS`) for a polished UX.
- **60-second iOS session timeout is unhandled in UX states** — Phase NFC-3 in `docs/READINESS.md` plans `parse_error`/`retry` states; iOS will hit these via the Core NFC built-in 60 s timeout. The scan-state model needs to map the iOS-specific timeout error code to `parse_error`.
- **No iOS app icon variants set** — `app.json` uses a single `icon` for both platforms. App Store submission requires the iOS icon set; demo builds will work fine.
- **No `PrivacyInfo.xcprivacy`** — Required for App Store review (microphone + NFC reasons), not for sideloaded dev builds.
- **EAS Build not configured** — A local `npx expo run:ios --device` works if Xcode is set up with a personal signing certificate, but cloud builds (and TestFlight) require `eas.json` + a paid team. Decide which to use before the dev account arrives.
- **No iOS device in the documented demo prerequisites** — iPhone 7+ is required for Core NFC. Pick a specific test device (e.g., iPhone 12+ recommended for reliable NDEF reads).

---

## 4. iOS NFC Rollout — Phased Plan

These phases mirror `docs/READINESS.md` §4 but cover only the iOS-specific work. Execute one phase per PR. Phases iOS-1 and iOS-2 are unblocked by the Apple Developer account; iOS-3 onward can be drafted in parallel and merged once the account is live.

> Cross-reference: `docs/NFC_GUIDE.md` §3 (iOS Configuration) and §5 (Platform Differences) cover the concepts. This section focuses on execution.

---

### Phase iOS-1: Core NFC entitlement + iOS dev client

**Goal:** Produce a development build IPA that can exercise real NFC on a physical iPhone, once the paid Apple Developer Program membership is active.

**Background:** Core NFC requires both `NFCReaderUsageDescription` (already set) **and** the `com.apple.developer.nfc.readersession.formats` entitlement, which can only be signed into a build by a team that has the NFC capability enabled in its provisioning profile. The capability is part of the paid Apple Developer Program.

**Prerequisites:**

1. Paid Apple Developer Program membership active; team ID known.
2. NFC Tag Reading capability enabled for the app's App ID in Apple Developer portal.
3. Xcode installed locally with a valid provisioning profile for `ac.tutoria.mobile`.
4. iPhone 7 or newer (iPhone 12+ recommended), iOS 16+, USB cable, device trusted for development.
5. `EXPO_PUBLIC_ENABLE_NFC_MOCK` unset or set to `false` in `.env`.

**Tasks:**

- [x] Add the `ios.entitlements` block to `app.json`:
  ```json
  "ios": {
    "supportsTablet": true,
    "bundleIdentifier": "ac.tutoria.mobile",
    "infoPlist": {
      "NFCReaderUsageDescription": "Tutoria uses NFC to read learning cards and start phonics lessons",
      "NSMicrophoneUsageDescription": "Tutoria records your voice to check pronunciation during lessons"
    },
    "entitlements": {
      "com.apple.developer.nfc.readersession.formats": ["NDEF"]
    }
  }
  ```
- [ ] Run `npx expo prebuild --platform ios` to regenerate the `ios/` directory with the entitlement applied; verify `ios/Tutoria/Tutoria.entitlements` contains the `com.apple.developer.nfc.readersession.formats` array with `NDEF`. _(hardware — pending Apple Developer account)_
- [ ] Run `npx expo run:ios --device` to build, sign, and install the dev client on the test iPhone. Confirm the install completes without provisioning errors. _(hardware — pending Apple Developer account)_
- [ ] On first launch, accept the NFC permission prompt; confirm the Tutoria-specific `NFCReaderUsageDescription` text appears. _(hardware — pending Apple Developer account)_
- [x] Confirm `npm run lint && npm run test` still pass.

**Acceptance criteria:**

- `npx expo run:ios --device` produces an installable dev client; the app launches without "missing entitlement" runtime warnings.
- `NfcManager.isSupported()` returns `true` on the test iPhone.
- Tapping the scan button opens the Core NFC system sheet with the default "Ready to Scan" text (the polished alert message lands in Phase iOS-2).
- `ios/Tutoria/Tutoria.entitlements` is generated and contains `<key>com.apple.developer.nfc.readersession.formats</key>` with `<string>NDEF</string>`.

**Test plan:**

1. Build dev client; install on iPhone; confirm app launches and Home screen shows the `NfcRing` (no "NFC not supported" banner).
2. Tap scan button without a card present → Core NFC sheet opens and times out after 60 s → app returns to idle state.
3. Run `npm run lint && npm run test` — all suites must remain green.

**Notes:**

- This phase is the iOS twin of Phase NFC-1 in `docs/READINESS.md`. The Android Phase NFC-1 work is independent and is not blocked by this PR.

---

### Phase iOS-2: iOS scan UX polish (`alertMessage`)

**Goal:** Make the Core NFC system sheet feel like part of Tutoria, with context-aware messages on listening, success, and failure.

**Tasks:**

- [x] Update `readTag()` in `src/services/nfc/nfcManager.ts` to pass an `alertMessage` to `requestTechnology` on iOS. Implemented with an explicit `Platform.OS === 'ios'` branch so Android stays single-arg (byte-for-byte identical to before this PR), rather than the `undefined` option pattern shown below; both achieve the same end:
  ```ts
  if (Platform.OS === 'ios') {
    await NfcManager.requestTechnology(NfcTech.Ndef, {
      alertMessage: 'Hold your Tutoria card near the top of your iPhone',
    });
  } else {
    await NfcManager.requestTechnology(NfcTech.Ndef);
  }
  ```
- [x] On a successful parse, call `NfcManager.setAlertMessageIOS('Card detected!')` before `cancelTechnologyRequest()` so the sheet closes with a confirmation.
- [x] On a parse failure (wrong prefix or empty `moduleId`), call `NfcManager.invalidateSessionWithErrorIOS('This is not a Tutoria card')` so the sheet shows the error and auto-dismisses, instead of silently closing.
- [x] Wrap the new iOS calls so they are no-ops on Android (Platform-guarded **and** try/catch-wrapped so UX polish cannot break the parsed return).
- [x] Add unit tests for the `Platform.OS === 'ios'` branches in `src/services/nfc/__tests__/nfcManager.test.ts` — four cases cover iOS reqTech args, Android reqTech args, iOS valid → `setAlertMessageIOS`, iOS invalid → `invalidateSessionWithErrorIOS`.

**Acceptance criteria:**

- On iOS, the NFC scan sheet shows "Hold your Tutoria card near the top of your iPhone" instead of the default text.
- A valid card triggers a brief "Card detected!" message before navigation.
- A non-Tutoria card causes the sheet to dismiss with an error message visible to the user.
- Android behavior is unchanged (no regressions in the existing test suite).

**Test plan:**

1. Tap a valid card on iOS → sheet shows "Card detected!" then dismisses, app navigates to lesson.
2. Tap a non-Tutoria card on iOS → sheet shows "This is not a Tutoria card" and dismisses.
3. Run Android scan flow → no behavioral change.
4. `npm run lint && npm run test` pass.

---

### Phase iOS-3: iOS-specific error mapping (timeout + user cancel)

**Goal:** Tie iOS-specific Core NFC errors to the `scanState` model defined in Phase NFC-3 of `docs/READINESS.md`.

**Tasks:**

- [x] In `useNfc.ts`, map `react-native-nfc-manager`'s iOS error codes to the appropriate `scanState`:
  - User dismissed the Core NFC sheet manually → `scanState: 'idle'` (no error UI).
  - Session timed out (60 s without a tag) → `scanState: 'parse_error'` with "Scan timed out — try again" copy.
  - Reader unavailable / device locked mid-scan / other generic failures → `scanState: 'parse_error'`.
  - App-initiated session invalidation (from Phase iOS-2's `invalidateSessionWithErrorIOS`) → `scanState: 'not_tutoria_card'`.
  - Heuristic matches both `err.message` and `err.constructor.name` (lowercased) — the constructor check covers the library's typed `UserCancel` / `Timeout` / `SessionInvalidated` errors that often carry an empty message.
- [x] Document the iOS error codes encountered in `docs/NFC_GUIDE.md` §6 (append to the error table; do not duplicate Android entries).
- [x] Add unit tests in `src/hooks/__tests__/useNfc.test.ts` covering each iOS error → state transition (mock the thrown error from `readTag`). Nine cases cover idle / listening / found / parse_error / not_tutoria_card transitions plus re-scan after parse_error.

**Acceptance criteria:**

- All four iOS error modes (success, user cancel, timeout, read failure) produce the correct `scanState` value.
- The `not_tutoria_card` state continues to render correctly when Phase iOS-2's `invalidateSessionWithErrorIOS` path triggers.
- The Phase NFC-3 acceptance criteria pass on iOS as well as Android.

**Test plan:**

1. iPhone: open scan UI, dismiss the Core NFC sheet manually → app returns to idle, no error banner.
2. iPhone: open scan UI, do nothing for 60 seconds → `parse_error` state with retry button.
3. iPhone: lock the device mid-scan, unlock → app returns to idle without an unhandled promise rejection.
4. Unit tests in `useNfc.test.ts` all green.

---

### Phase iOS-4: EAS Build profile + TestFlight pipeline

**Goal:** Move iOS builds off "developer laptop with Xcode" and onto EAS so the team (and CI) can produce signed builds reproducibly.

**Tasks:**

- [ ] Create `eas.json` with `development`, `preview`, and `production` profiles; bind the iOS profile to the paid team and the NFC-enabled provisioning profile.
- [ ] Run `eas credentials` to upload the App Store Connect API key and verify the NFC capability is part of the synced provisioning profile.
- [ ] Run `eas build --platform ios --profile development` and install the resulting IPA on the test iPhone via TestFlight or `eas device:create` ad-hoc install.
- [ ] Document the build commands and required env vars in `docs/DEVELOPMENT_SETUP.md` (iOS subsection).
- [ ] Add an iOS dev-build job to the CI workflow (optional in this phase — can wait until Phase 6 of `docs/ROADMAP.md`).

**Acceptance criteria:**

- A cloud-built IPA installs on the test iPhone and successfully scans a Tutoria card end-to-end.
- The provisioning profile in the build log lists the NFC reader-session capability.
- `docs/DEVELOPMENT_SETUP.md` has step-by-step iOS build instructions.

---

### Phase iOS-5: App Store readiness (privacy manifest + assets)

**Goal:** Clear the App Store review blockers before the first TestFlight beta invite.

**Tasks:**

- [ ] Create `ios/Tutoria/PrivacyInfo.xcprivacy` declaring the required reason APIs (microphone for pronunciation, NFC for tag reading, file timestamp APIs used by `expo-file-system`).
- [ ] Generate the full iOS icon set (1024×1024 marketing icon plus the variants) and reference them in `app.json` or via an Expo config plugin.
- [ ] Confirm Tutoria's privacy policy URL is reachable and matches the data collected in the App Privacy form (Clerk auth, voice recordings, anonymous telemetry once Phase NFC-4 lands).
- [ ] Verify Core NFC and Microphone usage strings are localized if the App Store listing is multi-language (English-only is fine for the first submission).
- [ ] Cross-link with Phase 6 of `docs/ROADMAP.md` for the broader release checklist.

**Acceptance criteria:**

- `eas submit --platform ios` produces a TestFlight build that passes Apple's automated review checks for entitlements and privacy.
- App Store Connect shows no warnings about missing privacy manifest entries.

---

## 5. Cross-platform sub-tasks that also benefit iOS

These already exist in `docs/READINESS.md` and apply to iOS without modification — call them out so they don't get done twice:

- **Cooldown persistence** (`docs/READINESS.md` §3 + Phase NFC-5 sub-task): move the 12-hour cooldown from `useLessonStore` to the persisted `useProgressStore`. Same patch, no iOS branch.
- **`completeSession` backend call** (§3): missing on both platforms.
- **Phase NFC-4 telemetry**: the `NfcScanEvent` shape already includes `platform: 'ios' | 'android'`. Once the iOS device is reading cards, the same telemetry pipeline captures iOS events.
- **Static bypass token → Clerk JWT swap** (§3 Phase 4): unrelated to NFC, but a prerequisite for App Store submission.

---

## 6. Code changes needed for iOS (TL;DR)

You asked: _"do I need to write additional code?"_ — Short answer: **very little JS code; mostly native config + UX polish.**

| Change | File | Phase | Mandatory for scan? |
|---|---|---|---|
| Add `ios.entitlements` with `com.apple.developer.nfc.readersession.formats: ["NDEF"]` | `app.json` | iOS-1 | **Yes** — without it Core NFC refuses to start |
| Regenerate `ios/` via `expo prebuild` | _generated_ | iOS-1 | **Yes** |
| Pass `alertMessage` to `requestTechnology` on iOS | `src/services/nfc/nfcManager.ts` | iOS-2 | No (default text works, but poor UX) |
| Call `setAlertMessageIOS` / `invalidateSessionWithErrorIOS` for feedback | `src/services/nfc/nfcManager.ts` | iOS-2 | No |
| Map iOS-specific error codes to `scanState` | `src/hooks/useNfc.ts` | iOS-3 | No (errors fall through to `parse_error` already) |
| Create `eas.json` for cloud builds | `eas.json` (new) | iOS-4 | No for local dev; yes for TestFlight |
| Create `PrivacyInfo.xcprivacy` | `ios/Tutoria/PrivacyInfo.xcprivacy` (new) | iOS-5 | No for dev builds; yes for App Store |

**Things you do _not_ need to write iOS-specific code for:**

- `parseNdefPayload`, `useNfc`, `useNfcStore`, `NfcRing`, manual-code fallback — all platform-agnostic, already done.
- Background tag dispatch — not supported on iOS at all; the Phase NFC-5 cold-tap work is Android-only by design.
- A separate iOS NFC service — `react-native-nfc-manager` is the single abstraction; no fork needed.

---

## 7. Recommended order while you wait for the account

You said you won't wait — here's the parallel path:

1. **Today, no account needed:** Open a draft PR for Phase iOS-1's `app.json` entitlement change. Mark it WIP. The diff is two lines and can be reviewed independently of any build.
2. **Today:** Open a second draft PR for Phase iOS-2's `alertMessage` patch. Add the `Platform.OS === 'ios'` guard so Android tests stay green; unit-test it with `Platform.OS` mocked. This merges safely before the account arrives because Android behavior is unchanged.
3. **Today:** Decide whether to use local `expo run:ios` builds or `eas build` from day one; if EAS, start drafting `eas.json` (Phase iOS-4) so it is ready to wire up the moment the team ID is available.
4. **The day the account clears:** Run `expo prebuild --platform ios && expo run:ios --device` on a real iPhone with a Tutoria card already written from Phase NFC-2. End-to-end scan should work on the first run.
5. **Same day:** Merge Phase iOS-1 and iOS-2; cut a TestFlight beta from Phase iOS-4 once the provisioning profile is live.

This sequences the work so the only thing blocked on the Apple Developer Program is **signing a build** — not writing code, not designing UX, not reviewing PRs.

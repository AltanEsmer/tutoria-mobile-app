# Phase 5 — Maestro Testing Integration

## What Was Done

Phase 5 integrates [Maestro](https://maestro.mobile.dev) as the E2E testing framework for Tutoria. This covers all major user flows across every screen.

### Changes Made

| Area | Change |
|---|---|
| `.maestro/config.yaml` | Maestro workspace config |
| `.maestro/.env` | Test credentials (git-ignored) |
| `.maestro/flows/` | 17 YAML test flows covering all screens |
| All screens + components | `testID` props added to every interactive element |
| `src/components/ui/Button.tsx` | Added `testID` prop support |

### Note: No Separate `completeSession` Endpoint

The original assumption that the backend required an explicit "complete session" POST was incorrect. The backend **auto-completes the module** when the last word is marked done via `POST /v1/modules/:moduleId/word` (response includes `isModuleComplete: true`). No separate `/complete` endpoint exists. The lesson screen calls `useProgressStore.getState().invalidate()` directly after `sessionComplete` becomes `true`, which is sufficient to refresh the progress dashboard.

---

## Installing Maestro CLI

Maestro is a standalone CLI, not an npm package. Install it once on your machine:

```bash
# macOS / Linux
curl -Ls "https://get.maestro.mobile.dev" | bash

# Verify
maestro --version
```

Restart your terminal after install.

---

## Running Tests

### Prerequisites
1. Start the app on a simulator/emulator or physical device:
   ```bash
   npm run ios     # iOS Simulator
   npm run android # Android Emulator
   ```
2. The app must be running and the simulator/device must be connected.

### Run All Flows
```bash
cd /path/to/tutoria-mobile-app
maestro test .maestro/flows/
```

### Run a Single Flow
```bash
maestro test .maestro/flows/auth-sign-in.yaml
maestro test .maestro/flows/lesson-start-and-navigate.yaml
```

### Interactive Studio (Visual Debugging)
```bash
maestro studio
```
Opens a browser UI where you can inspect the screen, record flows, and run tests interactively.

---

## Test Flows Overview

### Auth Flows
| Flow | What It Tests |
|---|---|
| `auth-sign-in.yaml` | Happy-path sign-in with real credentials |
| `auth-sign-in-error.yaml` | Invalid credentials → error message shown |
| `auth-sign-up-navigation.yaml` | Password mismatch validation, back navigation |
| `auth-forgot-password.yaml` | Navigate to/from forgot password screen |

### Home + NFC Flows
| Flow | What It Tests |
|---|---|
| `home-no-profile.yaml` | No-profile state → navigate to Profiles tab |
| `home-tab-navigation.yaml` | Full tab bar round-trip (Home → Progress → Profile → Home) |
| `home-nfc-manual-lesson.yaml` | Manual module code entry → lesson starts |
| `home-missions-display.yaml` | Missions section renders |

### Lesson Flows
| Flow | What It Tests |
|---|---|
| `lesson-start-and-navigate.yaml` | Enter lesson via manual entry, verify UI, go back |
| `lesson-word-display.yaml` | Word card + play audio button |
| `lesson-skip-word.yaml` | Skip word advances to next word |
| `lesson-results-back-to-home.yaml` | Results screen redirects home when no session |

### Profile + Progress Flows
| Flow | What It Tests |
|---|---|
| `profile-screen.yaml` | Profile screen loads, header + sign-out visible |
| `profile-add-button.yaml` | Add profile button present (empty or list state) |
| `profile-sign-out.yaml` | Sign out redirects to sign-in screen |
| `progress-screen.yaml` | Progress screen renders with title |
| `progress-streak-badge.yaml` | Streak badge with count and label visible |

---

## NFC Testing Strategy

NFC hardware is unavailable in simulators/emulators. The app adapts:

- **With `EXPO_PUBLIC_ENABLE_NFC_MOCK=true`**: Scans resolve with a mock tag (no hardware needed). The NFC scan button works as normal.
- **Without the flag (simulator)**: `isSupported=false` → manual code entry fallback is shown.

The Maestro flows target the **manual entry** path (`nfc-prompt-manual-card`, `nfc-prompt-manual-input`) which is 100% deterministic and works on all simulators without any env flag.

To test the full NFC mock flow:
```bash
# Set in your .env file
EXPO_PUBLIC_ENABLE_NFC_MOCK=true
```
Then the `home-nfc-manual-lesson.yaml` flow will work via the mock scan button.

---

## Environment / Credentials

Test credentials live in `.maestro/.env` (git-ignored). **Update this file** with a real Clerk test account before running auth flows:

```
MAESTRO_APP_ID=ac.tutoria.mobile
TEST_EMAIL=your-test-account@example.com
TEST_PASSWORD=YourTestPassword123!
```

> ⚠️ Never commit real credentials. The `.gitignore` already excludes `.maestro/.env`.

---

## CI Integration

Phase 5 adds a GitHub Actions CI pipeline at `.github/workflows/ci.yml` that runs on every push/PR to `main` and `develop`.

### What the CI runs

| Job | Steps |
|---|---|
| `lint-typecheck` | `npm ci` → `eslint` → `tsc --noEmit` |
| `test` | `npm ci` → `jest --coverage --ci --passWithNoTests` → upload coverage artifact |

### Running unit tests locally

```bash
npm test                  # run all jest tests
npm run test:watch        # watch mode
npm run test:coverage     # with coverage report
```

### Test files created

| File | What it covers |
|---|---|
| `src/services/nfc/__tests__/tagParser.test.ts` | NDEF parsing (valid, invalid, empty, whitespace) |
| `src/services/api/__tests__/progress.test.ts` | `getProgress` / `saveProgress` with mocked Axios |
| `src/stores/__tests__/useAuthStore.test.ts` | Initial state, `setAuth`, `clearAuth` |
| `src/stores/__tests__/useNfcStore.test.ts` | Scan state transitions |
| `src/stores/__tests__/useLessonStore.test.ts` | `hydrateFromSession`, `recordAttempt`, `advanceWord`, cooldown, reset |
| `src/stores/__tests__/useProgressStore.test.ts` | Offline queue drain, retry, 409 handling, invalidate |
| `src/app/(auth)/__tests__/sign-in.test.tsx` | Renders, Clerk integration, error handling |

### Mocks in `__mocks__/`

Root-level `__mocks__/` provides auto-mocks for: `react-native-nfc-manager`, `expo-haptics`, `expo-secure-store`, `expo-audio`, `expo-file-system`, `expo-router`, `@clerk/clerk-expo`, `@react-native-community/netinfo`, `@react-native-async-storage/async-storage`.

### Known limitations

- Hook tests (`useNfc`, `useAudio`, `usePronunciation`) are deferred — they require deep native mocking of recording hardware and NFC that cannot easily run headlessly.
- `eslint-plugin-react-native` rules are registered but disabled (the plugin does not yet support ESLint 9 flat config — `context.getScope` was removed in ESLint 9).

---

## Maestro E2E Testing

## testID Reference

Every interactive element has a `testID`. Pattern: `screen-element-type`. Examples:

- `sign-in-email-input`, `sign-in-submit-button`
- `home-screen`, `home-missions-section`
- `nfc-prompt-manual-input`, `nfc-prompt-start-lesson-button`
- `lesson-screen`, `lesson-play-button`, `lesson-record-button`, `lesson-skip-button`
- `word-display-card`, `word-display-text`
- `pronunciation-feedback-container`, `pronunciation-feedback-retry-button`
- `results-screen`, `results-score-circle`, `results-home-button`
- `profile-screen`, `profile-sign-out-button`
- `progress-screen`, `streak-badge`, `streak-badge-count`

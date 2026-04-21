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
| `src/services/api/modules.ts` | Added `completeSession()` API call (was missing) |
| `src/app/(public)/lesson/[moduleId].tsx` | Calls `completeSession` when a module finishes |
| `src/components/ui/Button.tsx` | Added `testID` prop support |

### Bug Fixed: `completeSession` Missing API Call

**Before:** When a student finished a lesson, the app navigated to the results screen but never told the backend the session was complete. The ROADMAP flagged this as ⚠️ Missing.

**After:** `completeSession(moduleId, profileId)` is now called before navigating to results. It's best-effort — if offline or the call fails, navigation still happens and sync can catch up later.

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

## CI Integration (Future)

To run Maestro in CI (GitHub Actions):

```yaml
- name: Install Maestro
  run: curl -Ls "https://get.maestro.mobile.dev" | bash

- name: Run E2E Tests
  run: maestro test .maestro/flows/
  env:
    TEST_EMAIL: ${{ secrets.TEST_EMAIL }}
    TEST_PASSWORD: ${{ secrets.TEST_PASSWORD }}
```

This requires a running simulator/emulator in CI (e.g., using `macos-latest` runner with Xcode for iOS, or `ubuntu-latest` with Android AVD for Android).

---

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

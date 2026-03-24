# Phase 2 — Core Screens & Navigation: Testing Guide

## What was implemented

| Screen / Component | Path |
|---|---|
| Tab navigator (Home / Progress / Syllabus / Profile) | `src/app/(public)/_layout.tsx` |
| Home screen | `src/app/(public)/home.tsx` |
| Profile selector | `src/app/(public)/profile.tsx` |
| Add profile form | `src/app/(public)/profile/add.tsx` |
| Lesson screen | `src/app/(public)/lesson/[moduleId].tsx` |
| Progress dashboard | `src/app/(public)/progress.tsx` |
| Syllabus browser | `src/app/(public)/syllabus.tsx` |
| MissionCard, Button, LoadingSpinner | `src/components/ui/` |
| NfcPrompt | `src/components/nfc/NfcPrompt.tsx` |
| WordDisplay | `src/components/lesson/WordDisplay.tsx` |
| StreakBadge, ActivityList, ActivityRow, WeeklyChart | `src/components/progress/` |

Fonts installed: `expo-font` + `@expo-google-fonts/lexend` (Lexend 400 Regular + 700 Bold)

---

## How to test

### 1. Start the dev server

```bash
npm run start
```

Open in Expo Go on a physical device or simulator.

### 2. Authentication flow

- Cold launch → redirected to sign-in screen (Phase 1).
- Sign in with a valid Clerk account → lands on **Home** tab.

### 3. Home screen

- With no active child profile selected: screen shows "Select a profile to get started" message with link to Profile tab.
- With an active profile: missions are fetched from the API and shown as cards. If the API is unreachable, an error state renders.
- The NFC prompt ("Tap your NFC card…") appears when no active lesson session is running.

### 4. Profile screen

- **Profile tab** → list of profiles fetched from API.
- Tap a profile → "Active" badge appears on that card.
- **Add Profile** button → navigates to the Add Profile form.
  - Enter a name (required) and optional age → "Create Profile" → navigates back.
  - Leaving name blank shows an inline validation error.

### 5. Lesson screen

Navigate manually (no NFC needed in Phase 2):

```
Deep link: tutoria://lesson/<any-module-id>
Or from Home: tap "Start" on a mission card
```

- Without an active profile: placeholder message shown.
- With an active profile: `startOrResumeModule` is called, word display renders with large Lexend font and IPA below.
- Progress bar shows current position.
- 🔊 Play button: enabled only when the word has `audio_path`.
- 🎙️ Record button: press & hold to record (mic permission prompt on first use); release triggers pronunciation check call (result processing is Phase 3).

### 6. Progress screen

- Shows "0 day streak" with flame badge if no data.
- With data: streak count, activity rows with mastery dots, weekly bar chart (last 7 days).

### 7. Syllabus screen

- Loads stages from API.
- Tap a stage row → expands to show description + module list with 🔒 icons.
- Tap a module → navigates to lesson screen with that module's ID.

---

## Environment variables required

Ensure `.env` (or `.env.local`) contains:

```
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
EXPO_PUBLIC_API_URL=https://api-dev.tutoria.ac
```

For testing without a physical NFC card, set:

```
EXPO_PUBLIC_ENABLE_NFC_MOCK=true
```

---

## Known limitations in Phase 2

- Pronunciation result feedback is not processed (Phase 3).
- NFC scanning is not wired to lesson launch (Phase 3).
- Module locked/unlocked state is always "locked" placeholder (Phase 3).
- Bottom tab icons use emoji — vector icons come in Phase 4.
- ESLint uses legacy `.eslintrc.json` format (pre-existing, not Phase 2 issue).

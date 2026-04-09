# Phase 3 — Core Features: Testing Guide

## Overview

Phase 3 implements the core learning experience: NFC-triggered lessons, word-by-word pronunciation feedback, haptic feedback, audio auto-play, attempt limits with cooldown, and a session results screen.

## Prerequisites

- Expo dev server running (`npm run start`)
- A valid learner profile selected
- Backend API running (or mock endpoints configured)
- For NFC: a physical device with NFC, or set `EXPO_PUBLIC_ENABLE_NFC_MOCK=true` in `.env`

## Features to Test

### 1. NFC Scan → Lesson Launch (Home Screen)

**Location:** `src/app/(public)/(tabs)/home.tsx`

- Open the Home tab — the NFC prompt card should appear
- Tap the NFC prompt to begin scanning (animated pulsing ring appears)
- Scan a valid `tutoria:<moduleId>` NFC tag → navigates to `/lesson/<moduleId>`
- Scan an invalid/foreign tag → shows error message
- If NFC is unsupported (simulator), shows "Enter lesson code" fallback
- If NFC is disabled on device, shows "Enable NFC in settings" message

**Manual (no NFC hardware):**

Set `EXPO_PUBLIC_ENABLE_NFC_MOCK=true` and restart the app. The mock NFC service will simulate tag reads.

### 2. Haptic Feedback

**Location:** `src/hooks/useHaptics.ts`

Haptic events fire on:

- NFC tag detected → medium impact
- Correct pronunciation → success notification
- Incorrect pronunciation → warning notification
- Button taps → light impact

**Note:** Haptics are a no-op on web and simulators. Test on a physical device to feel them.

### 3. Audio Auto-Play

**Location:** `src/hooks/useAudio.ts`

- When a new word is displayed in the lesson, audio plays automatically
- The play button shows a loading spinner while audio is fetching
- Tapping the play button replays the word audio
- Audio load failure shows an error state but doesn't block the lesson

### 4. Lesson Session Flow

**Location:** `src/app/(public)/lesson/[moduleId].tsx`

This is the main flow to test end-to-end:

1. Navigate to a lesson (via NFC or direct URL)
2. Module loads, first word appears with auto-play audio
3. Press and hold the microphone button to record pronunciation
4. Release to submit — pronunciation feedback panel slides in:
   - **Score ≥ 80%**: Green badge, success haptic, "Next Word" button
   - **Score 50–79%**: Yellow badge, warning haptic, "Retry" / "Next Word" buttons
   - **Score < 50%**: Red badge, warning haptic, "Retry" button, attempt counter
5. After 3 failed attempts on a word → word auto-marked as failed, auto-advances after 2 seconds
6. "Skip" button available to manually skip a word (counts as failed)
7. When all words are done → navigates to Results screen

**Attempt counter** shows "Attempt X of 3" during the lesson.

### 5. Word Attempt Limits & Cooldown

**Location:** `src/stores/useLessonStore.ts`

- Each word allows max 3 pronunciation attempts per session
- After 3 failures, word is marked failed and auto-advances
- Module cooldown: 12 hours after completing a session (stored in memory only — resets on app restart)

**Note:** Cooldown persistence requires `@react-native-async-storage/async-storage` which is not yet installed. Currently cooldowns reset on app restart.

### 6. Pronunciation Feedback UI

**Location:** `src/components/lesson/PronunciationFeedback.tsx`, `src/components/lesson/ScoreBadge.tsx`

- Score badge is circular with percentage, color-coded (green/yellow/red)
- Feedback message from API response displayed below badge
- Retry and Next Word buttons appear based on score
- Component animates in from the bottom

### 7. Results Screen

**Location:** `src/app/(public)/lesson/results.tsx`

- Shows after all words in a session are completed
- Displays: total words, passed count, failed count, session score percentage
- Word-by-word breakdown with pass/fail icons and individual scores
- Confetti animation on good performance (≥ 70% overall)
- "Back to Home" navigates to home tab
- "Try Again" restarts the same module (if not on cooldown)

## Known Limitations

1. **No persistent cooldown**: Module cooldown resets on app restart (needs AsyncStorage integration)
2. **ESLint config**: ESLint v9 config migration needed (pre-existing, unrelated to Phase 3)
3. **NFC on simulator**: Must use mock mode — real NFC requires a physical device
4. **Audio on emulator**: Audio playback may have latency on Android emulator

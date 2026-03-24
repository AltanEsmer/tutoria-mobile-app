# Phase 2 — Home Screen: Testing Guide

This document explains how to test the Home screen and related components delivered in Phase 2.

## Files Created

| File | Purpose |
|------|---------|
| `src/app/(public)/home.tsx` | Home screen (tab entry point) |
| `src/components/ui/MissionCard.tsx` | Mission card with progress bar and CTA |
| `src/components/ui/Button.tsx` | Reusable button primitive |
| `src/components/ui/LoadingSpinner.tsx` | Centered loading indicator |
| `src/components/nfc/NfcPrompt.tsx` | "Tap your NFC card" prompt |

---

## How to Run

```bash
npm run start        # Expo Go / dev client
npm run android      # Android target
npm run ios          # iOS target
```

Sign in with a valid account to reach the `/(public)/home` screen via the **Home** tab.

---

## Manual Test Checklist

### 1. No active profile
- Open the app without selecting a profile.
- **Expected:** "No profile selected" message with a "Go to Profiles" button.
- Tap the button → should navigate to the Profile tab (`/profile`).

### 2. Active profile — loading state
- Select a profile and navigate to the Home tab.
- **Expected:** A spinning `ActivityIndicator` (orange) appears while missions load.

### 3. Active profile — missions loaded
- Once loaded, up to **3 mission cards** appear sorted by `priority` (ascending).
- Each card shows:
  - Module name (bold)
  - Label badge: **Mint** for "Quick Win", **Orange** for "Continue", **Navy** for "Ready to Retry"
  - Progress bar reflecting `completedWords / totalWords`
  - `wordsLeft` subtitle
  - "Start" button

### 4. Start button navigation
- Tap the "Start" button on any mission card.
- **Expected:** Navigates to `/lesson/<moduleId>`.

### 5. NFC prompt visibility
- When there is no active lesson session (`currentSession` is null in `useLessonStore`), the NFC prompt should appear below the mission list.
- **Expected:** Card with 📲 emoji and "Tap your NFC card to start a lesson" text.

### 6. Error state
- Simulate an API error (e.g., disable network or use an invalid base URL in `.env`).
- **Expected:** "Could not load missions. Please try again." message in red.

### 7. Empty state
- If the API returns zero missions (all complete), the screen should show 🎉 "All caught up!" message.

### 8. Greeting
- The header greeting dynamically changes based on time of day:
  - 00:00–11:59 → "Good morning 👋"
  - 12:00–17:59 → "Good afternoon 👋"
  - 18:00–23:59 → "Good evening 👋"

---

## Component Variants (Button)

The `Button` component supports three variants — test manually by importing in a dev screen:

| Variant | Background | Text |
|---------|-----------|------|
| `primary` (default) | Orange `#FF9F1C` | White |
| `secondary` | Navy `#1F3A5F` | White |
| `outline` | Transparent | Navy + border |

All variants respect the **48px minimum touch target** requirement.

---

## Notes

- NFC is not available on simulators/emulators. Set `EXPO_PUBLIC_ENABLE_NFC_MOCK=true` in your `.env` for local dev.
- Hooks-based data fetching (moving `useEffect` logic into `useMissions` hook) is planned for Phase 3.

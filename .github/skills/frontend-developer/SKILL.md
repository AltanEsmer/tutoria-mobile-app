---
name: frontend-developer
description: Expert in Tutoria's React Native/Expo frontend, Expo Router file-based navigation, reusable components, custom hooks, and TypeScript patterns. Use for UI components, screen implementation, navigation flows, styling, or frontend architecture questions.
---

# Frontend Developer

The Tutoria Mobile App frontend is built with **React Native + Expo**, using **Expo Router** for file-based navigation, **Zustand** for global state management, and **TypeScript** throughout. The app is designed for children with dyslexia — it uses NFC tags to launch learning modules, records pronunciation attempts, plays audio, and tracks progress over time. Understanding the domain (lesson sessions, word-by-word progression, NFC scanning, pronunciation feedback) is as important as knowing the framework patterns.

---

## Key Concepts

- **React Native + Expo (~55.0.6 / React 19.2.0):** UI is declared with React Native primitives (`View`, `Text`, `Pressable`, etc.). Expo supplies device APIs (audio, haptics, secure storage, speech) and the managed build pipeline.
- **TypeScript 5.9.2:** Strict typing across every layer — stores, hooks, API responses, component props.
- **File-Based Routing (Expo Router):** Route files live in `src/app/`; the folder name is the URL segment. Route groups `(auth)` and `(public)` organize screens without affecting the URL.
- **Component-Driven Architecture:** UI is split into small, single-responsibility components organized by feature domain under `src/components/`.
- **Service / Store / Hook Separation:** API calls live in `src/services/api/`, global state in `src/stores/`, and stateful device logic in `src/hooks/`. Components are kept thin and delegate to these layers.

---

## Project Structure

```
src/
├── app/                    # Expo Router routes (file = route)
│   ├── _layout.tsx         # Root layout — wraps entire app
│   ├── (auth)/             # Route group: authenticated screens
│   └── (public)/           # Route group: unauthenticated screens
│
├── components/             # Reusable React Native components
│   ├── lesson/             # Lesson display & word progression UI
│   ├── nfc/                # NFC scan prompts and feedback UI
│   ├── progress/           # Streak badges, activity history
│   └── ui/                 # Domain-agnostic primitives (buttons, cards, etc.)
│
├── hooks/                  # Custom React hooks
│   ├── useAudio.ts         # Audio playback via expo-av
│   ├── useNfc.ts           # NFC scanning lifecycle
│   └── usePronunciation.ts # Record + submit pronunciation
│
├── services/               # External integrations (no React)
│   ├── api/                # Axios-based Tutoria API client
│   │   ├── client.ts       # Axios instance + auth interceptor
│   │   ├── audio.ts        # Audio proxy & IPA resolution
│   │   ├── modules.ts      # Module session management
│   │   ├── profiles.ts     # Learner profiles
│   │   ├── progress.ts     # Progress & streak endpoints
│   │   ├── pronunciation.ts# Pronunciation check endpoint
│   │   ├── syllabus.ts     # Stages / syllabus
│   │   └── index.ts        # Barrel re-exports
│   └── nfc/                # NFC hardware wrapper
│       ├── nfcManager.ts   # react-native-nfc-manager wrapper
│       ├── tagParser.ts    # NDEF "tutoria:moduleId" parser
│       └── index.ts        # Barrel re-exports
│
├── stores/                 # Zustand global state
│   ├── useAuthStore.ts     # isSignedIn, userId, token
│   ├── useProfileStore.ts  # profiles[], activeProfile
│   ├── useLessonStore.ts   # currentSession, currentWord, loading, error
│   ├── useNfcStore.ts      # isScanning, isSupported, lastTag, error
│   └── useProgressStore.ts # activities[], streakDays, loading
│
└── utils/
    ├── types.ts            # All shared TypeScript interfaces
    └── constants.ts        # API URLs, NFC prefix, timeouts, limits
```

> **Rule of thumb:** If it talks to a device API or the network, it belongs in `services/` or `hooks/`. If it's shared state, it belongs in `stores/`. If it renders pixels, it belongs in `components/`.

---

## Routing with Expo Router

Expo Router maps the file system directly to routes. Every `.tsx` file inside `src/app/` becomes a URL segment.

### Layout Files

A `_layout.tsx` file wraps all sibling and child routes. The root layout is minimal:

```tsx
// src/app/_layout.tsx
import { Slot } from 'expo-router';

export default function RootLayout() {
  return <Slot />;
}
```

`<Slot />` renders the currently active child route. To wrap the entire app in a provider (e.g., Clerk), do it here:

```tsx
import { ClerkProvider } from '@clerk/clerk-expo';
import { Slot } from 'expo-router';
import { CLERK_PUBLISHABLE_KEY } from '@/utils/constants';

export default function RootLayout() {
  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
      <Slot />
    </ClerkProvider>
  );
}
```

### Route Groups

Parenthesised folders `(auth)` and `(public)` are **route groups** — they organise screens logically without adding a URL segment.

```
src/app/
├── (auth)/
│   ├── _layout.tsx       → guard: redirect to /sign-in if not signed in
│   ├── home.tsx          → URL: /home
│   └── lesson/[id].tsx   → URL: /lesson/123
└── (public)/
    ├── _layout.tsx       → guard: redirect to /home if already signed in
    └── sign-in.tsx       → URL: /sign-in
```

### Navigation Patterns

```tsx
import { router, useLocalSearchParams } from 'expo-router';

// Imperative navigation
router.push('/lesson/abc123');
router.replace('/home');
router.back();

// Dynamic route params
const { id } = useLocalSearchParams<{ id: string }>();
```

### Deep Linking

Expo Router handles deep links automatically. Configure the scheme in `app.json`:

```json
{
  "expo": {
    "scheme": "tutoria"
  }
}
```

A link `tutoria://lesson/abc123` opens the `src/app/(auth)/lesson/[id].tsx` screen directly.

---

## State Management with Zustand

All global state lives in `src/stores/`. Each store is a single Zustand hook that holds both state and actions.

### Store Structure Pattern

Every store in this project follows the same flat pattern:

```typescript
import { create } from 'zustand';

interface MyState {
  value: string | null;
  isLoading: boolean;
}

interface MyActions {
  setValue: (value: string | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useMyStore = create<MyState & MyActions>((set) => ({
  // Initial state
  value: null,
  isLoading: false,

  // Actions
  setValue: (value) => set({ value }),
  setLoading: (loading) => set({ isLoading: loading }),
}));
```

### Store Reference

| Store | Key State | Key Actions |
|---|---|---|
| `useAuthStore` | `isSignedIn`, `userId`, `token` | `setAuth(userId, token)`, `clearAuth()` |
| `useProfileStore` | `profiles[]`, `activeProfile` | `setProfiles()`, `setActiveProfile()`, `addProfile()` |
| `useLessonStore` | `currentSession`, `currentWord`, `isLoading`, `error` | `setSession()`, `setCurrentWord()`, `reset()` |
| `useNfcStore` | `isScanning`, `isSupported`, `isEnabled`, `lastTag`, `error` | `setScanning()`, `setLastTag()`, `setError()` |
| `useProgressStore` | `activities[]`, `streakDays`, `isLoading` | `setActivities()`, `setStreakDays()` |

### Subscribing from Components

Read only the slices you need to avoid unnecessary re-renders:

```tsx
// ✅ Select only what you need
const isSignedIn = useAuthStore((state) => state.isSignedIn);
const clearAuth = useAuthStore((state) => state.clearAuth);

// ✅ Or destructure the whole store (fine for small stores)
const { currentSession, currentWord, setCurrentWord } = useLessonStore();

// ❌ Avoid subscribing to the entire store object when you only need one field
const store = useAuthStore(); // re-renders on every store change
```

### Store Interactions

Stores are independent; coordinate them in hooks or screen-level components, not inside stores:

```tsx
// In a screen or custom hook — NOT inside a store
const { setAuth } = useAuthStore();
const { setProfiles } = useProfileStore();

async function onSignIn(userId: string, token: string) {
  setAuth(userId, token);
  const profiles = await listProfiles();
  setProfiles(profiles);
}
```

---

## Component Architecture

### Domain Organisation

Components are co-located with the feature they serve:

```
src/components/
├── lesson/      # LessonCard, WordDisplay, ProgressBar, ResultFeedback
├── nfc/         # NfcScanPrompt, NfcStatusBadge, TagReadFeedback
├── progress/    # StreakBadge, ActivityList, ActivityRow
└── ui/          # Button, Card, Screen, LoadingSpinner, ErrorMessage
```

Components in `ui/` have **no domain knowledge** — they accept generic props and can be used anywhere. Domain components (`lesson/`, `nfc/`, `progress/`) may read from stores directly.

### Component Conventions

```tsx
// 1. Type props with an explicit interface
interface WordDisplayProps {
  word: WordData;
  isActive: boolean;
  onPress: () => void;
}

// 2. Default export for route files; named export for components
export function WordDisplay({ word, isActive, onPress }: WordDisplayProps) {
  return (
    <Pressable onPress={onPress} style={[styles.container, isActive && styles.active]}>
      <Text style={styles.text}>{word.display_text}</Text>
    </Pressable>
  );
}

// 3. StyleSheet at the bottom of the file
const styles = StyleSheet.create({
  container: { padding: 16, borderRadius: 12 },
  active:    { backgroundColor: '#E8F4FF' },
  text:      { fontSize: 24, fontWeight: '600' },
});
```

### Reusable UI Primitives (`ui/`)

Build primitives that accept children and style overrides:

```tsx
interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function Card({ children, style }: CardProps) {
  return <View style={[styles.card, style]}>{children}</View>;
}
```

---

## Custom Hooks

### `useAudio` — Audio Playback

Manages an `expo-av` `Sound` instance. Takes an R2 storage path, resolves it to a proxied URL, and plays it.

```typescript
const { play, stop } = useAudio();

// Play audio for the current word
await play(word.audio_path); // e.g. "words/cat.mp3"

// Stop before navigating away
await stop();
```

Internally uses `useRef` to persist the `Sound` instance across renders without triggering re-renders on load/unload.

---

### `useNfc` — NFC Scanning Lifecycle

Initialises `react-native-nfc-manager` on mount, checks support/enabled state, cleans up on unmount. Exposes the full `useNfcStore` state plus a `scan()` function.

```typescript
const { isSupported, isEnabled, isScanning, lastTag, error, scan } = useNfc();

// Trigger a scan (returns the parsed tag or null)
const tag = await scan();
if (tag?.isValid) {
  router.push(`/lesson/${tag.moduleId}`);
}
```

Use this hook in screens that need to read NFC tags. Do **not** call the NFC service functions directly from components.

---

### `usePronunciation` — Record & Check

Two-phase hook: record audio locally, then submit to the Tutoria pronunciation API.

```typescript
const {
  isRecording,
  isChecking,
  result,
  error,
  startRecording,
  stopAndCheck,
} = usePronunciation();

// Phase 1: user presses mic button
await startRecording();  // requests mic permission, starts recording

// Phase 2: user releases mic button
const response = await stopAndCheck(
  word.display_text,   // "cat"
  word.target_ipa      // "kæt"
);

if (response?.overallIsCorrect) {
  // award points, advance to next word
}
```

`result` holds the full `PronunciationCheckResponse` including `similarity`, `ipa_transcription_user`, `feedback`, and `audioIssue` for displaying detailed feedback to the child.

---

## TypeScript Conventions

All shared types live in `src/utils/types.ts`. Never re-define types inline — import from there.

### Key Types

```typescript
// Learner profile
interface Profile {
  id: string;
  name: string;
  user_id: string;
  created_at: string;
}

// Active lesson session
interface SessionData {
  words: string[];
  wordData: WordData[];
  totalWords: number;
  position: number;
  started: boolean;
  completedWords: string[];
  remainingWords: string[];
  moduleName: string;
  failedWords: string[];
}

// A single word in the session
interface WordData {
  id: string;
  display_text: string;
  target_ipa?: string;
  audio_path?: string;
}

// NFC tag after parsing
interface NfcTagPayload {
  tagId: string;
  moduleId: string;
  isValid: boolean;
  rawData?: string;
}

// Full pronunciation API response
interface PronunciationCheckResponse {
  overallIsCorrect: boolean;
  similarity: number;
  ipa_transcription_reference: string;
  ipa_transcription_user: string;
  feedback: string;
  audioIssue?: boolean;
  resultType: string;
  // ...additional debug/azure fields
}
```

### Typing Component Props

Always declare a named `interface` above the component:

```typescript
interface LessonCardProps {
  session: SessionData;
  onComplete: (result: WordCompletionResponse) => void;
  onAbandon: () => void;
}

export function LessonCard({ session, onComplete, onAbandon }: LessonCardProps) { ... }
```

### Typing Store State

```typescript
// State and actions are combined in one interface
interface LessonState {
  currentSession: SessionData | null;
  currentWord: WordData | null;
  isLoading: boolean;
  error: string | null;
  setSession: (session: SessionData | null) => void;
  setCurrentWord: (word: WordData | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}
```

### Typing API Calls

The `apiClient` is a typed Axios instance. Pass the response type as a generic:

```typescript
const response = await apiClient.get<SessionData>(`/modules/${moduleId}/session`);
const session: SessionData = response.data;
```

---

## Animations & Interactions

### react-native-reanimated 4.2.1

Use `useSharedValue` + `useAnimatedStyle` for smooth, JS-thread-independent animations:

```tsx
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

function PulseButton({ onPress }: { onPress: () => void }) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPressIn={() => { scale.value = withSpring(0.95); }}
        onPressOut={() => { scale.value = withSpring(1); }}
        onPress={onPress}
      />
    </Animated.View>
  );
}
```

Use `withTiming`, `withSpring`, and `withSequence` for entrance/exit and feedback animations. Avoid animating with `useState` — it runs on the JS thread and causes jank.

### react-native-gesture-handler ~2.30.0

Wrap the app root in `<GestureHandlerRootView>` (usually in `_layout.tsx`). Use `Gesture.Pan()`, `Gesture.Tap()` etc. for complex gestures:

```tsx
import { GestureDetector, Gesture } from 'react-native-gesture-handler';

const tap = Gesture.Tap().onEnd(() => {
  // runs on UI thread
  scale.value = withSpring(1);
});

return <GestureDetector gesture={tap}><Animated.View style={animatedStyle} /></GestureDetector>;
```

For simple tap targets, `Pressable` (React Native core) is sufficient.

### Haptic Feedback — expo-haptics ~55.0.8

Provide tactile confirmation for key interactions:

```typescript
import * as Haptics from 'expo-haptics';

// Correct pronunciation
await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

// Wrong pronunciation
await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

// Button tap
await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

// NFC tag detected
await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
```

Use haptics sparingly and pair them with visual feedback so the experience doesn't feel overwhelming for children with dyslexia.

---

## Authentication with Clerk

The app uses `@clerk/clerk-expo ^2.19.31`. The `ClerkProvider` must wrap the entire navigation tree in the root layout.

### Root Layout Setup

```tsx
// src/app/_layout.tsx
import { ClerkProvider, ClerkLoaded } from '@clerk/clerk-expo';
import { Slot } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { CLERK_PUBLISHABLE_KEY } from '@/utils/constants';

const tokenCache = {
  async getToken(key: string) { return SecureStore.getItemAsync(key); },
  async saveToken(key: string, value: string) { return SecureStore.setItemAsync(key, value); },
};

export default function RootLayout() {
  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} tokenCache={tokenCache}>
      <ClerkLoaded>
        <Slot />
      </ClerkLoaded>
    </ClerkProvider>
  );
}
```

### Protecting Routes

Use a guard in the `(auth)/_layout.tsx` to redirect unauthenticated users:

```tsx
// src/app/(auth)/_layout.tsx
import { useAuth } from '@clerk/clerk-expo';
import { Redirect, Slot } from 'expo-router';

export default function AuthLayout() {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) return null; // or a splash screen
  if (!isSignedIn) return <Redirect href="/sign-in" />;

  return <Slot />;
}
```

Mirror the pattern in `(public)/_layout.tsx` to redirect already-signed-in users away from the sign-in screen.

### Using Auth State in Components

```tsx
import { useAuth, useUser } from '@clerk/clerk-expo';

function ProfileHeader() {
  const { isSignedIn, getToken } = useAuth();
  const { user } = useUser();

  // Sync Clerk token into Zustand + API client on sign-in
  useEffect(() => {
    if (!isSignedIn) return;
    getToken().then((token) => {
      if (token) {
        setAuthToken(token);          // axios interceptor
        useAuthStore.getState().setAuth(user!.id, token);
      }
    });
  }, [isSignedIn]);
}
```

Never store the raw Clerk JWT in plain `AsyncStorage`. Use `expo-secure-store` (already wired into the `tokenCache` above).

---

## Best Practices

1. **Keep components small and focused.** If a component exceeds ~100 lines or handles more than one responsibility, extract a child component or a custom hook. Screens should mostly compose smaller components.

2. **Extract device logic into hooks.** Audio playback, NFC scanning, microphone recording — all of these have async lifecycle concerns. Keep them in `src/hooks/` so components stay declarative and testable.

3. **Read only the Zustand slices you need.** Pass a selector to avoid unnecessary re-renders:
   ```typescript
   const activeProfile = useProfileStore((s) => s.activeProfile);
   ```

4. **Use `reset()` when leaving a lesson session.** `useLessonStore` has a `reset()` action for this reason. Call it when the user abandons a module or navigates back to home, so stale session data doesn't bleed into a new session.

5. **Never hardcode API URLs or keys.** All values are in `src/utils/constants.ts`, which reads from `EXPO_PUBLIC_*` environment variables. Add new config there.

6. **Type everything — avoid `any`.** The TypeScript types in `src/utils/types.ts` mirror the Tutoria API schema. When the API changes, update types there first and let compiler errors guide you to every affected call site.

7. **Pair animations with haptics for feedback moments.** The target users (children with dyslexia) benefit from multi-sensory feedback. On success/failure, trigger both a visual animation and a haptic notification together.

8. **Guard NFC feature usage with capability checks.** Always check `isSupported` and `isEnabled` from `useNfc()` before showing NFC UI. Not all devices support NFC; show a graceful fallback when it's unavailable.

9. **Avoid logic in `_layout.tsx` files beyond guards.** Layouts are re-mounted on route changes. Heavy computation or data-fetching in a layout can cause unexpected re-runs. Fetch data in screens instead.

---

## Common Pitfalls

1. **Importing from `services/` directly in components.** Service functions are plain async functions with no React lifecycle awareness. They won't handle loading/error state for you. Always call them from a custom hook or a screen handler that updates a store.

2. **Forgetting to call `cleanupNfc()` / `stop()` on unmount.** `useNfc` handles NFC cleanup automatically, but if you ever call `nfcManager` functions outside the hook, you must clean up in a `useEffect` return. Similarly, `useAudio.stop()` should be called when a lesson screen unmounts to avoid audio playing in the background.

3. **Using `router.push` for auth redirects.** Use `<Redirect>` (declarative) inside layout guards rather than `router.push` in `useEffect`. Imperative navigation during render can cause race conditions with Expo Router's internal state.

4. **Assuming NFC tags always have a valid payload.** `parseNdefPayload` sets `isValid: false` when the tag doesn't start with `tutoria:`. Always check `tag.isValid` before using `tag.moduleId` — an invalid/foreign NFC tag should show an error message, not crash.

5. **Conflating Clerk auth state with `useAuthStore`.** Clerk is the source of truth for the session; `useAuthStore` is a local mirror that feeds the Axios client. If they get out of sync (e.g., Clerk token refreshes), re-sync by calling `setAuth` with the new token. Never treat `useAuthStore.isSignedIn` as the primary auth check in route guards — use Clerk's `useAuth()` for that.

6. **Ignoring the `audioIssue` flag in pronunciation results.** When `PronunciationCheckResponse.audioIssue === true`, the recording was too quiet, too short, or had background noise — not necessarily a mispronunciation. Show an appropriate "try again" prompt rather than marking the word as incorrect.

---

## Quick Reference

### Key Files

| File | Purpose |
|---|---|
| `src/app/_layout.tsx` | Root layout — Clerk provider, safe area, gesture handler root |
| `src/app/(auth)/_layout.tsx` | Auth guard — redirect to `/sign-in` if not authenticated |
| `src/app/(public)/_layout.tsx` | Public guard — redirect to `/home` if already signed in |
| `src/utils/types.ts` | All shared TypeScript interfaces (Profile, SessionData, WordData, …) |
| `src/utils/constants.ts` | API base URL, NFC prefix, timeouts, mastery thresholds |
| `src/services/api/client.ts` | Axios instance — call `setAuthToken(token)` after sign-in |
| `src/services/api/index.ts` | Barrel export — import all API functions from here |
| `src/services/nfc/nfcManager.ts` | Low-level NFC: `initNfc()`, `readTag()`, `cleanupNfc()` |
| `src/services/nfc/tagParser.ts` | Parse `"tutoria:moduleId"` NDEF payload |

### Hooks Cheat-Sheet

| Hook | Import | Returns |
|---|---|---|
| `useAudio` | `@/hooks/useAudio` | `{ play(r2Path), stop }` |
| `useNfc` | `@/hooks/useNfc` | `{ isSupported, isEnabled, isScanning, lastTag, error, scan }` |
| `usePronunciation` | `@/hooks/usePronunciation` | `{ isRecording, isChecking, result, error, startRecording, stopAndCheck }` |

### Stores Cheat-Sheet

| Store | Key Read State | Key Write Actions |
|---|---|---|
| `useAuthStore` | `isSignedIn`, `userId`, `token` | `setAuth(userId, token)`, `clearAuth()` |
| `useProfileStore` | `profiles`, `activeProfile` | `setActiveProfile(profile)`, `addProfile(profile)` |
| `useLessonStore` | `currentSession`, `currentWord`, `isLoading`, `error` | `setSession()`, `setCurrentWord()`, `reset()` |
| `useNfcStore` | `isScanning`, `lastTag`, `isSupported` | `setScanning()`, `setLastTag()`, `setError()` |
| `useProgressStore` | `activities`, `streakDays`, `isLoading` | `setActivities()`, `setStreakDays()` |

### Constants Cheat-Sheet

| Constant | Value / Purpose |
|---|---|
| `API_BASE_URL` | `EXPO_PUBLIC_API_URL` or `https://api-dev.tutoria.ac` |
| `CLERK_PUBLISHABLE_KEY` | `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` |
| `NFC_TAG_PREFIX` | `"tutoria:"` — expected NDEF payload prefix |
| `MAX_MODULE_ATTEMPTS` | `3` — max tries before cooldown |
| `COOLDOWN_HOURS` | `12` — hours between retry windows |
| `MASTERY_DAYS_REQUIRED` | `3` — days correct to mark a word mastered |
| `PRONUNCIATION_TIMEOUT_MS` | `20000` — API timeout for pronunciation checks |
| `STAGES_CACHE_TTL` | `3_600_000` — 1-hour cache for syllabus data |

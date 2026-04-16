# Phase 4 — Offline & Resilience: Testing Guide

## What Was Implemented

### 1. Offline Progress Queue (`src/stores/useProgressStore.ts`)
- Zustand persist middleware with AsyncStorage keeps `offlineQueue` across app restarts
- `addToQueue(item)` — pushes failed API payloads to queue with auto-generated ID
- `drainQueue()` — replays queued requests in order; retries up to 5 times, discards on 409 Conflict (server-wins)
- `removeFromQueue(id)` / `clearQueue()` — manual queue management

### 2. Cache Service (`src/services/cache/cacheManager.ts`)
AsyncStorage-backed cache with TTL support:
- `getCache<T>(key)` — returns data if not expired, `null` otherwise
- `setCache<T>(key, data, ttlMs)` — stores data with a TTL
- `clearCache(key)` — removes a single entry
- `getCacheEntry<T>(key)` — returns the raw entry including expired ones (used for stale fallback)

### 3. Audio Cache (`src/services/cache/audioCache.ts`)
expo-file-system audio caching for offline playback:
- `prefetchAudioFiles(r2Paths)` — downloads audio files to `FileSystem.cacheDirectory/audio/`
- `getCachedAudioUri(r2Path)` — returns local URI if cached, `null` otherwise
- `clearAudioCache()` — removes all cached audio files

### 4. Syllabus API (`src/services/api/syllabus.ts`)
- `getStages()` — cache-first: serves valid cache instantly, fetches fresh on miss/expiry, falls back to stale cache on network failure
- `getStagesCacheInfo()` — returns `{ timestamp }` of current cache entry

### 5. Modules API (`src/services/api/modules.ts`)
- `getMissions(profileId)` — cache-first with 1-hour TTL; serves stale on failure
- `startOrResumeModule(moduleId, profileId)` — caches session after success; serves cached on failure
- `getCachedSession(moduleId)` — returns cached `SessionData` or `null`

### 6. Network State (`src/hooks/useNetworkState.ts` + `src/stores/useNetworkStore.ts`)
- NetInfo listener syncs `isOnline`, `isInternetReachable`, `connectionType` to Zustand store
- Called once in root layout; all consumers read from `useNetworkStore`

### 7. Offline Banner (`src/components/ui/OfflineBanner.tsx`)
- Animated slide-down/slide-up amber banner: "You're offline — progress will sync when reconnected"
- Positioned at top with safe area insets

### 8. Queue Drain on Reconnect (`src/app/_layout.tsx`)
- Watches `useNetworkStore.isOnline` for `false→true` transitions
- Calls `useProgressStore.getState().drainQueue()` automatically

### 9. Queue Badge (`src/app/(public)/(tabs)/_layout.tsx`)
- Orange dot on Progress tab icon when `offlineQueue.length > 0`

### 10. Per-Tab Error Boundaries
- Each tab screen (Home, Progress, Syllabus, Profile) wrapped in `<ErrorBoundary>`
- A crash in one tab does not affect others
- `componentDidCatch` logs structured error info to console

### 11. Audio Prefetch & Cache-First Playback
- `useAudio` checks `getCachedAudioUri()` before making network requests
- Lesson screen prefetches audio for first 3 words on module load
- Audio failure shows error icon on play button; does NOT block lesson progress

### 12. Pronunciation Graceful Degradation (`src/hooks/usePronunciation.ts`)
- Tracks `consecutiveFailures` count
- After `MAX_PRONUNCIATION_FAILURES` (2) consecutive upload failures, `canSkipPronunciation` becomes `true`
- Shows amber "Skip pronunciation" banner allowing child to continue without recording
- `resetFailures()` resets the counter on success

### 13. Syllabus Screen (`src/app/(public)/(tabs)/syllabus.tsx`)
- Shows **"Last updated X ago"** below header when serving cached data
- Shows **yellow banner** ("Showing cached data · Last updated X ago") when cache is stale

---

## How to Test Manually

### 1. Offline Queue (airplane mode mid-lesson)
1. Start a lesson with network available.
2. Enable **Airplane Mode** on the device.
3. Complete a word — the `completeWord` API call will fail.
4. Check: an orange dot appears on the **Progress** tab icon.
5. Check: the amber **"You're offline"** banner appears at the top.
6. Complete a few more words — all queue to `offlineQueue`.
7. Disable Airplane Mode.
8. Check: the offline banner dismisses; the queue drains automatically.
9. Check: the orange dot disappears once the queue is empty.

### 2. Cache-first syllabus (normal case)
1. Open the app with network and navigate to **Curriculum** tab.
2. Syllabus loads from API and writes to cache.
3. Kill and reopen the app — syllabus loads instantly from cache.
4. A subtle **"Last updated X ago"** text appears below the subtitle.

### 3. Stale cache banner (offline case)
1. Load the syllabus at least once.
2. Wait for TTL to expire (24h), **or** temporarily set `CURRICULUM_CACHE_TTL` to `5000` (5s) in `src/utils/constants.ts`.
3. Go offline.
4. Navigate to Curriculum tab.
5. Yellow banner: **"Showing cached data · Last updated X ago"** appears.

### 4. No cache + no network (hard failure)
1. Clear AsyncStorage (or uninstall/reinstall the app).
2. Go offline.
3. Navigate to Curriculum — the ErrorBoundary fallback with **Retry** appears.

### 5. Module session caching
1. Start a lesson while online — session is cached.
2. Go offline and tap the same module.
3. `startOrResumeModule()` serves cached session without error.

### 6. Audio prefetch & cache-first playback
1. Start a lesson online — observe audio files prefetch (console logs show download progress).
2. Go offline.
3. Tap audio play buttons — previously cached audio plays from local file.
4. Uncached audio shows error icon on button; lesson still progresses.

### 7. Pronunciation graceful degradation
1. Start a lesson and attempt pronunciation recording.
2. Go offline (or simulate network failure).
3. Record pronunciation — upload fails, retry button shown.
4. Fail pronunciation 2 times consecutively.
5. Check: amber banner appears: "Having trouble with pronunciation? You can skip for now."
6. Tap **Skip pronunciation** — lesson advances without recording.

### 8. Per-tab error boundary isolation
1. In development, temporarily add `throw new Error('test')` in one tab screen's render.
2. Navigate to that tab — ErrorBoundary shows "Something went wrong" with a retry button.
3. Navigate to other tabs — they function normally.

### 9. Network state banner
1. Enable Airplane Mode — amber offline banner slides down within ~2 seconds.
2. Disable Airplane Mode — banner slides up and dismisses.

---

## Key Constants
| Constant | Value | File |
|---|---|---|
| `CURRICULUM_CACHE_TTL` | 24 hours | `src/utils/constants.ts` |
| `OFFLINE_QUEUE_STORAGE_KEY` | `'tutoria:offline-queue'` | `src/utils/constants.ts` |
| `PROGRESS_STORE_STORAGE_KEY` | `'tutoria:progress-store'` | `src/utils/constants.ts` |
| `AUDIO_CACHE_DIR` | `'audio/'` | `src/utils/constants.ts` |
| `MAX_PREFETCH_WORDS` | 3 | `src/utils/constants.ts` |
| `MAX_PRONUNCIATION_FAILURES` | 2 | `src/utils/constants.ts` |

Temporarily lower `CURRICULUM_CACHE_TTL` for faster manual testing of stale/expiry flows.

## New Dependencies
| Package | Purpose |
|---|---|
| `@react-native-community/netinfo` | Network connectivity detection |
| `@react-native-async-storage/async-storage` | Persistent storage for Zustand persist + cache |

`expo-file-system` was already included with Expo SDK 55.

## Files Created
- `src/services/cache/cacheManager.ts`
- `src/services/cache/audioCache.ts`
- `src/services/cache/index.ts`
- `src/stores/useNetworkStore.ts`
- `src/hooks/useNetworkState.ts`
- `src/components/ui/OfflineBanner.tsx`

## Files Modified
- `src/utils/types.ts` — `OfflineQueueItem`, `CacheEntry<T>`, `NetworkState`
- `src/utils/constants.ts` — Cache/offline constants
- `src/stores/useProgressStore.ts` — Zustand persist + offline queue
- `src/services/api/syllabus.ts` — Cache-first `getStages()`
- `src/services/api/modules.ts` — Cache-first `getMissions()`, `startOrResumeModule()`
- `src/hooks/useAudio.ts` — Cache-first playback
- `src/hooks/usePronunciation.ts` — Consecutive failure tracking + skip option
- `src/app/(public)/lesson/[moduleId].tsx` — Audio prefetch, error icons, skip UI, offline queue
- `src/app/(public)/(tabs)/syllabus.tsx` — Stale cache notice
- `src/app/(public)/(tabs)/home.tsx` — Per-tab ErrorBoundary
- `src/app/(public)/(tabs)/progress.tsx` — Per-tab ErrorBoundary
- `src/app/(public)/(tabs)/profile.tsx` — Per-tab ErrorBoundary
- `src/app/(public)/(tabs)/_layout.tsx` — Queue badge on Progress tab
- `src/app/_layout.tsx` — Network state + offline banner + queue drain
- `src/components/ui/ErrorBoundary.tsx` — Enhanced logging

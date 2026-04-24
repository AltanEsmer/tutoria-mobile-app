# Audio + Pronunciation API Integration — Handoff

Pattern-replication report for engineers on a separate Expo project who need to wire word-audio playback (HEAR) and pronunciation evaluation (SPEAK) against the Tutoria API. No Tutoria-specific context is assumed. Every code claim cites `file:line` in this repo — read those sources as the authoritative reference.

---

## 1. Overview

Two independent pipelines share an API base and auth header, but run on different player primitives from `expo-audio`:

- **HEAR** — user taps a word card → client resolves an audio URL for the target IPA → plays it back once. Implemented via `useAudioPlayer` in `src/hooks/useWordAudio.ts:17-175`. Module-level preload on screen mount in `src/screens/PracticeScreen.tsx:110-143`.
- **SPEAK** — user holds a card → mic records WAV → base64 body posted to `/v1/pronunciation/check` → server returns a verdict with IPA transcription and error type. Implemented via `useAudioRecorder` in `src/hooks/useAudioRecording.ts:74-93` and `src/services/pronunciationEval.ts:52-135`.

---

## 2. Dependencies

From `package.json`:

- `expo`: `~55.0.8`
- `expo-audio`: `~55.0.9`
- `react-native`: `0.83.2`
- `expo-file-system` (for `File(uri).base64()` — RN's fetch polyfill can't reliably read `file://` URIs on iOS; see `src/services/pronunciationEval.ts:46-50`)

All audio functionality uses the unified `expo-audio` API (SDK 55) — no `expo-av`.

---

## 3. Auth posture

Client hits `https://api-dev.tutoria.ac` with:

- `Authorization: Bearer <DEV_BEARER_TOKEN>` — hardcoded in `app/_layout.tsx:33`. **Dev env only; prod uses Clerk-issued tokens post-beta.**
- `X-Device-Id: <profileId>` on pronunciation eval requests (`src/services/pronunciationEval.ts:88`). Matches server rate-limit key order: **profileId → deviceId → userId, 60/min**.
- `Content-Type: application/json`.
- Mutations additionally carry `X-Idempotency-Key` header + the same `idempotencyKey` in the JSON body (`src/services/api.ts:243-262`).

The API service is a singleton injected via React context (`app/_layout.tsx:36`, `src/services/api.ts:143-150`). 10s per-request timeout on reads (`src/services/api.ts:164-188`); React Query owns higher-level retry (§ 8).

---

## 4. HEAR pipeline

### 4.1 URL resolution

Single endpoint resolves an IPA string to one or more public audio URLs:

- `GET /v1/audio/sounds-resolve?ipa=<IPA>` → `SoundsResolveResponse` (`src/services/api.ts:121-133, 308-312`)
- Fallback stream proxy: `GET /v1/audio/proxy?path=<path>` via `api.getAudioProxy(path)` (`src/services/api.ts:304-306`)

Response shape priority: `publicUrls[]` (compound mode) → `publicUrl` (single) → `path` (proxy). URL construction in `src/hooks/useWordAudio.ts:121-129` normalizes both absolute and relative forms through `getAudioProxy`.

### 4.2 `useWordAudio` hook API

```ts
// src/hooks/useWordAudio.ts:17
function useWordAudio(): {
  playWord: (ipa: string | undefined) => Promise<void>;
  state: 'idle' | 'loading' | 'playing' | 'error';
}
```

Load-bearing implementation details:

- **Single `useAudioPlayer` instance primed with a real warmer asset** (`src/hooks/useWordAudio.ts:13, 20`). Constructing with `null` and then calling `replace(uri)` on a fresh player throws `Exception in HostFunction: <unknown>` — the JSI binding isn't materialized until the player has a source. The warmer is never played; every tap calls `replace()` first.
- **`replace(uri)` per tap, then `play()`** — no player pool, no url cache. See `src/hooks/useWordAudio.ts:153-161`. A one-shot 100ms retry handles the first network-URI replace after warmer init.
- **State driven by `playbackStatusUpdate` listener** (`src/hooks/useWordAudio.ts:44-80`). No `setInterval`, no polling, no `useAudioPlayerStatus` (causes per-tick re-renders).
- **Play gate opens BEFORE `replace()`** (`src/hooks/useWordAudio.ts:138-151`). Preloaded sources can transition straight to `isLoaded=true` with no intervening `isLoaded=false` event; the listener gate must already be open. A 250ms fallback timer calls `play()` directly if the event never fires.
- **Loading reveal at 150ms grace; error transition at 2000ms** (`src/hooks/useWordAudio.ts:92-102`). Sub-150ms plays stay visually idle to avoid a loading flash.

### 4.3 Preload strategy

`src/screens/PracticeScreen.tsx:110-143`:

1. On mount, batch-resolve every word's IPA via `Promise.all(api.resolveSounds(ipa))`.
2. For each resolved URL, call `preload({ uri })` from `expo-audio`.
3. On unmount, call `clearAllPreloadedSources()`. Cleanup is critical — lingering preloaded sources can bleed into the next module.

Preload failures are swallowed (non-fatal; playback will buffer on demand). Resolution failures drop that word silently.

---

## 5. SPEAK pipeline

### 5.1 Endpoint + request shape

`POST /v1/pronunciation/check` (`src/services/pronunciationEval.ts:83-100`).

Headers:

```
Content-Type: application/json
Authorization: Bearer <DEV_BEARER_TOKEN>
X-Device-Id: <profileId>     // when profileId present
```

Body:

```json
{
  "audio": "<base64-wav>",
  "displayText": "cat",
  "targetIPA": "kæt",
  "profileId": "prof_...",
  "language": "english",
  "audioFormat": "wav",
  "unitType": "word",
  "validation": { "confused": [...], "feedback": {...} }
}
```

`validation.confused[]` routes the server to a Gemini Two-Sided judge. Without it, the server falls back to Azure-only force-align, which tends to pass gibberish (`src/services/pronunciationEval.ts:58-63, 98`).

### 5.2 Response shape

```ts
// src/services/pronunciationEval.ts:29-43
type EvalVerdict = {
  correct: boolean;                 // server: overallIsCorrect === true
  similarity?: number;
  errorType?: string;               // infra error, e.g. 'http-500', 'timeout', 'no-auth'
  highlightedSegment?: { phoneme: string; correct: boolean }[];
  userIPA?: string;
  targetIPA?: string;
  audioIssue?: { reason: 'NO_SPEECH' | 'UNINTELLIGIBLE' | 'SYSTEM_ERROR'; errorCode?: string };
  _debug?: EvalDebug;
};
```

Client never throws — on any failure path (network, non-2xx, shape mismatch) it returns `{ correct: false, errorType: '...' }` so the UI re-prompts instead of marking gibberish correct (`src/services/pronunciationEval.ts:1-6, 104-111`).

### 5.3 `useAudioRecording` hook API

```ts
// src/hooks/useAudioRecording.ts:46, 302
function useAudioRecording(): {
  startRecording: () => Promise<boolean>;        // false if permission denied
  stopRecording: () => Promise<string | undefined>;
  isRecording: boolean;
  calibrated: boolean;
  metering: number;                              // smoothed 0..1 for UI bars
  countdownActive: boolean;                      // silence timer running
  earlySpeechDetected: boolean;                  // spoke during warmup
  peakDetected: boolean;                         // <-- speech-presence gate
  recordingUri: string | null;
}
```

**Recorder config** (`src/hooks/useAudioRecording.ts:74-93`): 16kHz mono WAV with `IOSOutputFormat.LINEARPCM` on iOS. Without an explicit `outputFormat`, `AVAudioRecorder` defaults to MPEG4-AAC and writes AAC bytes into a `.wav`-named file — the server's WAV decoder then hands AAC bytes to Azure Speech as PCM and fails. The Android branch uses `mpeg4` container + `aac` encoder; server accepts `wav` or `mp3` only, so the Android path needs its own server-side handling if you port it.

**Silence / speech thresholds** (`src/hooks/useAudioRecording.ts:5-23`): calibrated noise floor with a 60s module-level cache, transient rejection (`TRANSIENT_DECAY = 0.4`), `MIN_SPEECH_PEAK = 0.40`, `MIN_SPEECH_FRAMES = 5`, `SILENCE_MS = 2000`. `MAX_DURATION_MS = 5000` hard cap.

### 5.4 `peakDetected` gate

Before POSTing, the caller checks `peakDetected`. If false, skip the network call and show a silence prompt (`src/components/decks/PracticeCardStack/PracticeCardStack.tsx:673-680`):

```ts
if (!peakDetected) {
  setSilenceVisible?.(true);
  resetCard();
  return;
}
```

This is the single defense against submitting near-silent clips as wrong answers.

### 5.5 `EVAL_TIMEOUT_MS = 22000`

Defined once in `src/components/decks/PracticeCardStack/PracticeCardStack.tsx:26`. Server budget is 20s (Azure + Gemini worst case); client adds 2s slack. Implemented as `Promise.race` against the eval fetch (`src/components/decks/PracticeCardStack/PracticeCardStack.tsx:713-719`). On timeout the verdict resolves as `{ correct: false, errorType: 'timeout' }` and the UI falls into the error branch.

### 5.6 Error branching (MUST check errorType first)

`src/components/decks/PracticeCardStack/PracticeCardStack.tsx:722-732`:

```ts
if (verdict.errorType) {
  onEvalError?.(mapErrorTypeToMessage(verdict.errorType));
  // collapse animations back to idle — NO shake, NO wrong-answer UX
  updatePhase(CardPhase.IDLE);
  return;
}
if (verdict.correct) { ... } else { ... shake ... }
```

Infrastructure failures (timeout, `http-5xx`, `no-auth`) must render as a banner, never as the wrong-answer shake. Checking `verdict.correct` first would misattribute a timeout as a failed attempt. `audioIssue` (distinct from `errorType` — e.g. `NO_SPEECH` / `UNINTELLIGIBLE`) is attached to the wrong-answer branch as inline feedback via `setFeedbackAudioIssue` (`src/components/decks/PracticeCardStack/PracticeCardStack.tsx:758`).

---

## 6. Audio mode rules

- **ONE** boot-time call in `app/_layout.tsx:147-153`:
  ```ts
  setAudioModeAsync({
    playsInSilentMode: true,
    interruptionMode: 'duckOthers',
    shouldPlayInBackground: false,
  });
  ```
- **TWO** additional calls in `src/hooks/useAudioRecording.ts:120` (after recorder stops: `{ allowsRecording: false, playsInSilentMode: true }`) and `src/hooks/useAudioRecording.ts:280` (before recording: `{ allowsRecording: true, playsInSilentMode: true }`). Both are load-bearing for iOS speaker routing — removing them breaks output after recording.
- **NEVER** add `allowsRecording: true` to the boot call. The boot call is for playback-only posture; recording toggles it locally around the capture.
- **NEVER** call `setAudioModeAsync` anywhere else in the app. All other playback surfaces inherit the boot posture.

---

## 7. Jony Law — when NOT to play

Audio plays **ONLY** on explicit user tap of a word card while NOT in speaking mode.

NEVER auto-play on:

- wrong-answer feedback (wrong UX is purely visual — shake + "Try again." label)
- eval completion (neither success nor failure triggers playback)
- card swipe / card entry
- any background / lifecycle event

Violating this is a taste-level regression. The correct-answer tone (`src/screens/PracticeScreen.tsx:91, 149-150`) is a short confirmation sound separate from word audio playback.

---

## 8. Error handling & idempotency

- **All write mutations carry `idempotencyKey`**: both as `X-Idempotency-Key` header and inside the JSON body (`src/services/api.ts:243-262, 282-301`).
- **`onMutate` generates the key once per mutation invocation** and stamps `clientTimestamp` (`src/data/mutations/useSubmitWord.ts:29-33`, `src/data/mutations/useSaveProgress.ts:26-30`). The same key survives retries so the server dedupes.
- **Retry ownership is split**: the raw `request()` method is single-shot with a 10s abort (`src/services/api.ts:164-188`); React Query retries on top. Read-side default `retry: 2` (`src/data/queryClient.ts:33`). Write-side default `retry: 0` — an offline queue flips it to `Infinity` when appropriate (`src/data/queryClient.ts:37-39`).
- **Error surfacing is centralized** via `QueryCache` + `MutationCache` `onError` callbacks pushing into an error banner bus (`src/data/queryClient.ts:41-60`). No toast spam — a single banner per error.

---

## 9. Grep gates (copy into your CI or pre-commit)

Adapted from `docs/audio-architecture.md`, secret-redacted:

```bash
# No legacy audio primitives
grep -rn 'useAudioPlayback'      src/ app/     # = 0
grep -rn 'isPlayingRef\|urlCache' src/         # = 0

# Exactly one boot-time audio mode call in _layout
grep -n  'setAudioModeAsync'     app/_layout.tsx     # = 1 call

# Exactly two setAudioModeAsync calls in src/ (both inside useAudioRecording)
grep -rn 'setAudioModeAsync'     src/                # = 2 calls, both src/hooks/useAudioRecording.ts

# No polling in the HEAR hook
grep -rn 'setInterval'           src/hooks/useWordAudio.ts   # = 0

# Exactly one eval timeout constant
grep -n  'EVAL_TIMEOUT_MS\s*=\s*22000' src/          # = 1

# Secret is NOT hardcoded in your copy of the doc or in anything you commit
! grep -rn '<DEV_BEARER_TOKEN literal>' docs/ src/ app/
```

Adjust paths for your repo layout. The hard invariants — one boot `setAudioModeAsync`, two recorder calls, `errorType` branch before `correct`, `peakDetected` gate before POST — should survive any refactor.

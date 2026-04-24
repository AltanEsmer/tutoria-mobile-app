# Expo Audio Playback + Mic Permissions — Handoff

Companion to [`docs/handoff/audio-api-integration.md`](./audio-api-integration.md). Where the sibling doc covers the API contract (endpoints, auth, verdict shape), this one covers the CLIENT-SIDE `expo-audio` wiring: player config, recorder lifecycle, mic permission flow, iOS/Android quirks, and teardown.

Every claim cites `file:line` in this repo. Adapt paths for your layout.

---

## 1. Overview

`expo-audio` (SDK 55 unified package, superseding `expo-av`) provides two primitives we use:

- **`useAudioPlayer`** — foreground playback of word audio (HEAR). Single instance per screen, `replace(uri)` per tap. Wired in `src/hooks/useWordAudio.ts:17-175`.
- **`useAudioRecorder` + `useAudioRecorderState`** — hold-to-record WAV capture with metering (SPEAK). Wired in `src/hooks/useAudioRecording.ts:74-95`.

The split matters because the two primitives require different audio-session modes on iOS, and a single global "playback+record" mode dulls playback output after recording. We keep the boot session playback-only and flip `allowsRecording` locally around the capture window (§4 + §8).

---

## 2. Dependencies

From `package.json`:

- `expo`: `~55.0.8`
- `expo-audio`: `~55.0.9`
- `expo-file-system`: used for base64 reads in the sibling doc (`src/services/pronunciationEval.ts:7`). Not needed for playback/recording per se.
- `react-native`: `0.83.2`

No `expo-av` — remove it if your project has it alongside `expo-audio`; the two packages register conflicting audio sessions.

---

## 3. app.json / Info.plist config

`app.json`:

```json
"plugins": [
  ["expo-audio", {
    "microphonePermission": "Tutoria needs your microphone to hear you practice reading words aloud."
  }]
],
"ios": {
  "infoPlist": {
    "NSMicrophoneUsageDescription": "Tutoria needs your microphone to hear you practice reading words aloud."
  }
}
```

Notes:

- The `expo-audio` plugin's `microphonePermission` string is what prebuild writes into `NSMicrophoneUsageDescription`. We also set `ios.infoPlist.NSMicrophoneUsageDescription` explicitly so the string shows up even if the plugin step is skipped in a partial build.
- Android permissions: we do NOT enumerate `android.permissions` in `app.json`. Expo's `expo-audio` plugin adds `android.permission.RECORD_AUDIO` automatically via the prebuild step. If you lock down `android.permissions` explicitly, include `RECORD_AUDIO` manually.
- No background-audio mode. `UIBackgroundModes: audio` is intentionally absent — audio stops when the app backgrounds (matches `shouldPlayInBackground: false`, §4).

---

## 4. Boot-time audio mode

`app/_layout.tsx:147-153`:

```ts
useEffect(() => {
  setAudioModeAsync({
    playsInSilentMode: true,
    interruptionMode: 'duckOthers',
    shouldPlayInBackground: false,
  }).catch(() => {});
}, []);
```

Why each option:

- **`playsInSilentMode: true`** — without this, iOS honors the hardware mute switch and the app is silent for any user with ringer off. Kids' devices are almost always muted; this is the #1 "audio not working" bug.
- **`interruptionMode: 'duckOthers'`** — if Spotify / Podcasts is playing when the app starts, duck their volume rather than stop them. Recording later briefly overrides this locally (§8).
- **`shouldPlayInBackground: false`** — lock-screen / app-switcher should pause us. We are not a media app.

`allowsRecording` is **deliberately absent** here. A boot mode of `allowsRecording: true` puts the iOS session in `PlayAndRecord`, which routes output to the earpiece (not the speaker) after any recording event. See `docs/audio-architecture.md:26-28` — "NEVER add `allowsRecording: true` to the boot call." Recording toggles it locally.

---

## 5. Playback pattern (`useWordAudio`)

One `useAudioPlayer` instance per hook, `replace(uri)` per tap, state from a single listener.

`src/hooks/useWordAudio.ts:20`:

```ts
const player = useAudioPlayer(warmerSource);
```

The warmer is a real asset (`src/hooks/useWordAudio.ts:13`: `require('../assets/audio/correct.mp3')`). Constructing with `null` and then calling `replace(uri)` throws `Exception in HostFunction: <unknown>` because the JSI binding isn't materialized until a source exists. The warmer is never heard — every tap calls `replace()` first.

`src/hooks/useWordAudio.ts:44-80` — state driven by a single listener:

```ts
const subscription = player.addListener('playbackStatusUpdate', (status) => {
  if (status.isLoaded && readyForPlayRef.current && /* ... */) {
    readyForPlayRef.current = false;
    player.play();
  }
  if (status.playing) { clearTimers(); setState('playing'); }
  else if (status.didJustFinish) { clearTimers(); setState('idle'); }
});
```

No `setInterval`, no polling, no `useAudioPlayerStatus`. `useAudioPlayerStatus` drives a re-render on every status tick and is a re-render storm trap — avoid it (§10).

Timing constants (`src/hooks/useWordAudio.ts:92-102`):

- **150ms loading grace** before `state` flips to `'loading'`. Sub-150ms plays stay visually idle so short cached clips don't flash a spinner.
- **2000ms error transition** — if the player hasn't emitted `playing` or `didJustFinish` within 2s of `replace()`, assume the clip is broken and surface `state = 'error'`.

The gate flag `readyForPlayRef` opens BEFORE `replace()` (`src/hooks/useWordAudio.ts:138-151`) because preloaded sources can skip `isLoaded=false` entirely and emit `isLoaded=true` synchronously — the listener must be ready when that lands. A 250ms fallback timer calls `play()` directly if the event never fires.

---

## 6. Preload strategy (`PracticeScreen`)

`src/screens/PracticeScreen.tsx:110-143` preloads every word's audio on screen mount and clears on unmount:

```ts
useEffect(() => {
  if (practiceLoading || !practiceData.words.length || preloadedRef.current) return;
  preloadedRef.current = true;
  (async () => {
    const results = await Promise.all(ipas.map((ipa) => api.resolveSounds(ipa).catch(() => null)));
    for (const res of results) { /* ... */ preload({ uri: url }).catch(() => {}); }
  })();
  return () => { clearAllPreloadedSources().catch(() => {}); };
}, [practiceLoading, practiceData.words, token]);
```

Why this matters:

- **iPad / spotty networks** — without preload the first tap takes 300–800ms to cold-fetch the clip. Kids tap the word expecting instant feedback; a sub-100ms latency is the threshold for "it's broken."
- **Cleanup on unmount is non-negotiable** — lingering preloaded sources can bleed into the next module's preload batch and push us past the native cache ceiling, after which preload failures become silent.
- Preload failures are swallowed (`src/screens/PracticeScreen.tsx:134-136`). The player falls back to on-demand buffering.

---

## 7. Mic permission flow

Permission request happens at the moment of first recording — lazily, not on mount — in `src/hooks/useAudioRecording.ts:277-278`:

```ts
const { granted } = await requestRecordingPermissionsAsync();
if (!granted) return false;
```

`startRecording` returns `false` on denial. The caller in `src/components/decks/PracticeCardStack/PracticeCardStack.tsx:857-864`:

```ts
const granted = await startRecording();
if (!granted) {
  haptics.error();
  resetCard();
  if (onMicDenied) onMicDenied();
  return;
}
```

Denied → caller sets `micDenied` state in `src/screens/PracticeScreen.tsx:97` and renders `<MicDeniedCard />` in place of the card stack (`src/screens/PracticeScreen.tsx:213-217`). The MicDeniedCard is the fallback UX — it explains why the app needs mic and points at system settings (`src/components/failure/MicDeniedCard/MicDeniedCard.tsx`).

iOS vs Android:

- **iOS** — the system dialog appears on the first `requestRecordingPermissionsAsync()` call after install. If the user denies, subsequent calls return `{ granted: false }` instantly with no system prompt. Recovery requires Settings → app → Microphone.
- **Android** — same API surface; the native prompt behaves similarly. No `shouldShowRequestPermissionRationale` handling in our code; we rely on the MicDeniedCard copy to explain.

We do **not** pre-request on mount. Asking at the first hold ties the permission prompt to a user gesture, which Apple recommends and which produces a materially higher grant rate than a boot-time cold prompt.

---

## 8. Recording lifecycle (`useAudioRecording`)

Recorder creation (`src/hooks/useAudioRecording.ts:74-93`):

```ts
const recorder = useAudioRecorder({
  isMeteringEnabled: true,
  extension: '.wav',
  sampleRate: 16000,
  numberOfChannels: 1,
  bitRate: 128000,
  android: { outputFormat: 'mpeg4', audioEncoder: 'aac' },
  ios: {
    outputFormat: IOSOutputFormat.LINEARPCM,
    audioQuality: AudioQuality.HIGH,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: { mimeType: 'audio/webm', bitsPerSecond: 128000 },
});
const recorderState = useAudioRecorderState(recorder, METERING_INTERVAL_MS);
```

`METERING_INTERVAL_MS = 80` (`src/hooks/useAudioRecording.ts:6`) — balances metering granularity against JS thread cost.

Start (`src/hooks/useAudioRecording.ts:268-296`):

```ts
await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });   // line 280
await recorder.prepareToRecordAsync();
recorder.record();
```

Stop (`src/hooks/useAudioRecording.ts:115-134`):

```ts
try { await recorder.stop(); } catch { /* already stopped */ }
try { await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }); } catch { /* non-fatal */ }  // line 120
const uri = recorder.uri;
setRecordingUri(uri);
```

**The two `setAudioModeAsync` calls at `src/hooks/useAudioRecording.ts:280` and `src/hooks/useAudioRecording.ts:120` are load-bearing for iOS speaker routing** (per `docs/audio-architecture.md:26-28`, commit `5e2cd27`). Removing either flips output to the earpiece after the first recording — playback still emits audio, it's just inaudible unless the phone is held to the ear. Do not "simplify" by hoisting these into the boot call.

### `peakDetected` meter tap

Silence is detected client-side in the metering effect (`src/hooks/useAudioRecording.ts:136-266`). The loop:

1. Normalizes raw dB metering to `[0,1]` (`src/hooks/useAudioRecording.ts:33-37`).
2. Builds a noise floor from the first 800ms of warmup, clamped `[0.10, 0.35]`. A module-level cache survives remounts (`src/hooks/useAudioRecording.ts:25-27`).
3. Detects speech: level > threshold for `MIN_SPEECH_FRAMES = 5` consecutive frames.
4. Sets `peakDetected = true` once `peakRef` crosses `MIN_SPEECH_PEAK = 0.40` (`src/hooks/useAudioRecording.ts:231-234`).
5. Stops when 2000ms of silence follows speech (`SILENCE_MS`) OR `MAX_DURATION_MS = 5000` hard cap trips the max-timer (`src/hooks/useAudioRecording.ts:294`).

Callers gate the POST on `peakDetected` — see sibling doc §5.4.

WAV config caveat: the iOS `outputFormat: IOSOutputFormat.LINEARPCM` declaration is required. Without it `AVAudioRecorder` defaults to MPEG4-AAC and writes AAC bytes into a `.wav`-named file; our server (WAV-only) then hands AAC to Azure Speech as PCM and fails. See `src/hooks/useAudioRecording.ts:80-83` for the inline comment.

---

## 9. iOS gotchas

- **Silent-mode switch** — `playsInSilentMode: true` is the single most important flag. Default iOS behavior honors the ringer switch for "ambient" playback; without this flag, users with mute on hear nothing and assume the app is broken.
- **Speaker vs earpiece after recording** — `PlayAndRecord` session routes output to the earpiece. The stop-side `setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true })` at `src/hooks/useAudioRecording.ts:120` restores `Playback` mode which routes to the speaker. If you remove that call, playback after the first SPEAK attempt is near-silent.
- **Bluetooth routing** — we do nothing custom. `expo-audio` 55 routes to any connected A2DP sink by default. We haven't explicitly tested bluetooth mic capture; iOS generally refuses to capture over A2DP and falls back to built-in mic.
- **Audio-session interruptions** — `interruptionMode: 'duckOthers'` handles incoming-call ducking. We don't listen for interruption events; the session auto-resumes after.
- **Background audio** — `shouldPlayInBackground: false` means lock-screen or app-switcher pauses us. No `UIBackgroundModes: audio` in `app.json` (§3).

---

## 10. Teardown

- **Player cleanup** — the `useEffect` in `src/hooks/useWordAudio.ts:44-80` returns `() => subscription.remove()`. Timer cleanup via `clearTimers()` in `src/hooks/useWordAudio.ts:29-42` and the effect at `src/hooks/useWordAudio.ts:82`. The `useAudioPlayer` hook itself handles native player disposal.
- **Preload cleanup** — `clearAllPreloadedSources()` in `src/screens/PracticeScreen.tsx:140-142` runs on unmount. Without this, a child navigating module → module accumulates preloaded sources until hitting the native cache limit (≈200 sources on iOS), after which new preloads silently fail.
- **Recorder cleanup** — `stopRecordingInternal()` in `src/hooks/useAudioRecording.ts:115-134` is called on: VAD silence, max-timer trip, or explicit stop. The max-timer itself is cleared on unmount (`src/hooks/useAudioRecording.ts:300`).
- **Why we avoid `useAudioPlayerStatus`** — it subscribes to status events and returns a fresh object reference on every tick, causing the consuming component to re-render at the metering rate. For a stack of cards that's a frame-rate killer. Listen to `playbackStatusUpdate` imperatively and call `setState` only on meaningful transitions.

---

## 11. Grep gates

From `docs/audio-architecture.md` (adapted):

```bash
# Exactly one boot-time audio mode call
grep -n 'setAudioModeAsync' app/_layout.tsx                   # = 1

# Exactly two setAudioModeAsync calls in src/, both in useAudioRecording
grep -rn 'setAudioModeAsync' src/                              # = 2

# No polling in the HEAR hook
grep -rn 'setInterval' src/hooks/useWordAudio.ts               # = 0

# Avoid per-tick re-render trap
grep -rn 'useAudioPlayerStatus' src/ app/                      # = 0

# Permission string present and non-empty
grep -q 'NSMicrophoneUsageDescription' app.json                # present
grep -q 'microphonePermission' app.json                        # present

# No allowsRecording: true in the boot call
grep -A5 'setAudioModeAsync' app/_layout.tsx | grep -q 'allowsRecording'   # empty
```

Pair these with the sibling doc's grep block ([`audio-api-integration.md §9`](./audio-api-integration.md)) for full HEAR + SPEAK coverage.

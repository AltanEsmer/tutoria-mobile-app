---
name: pronunciation-perf
description: Investigate or reduce latency on the child-voice pronunciation flow. Use when recordings feel slow to score.
---

## Known latency hot spots

All of the following live in `src/hooks/usePronunciation.ts` and `src/services/api/pronunciation.ts` unless noted otherwise.

### 1. Base64 read of the WAV file

`FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 })` (from `expo-file-system/legacy`) runs synchronously on the JS thread. For a 3-5 second child utterance the WAV is typically 100-400 KB; base64 encoding adds ~33% and the synchronous read blocks the React Native bridge for the entire duration.

Mitigation to consider: switch to a multipart `FormData` upload using the file URI directly (via `fetch` or an `axios` form-data POST), which avoids reading the file into JS memory at all. This requires a backend endpoint change as well.

### 2. 100 ms post-stop flush wait

Immediately after `recorder.stop()`, the hook waits `100ms` (`await new Promise(r => setTimeout(r, 100))`) to allow the OS to flush the WAV file to disk. This wait is always incurred even on fast devices.

If the file size check (`FileSystem.getInfoAsync`) consistently shows the file as complete, this delay can be tuned down or replaced with a retry-with-backoff on the size check.

### 3. 20-second axios timeout

`checkPronunciation` in `src/services/api/pronunciation.ts` passes `timeout: PRONUNCIATION_TIMEOUT_MS` to axios. `PRONUNCIATION_TIMEOUT_MS` is `20_000` ms (defined in `src/utils/constants.ts`). This does not cause latency on its own, but it means a slow or stalled request will not surface an error to the user for up to 20 seconds. Consider lowering to 10 seconds and showing a "Still working..." message at 5 seconds.

### 4. Synchronous metering effect

The `useEffect` that processes `recorderState.metering` runs on every metering tick (every `80ms`). It performs array pushes, floating-point math, and multiple ref reads synchronously on the JS thread. While individually cheap, these accumulate during long recordings. This is low priority but worth noting if jank is observed during recording.

### 5. No HTTP keep-alive on `apiClient`

The axios instance in `src/services/api/client.ts` is created with default settings — no `httpAgent`/`httpsAgent` and no `keepAlive: true`. Each pronunciation request opens a fresh TCP+TLS connection to the API, adding 100-300 ms of handshake overhead per request on a mobile network.

Mitigation: pass a custom `https.Agent({ keepAlive: true })` when creating the axios instance. Note this requires React Native's networking layer to support it; test on device before shipping.

### 6. No UI progress states between recording stop and result

From the user's perspective, the UI goes silent between `recorder.stop()` and the final score. The hook exposes `isChecking` but there is no "Analyzing your voice..." state shown between stop and the API response. Children interpret this silence as a broken app and tap again, sometimes triggering double submissions.

## How to investigate: measure first

Before changing any code, add timing logs to `stopAndCheck` in `src/hooks/usePronunciation.ts`:

```ts
const t0 = Date.now();
await recorder.stop();
console.log('[Perf] recorder.stop() ms:', Date.now() - t0);

const t1 = Date.now();
await new Promise<void>((r) => setTimeout(r, 100));
console.log('[Perf] flush wait ms:', Date.now() - t1);

const t2 = Date.now();
const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
console.log('[Perf] readAsStringAsync ms:', Date.now() - t2, 'base64 length:', base64.length);

const t3 = Date.now();
const checkResult = await checkPronunciation(request);
console.log('[Perf] checkPronunciation ms:', Date.now() - t3);
console.log('[Perf] total stopAndCheck ms:', Date.now() - t0);
```

Share the four logged durations before proposing any change. Identify which single step accounts for more than half the total time and address only that step first. Do not change multiple hot spots simultaneously — it makes regressions impossible to attribute.

## Recommended next steps (in order)

1. Add the timing logs above, reproduce on a real device, and read the console output.
2. If `readAsStringAsync` dominates: prototype the multipart upload path on a branch.
3. If `checkPronunciation` dominates: check network conditions and backend response times via the API dashboard; consider a "Analyzing..." spinner at 2 seconds.
4. Add a "Listening / Analyzing" state transition in the UI immediately after `recorder.stop()` completes — this is a low-effort win that reduces perceived latency regardless of actual timing.
5. Do not prefetch word audio or make any other network requests during the recording window (`isRecording === true`); contention on the radio increases the post-stop network latency.

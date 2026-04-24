# Audio Pipeline — Wiring & Manual Test Guide

This doc is the single source of truth for how Tutoria plays word audio (HEAR) and evaluates pronunciation (SPEAK), reflecting the rewrite based on `docs/audio-api-integration.md` and `docs/expo-audio-permissions.md`.

## Architecture (post-fix)

```
Boot                  Lesson load                    User taps Play           User holds Record
────                  ───────────                    ────────────────         ──────────────────
_layout.tsx           startOrResumeModule            useAudio.play(url)       usePronunciation
  └─ setAudioModeAsync   ├─ normalizeWordData            └─ replace(uri)          ├─ start: setAudioModeAsync({allowsRecording:true})
     ({playsInSilent,     │   (camel→snake +                ├─ http: direct          ├─ record (LINEARPCM .wav)
       duckOthers})       │    extracts validation)         └─ proxy: download+      ├─ meter → peakDetected gate
                          └─ resolveSessionAudioPaths           cache (auth)         ├─ stop: setAudioModeAsync({allowsRecording:false})
                              priority: publicUrls[0]                                ├─ if !peak → silence msg, no POST, no failure++
                              → publicUrl                                            └─ POST /pronunciation/check
                              → proxy(path)                                              {audio, displayText, targetIPA,
                              → proxy(audioPath legacy)                                   audioFormat:'wav', validation,
                                                                                          profileId}  + X-Device-Id header
```

## Invariants (do not regress)

1. **One** boot `setAudioModeAsync` in `src/app/_layout.tsx`. Never set `allowsRecording: true` here (routes audio to earpiece on iOS).
2. **Two** `setAudioModeAsync` calls inside `src/hooks/usePronunciation.ts` (start = recording on, stop = recording off). Total in `src/` = **3**.
3. **No** `setAudioModeAsync` anywhere else.
4. **No** `useAudioPlayerStatus` (re-render storm).
5. `useAudio` uses **one** `useAudioPlayer(warmerSource)` and `replace(uri)` per tap — never `createAudioPlayer` per tap.
6. Recorder MUST set `ios.outputFormat: IOSOutputFormat.LINEARPCM`. Without it, `.wav` files contain AAC bytes and Azure scores 0%.
7. Pronunciation request MUST send `audioFormat: 'wav'` + `validation` block (when present on the word) + `profileId`. The `validation` block routes the server to the Gemini judge instead of Azure-only force-align.
8. Lesson screen MUST check `result.errorType` BEFORE `result.overallIsCorrect` — infrastructure errors (timeout, http-5xx) are NOT wrong attempts.
9. Silence-gate (`peakDetected === false`) MUST NOT increment `consecutiveFailures` and MUST NOT POST.

## Grep gates (run before every PR)

```bash
grep -rn 'setAudioModeAsync' src/          # = 3 (1 in _layout.tsx, 2 in usePronunciation.ts)
grep -n  'allowsRecording'   src/app/_layout.tsx   # = 0
grep -rn 'useAudioPlayerStatus' src/       # = 0 (comment references OK)
grep -n  'setInterval'       src/hooks/useAudio.ts   # = 0
grep -n  'createAudioPlayer' src/hooks/useAudio.ts   # = 0
grep -q  'NSMicrophoneUsageDescription' app.json
grep -q  'microphonePermission'         app.json
```

## Manual test plan

### HEAR (Play button)

1. `npm run ios` (simulator OR device). NFC scan a card OR open any lesson.
2. Wait for the word screen to render.
3. **Tap Play.** Expect: word audio plays once within ~500ms.
4. **Flip the iPhone ring/silent switch to silent. Tap Play again.** Expect: audio still plays (silent-mode override).
5. **Tap Play 5× in rapid succession.** Expect: each tap restarts playback cleanly (no overlapping audio, no JSI errors in Metro).
6. **Background the app, return, tap Play.** Expect: still works.
7. Open Metro logs — should see no `[Audio] error` lines.

### SPEAK (Hold-to-Record)

1. **Hold the record button** while clearly saying the displayed word.
2. **Release.** Expect within ~3s: feedback panel appears with similarity score `> 0` (typically 60–95% for clear pronunciation).
3. **Hold the button without speaking** (silence test). Release. Expect: error banner "We couldn't hear you — try holding the button while speaking clearly". Attempt counter does NOT increment.
4. **Hold and tap-release within 200ms.** Expect: silence message, no POST, no attempt counted.
5. **Hold + speak gibberish.** Expect: feedback shows low similarity OR `audioIssue: UNINTELLIGIBLE` — either is correct, both render as a wrong attempt.
6. **Disable network mid-record + release.** Expect: error banner (timeout/network), attempt NOT counted as wrong.
7. Check Metro logs for `[Pronunciation] checkResult: ...` — `similarity` field should be > 0 for honest attempts.

### Mic permission

1. Fresh install (delete app first). Open lesson, hold record. Expect: iOS system mic prompt appears once.
2. Deny it. Expect: friendly error, button state recovers.
3. Re-enable in iOS Settings → Tutoria → Microphone. Hold record. Expect: works without re-prompt.

## Known limitations

- **Bypass token:** All auth uses a static dev token (`tutoria-integration-test-2026`). Phase 4 swaps to Clerk JWT.
- **Android recorder:** Configured but currently produces `mpeg4/aac` files. The server accepts `wav` or `mp3`; Android recordings will still hit a 400 until the server gains m4a support OR we transcode client-side. iOS works.
- **Warmer asset:** `assets/audio/silence-100ms.mp3` is a 383-byte silent file required to materialise the JSI player binding. Do not delete.

## Where to look when something breaks

| Symptom | Look at |
|---|---|
| Play button disabled | `resolveSessionAudioPaths` in `src/services/api/modules.ts` — is the URL priority returning anything? |
| Tap Play, no sound, no error | `_layout.tsx` boot `setAudioModeAsync` exists? `playsInSilentMode: true`? |
| Tap Play, audio plays from earpiece (very quiet) | Stray `allowsRecording: true` somewhere — grep gate it. |
| Hold record returns 0% always | Recorder config in `usePronunciation.ts` — is `ios.outputFormat: IOSOutputFormat.LINEARPCM` set? |
| Hold record returns 0% sometimes | Word's `validation` block missing — check `normalizeWordData`. |
| Silence counted as failure | `peakDetected` gate in `usePronunciation.ts` — make sure the `if (!peakDetectedRef.current)` early-return is BEFORE `setConsecutiveFailures`. |
| Wrong-shake on a network timeout | Lesson screen — `errorType` must be checked BEFORE `overallIsCorrect`. |

## Reference

- `docs/audio-api-integration.md` — supervisor handoff (API contract)
- `docs/expo-audio-permissions.md` — supervisor handoff (expo-audio wiring)
- `docs/ERROR.md` — the 5 entries appended during this rewrite document each root cause

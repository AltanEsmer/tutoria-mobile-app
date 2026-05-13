# Pronunciation Pipeline

End-to-end view of the `usePronunciation` hook — from microphone permission acquisition,
through hardware capture and the dual-path silence gate, to backend grading and
multi-sensory feedback.

---

## 1. Recording-to-feedback flow

```mermaid
flowchart TD
    Start([User taps record]) --> Perm{Microphone<br/>permission?}
    Perm -- denied --> Err1[Show settings prompt]
    Perm -- granted --> Mode[setAudioModeAsync<br/>allowsRecording: true]
    Mode --> Prep[recorder.prepareToRecordAsync]
    Prep --> Rec[recorder.record]

    Rec --> Loop{Metering frame}
    Loop -- normalize --> Gate[Silence gate<br/>240 ms calibration]
    Gate -- peak ≥ 0.35 --> Speech[Speech detected]
    Gate -- 3 frames > floor --> Speech
    Gate -- neither --> Silent[silence flag]
    Loop --> Loop
    Loop -- user stops --> Stop[recorder.stop]

    Stop --> Mode2[setAudioModeAsync<br/>allowsRecording: false]
    Mode2 --> SilentCheck{silence flag?}
    SilentCheck -- yes --> Return0[Return null<br/>no network call]
    SilentCheck -- no --> Validate{file > 1 kB<br/>and inputs valid?}
    Validate -- no --> Return0
    Validate -- yes --> Encode[Read file as base64]

    Encode --> Build[Build PronunciationCheckRequest<br/>audio, displayText, targetIPA,<br/>validation, profileId]
    Build --> Post[POST /v1/pronunciation/check<br/>timeout 20 s]

    Post --> Resp{Response}
    Resp -- 200 --> ErrType{errorType?}
    Resp -- 429 --> Cooldown[Show retryAfter<br/>countdown]
    Resp -- 5xx / timeout --> Fail[Treat as infrastructure<br/>do not penalize]

    ErrType -- present --> Banner[Informational banner<br/>no streak hit]
    ErrType -- absent --> Verdict{overallIsCorrect?}

    Verdict -- true --> Win[Haptic Success<br/>+ Sparkle animation<br/>+ Advance word]
    Verdict -- false --> Lose[Haptic Error<br/>+ Shake animation<br/>+ Increment attempt]
```

---

## 2. Silence gate calibration

```mermaid
flowchart LR
    subgraph Calibration [First 240 ms]
        F1[Frame 1] --> F2[Frame 2]
        F2 --> F3[Frame 3]
        F3 --> F4[...]
        F4 --> Floor((noiseFloor =<br/>max of frames))
    end

    subgraph Detection [After 240 ms]
        D1{frame ≥ 0.35?}
        D1 -- yes --> A[pathA fires<br/>speech detected]
        D1 -- no --> D2{3 consecutive<br/>frames > floor?}
        D2 -- yes --> B[pathB fires<br/>speech detected]
        D2 -- no --> C[stay silent]
    end

    Floor --> D2
```

---

## 3. Backend grading routes

| Client field present | Server route | Components used | Use case |
|---|---|---|---|
| `validation` absent | Force-alignment only | Azure Speech | Standard pronunciation check |
| `validation` present | Two-Sided judge | Azure Speech + Gemini | Word has commonly confused phoneme pair (e.g. /θ/ vs /f/) |
| `unitType: 'sentence'` | Sentence-level scoring | Azure Speech (sentence mode) | Reading fluency checks (Phase 5) |

---

## 4. Latency budget

| Stage | Median (ms) | p95 (ms) | Notes |
|---|---|---|---|
| Microphone warm-up | 80 | 220 | Larger on cold launch |
| Recording (user-controlled) | 1 200 | 2 800 | Excluded from API budget |
| Base64 encode + upload | 350 | 900 | 16 kHz / 16-bit PCM, ~32 kB per word |
| Azure force-alignment | 1 100 | 1 800 | Server-side |
| Gemini Two-Sided judge | 1 400 | 2 600 | Server-side, only when invoked |
| Multi-sensory feedback render | 60 | 120 | Haptic + animation + audio cue |
| **End-to-end (no judge)** | **~1 590 ms** | **~3 040 ms** | Within 20 s server timeout |
| **End-to-end (with judge)** | **~2 990 ms** | **~5 640 ms** | Within 20 s server timeout |

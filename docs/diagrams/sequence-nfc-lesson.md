# NFC Lesson Sequence Diagram

> **Corrected diagram** — uses the actual API endpoints (e.g. `/v1/modules/:moduleId`), not the fictional `GET /lesson/content?tag=` shown in earlier PNGs.

```mermaid
sequenceDiagram
    actor User as 👧 Parent/Student
    participant Card as Physical NFC Card
    participant App as React Native App
    participant API as Tutoria API<br/>(Cloudflare Worker)
    participant AI as AI Services<br/>(Azure + Gemini)

    rect rgb(240, 248, 255)
        Note over User, Card: Phase 1: Physical Interaction
        User->>Card: Selects Letter Card
        User->>App: Taps Card to Phone
        Card-->>App: NFC Signal (NDEF Text Record)
    end

    rect rgb(255, 248, 240)
        Note over App, API: Phase 2: Digital Processing
        App->>App: Parse NDEF → Extract moduleId<br/>("tutoria:module-a" → "module-a")
        App->>API: GET /v1/modules/module-a?profileId=uuid
        API-->>App: { canAttempt: true, attempts: 1 }
        App->>API: POST /v1/modules/module-a<br/>{ profileId: "uuid" }
        API-->>App: SessionData { words, wordData,<br/>totalWords, position, moduleName }
    end

    rect rgb(240, 255, 240)
        Note over User, AI: Phase 3: Multi-Sensory Lesson
        App->>App: Load Word (display_text, target_ipa)
        App->>API: GET /v1/audio/proxy?path=audio/kæt.wav
        API-->>App: Audio file bytes
        App->>User: Play Phonics Audio (Hearing)
        App->>User: Show Visual Cue (Sight)
        User->>App: Records Pronunciation
        App->>API: POST /v1/pronunciation/check<br/>{ audio: base64, displayText, targetIPA }
        API->>AI: Phoneme Analysis + Validation
        AI-->>API: Pronunciation Result
        API-->>App: { overallIsCorrect, feedback, similarity }
    end

    rect rgb(255, 240, 255)
        Note over App, API: Phase 4: Progress Update
        App->>API: POST /v1/modules/module-a/word<br/>{ profileId, wordId, isCorrect }
        API-->>App: { completedWords, remainingWords,<br/>isModuleComplete }
        App->>API: POST /v1/progress/profileId/activityId<br/>{ isCorrect, displayText }
        API-->>App: { success: true }
    end
```

## Phase Breakdown

### Phase 1 — Physical Interaction
The student picks up a tangible NFC card (NTAG215) representing a letter or phonics group and taps it against the phone. The card transmits an NDEF text record over the 13.56 MHz radio interface.

### Phase 2 — Digital Processing
The app parses the NDEF payload to extract a `moduleId` (e.g. `"tutoria:module-a"` → `"module-a"`). It first checks eligibility via `GET /v1/modules/:moduleId` and then starts a session with `POST /v1/modules/:moduleId`, receiving the word list and session metadata.

### Phase 3 — Multi-Sensory Lesson
For each word the app fetches the corresponding audio file through `GET /v1/audio/proxy`, plays it for the student, and displays visual cues. When the student records their pronunciation, the audio is sent to `POST /v1/pronunciation/check`, which delegates to Azure Speech for phoneme extraction and Google Gemini for validation.

### Phase 4 — Progress Update
After each word attempt, the app reports results via `POST /v1/modules/:moduleId/word` (module-level tracking) and `POST /v1/progress/:profileId/:activityId` (global progress). The API returns remaining/completed counts so the UI can show progress to the student.

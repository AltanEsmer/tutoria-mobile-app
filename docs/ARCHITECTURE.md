# Tutoria — System & Mobile App Architecture

> Architecture reference for the Tutoria mobile app — a React Native (Expo) application that uses physical NFC cards to deliver phonics lessons to children with dyslexia.

---

## 1. System Overview

Tutoria follows a **"phygital"** model: **physical** NFC cards combined with a **digital** mobile experience. A child taps a physical NTAG215 card on their device, and the app launches the corresponding phonics lesson — bridging tactile interaction with structured digital learning.

### Three-Tier Architecture

| Layer | Technology | Responsibility |
|-------|-----------|----------------|
| **Physical Layer** | NTAG215 NFC cards | Store NDEF payloads (`tutoria:<moduleId>`) that identify curriculum modules |
| **Mobile App** | React Native / Expo (TypeScript) | NFC scanning, audio playback, pronunciation recording, UI, local state |
| **Cloud API** | Cloudflare Worker / Hono | Authentication, curriculum delivery, pronunciation AI, progress persistence |

```mermaid
C4Context
    title Tutoria System Context

    Person(child, "Child Learner", "Taps NFC cards and completes phonics lessons")
    Person(parent, "Parent / Tutor", "Manages profiles and monitors progress")

    System_Boundary(physical, "Physical Layer") {
        System_Ext(nfc_card, "NTAG215 NFC Card", "NDEF payload: tutoria:<moduleId>")
    }

    System_Boundary(mobile, "Mobile App Layer") {
        System(app, "Tutoria Mobile App", "React Native / Expo\nNFC scanning, audio, pronunciation recording, UI")
    }

    System_Boundary(cloud, "Cloud API Layer") {
        System(api, "Tutoria API", "Cloudflare Worker / Hono\nAuth, curriculum, AI pronunciation, progress")
        SystemDb(d1, "D1 (SQLite)", "Users, profiles, progress")
        SystemDb(r2, "R2 Object Storage", "Curriculum JSON, audio .wav files")
        SystemDb(kv, "KV Cache", "Session cache, rate limits")
    }

    System_Boundary(external, "External Services") {
        System_Ext(clerk, "Clerk", "Authentication & user management")
        System_Ext(azure, "Azure Speech", "Phoneme-level analysis")
        System_Ext(gemini, "Google Gemini", "Pronunciation validation (primary)")
        System_Ext(mistral, "Mistral", "Pronunciation validation (fallback)")
    }

    Rel(child, nfc_card, "Taps card on device")
    Rel(nfc_card, app, "NDEF payload read")
    Rel(child, app, "Interacts with lessons")
    Rel(parent, app, "Manages profiles")
    Rel(app, api, "HTTPS (Bearer JWT)")
    Rel(api, d1, "SQL queries")
    Rel(api, r2, "Object read")
    Rel(api, kv, "Cache read/write")
    Rel(api, clerk, "JWT verification, webhooks")
    Rel(api, azure, "Phoneme analysis")
    Rel(api, gemini, "Pronunciation scoring")
    Rel(api, mistral, "Fallback scoring")
```

---

## 2. Backend Architecture

The Tutoria API is a **Cloudflare Worker** built with the [Hono](https://hono.dev) framework. The mobile app communicates with it exclusively over HTTPS — it never accesses backend storage directly.

### Storage

| Service | Purpose | Examples |
|---------|---------|----------|
| **D1 (SQLite)** | Relational data | `users`, `profiles`, `activities`, `progress`, `module_progress`, `pronunciation_metrics` |
| **R2** | Static assets | Curriculum JSON (`/branch/stages/...`), audio files (IPA-keyed `.wav`) |
| **KV** | Caching & ephemeral data | Curriculum stage cache (1 h TTL), rate-limit counters |

### External Services

| Service | Role |
|---------|------|
| **Clerk** | JWT-based authentication; webhooks sync user records to D1 |
| **Azure Speech** | Phoneme-level pronunciation analysis of recorded audio |
| **Google Gemini** | Primary AI model for pronunciation validation / scoring |
| **Mistral** | Fallback AI model when Gemini is unavailable |

### Key API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check (no auth) |
| `GET` | `/v1/profiles/list` | List user profiles |
| `POST` | `/v1/profiles/create` | Create a new learner profile |
| `POST` | `/v1/profiles/select` | Validate profile ownership |
| `GET` | `/v1/syllabus/stages` | Curriculum stages (cached 1 h) |
| `GET` | `/v1/modules/missions` | 3 prioritized mission cards |
| `GET / POST` | `/v1/modules/:moduleId` | Get status / start or resume module |
| `POST` | `/v1/modules/:moduleId/word` | Mark a word complete in a session |
| `DELETE` | `/v1/modules/:moduleId` | Abandon module (no attempt increment) |
| `POST` | `/v1/modules/status/batch` | Batch fetch module statuses |
| `GET / POST` | `/v1/progress/:profileId[/:activityId]` | Get progress / save pronunciation attempt |
| `POST` | `/v1/pronunciation/check` | Validate pronunciation (5 req/60 s, 20 s timeout) |
| `GET` | `/v1/audio/proxy?path=<r2-path>` | Proxy R2 audio with 1 h cache |
| `GET` | `/v1/audio/sounds-resolve?ipa=<ipa>` | Resolve IPA string to audio file path |
| `POST` | `/v1/webhooks/clerk` | Clerk webhook receiver (Svix HMAC) |

> **Important:** The mobile app does **not** directly access D1, R2, or KV. All data flows through the API's REST endpoints.

---

## 3. Mobile App Architecture

### Technology Stack

- **Framework:** React Native + Expo 55 (managed workflow)
- **Language:** TypeScript
- **Navigation:** Expo Router (file-based routing under `src/app/`)
- **State management:** Zustand 5
- **HTTP client:** Axios
- **Auth:** @clerk/clerk-expo
- **NFC:** react-native-nfc-manager
- **Audio:** expo-av (playback & recording)

### Project Structure

```
src/
├── app/                    # Expo Router screens & layouts
│   └── _layout.tsx         # Root layout (Slot)
├── components/             # Reusable UI components
├── hooks/                  # Custom React hooks
│   ├── useAudio.ts         # Audio playback via R2 proxy
│   ├── useNfc.ts           # NFC scanning lifecycle
│   └── usePronunciation.ts # Record + check pronunciation
├── services/
│   ├── api/                # Axios client modules per API domain
│   │   ├── client.ts       # Axios instance + Bearer interceptor
│   │   ├── audio.ts        # Audio proxy URL, IPA resolution
│   │   ├── modules.ts      # Missions, sessions, word completion
│   │   ├── profiles.ts     # Profile CRUD
│   │   ├── progress.ts     # Activity progress & streaks
│   │   ├── pronunciation.ts# Pronunciation check
│   │   ├── syllabus.ts     # Curriculum stages
│   │   └── index.ts        # Barrel export
│   └── nfc/                # NFC hardware abstraction
│       ├── nfcManager.ts   # init / readTag / cleanup
│       ├── tagParser.ts    # Parse NDEF → { moduleId }
│       └── index.ts        # Barrel export
├── stores/                 # Zustand state stores
│   ├── useAuthStore.ts     # isSignedIn, userId, token
│   ├── useProfileStore.ts  # profiles[], activeProfile
│   ├── useLessonStore.ts   # currentSession, currentWord
│   ├── useNfcStore.ts      # isScanning, lastTag, isSupported
│   └── useProgressStore.ts # activities[], streakDays
└── utils/
    ├── types.ts            # Shared TypeScript interfaces
    └── constants.ts        # API URLs, NFC prefix, rate limits
```

### Component Diagram

```mermaid
graph TB
    subgraph UI["UI Layer (Expo Router)"]
        Screens["Screens & Layouts<br/><small>src/app/</small>"]
        Components["Reusable Components<br/><small>src/components/</small>"]
    end

    subgraph Hooks["Custom Hooks Layer"]
        useNfc["useNfc"]
        useAudio["useAudio"]
        usePronunciation["usePronunciation"]
    end

    subgraph State["State Layer (Zustand)"]
        AuthStore["useAuthStore"]
        ProfileStore["useProfileStore"]
        LessonStore["useLessonStore"]
        NfcStore["useNfcStore"]
        ProgressStore["useProgressStore"]
    end

    subgraph Services["Service Layer"]
        subgraph API["API Services<br/><small>src/services/api/</small>"]
            AxiosClient["client.ts<br/><small>Axios + Auth Interceptor</small>"]
            ProfilesAPI["profiles.ts"]
            ModulesAPI["modules.ts"]
            ProgressAPI["progress.ts"]
            PronunciationAPI["pronunciation.ts"]
            AudioAPI["audio.ts"]
            SyllabusAPI["syllabus.ts"]
        end
        subgraph NFC["NFC Services<br/><small>src/services/nfc/</small>"]
            NfcManager["nfcManager.ts"]
            TagParser["tagParser.ts"]
        end
    end

    subgraph External["External"]
        TutoriaAPI["Tutoria Cloud API"]
        NFCHardware["NFC Hardware"]
    end

    Screens --> Components
    Screens --> Hooks
    Screens --> State

    useNfc --> NfcStore
    useNfc --> NfcManager
    useNfc --> TagParser
    useAudio --> AudioAPI
    usePronunciation --> PronunciationAPI

    ProfilesAPI --> AxiosClient
    ModulesAPI --> AxiosClient
    ProgressAPI --> AxiosClient
    PronunciationAPI --> AxiosClient
    AudioAPI --> AxiosClient
    SyllabusAPI --> AxiosClient

    AxiosClient --> TutoriaAPI
    NfcManager --> NFCHardware
```

---

## 4. Authentication Flow

Authentication is handled by **Clerk** via the `@clerk/clerk-expo` SDK.

### Key Concepts

- **Clerk** manages signup, login, session tokens, and user lifecycle.
- The `@clerk/clerk-expo` package provides React hooks (`useAuth`, `useUser`, `useSignIn`, `useSignUp`) for session management.
- A **Clerk JWT** is attached to every API request through an **Axios request interceptor** in `src/services/api/client.ts`.
- `useAuthStore` (Zustand) mirrors the Clerk session state (`isSignedIn`, `userId`, `token`) for use across the app.
- **Clerk webhooks** keep the backend D1 `users` table in sync — when a user signs up or updates their account in Clerk, a webhook event (verified with Svix HMAC) writes the data to D1.

### Sequence Diagram

```mermaid
sequenceDiagram
    actor User
    participant App as Tutoria App
    participant ClerkSDK as @clerk/clerk-expo
    participant AuthStore as useAuthStore
    participant AxiosClient as Axios Interceptor
    participant API as Tutoria API
    participant Clerk as Clerk Service
    participant D1 as D1 Database

    User->>App: Open app
    App->>ClerkSDK: Initialize ClerkProvider
    ClerkSDK->>Clerk: Check existing session

    alt New user
        User->>App: Sign up
        App->>ClerkSDK: useSignUp().create()
        ClerkSDK->>Clerk: Create user
        Clerk-->>ClerkSDK: Session + JWT
        Clerk->>API: Webhook (user.created, Svix HMAC)
        API->>D1: INSERT INTO users
    else Returning user
        User->>App: Sign in
        App->>ClerkSDK: useSignIn().create()
        ClerkSDK->>Clerk: Authenticate
        Clerk-->>ClerkSDK: Session + JWT
    end

    ClerkSDK-->>App: Session active
    App->>AuthStore: setAuth(userId, token)

    Note over AxiosClient: All subsequent API calls
    App->>AxiosClient: API request
    AxiosClient->>AxiosClient: Attach Authorization: Bearer <token>
    AxiosClient->>API: HTTPS request with JWT
    API->>Clerk: Verify JWT
    Clerk-->>API: Valid
    API-->>App: Response
```

---

## 5. NFC Integration Architecture

NFC functionality is provided by **react-native-nfc-manager**, which wraps platform-specific NFC APIs (Android NFC adapter / iOS CoreNFC).

### Scanning Lifecycle

1. **Initialize** — `NfcManager.start()` on app mount
2. **Request technology** — `NfcManager.requestTechnology(NfcTech.Ndef)`
3. **Read tag** — `NfcManager.getTag()` returns raw NDEF messages
4. **Parse payload** — `parseNdefPayload()` extracts the `moduleId` from the `tutoria:<moduleId>` text record
5. **Cancel** — `NfcManager.cancelTechnologyRequest()` releases the NFC session

### Tag Payload Format

Each NTAG215 card carries a single NDEF Text record:

```
tutoria:<moduleId>
```

Example: `tutoria:phonics-stage1-module3` → the app navigates to module `phonics-stage1-module3`.

### Platform Differences

| Capability | Android | iOS |
|-----------|---------|-----|
| Background scanning | ✅ Supported via Intent filters | ❌ Not supported |
| Foreground scanning | ✅ Automatic | ✅ Requires user action (CoreNFC prompt) |
| NFC availability check | `NfcManager.isEnabled()` | `NfcManager.isSupported()` |
| Dev config | `AndroidManifest.xml` permissions | Entitlements + `Info.plist` |

### Sequence Diagram

```mermaid
sequenceDiagram
    actor Child
    participant Card as NFC Card (NTAG215)
    participant Device as Device NFC Hardware
    participant NfcMgr as nfcManager.ts
    participant Parser as tagParser.ts
    participant Store as useNfcStore
    participant Hook as useNfc Hook
    participant App as App Screen

    App->>Hook: Mount → useNfc()
    Hook->>NfcMgr: initNfc()
    NfcMgr->>Device: NfcManager.start()
    Device-->>NfcMgr: Ready
    NfcMgr->>Device: NfcManager.isEnabled()
    Device-->>NfcMgr: true
    Hook->>Store: setSupported(true), setEnabled(true)

    Child->>App: Tap "Scan Card"
    App->>Hook: scan()
    Hook->>Store: setScanning(true)
    Hook->>NfcMgr: readTag()
    NfcMgr->>Device: requestTechnology(Ndef)
    Device-->>NfcMgr: Technology granted

    Child->>Card: Holds card to device
    Card->>Device: NDEF payload transmitted
    Device-->>NfcMgr: getTag() → raw NDEF data

    NfcMgr->>Parser: parseNdefPayload(ndefMessage)
    Parser-->>NfcMgr: { moduleId: "phonics-stage1-module3" }

    NfcMgr->>Device: cancelTechnologyRequest()
    NfcMgr-->>Hook: NfcTagPayload

    Hook->>Store: setLastTag(payload), setScanning(false)
    Store-->>App: Re-render with moduleId
    App->>App: Navigate to lesson
```

---

## 6. Lesson & Module Flow

### Lifecycle

1. An NFC scan (or mission card tap) produces a `moduleId`.
2. `POST /v1/modules/:moduleId` starts a new session or resumes an existing one.
3. The session contains an ordered word list, each with pronunciation targets (IPA, audio paths).
4. For each word the child: sees the word → hears the audio → records their pronunciation → receives AI feedback → progress is saved.
5. The module is complete when all words are finished.
6. **Attempt limits:** maximum **3 attempts** per module, with a **12-hour cooldown** between failed attempts.

### Flowchart

```mermaid
flowchart TD
    Start([NFC Scan / Mission Tap]) --> GetModule[Extract moduleId]
    GetModule --> CheckStatus{GET /v1/modules/:moduleId<br/>Check status}

    CheckStatus -->|locked / cooldown| Blocked[Show locked message<br/>with cooldown timer]
    CheckStatus -->|completed| Done[Show completion badge]
    CheckStatus -->|available / in_progress| StartSession[POST /v1/modules/:moduleId<br/>Start or resume session]

    StartSession --> LoadWords[Receive ordered word list<br/>with IPA targets]
    LoadWords --> NextWord{More words<br/>remaining?}

    NextWord -->|No| ModuleComplete[Module Complete<br/>Save final progress]
    ModuleComplete --> Done

    NextWord -->|Yes| DisplayWord[Display current word]
    DisplayWord --> PlayAudio[Play audio pronunciation<br/>via expo-av]
    PlayAudio --> RecordAttempt[Child records pronunciation<br/>expo-av Recording API]
    RecordAttempt --> AICheck[POST /v1/pronunciation/check<br/>Base64 audio → AI analysis]

    AICheck --> CheckResult{Pronunciation<br/>acceptable?}

    CheckResult -->|Yes| SaveProgress[POST /v1/modules/:moduleId/word<br/>Mark word complete]
    SaveProgress --> NextWord

    CheckResult -->|No| Feedback[Show feedback<br/>& encourage retry]
    Feedback --> PlayAudio

    Blocked --> End([End])
    Done --> End
```

---

## 7. Audio Pipeline

### Asset Storage

Audio files are stored in **R2** as IPA-keyed `.wav` files organized by curriculum branch:

```
/branch/
  └── audio/
      ├── æ.wav
      ├── b.wav
      ├── k.wav
      └── ...
```

### Endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /v1/audio/proxy?path=<r2-path>` | Proxies an R2 audio file to the client with a 1-hour cache header |
| `GET /v1/audio/sounds-resolve?ipa=<ipa>` | Resolves an IPA string (e.g. `kæt`) into individual sound file paths |

### Playback Flow

1. The `useAudio` hook calls `getAudioProxyUrl(r2Path)` to build the proxy URL.
2. `expo-av` `Audio.Sound` loads and plays the URL.
3. The response is cached by the proxy endpoint (1-hour TTL).

### Pronunciation Recording Flow

1. `usePronunciation` hook starts an `expo-av` recording session.
2. On stop, the audio file is read and **base64-encoded**.
3. The encoded audio is sent via `POST /v1/pronunciation/check` with the display text and target IPA.
4. The API forwards the audio to **Azure Speech** for phoneme analysis, then to **Google Gemini** (or **Mistral** fallback) for scoring.
5. The result (score, feedback, per-phoneme breakdown) is returned to the app.

---

## 8. Data Flow

The diagram below traces data from an NFC card scan through to a persisted progress update.

```mermaid
flowchart LR
    subgraph Physical
        Card[NFC Card<br/>NDEF: tutoria:mod-1]
    end

    subgraph Device["Mobile Device"]
        NFC[NFC Hardware]
        Parser[tagParser.ts<br/>→ moduleId]
        NfcStore[(useNfcStore<br/>lastTag)]
        LessonStore[(useLessonStore<br/>currentSession)]
        ProgressStore[(useProgressStore)]
        AudioHook[useAudio<br/>expo-av playback]
        PronHook[usePronunciation<br/>expo-av recording]
        APIClient[Axios Client<br/>+ JWT header]
    end

    subgraph Cloud["Tutoria API (Cloudflare Worker)"]
        Router[Hono Router]
        Auth[Clerk JWT<br/>Verification]
        ModuleLogic[Module Service]
        PronLogic[Pronunciation Service]
        AudioProxy[Audio Proxy]
        D1[(D1 SQLite)]
        R2[(R2 Storage)]
        KV[(KV Cache)]
    end

    subgraph AI["AI Services"]
        Azure[Azure Speech]
        Gemini[Google Gemini]
    end

    Card -- NDEF read --> NFC
    NFC -- raw NDEF --> Parser
    Parser -- moduleId --> NfcStore

    NfcStore -- moduleId --> APIClient
    APIClient -- "POST /modules/:id" --> Router
    Router --> Auth
    Auth --> ModuleLogic
    ModuleLogic --> D1
    D1 -- session + words --> ModuleLogic
    ModuleLogic -- session --> APIClient
    APIClient -- session --> LessonStore

    LessonStore -- r2 audio path --> AudioHook
    AudioHook -- "GET /audio/proxy" --> AudioProxy
    AudioProxy --> R2
    R2 -- .wav --> AudioProxy
    AudioProxy -- audio stream --> AudioHook

    PronHook -- "POST /pronunciation/check<br/>base64 audio" --> Router
    Router --> PronLogic
    PronLogic --> Azure
    Azure -- phonemes --> PronLogic
    PronLogic --> Gemini
    Gemini -- score + feedback --> PronLogic
    PronLogic -- result --> APIClient
    APIClient -- result --> PronHook

    APIClient -- "POST /progress/:profileId/:activityId" --> Router
    Router --> ModuleLogic
    ModuleLogic --> D1
    D1 -- saved --> ModuleLogic
    ModuleLogic --> APIClient
    APIClient -- confirmation --> ProgressStore
```

---

## 9. Offline Strategy

Tutoria is designed to degrade gracefully when the device loses connectivity.

| Capability | Online | Offline |
|-----------|--------|---------|
| **NFC scanning** | ✅ | ✅ Tag parsing is entirely local |
| **Curriculum browsing** | Fetched from API | Served from local cache |
| **Audio playback** | Streamed via proxy | Played from local cache (if previously loaded) |
| **Pronunciation check** | Real-time AI scoring | ❌ Requires network (queued for later) |
| **Progress saving** | Immediate sync to D1 | Queued locally, synced when back online |

### Caching Strategy

- **Curriculum data** (stages, modules): cached locally after first fetch. The `/v1/syllabus/stages` endpoint returns data with a 1-hour cache header; the app stores it in memory / AsyncStorage.
- **Audio assets**: cached by the HTTP layer after first playback. Subsequent plays load from cache without hitting the proxy.
- **Progress updates**: when offline, pronunciation attempts and word completions are queued in local storage. A background sync job replays them when connectivity is restored.
- **NFC scanning**: always works offline — `nfcManager.ts` reads NDEF data directly from the hardware, and `tagParser.ts` extracts the `moduleId` without any network call.

# Deployment Diagram

> **Corrected diagram** — replaces earlier PNGs that incorrectly showed Next.js and PostgreSQL/MongoDB.
> The production infrastructure runs entirely on the **Cloudflare edge** (Worker, D1, R2, KV).

```mermaid
graph TB
    subgraph Physical["Physical Environment"]
        User["👧 Student / Parent"]
        NFCCard["Physical NFC Card<br/>(NTAG215 Chip)"]
    end

    subgraph Device["User's Mobile Device"]
        OS["Mobile OS<br/>(Android / iOS)"]
        NFCController["NFC Controller"]
        App["Tutoria Mobile App<br/>(React Native / Expo)"]
    end

    subgraph CloudflareEdge["Cloudflare Edge Network"]
        Worker["Cloudflare Worker<br/>(Hono Framework)"]
        D1["D1 Database<br/>(SQLite — Users, Profiles,<br/>Progress, Module Progress)"]
        R2["R2 Object Storage<br/>(Curriculum JSON,<br/>Audio .wav files)"]
        KV["KV Namespace<br/>(Cache, Rate Limiting,<br/>Deduplication)"]
    end

    subgraph External["External Services"]
        Clerk["Clerk<br/>(JWT Auth via JWKS)"]
        AzureSpeech["Azure Speech API<br/>(Phoneme Analysis)"]
        GoogleGemini["Google Vertex AI<br/>(Gemini — Pronunciation)"]
        MistralAI["Mistral AI<br/>(Voxtral — Fallback)"]
    end

    User -->|"1. Taps Card"| NFCCard
    NFCCard -->|"2. NDEF Radio Signal"| NFCController
    NFCController -->|"3. Tag ID + Payload"| OS
    OS -->|"4. Tag Data"| App
    App -->|"5. REST API (HTTPS)<br/>Bearer JWT"| Worker
    Worker --> D1
    Worker --> R2
    Worker --> KV
    Worker -->|"JWT Verification"| Clerk
    Worker -->|"Phoneme Analysis"| AzureSpeech
    Worker -->|"Pronunciation Check"| GoogleGemini
    Worker -.->|"Fallback"| MistralAI
    Worker -->|"6. JSON Response<br/>(Session + Audio URLs)"| App
```

## Deployment Notes

| Component | Technology | Purpose |
|---|---|---|
| **Mobile App** | React Native (Expo) on Android/iOS | Client-side NFC reading, audio playback, multi-sensory UI |
| **API** | Cloudflare Worker with Hono | Edge-deployed REST API — low latency worldwide |
| **Database** | Cloudflare D1 (SQLite) | Users, profiles, progress tracking, module session state |
| **Object Storage** | Cloudflare R2 | Curriculum JSON files and phonics audio (`.wav`) |
| **Cache** | Cloudflare KV | Response caching, rate-limit counters, request deduplication |
| **Auth** | Clerk (JWKS) | JWT issuance and verification for parent accounts |
| **AI** | Azure Speech, Gemini, Mistral | Phoneme extraction, pronunciation validation, fallback analysis |

The entire backend runs on the Cloudflare edge network — there is no traditional server, no Next.js, and no PostgreSQL or MongoDB.

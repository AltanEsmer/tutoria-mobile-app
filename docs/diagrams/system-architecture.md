# System Architecture

> **Corrected diagram** — replaces earlier PNGs that incorrectly depicted a Next.js backend with PostgreSQL/MongoDB and REST/GraphQL.
> The actual stack is **Cloudflare Worker (Hono)**, **D1 (SQLite)**, **R2**, **KV**, and **REST only**.

```mermaid
graph TB
    subgraph Physical["Physical World"]
        Student["👧 Student / Parent"]
        Card["📇 NFC Card<br/>(NTAG215)"]
    end

    subgraph Mobile["Tutoria Mobile App"]
        RN["React Native<br/>(Expo / TypeScript)"]
        NFC["NFC Reader Module<br/>(react-native-nfc-manager)"]
        Audio["Audio Engine<br/>(expo-av)"]
        UI["Multi-Sensory UI"]
        Stores["Zustand State<br/>Management"]
    end

    subgraph Cloud["Tutoria Cloud Infrastructure"]
        API["Tutoria API<br/>(Cloudflare Worker / Hono)"]
        Auth["Clerk<br/>(Authentication)"]
        D1["D1 Database<br/>(SQLite)"]
        R2["R2 Object Storage<br/>(Curriculum + Audio)"]
        KV["KV Namespace<br/>(Cache + Rate Limit)"]
    end

    subgraph AI["AI Services"]
        Azure["Azure Speech<br/>(Phoneme Analysis)"]
        Gemini["Google Gemini<br/>(Pronunciation Validation)"]
        Mistral["Mistral Voxtral<br/>(Fallback Validator)"]
    end

    Student -->|"1. Tactile Interaction"| Card
    Card -->|"2. NFC Signal (NDEF)"| NFC
    NFC -->|"3. Tag Data"| RN
    RN -->|"4. REST API"| API
    API --> D1
    API --> R2
    API --> KV
    API --> Auth
    API --> Azure
    API --> Gemini
    API -.->|"Fallback"| Mistral
    RN --> Audio
    RN --> UI
    RN --> Stores
    Audio -->|"5. Audio/Visual Output"| Student
```

## Data Flow

1. **Tactile Interaction** — The student selects a physical NTAG215 NFC card representing a letter or phonics module.
2. **NFC Signal (NDEF)** — Tapping the card against the phone transmits an NDEF text record containing a `moduleId` (e.g. `tutoria:module-a`).
3. **Tag Data** — `react-native-nfc-manager` parses the NDEF payload and passes the extracted `moduleId` to the React Native application layer.
4. **REST API** — The app calls the Tutoria API (a Cloudflare Worker built with the Hono framework) over HTTPS with a Bearer JWT. The Worker reads from D1 (SQLite) for user/progress data, R2 for curriculum JSON and audio files, and KV for caching and rate-limiting. It also delegates to Clerk for JWT verification and to AI services for pronunciation analysis.
5. **Audio/Visual Output** — The app plays phonics audio via `expo-av` and renders multi-sensory visual cues back to the student, completing the phygital learning loop.

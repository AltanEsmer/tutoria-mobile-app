# 📚 Tutoria

**A React Native mobile app helping children with dyslexia learn to read through phygital (physical + digital) NFC card interactions.**

![React Native](https://img.shields.io/badge/React_Native-0.83-61DAFB?logo=react&logoColor=white)
![Expo](https://img.shields.io/badge/Expo-55-000020?logo=expo&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)

---

## Overview

Tutoria is a mobile application designed as a structured literacy intervention for children with dyslexia. It delivers phonics-based reading lessons through an engaging, game-like experience that keeps young learners motivated with streaks, progress tracking, and mission-based learning modules.

At the heart of Tutoria is the **phygital concept** — bridging the physical and digital worlds. Children interact with tangible **NTAG215 NFC cards**, each representing a phonics lesson or mission. By tapping a card against their device, the app instantly launches the corresponding lesson, turning a simple physical action into a rich digital learning experience. This tactile trigger makes the technology accessible and intuitive, even for early readers.

Tutoria embraces a **multi-sensory learning approach** combining visual (on-screen letter/word animations), auditory (audio playback and AI-powered pronunciation feedback), and tactile (physical card handling and device haptics) modalities. Research shows that multi-sensory instruction is particularly effective for learners with dyslexia, and Tutoria weaves all three channels into every lesson.

---

## Key Features

- 📱 **NFC Card Scanning** — Tap NTAG215 NFC cards to launch lessons instantly via `react-native-nfc-manager`
- 🔤 **Phonics Lesson Delivery** — Structured audio and visual content for systematic phonics instruction
- 🎙️ **AI-Powered Pronunciation Checking** — Real-time speech assessment using Azure Speech, Google Gemini, and Mistral (fallback) pipeline
- 🔥 **Progress Tracking with Streak System** — Daily streaks and per-lesson progress to keep learners motivated
- 👨‍👩‍👧‍👦 **Multiple Learner Profiles** — Support for multiple children per account with individual progress
- 🗂️ **Module-Based Curriculum** — Organised syllabus with mission cards that map physical cards to lesson sequences
- 📶 **Offline-Capable Lesson Caching** — Lessons and audio assets are cached for use without connectivity

---

## Tech Stack

| Category | Technology |
| --- | --- |
| **Framework** | Expo 55 (managed workflow) |
| **Language** | TypeScript 5.9 |
| **Navigation** | Expo Router (file-based routing) |
| **State Management** | Zustand |
| **Authentication** | Clerk (`@clerk/clerk-expo`) |
| **NFC** | `react-native-nfc-manager` (NTAG215) |
| **Audio** | `expo-av` / `expo-speech` |
| **Haptics** | `expo-haptics` |
| **HTTP Client** | Axios |
| **Animations** | React Native Reanimated |
| **Backend** | Tutoria API — Cloudflare Worker on Hono |
| **Database** | Cloudflare D1 (SQLite) + R2 Object Storage + KV |
| **AI Services** | Azure Speech · Google Gemini · Mistral (fallback) |

---

## Quick Start

### Prerequisites

- **Node.js** 18+ and npm
- **Expo CLI** — `npm install -g expo-cli`
- A **physical Android or iOS device** with NFC capability (NFC does not work in emulators/simulators)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/<your-org>/tutoria-mobile-app.git
cd tutoria-mobile-app

# 2. Install dependencies
npm install

# 3. Create a .env file with your environment variables
cp .env.example .env
# Fill in the required values:
#   EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=...
#   EXPO_PUBLIC_API_BASE_URL=...

# 4. Start the development server
npx expo start
```

> **Note:** NFC functionality requires a **development build** (`npx expo run:android` or `npx expo run:ios`), not Expo Go, because `react-native-nfc-manager` includes native modules.

---

## Project Structure

```
src/
├── app/                  # Expo Router screens & layouts
│   ├── (auth)/           #   Authenticated routes
│   ├── (public)/         #   Public / sign-in routes
│   └── _layout.tsx       #   Root layout
├── assets/               # Static assets
│   ├── fonts/            #   Custom typefaces
│   ├── images/           #   Illustrations & icons
│   └── sounds/           #   Lesson audio files
├── components/           # Reusable UI components
│   ├── lesson/           #   Lesson playback components
│   ├── nfc/              #   NFC scanning UI & feedback
│   ├── progress/         #   Progress bars, streaks, stats
│   └── ui/               #   Generic UI primitives
├── hooks/                # Custom React hooks
│   ├── useAudio.ts       #   Audio playback controls
│   ├── useNfc.ts         #   NFC read/write lifecycle
│   └── usePronunciation.ts # AI pronunciation assessment
├── services/             # External service integrations
│   ├── api/              #   Tutoria API client (Axios)
│   │   ├── client.ts     #     Axios instance & interceptors
│   │   ├── audio.ts      #     Audio asset endpoints
│   │   ├── modules.ts    #     Curriculum module endpoints
│   │   ├── profiles.ts   #     Learner profile endpoints
│   │   ├── progress.ts   #     Progress & streak endpoints
│   │   ├── pronunciation.ts #  Pronunciation check endpoints
│   │   └── syllabus.ts   #     Syllabus / mission endpoints
│   └── nfc/              #   NFC hardware abstraction
│       ├── nfcManager.ts #     NFC session management
│       └── tagParser.ts  #     NTAG215 payload parsing
├── stores/               # Zustand state stores
│   ├── useAuthStore.ts   #   Authentication state
│   ├── useLessonStore.ts #   Current lesson state
│   ├── useNfcStore.ts    #   NFC scanning state
│   ├── useProfileStore.ts #  Active learner profile
│   └── useProgressStore.ts # Progress & streaks
└── utils/                # Shared utilities
    ├── constants.ts      #   App-wide constants
    └── types.ts          #   Shared TypeScript types
```

---

## Documentation

| Document | Description |
| --- | --- |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | High-level architecture & design decisions |
| [`docs/API_INTEGRATION.md`](docs/API_INTEGRATION.md) | How the app communicates with the Tutoria API |
| [`docs/NFC_GUIDE.md`](docs/NFC_GUIDE.md) | NFC card encoding, reading, and NTAG215 specifics |
| [`docs/DEVELOPMENT_SETUP.md`](docs/DEVELOPMENT_SETUP.md) | Local development environment setup |
| [`docs/PROJECT_STRUCTURE.md`](docs/PROJECT_STRUCTURE.md) | Detailed breakdown of the codebase |
| [`docs/DATA_MODELS.md`](docs/DATA_MODELS.md) | Data models, schemas, and store shapes |
| [`docs/ROADMAP.md`](docs/ROADMAP.md) | Implementation roadmap & phased milestones |
| [`docs/infrastructure/DEPLOYMENT.md`](docs/infrastructure/DEPLOYMENT.md) | Build, signing, and release process |
| [`docs/infrastructure/SECURITY.md`](docs/infrastructure/SECURITY.md) | Security model & data privacy |
| [`docs/infrastructure/OFFLINE_STRATEGY.md`](docs/infrastructure/OFFLINE_STRATEGY.md) | Offline support & caching architecture |
| [`docs/infrastructure/ERROR_HANDLING.md`](docs/infrastructure/ERROR_HANDLING.md) | Error handling patterns & crash reporting |
| [`docs/quality/TESTING_STRATEGY.md`](docs/quality/TESTING_STRATEGY.md) | Testing approach, setup, and CI integration |
| [`docs/tutoria-api.md`](docs/tutoria-api.md) | Full Tutoria backend API specification |

---

## API Overview

The Tutoria backend is fully documented in [`docs/tutoria-api.md`](docs/tutoria-api.md). It runs as a **Cloudflare Worker** built with **Hono** and uses:

- **D1 (SQLite)** for relational data (users, profiles, progress, modules)
- **R2 Object Storage** for audio files and lesson media
- **KV** for fast lookups and session caching
- **Multi-AI pronunciation pipeline** — Azure Speech SDK for primary assessment, Google Gemini for contextual feedback, and Mistral as a fallback provider

All API requests from the app flow through the Axios client in `src/services/api/client.ts`, authenticated via Clerk session tokens.

---

## Platform Support

| Platform | NFC Support | Notes |
| --- | --- | --- |
| **Android** | ✅ Full | Background tag discovery — cards are detected automatically even when the scan dialog is not open |
| **iOS** | ✅ Foreground | Uses Core NFC — the user must initiate a scan session via the in-app UI before tapping a card |

> Both platforms require a **development build**. Expo Go does not support `react-native-nfc-manager`.

---

## Roadmap

See [`docs/ROADMAP.md`](docs/ROADMAP.md) for the full implementation plan. Current phases:

| Phase | Focus | Status |
| --- | --- | --- |
| 1 | Foundation (providers, auth, tsconfig) | 🔜 Next |
| 2 | Core Screens & Navigation | ⏳ Planned |
| 3 | Core Features (NFC, audio, pronunciation) | ⏳ Planned |
| 4 | Offline & Resilience | ⏳ Planned |
| 5 | Testing & Quality | ⏳ Planned |
| 6 | Deployment & Release | ⏳ Planned |

---

## Troubleshooting

| Issue | Fix |
| --- | --- |
| NFC not detected | Use a development build, not Expo Go. Check device NFC is enabled. |
| Clerk auth errors | Verify `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` in `.env` |
| API connection failed | Check `EXPO_PUBLIC_API_URL` — run `curl <url>/health` to verify |
| Metro cache issues | Run `npx expo start --clear` |
| Build errors (native modules) | Run `npx expo prebuild --clean` |

For detailed setup help, see [`docs/DEVELOPMENT_SETUP.md`](docs/DEVELOPMENT_SETUP.md).

---

## License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

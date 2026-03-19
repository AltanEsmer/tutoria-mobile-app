# CI/CD Pipeline — Tutoria Mobile App

This document describes the CI/CD pipeline for the Tutoria mobile app (React Native / Expo SDK 55). It uses GitHub Actions for automation and EAS (Expo Application Services) for builds, OTA updates, and store submissions.

---

## Pipeline Flow

```mermaid
flowchart TD
    %% Triggers
    T([Push to main / develop\nor PR opened]) --> S1

    %% Stage 1 — Validate (parallel)
    subgraph S1["Stage 1 — Validate (parallel)"]
        direction LR
        LINT[ESLint]
        TSC[Type Check\ntsc --noEmit]
        TEST[Unit Tests\nJest]
    end

    %% Gate after Stage 1
    S1 --> GATE{All checks\npassed?}
    GATE -- No --> FAIL([❌ Pipeline failed\nNotify author])
    GATE -- Yes --> BRANCH{Which branch\nor event?}

    %% Stage 2 — Build (branch-specific profile)
    BRANCH -- PR opened --> BUILD_DEV["EAS Build\nprofile: development"]
    BRANCH -- push to develop --> BUILD_PREV["EAS Build\nprofile: preview"]
    BRANCH -- push to main --> BUILD_PROD["EAS Build\nprofile: production"]

    %% Stage 3 — Deploy
    BUILD_DEV --> PR_DONE([✅ Build artifact\navailable for review])

    BUILD_PREV --> OTA_PREV["EAS Update\n→ preview channel (OTA)"]
    OTA_PREV --> PREV_DONE([✅ Preview channel\nupdated])

    BUILD_PROD --> MANUAL{Manual store\nsubmission\ntriggered?}
    MANUAL -- No --> OTA_PROD["EAS Update\n→ production channel (OTA)"]
    MANUAL -- Yes --> STORE["EAS Submit\n→ App Store + Google Play"]
    OTA_PROD --> PROD_OTA_DONE([✅ Production channel\nupdated via OTA])
    STORE --> PROD_STORE_DONE([✅ Submitted to\napp stores])
```

---

## Branch Strategy

```mermaid
flowchart LR
    %% Feature development
    FEAT["feature/*"] -- PR --> DEV[develop]
    DEV -- merge --> PREV_BUILD["EAS Build: preview\n+ EAS Update: preview channel"]

    %% Release to production
    DEV -- PR --> MAIN[main]
    MAIN -- merge --> PROD_BUILD["EAS Build: production\n+ EAS Update: production channel\nor EAS Submit"]

    %% Hotfix path
    HOT["hotfix/*"] -- PR directly to main --> MAIN
```

---

## Key Notes

- **Full EAS Build required** when native modules or `app.json`/`eas.json` config change — OTA cannot deliver native code.
- **OTA updates** (EAS Update) are limited to JavaScript bundle and asset changes only.
- All sensitive values (tokens, credentials) are stored in **GitHub Actions secrets** and **EAS secrets** — never committed to source.
- **Preview builds** are distributed internally via EAS to testers before anything reaches the public stores.

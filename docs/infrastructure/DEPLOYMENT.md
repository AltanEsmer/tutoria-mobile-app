# Tutoria — Deployment Guide

This document covers the full deployment lifecycle for the Tutoria mobile app: environment configuration, EAS Build, signing, OTA updates, store submission, CI/CD, and monitoring.

> **Important:** Tutoria uses `react-native-nfc-manager`, which is a native module. The app **cannot run in Expo Go**. All development and testing requires a custom development client built via EAS Build or a local build.

---

## Table of Contents

1. [Environment Configuration](#1-environment-configuration)
2. [EAS Build Setup](#2-eas-build-setup)
3. [App Signing](#3-app-signing)
4. [Build Commands Reference](#4-build-commands-reference)
5. [Over-the-Air Updates (EAS Update)](#5-over-the-air-updates-eas-update)
6. [App Store Submission](#6-app-store-submission)
7. [CI/CD Pipeline](#7-cicd-pipeline)
8. [Monitoring & Crash Reporting](#8-monitoring--crash-reporting)

---

## 1. Environment Configuration

### 1.1 Environment Files

Tutoria uses three environment tiers. Each tier maps to a `.env` file that is loaded by Expo at build time. Never commit `.env` or `.env.local` to source control — only `.env.example` should be tracked.

| File | Purpose | Committed? |
|------|---------|-----------|
| `.env.example` | Template with all keys, no real values | ✅ Yes |
| `.env` | Local development overrides | ❌ No |
| `.env.local` | Personal local overrides (highest priority) | ❌ No |
| `.env.production` | Production values for CI builds | ❌ No (injected via CI secrets) |

**`.env` (development):**
```bash
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_dev_key_here
EXPO_PUBLIC_API_URL=https://api-dev.tutoria.ac
EXPO_PUBLIC_ENABLE_NFC_MOCK=true
```

**`.env.production`:**
```bash
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_your_prod_key_here
EXPO_PUBLIC_API_URL=https://api.tutoria.ac
EXPO_PUBLIC_ENABLE_NFC_MOCK=false
```

> Only variables prefixed with `EXPO_PUBLIC_` are inlined into the JS bundle at build time. Never put secrets in `EXPO_PUBLIC_` variables — they are visible in the app binary.

### 1.2 Recommended: Convert to `app.config.ts`

The static `app.json` should be converted to a dynamic `app.config.ts` so that environment variables can influence the app configuration (e.g., different API URL badge on the icon, different bundle IDs per environment). Rename `app.json` → `app.config.ts`:

```typescript
// app.config.ts
import type { ExpoConfig, ConfigContext } from 'expo/config';

const IS_DEV = process.env.APP_ENV === 'development';
const IS_PREVIEW = process.env.APP_ENV === 'preview';

const getUniqueIdentifier = () => {
  if (IS_DEV) return 'ac.tutoria.mobile.dev';
  if (IS_PREVIEW) return 'ac.tutoria.mobile.preview';
  return 'ac.tutoria.mobile';
};

const getAppName = () => {
  if (IS_DEV) return 'Tutoria (Dev)';
  if (IS_PREVIEW) return 'Tutoria (Preview)';
  return 'Tutoria';
};

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: getAppName(),
  slug: 'tutoria',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  scheme: IS_DEV ? 'tutoria-dev' : IS_PREVIEW ? 'tutoria-preview' : 'tutoria',
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#ffffff',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: getUniqueIdentifier(),
    infoPlist: {
      NFCReaderUsageDescription:
        'Tutoria uses NFC to read learning cards and start phonics lessons',
    },
  },
  android: {
    package: getUniqueIdentifier(),
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    permissions: ['android.permission.NFC'],
    predictiveBackGestureEnabled: false,
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: ['expo-secure-store', 'expo-router'],
  extra: {
    eas: {
      projectId: 'YOUR_EAS_PROJECT_ID',
    },
  },
  updates: {
    url: 'https://u.expo.dev/YOUR_EAS_PROJECT_ID',
  },
  runtimeVersion: {
    policy: 'appVersion',
  },
});
```

> Using separate bundle IDs per environment (`ac.tutoria.mobile.dev`, `ac.tutoria.mobile.preview`, `ac.tutoria.mobile`) lets you install all three builds simultaneously on a device without conflicts.

Set `APP_ENV` in each EAS build profile (see [section 2](#2-eas-build-setup)).

### 1.3 Accessing Environment Variables at Runtime

Use `expo-constants` or direct `process.env` access. Since all `EXPO_PUBLIC_*` vars are statically replaced at build time, TypeScript will not complain about them:

```typescript
// lib/config.ts
import Constants from 'expo-constants';

export const Config = {
  clerkPublishableKey: process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!,
  apiUrl: process.env.EXPO_PUBLIC_API_URL!,
  enableNfcMock: process.env.EXPO_PUBLIC_ENABLE_NFC_MOCK === 'true',
  // EAS-injected values (not public, server-side only if using server components)
  easProjectId: Constants.expoConfig?.extra?.eas?.projectId,
  appVersion: Constants.expoConfig?.version,
  appEnv: (process.env.APP_ENV ?? 'development') as
    | 'development'
    | 'preview'
    | 'production',
} as const;
```

Add type declarations so TypeScript knows about your env vars:

```typescript
// env.d.ts (add to project root)
declare namespace NodeJS {
  interface ProcessEnv {
    EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: string;
    EXPO_PUBLIC_API_URL: string;
    EXPO_PUBLIC_ENABLE_NFC_MOCK: string;
    APP_ENV?: 'development' | 'preview' | 'production';
  }
}
```

---

## 2. EAS Build Setup

### 2.1 Prerequisites

```bash
# Install EAS CLI globally
npm install -g eas-cli

# Log in to your Expo account
eas login

# Link the project (run once from the project root)
eas init
```

This writes an `extra.eas.projectId` to your `app.config.ts` and creates the project on expo.dev.

### 2.2 `eas.json` Configuration

Create `eas.json` at the project root:

```json
{
  "cli": {
    "version": ">= 16.0.0",
    "promptToConfigurePushNotifications": false
  },
  "build": {
    "base": {
      "node": "22.14.0",
      "env": {
        "EXPO_PUBLIC_ENABLE_NFC_MOCK": "false"
      }
    },
    "development": {
      "extends": "base",
      "developmentClient": true,
      "distribution": "internal",
      "channel": "development",
      "env": {
        "APP_ENV": "development",
        "EXPO_PUBLIC_API_URL": "https://api-dev.tutoria.ac",
        "EXPO_PUBLIC_ENABLE_NFC_MOCK": "false"
      },
      "android": {
        "buildType": "apk",
        "gradleCommand": ":app:assembleDebug"
      },
      "ios": {
        "simulator": false,
        "buildConfiguration": "Debug"
      }
    },
    "development-simulator": {
      "extends": "development",
      "ios": {
        "simulator": true
      }
    },
    "preview": {
      "extends": "base",
      "distribution": "internal",
      "channel": "preview",
      "env": {
        "APP_ENV": "preview",
        "EXPO_PUBLIC_API_URL": "https://api-dev.tutoria.ac",
        "EXPO_PUBLIC_ENABLE_NFC_MOCK": "false"
      },
      "android": {
        "buildType": "apk"
      },
      "ios": {
        "buildConfiguration": "Release"
      }
    },
    "production": {
      "extends": "base",
      "distribution": "store",
      "channel": "production",
      "autoIncrement": true,
      "env": {
        "APP_ENV": "production",
        "EXPO_PUBLIC_API_URL": "https://api.tutoria.ac",
        "EXPO_PUBLIC_ENABLE_NFC_MOCK": "false"
      },
      "android": {
        "buildType": "app-bundle"
      },
      "ios": {
        "buildConfiguration": "Release"
      }
    }
  },
  "submit": {
    "production": {
      "android": {
        "serviceAccountKeyPath": "./secrets/google-play-service-account.json",
        "track": "internal"
      },
      "ios": {
        "appleId": "your-apple-id@example.com",
        "ascAppId": "YOUR_APP_STORE_CONNECT_APP_ID",
        "appleTeamId": "YOUR_APPLE_TEAM_ID"
      }
    }
  }
}
```

### 2.3 Build Profile Breakdown

| Profile | Purpose | Distribution | Android output | iOS output |
|---------|---------|-------------|----------------|------------|
| `development` | Dev client for physical device testing (NFC) | Internal (QR/link) | `.apk` | `.ipa` (Debug) |
| `development-simulator` | iOS Simulator build (no NFC) | Internal | — | `.app` |
| `preview` | Internal QA / stakeholder testing | Internal | `.apk` | `.ipa` (Release) |
| `production` | Store submission | Store | `.aab` | `.ipa` (Release) |

### 2.4 Development Client (Required for NFC)

Because `react-native-nfc-manager` ships native code, **Expo Go cannot be used**. You must build and install a development client on each test device:

```bash
# Build dev client for Android (physical device)
eas build --profile development --platform android

# Build dev client for iOS (physical device — requires provisioning profile)
eas build --profile development --platform ios

# After install, start the local Metro bundler
APP_ENV=development npx expo start --dev-client
```

The development client connects back to your local Metro server over the same LAN or via a tunnel (`--tunnel`).

**NFC on Android emulator:** NFC hardware is not available in Android emulators. Set `EXPO_PUBLIC_ENABLE_NFC_MOCK=true` in `.env` and use the `development-simulator` profile if testing on a non-NFC device.

**NFC on iOS Simulator:** NFC is not supported at all in the iOS Simulator. Use `EXPO_PUBLIC_ENABLE_NFC_MOCK=true` for simulator development.

### 2.5 `react-native-nfc-manager` Plugin

Add the NFC manager plugin to `app.config.ts` to ensure the correct entitlements and permissions are automatically configured:

```typescript
// Inside app.config.ts plugins array:
plugins: [
  'expo-secure-store',
  'expo-router',
  [
    'react-native-nfc-manager',
    {
      nfcPermission: 'Tutoria uses NFC to read learning cards and start phonics lessons',
    },
  ],
],
```

Ensure `NFCReaderUsageDescription` is also set in `ios.infoPlist` (already present in `app.json`) and that the NFC entitlement (`com.apple.developer.nfc.readersession.formats`) is included — the plugin handles this automatically.

---

## 3. App Signing

### 3.1 Android — Keystore

EAS can manage your keystore automatically (recommended) or you can supply your own.

**Option A — EAS-managed credentials (recommended):**
```bash
eas credentials --platform android
# Select "Set up new keystore" and EAS will generate and store it securely
```

EAS stores the keystore encrypted in the Expo credential store. You never handle the raw keystore file.

**Option B — Self-managed keystore:**
```bash
# Generate a keystore
keytool -genkey -v \
  -keystore tutoria-release.keystore \
  -alias tutoria \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000

# Store the following as CI secrets (never commit to git):
# ANDROID_KEYSTORE_BASE64   — base64 of the .keystore file
# ANDROID_KEY_ALIAS         — key alias
# ANDROID_KEY_PASSWORD      — key password
# ANDROID_STORE_PASSWORD    — store password
```

**Play App Signing:** When submitting to Google Play for the first time, enroll in Play App Signing. Google holds the final signing key; you upload with your upload key. EAS handles this automatically when you use `eas submit`.

### 3.2 iOS — Certificates and Provisioning Profiles

Apple requires two certificates and one provisioning profile per environment tier:

| Artifact | Development | Distribution |
|----------|-----------|-------------|
| Certificate | Apple Development | Apple Distribution |
| Provisioning Profile | Development (device UDID list) | App Store (or Ad Hoc for preview) |

**EAS-managed credentials (recommended):**
```bash
eas credentials --platform ios
# EAS will create/renew certificates and profiles via your Apple Developer account
```

EAS uses the App Store Connect API key (not your personal Apple ID) for automation. Generate one at [appstoreconnect.apple.com](https://appstoreconnect.apple.com) under **Users and Access → Keys** with **Developer** role, then:

```bash
eas credentials --platform ios
# Choose "Add new ASC API Key" and upload the .p8 file
```

**NFC Entitlement:** The NFC capability (`com.apple.developer.nfc.readersession.formats`) must be enabled on the App ID in the Apple Developer portal **before** creating the provisioning profile. Navigate to **Certificates, Identifiers & Profiles → Identifiers → ac.tutoria.mobile → Capabilities** and enable **NFC Tag Reading**.

> If you regenerate the provisioning profile without this step the NFC entitlement will be missing and the app will crash at runtime when attempting to start an NFC session.

### 3.3 Credential Audit

Run at any time to inspect current credential status:

```bash
eas credentials --platform android
eas credentials --platform ios
```

To revoke and regenerate compromised credentials:

```bash
eas credentials --platform ios --profile production
# Choose "Remove credentials" then regenerate
```

---

## 4. Build Commands Reference

### 4.1 Development Builds

```bash
# Android physical device dev client
eas build --profile development --platform android

# iOS physical device dev client
eas build --profile development --platform ios

# iOS Simulator dev client (no NFC, for UI development)
eas build --profile development-simulator --platform ios

# Both platforms simultaneously
eas build --profile development --platform all

# Local build (requires Android SDK / Xcode locally, skips EAS servers)
eas build --profile development --platform android --local
```

### 4.2 Preview Builds

```bash
# Android preview APK (internal testing)
eas build --profile preview --platform android

# iOS preview IPA (Ad Hoc / TestFlight internal)
eas build --profile preview --platform ios

# Both platforms
eas build --profile preview --platform all
```

Preview builds are distributed via a shareable EAS link. Share the link with QA testers — they scan a QR code to install directly on their device (Android) or via TestFlight (iOS).

### 4.3 Production Builds

```bash
# Android AAB for Play Store
eas build --profile production --platform android

# iOS IPA for App Store
eas build --profile production --platform ios

# Build and submit to stores in one command
eas build --profile production --platform all --auto-submit
```

### 4.4 Useful Flags

| Flag | Description |
|------|------------|
| `--local` | Build on your machine instead of EAS servers (requires native toolchain) |
| `--no-wait` | Submit the build job and exit without waiting for completion |
| `--auto-submit` | Automatically submit to the store after a successful build |
| `--clear-cache` | Clear the EAS build cache for this project |
| `--message "..."` | Tag the build with a message for identification |
| `--json` | Output build info as JSON (useful in CI scripts) |

### 4.5 Checking Build Status

```bash
# List recent builds
eas build:list

# View a specific build
eas build:view BUILD_ID

# Cancel a queued or running build
eas build:cancel BUILD_ID
```

---

## 5. Over-the-Air Updates (EAS Update)

### 5.1 What OTA Can and Cannot Update

| Changeable via OTA ✅ | Requires full rebuild ❌ |
|----------------------|------------------------|
| JavaScript / TypeScript code | New native modules (e.g., a new Expo SDK plugin) |
| Styles, layouts, assets | Changes to `app.config.ts` native fields |
| Business logic, API URLs | New NFC-related permissions |
| `EXPO_PUBLIC_*` env var values (if baked at build time via new OTA) | Updating `react-native-nfc-manager` to a new major version |
| Bug fixes not touching native code | React Native version bumps |

> Because Tutoria relies on NFC (a native capability), any update to NFC scanning logic itself is OTA-safe (JS side), but any changes to NFC entitlements or permissions in `app.config.ts` require a new binary.

### 5.2 Setup

Add the `updates` and `runtimeVersion` fields to `app.config.ts` (already shown in section 1.2):

```typescript
updates: {
  url: 'https://u.expo.dev/YOUR_EAS_PROJECT_ID',
},
runtimeVersion: {
  policy: 'appVersion',
},
```

`runtimeVersion` with policy `appVersion` means the OTA update channel is compatible only with binaries of the same `version` in `app.config.ts`. Increment the app version when you do a full rebuild to prevent mismatched updates from being delivered to older binaries.

### 5.3 Update Channels

Each EAS build profile maps to an update channel:

| Build profile | Update channel | Audience |
|--------------|---------------|---------|
| `development` | `development` | Developers |
| `preview` | `preview` | QA / internal testers |
| `production` | `production` | End users (App Store / Play Store) |

### 5.4 Publishing an OTA Update

```bash
# Publish to the preview channel (e.g. after merging to develop)
eas update --channel preview --message "Fix typo on home screen"

# Publish to production
eas update --channel production --message "v1.2.1 — improve NFC scan reliability"

# Publish to all channels at once
eas update --channel development --channel preview --channel production --message "Hotfix"

# Preview what would be published without actually publishing
eas update --channel production --dry-run
```

### 5.5 Rollback Procedure

EAS Update retains a history of all published updates per channel. To roll back:

```bash
# List update history for the production channel
eas update:list --branch production

# Re-publish a previous update by its ID
eas update:republish --group UPDATE_GROUP_ID --channel production
```

Alternatively, via the Expo web dashboard: **expo.dev → Project → Updates → production branch** → find the previous update → **Republish**.

### 5.6 Runtime Update Configuration

For finer-grained control over update checks add to `app.config.ts`:

```typescript
updates: {
  url: 'https://u.expo.dev/YOUR_EAS_PROJECT_ID',
  checkAutomatically: 'ON_LOAD',
  fallbackToCacheTimeout: 0,
},
```

Or handle updates manually in code:

```typescript
import * as Updates from 'expo-updates';

async function checkForAppUpdate() {
  if (!Updates.isEmbeddedLaunch) {
    const update = await Updates.checkForUpdateAsync();
    if (update.isAvailable) {
      await Updates.fetchUpdateAsync();
      await Updates.reloadAsync();
    }
  }
}
```

---

## 6. App Store Submission

### 6.1 Google Play Store

**Pre-submission checklist:**

- [ ] Production AAB built with `eas build --profile production --platform android`
- [ ] App signed with the upload key enrolled in Play App Signing
- [ ] `versionCode` auto-incremented (`autoIncrement: true` in `eas.json`)
- [ ] Content rating questionnaire completed (required for children's apps — see COPPA notes below)
- [ ] Data safety section completed — declare: Clerk auth data, device identifiers, NFC usage (local only, no data transmitted)
- [ ] Store listing: title, short description (80 chars), full description, promo graphic, screenshots (phone + 7-inch tablet + 10-inch tablet)
- [ ] At least 2 testers in the Internal Testing track before promoting to production

**Submit via EAS:**
```bash
eas submit --platform android --profile production
# Or with a local AAB file:
eas submit --platform android --path ./build/tutoria.aab
```

**Required Play Store assets:**

| Asset | Size |
|-------|------|
| App icon | 512×512 PNG |
| Feature graphic | 1024×500 PNG |
| Phone screenshots | Min 2, 16:9 or 9:16 |
| 7-inch tablet screenshots | Recommended |
| 10-inch tablet screenshots | Recommended |

### 6.2 Apple App Store

**Pre-submission checklist:**

- [ ] Production IPA built with `eas build --profile production --platform ios`
- [ ] NFC entitlement (`com.apple.developer.nfc.readersession.formats`) enabled on App ID (**critical** — see section 3.2)
- [ ] `NFCReaderUsageDescription` set in `Info.plist` ✅ (already in `app.json`)
- [ ] Privacy policy URL ready (required for children's apps)
- [ ] Age rating completed — select **4+** for educational children's app
- [ ] App Review Information filled (reviewer notes, demo account if needed)
- [ ] Export Compliance: select "No" (no custom encryption beyond HTTPS/TLS via Clerk)
- [ ] At least one build submitted to TestFlight and tested before App Store submission

**Submit via EAS:**
```bash
eas submit --platform ios --profile production
# Or with a local IPA:
eas submit --platform ios --path ./build/tutoria.ipa
```

**Required App Store assets:**

| Asset | Size |
|-------|------|
| App icon | 1024×1024 PNG (no alpha) |
| iPhone 6.9" screenshots | Min 3 |
| iPhone 6.7" screenshots | Min 3 |
| iPad 13" screenshots | Recommended |
| iPad 12.9" screenshots | Recommended |

### 6.3 COPPA Compliance (Children's Educational App)

Tutoria is an educational app targeting children. Both platforms have specific requirements:

**Google Play:**
- Designate the app as **"Designed for Families"** in the Play Console under App Content → Target Audience
- Comply with the **Families Policy**: no ad networks that are not Play-approved, no data collection beyond what is needed for core functionality
- The **Data Safety** section must accurately reflect that you do **not** share children's personal data with third parties

**Apple App Store:**
- Set age rating to **4+**; Apple will automatically place it in the Kids category if you opt in
- A **Privacy Policy URL** is mandatory
- If you opt into the **Kids Category**: no third-party analytics, no behavioural advertising, no social network links, no in-app purchases without parental gate

**Clerk Auth & COPPA:**
- If children under 13 can create accounts, ensure Clerk is configured with parental consent flows or that accounts are created by parents/guardians
- Do not store children's email addresses or personal identifiers on the Cloudflare Worker without appropriate data retention and deletion policies

**NFC & Privacy:**
- NFC data (card UID) should be documented in both stores' privacy disclosures
- If the UID is sent to the Cloudflare Worker API, declare it as a device/other identifier collected

---

## 7. CI/CD Pipeline

### 7.1 Recommended Branch Strategy

```
main          →  triggers production EAS build + eas update production
develop       →  triggers preview EAS build + eas update preview
feature/*     →  triggers lint + typecheck only (no build)
```

Tag `main` with `v1.x.x` to trigger a store submission flow.

### 7.2 Required GitHub Secrets

Add the following in **GitHub → Repository Settings → Secrets and variables → Actions**:

| Secret | Description |
|--------|------------|
| `EXPO_TOKEN` | EAS personal access token (`eas token:create`) |
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY_DEV` | Clerk dev key |
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY_PROD` | Clerk production key |
| `GOOGLE_PLAY_SERVICE_ACCOUNT_KEY` | Play Console service account JSON (base64) |
| `APPLE_APP_STORE_CONNECT_KEY_ID` | ASC API key ID |
| `APPLE_APP_STORE_CONNECT_ISSUER_ID` | ASC API issuer ID |
| `APPLE_APP_STORE_CONNECT_KEY_P8` | ASC API private key content |
| `SENTRY_AUTH_TOKEN` | For source map uploads (see section 8) |
| `SENTRY_DSN` | Sentry project DSN |

### 7.3 GitHub Actions Workflow

**`.github/workflows/ci.yml`** — runs on all branches:

```yaml
name: CI

on:
  push:
    branches: ['**']
  pull_request:
    branches: [main, develop]

jobs:
  lint-and-typecheck:
    name: Lint & Typecheck
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Format check
        run: npm run format:check

      - name: Typecheck
        run: npx tsc --noEmit
```

**`.github/workflows/preview.yml`** — runs on `develop` branch:

```yaml
name: Preview Build

on:
  push:
    branches: [develop]

jobs:
  build-preview:
    name: EAS Preview Build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}

      - name: Publish OTA update to preview channel
        run: eas update --channel preview --message "Preview — ${{ github.sha }}" --non-interactive
        env:
          EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: ${{ secrets.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY_DEV }}
          EXPO_PUBLIC_API_URL: https://api-dev.tutoria.ac
          EXPO_PUBLIC_ENABLE_NFC_MOCK: 'false'

      # Full native rebuild only when eas.json or native config changes
      - name: Check for native changes
        id: native-check
        run: |
          git diff --name-only HEAD~1 HEAD | grep -qE '(eas\.json|app\.config\.ts|package\.json)' && \
            echo "native_changed=true" >> $GITHUB_OUTPUT || \
            echo "native_changed=false" >> $GITHUB_OUTPUT

      - name: EAS Build (preview)
        if: steps.native-check.outputs.native_changed == 'true'
        run: eas build --profile preview --platform all --non-interactive --no-wait
        env:
          EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: ${{ secrets.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY_DEV }}
```

**`.github/workflows/production.yml`** — runs on `main` branch or version tags:

```yaml
name: Production Build & Submit

on:
  push:
    tags:
      - 'v*.*.*'

jobs:
  build-and-submit:
    name: EAS Production Build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}

      - name: EAS Production Build
        run: eas build --profile production --platform all --non-interactive --no-wait
        env:
          EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: ${{ secrets.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY_PROD }}
          EXPO_PUBLIC_API_URL: https://api.tutoria.ac
          EXPO_PUBLIC_ENABLE_NFC_MOCK: 'false'
          SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}

      - name: Publish OTA update to production channel
        run: eas update --channel production --message "Release ${{ github.ref_name }}" --non-interactive
        env:
          EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: ${{ secrets.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY_PROD }}
          EXPO_PUBLIC_API_URL: https://api.tutoria.ac
          EXPO_PUBLIC_ENABLE_NFC_MOCK: 'false'
```

### 7.4 Flow Summary

```
feature/* push
    └── CI: lint + typecheck + format check

develop push
    ├── CI: lint + typecheck
    ├── EAS Update → preview channel  (always)
    └── EAS Build preview             (only if native files changed)

v*.*.* tag (on main)
    ├── EAS Build production (all platforms)
    ├── EAS Update → production channel
    └── (optional) eas submit --auto-submit
```

---

## 8. Monitoring & Crash Reporting

### 8.1 Sentry Setup

Install Sentry's Expo integration:

```bash
npx expo install @sentry/react-native
```

Add the Sentry plugin to `app.config.ts`:

```typescript
plugins: [
  'expo-secure-store',
  'expo-router',
  [
    '@sentry/react-native/expo',
    {
      organization: 'your-sentry-org',
      project: 'tutoria-mobile',
      url: 'https://sentry.io/',
    },
  ],
],
```

Initialise Sentry in your app entry point (`index.ts` or the root layout):

```typescript
// index.ts
import * as Sentry from '@sentry/react-native';
import { isRunningInExpoGo } from 'expo';

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  debug: process.env.APP_ENV !== 'production',
  environment: process.env.APP_ENV ?? 'development',
  enabled: process.env.APP_ENV === 'production' || process.env.APP_ENV === 'preview',
  tracesSampleRate: process.env.APP_ENV === 'production' ? 0.2 : 1.0,
  integrations: [
    Sentry.mobileReplayIntegration({
      maskAllText: true,      // important for children's data privacy
      maskAllImages: true,
    }),
  ],
});
```

Add `EXPO_PUBLIC_SENTRY_DSN` to your `.env` files and to the CI secrets table above.

### 8.2 Source Map Upload

Source maps allow Sentry to display readable stack traces for production crashes. The `@sentry/react-native/expo` plugin handles this automatically during EAS builds when `SENTRY_AUTH_TOKEN` is set as an environment variable (see CI secrets).

For local production builds:

```bash
SENTRY_AUTH_TOKEN=your_token eas build --profile production --platform android --local
```

Verify source maps are uploaded correctly in the Sentry dashboard under **Project Settings → Source Maps**.

### 8.3 Wrapping the Root Component

Use Sentry's higher-order component to capture unhandled errors at the root:

```typescript
// app/_layout.tsx
import * as Sentry from '@sentry/react-native';

function RootLayout() {
  // ... your existing layout
}

export default Sentry.wrap(RootLayout);
```

### 8.4 NFC Error Tracking

NFC failures are a primary source of user-facing errors in Tutoria. Add structured breadcrumbs:

```typescript
import * as Sentry from '@sentry/react-native';

async function startNfcScan() {
  Sentry.addBreadcrumb({
    category: 'nfc',
    message: 'NFC scan started',
    level: 'info',
  });
  try {
    // ... NFC scan logic
  } catch (error) {
    Sentry.captureException(error, {
      tags: { feature: 'nfc' },
      contexts: {
        nfc: {
          isSupported: await NfcManager.isSupported(),
          isEnabled: await NfcManager.isEnabled(),
        },
      },
    });
  }
}
```

### 8.5 Performance Monitoring Recommendations

| Tool | Purpose | Notes |
|------|---------|-------|
| Sentry Performance | JS render traces, network calls | Set `tracesSampleRate: 0.2` in production |
| Sentry Mobile Replay | Session replay for crash context | Enable `maskAllText/maskAllImages` for COPPA |
| Expo Updates | Track OTA update adoption rate | View in expo.dev dashboard |
| Cloudflare Analytics | API latency, error rates for Worker | Built-in to Cloudflare dashboard |
| React Native Perf Monitor | Frame rate during development | Enable via Dev Menu → Perf Monitor |

---

## Appendix: Quick Reference

### Useful EAS Commands

```bash
eas whoami                            # Check logged-in account
eas project:info                      # Show EAS project details
eas build:list --limit 10             # Recent builds
eas update:list --branch production   # Recent OTA updates
eas credentials --platform ios        # Manage iOS credentials
eas credentials --platform android    # Manage Android credentials
eas device:create                     # Register a new test device (iOS)
eas device:list                       # List registered devices
```

### Environment Summary

| | Development | Preview | Production |
|-|------------|---------|-----------|
| `APP_ENV` | `development` | `preview` | `production` |
| API URL | `api-dev.tutoria.ac` | `api-dev.tutoria.ac` | `api.tutoria.ac` |
| NFC Mock | configurable | `false` | `false` |
| Bundle ID | `ac.tutoria.mobile.dev` | `ac.tutoria.mobile.preview` | `ac.tutoria.mobile` |
| Distribution | Internal | Internal | Store |
| OTA Channel | `development` | `preview` | `production` |
| Sentry | disabled | enabled | enabled |

### When to Do a Full Rebuild vs OTA Update

```
Changed JS/TS/assets only?          → eas update (OTA)
Changed EXPO_PUBLIC_* env var?      → eas update (OTA)
Changed app.config.ts native field? → eas build (full rebuild)
Added/removed npm package?          → check if it has native code
  └─ native code (has /ios or /android folder)? → eas build
  └─ JS-only package?               → eas update (OTA)
Changed react-native-nfc-manager?   → eas build (full rebuild)
Changed Expo SDK version?           → eas build (full rebuild)
Changed app version number?         → eas build (required for runtimeVersion policy)
```

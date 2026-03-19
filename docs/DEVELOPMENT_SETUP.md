# Development Setup Guide

Development setup guide for the Tutoria React Native (Expo) mobile app.

## 1. Prerequisites

- **Node.js 18+** (LTS recommended)
- **npm** or **yarn**
- **Expo CLI**: `npm install -g expo-cli` (or use `npx`)
- **Git**
- **Physical Android/iOS device with NFC** (NFC cannot be tested in emulator)
- **Android**: Android Studio (for development builds)
- **iOS**: Xcode 15+ on macOS (for development builds)
- **Clerk account** with publishable key
- **Access to Tutoria API** (dev environment)

### Platform SDK Versions

| Platform | Tool | Minimum Version | Recommended |
|----------|------|----------------|-------------|
| Android | Android Studio | Hedgehog (2023.1.1) | Latest stable |
| Android | SDK Platform | API 34 (Android 14) | API 34+ |
| Android | Build Tools | 34.0.0 | Latest |
| iOS | Xcode | 15.0 | 15.4+ |
| iOS | CocoaPods | 1.14.0 | Latest |

> **Note:** Ensure Android SDK environment variables are set: `ANDROID_HOME` and `ANDROID_SDK_ROOT`.

## 2. Getting Started

```bash
# Clone the repository
git clone <repo-url>
cd tutoria-mobile-app

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
# Edit .env with your actual values
```

## 3. Environment Variables

| Variable | Required | Description |
|---|---|---|
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes | Clerk publishable key |
| `EXPO_PUBLIC_API_URL` | Yes | Tutoria API URL (default: `https://api-dev.tutoria.ac`) |
| `EXPO_PUBLIC_ENABLE_NFC_MOCK` | No | Enable NFC mocking for development (default: `false`) |

### Environment Variable Precedence

Expo loads environment variables in this order (later overrides earlier):

1. `.env` — Base defaults (committed to repo as `.env.example`)
2. `.env.local` — Local overrides (gitignored, never committed)
3. `.env.development` / `.env.production` — Mode-specific overrides
4. System environment variables — CI/CD pipeline values

> Only variables prefixed with `EXPO_PUBLIC_` are accessible in client code at build time via `process.env.EXPO_PUBLIC_*`.

## 4. Running the App

### Development Build (Required for NFC)

```bash
# Create development build for Android
npx expo run:android

# Create development build for iOS (macOS only)
npx expo run:ios
```

> **Note:** NFC features require a development build — Expo Go does not support native modules like `react-native-nfc-manager`.

### Without NFC (Expo Go)

```bash
npx expo start
```

Non-NFC features (auth, progress, profile management) work in Expo Go.

## 5. Physical Device Testing

- Connect Android device via USB with USB debugging enabled
- For iOS, connect device and trust the development certificate
- NFC testing requires a physical NTAG215 card or an NFC-capable second device with NFC Tools app
- Ensure NFC is enabled in device settings

## 6. Debugging NFC Without Physical Cards

- Set `EXPO_PUBLIC_ENABLE_NFC_MOCK=true` in `.env`
- Use NFC Tools app on a second phone to write test NDEF records
- Write text records with format: `tutoria:module-a`
- The app can also navigate directly to modules via deep links during development

## 7. Testing Pronunciation Features

- Requires microphone permission
- Audio recording uses `expo-av`
- The pronunciation check endpoint has a **5 req/60s rate limit** in development too
- Test with simple words first (e.g., "cat", "dog")
- Check the API response's `debug.processingTime` to ensure under 20s timeout

## 8. Project Scripts

```bash
npm start          # Start Expo dev server
npm run android    # Run on Android device/emulator
npm run ios        # Run on iOS device/simulator (macOS only)
npm run web        # Run in web browser (limited features)
npm run lint       # Run ESLint
npm run format     # Run Prettier
```

## 9. Common Issues & Troubleshooting

### NFC not working

- Ensure you're using a development build, not Expo Go
- Check NFC is enabled in device settings
- On Android: check `AndroidManifest.xml` has NFC permission
- On iOS: check NFC entitlement is added in Xcode

### Clerk authentication errors

- Verify `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` is set correctly
- Ensure `expo-secure-store` is properly linked

### API connection issues

- Check `EXPO_PUBLIC_API_URL` is correct
- Verify the API health endpoint: `curl https://api-dev.tutoria.ac/health`
- Check network connectivity from the device

### Build errors with native modules

- Run `npx expo prebuild --clean` to regenerate native projects
- Clear Metro cache: `npx expo start --clear`

### Metro bundler cache issues

```bash
# Clear Metro cache
npx expo start --clear

# Full reset (nuclear option)
rm -rf node_modules/.cache
npx expo start --clear
```

### Expo prebuild cleanup

If native project files get into a bad state after plugin changes:

```bash
# Remove generated native projects and regenerate
npx expo prebuild --clean

# Then rebuild
npx expo run:android  # or run:ios
```

### Proxy / Firewall / VPN

If you're behind a corporate proxy:

```bash
# Set npm proxy
npm config set proxy http://proxy.example.com:8080
npm config set https-proxy http://proxy.example.com:8080

# For Expo dev server, ensure your device and dev machine are on the same network
# Use tunnel mode if direct connection fails:
npx expo start --tunnel
```

> **Note:** `--tunnel` mode requires `@expo/ngrok` — install with `npm install -g @expo/ngrok`.

## 10. IDE Setup

- **VS Code** recommended with extensions:
  - ESLint
  - Prettier
  - React Native Tools
  - TypeScript Hero
- Use the included `.eslintrc.json` and `.prettierrc` for consistent formatting

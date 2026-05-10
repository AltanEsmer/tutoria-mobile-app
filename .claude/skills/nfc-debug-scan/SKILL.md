---
name: nfc-debug-scan
description: Diagnose a failing NFC scan in the Tutoria app — mock vs real, parsing, lifecycle, native config.
---

## Triage checklist

Work through the steps in order. Stop and report as soon as a step explains the failure.

### (a) Is mock mode active?

Check whether `EXPO_PUBLIC_ENABLE_NFC_MOCK` is set to `'true'` in the running environment (`.env`, `.env.local`, or EAS environment variables).

- If mock is enabled, `initNfc()` and `readTag()` in `src/services/nfc/nfcManager.ts` short-circuit immediately and return a synthetic tag with `moduleId` from `EXPO_PUBLIC_NFC_MOCK_MODULE_ID` (default `'module-a'`).
- A scan that always returns `module-a` regardless of the physical card is the clearest sign mock mode is active.
- Fix: set `EXPO_PUBLIC_ENABLE_NFC_MOCK=false` (or remove the variable) and rebuild.

### (b) Is expo-dev-client in use?

Check `package.json` (`devDependencies` and `dependencies`). The production NFC library (`react-native-nfc-manager`) requires a native build — it will not function in Expo Go.

- If `expo-dev-client` is present: confirm the dev client was built with `expo run:android` or `expo run:ios`, not launched via `expo start` -> Expo Go.
- If `expo-dev-client` is absent: a custom dev client or production build must be used for NFC. Expo Go silently disables native modules including NFC.
- Log line to look for: `[NFC] Mock scan returning moduleId:` — presence of this line at runtime means the mock path is running regardless of the build type.

### (c) Was `NfcManager.start()` called?

`initNfc()` in `src/services/nfc/nfcManager.ts` calls `NfcManager.start()`. It is invoked by the `useEffect` in `src/hooks/useNfc.ts` on component mount.

- Verify `useNfc()` is mounted before any scan is attempted.
- If `initNfc()` returned `false` (not supported or threw), `isSupported` in `useNfcStore` will be `false` and no scan will be issued.
- Reproduce by adding a temporary `console.log('[NFC] initNfc result:', supported)` inside the `useEffect` in `useNfc.ts`.
- Log line to look for: any error thrown inside `NfcManager.start()` is silently swallowed — check for a missing log line rather than an explicit error.

### (d) Are Android intent filters / iOS entitlements present in `app.json`?

Open `app.json` and confirm:

- **Android**: `expo.android.permissions` includes `"android.permission.NFC"`. Currently present.
- **iOS**: `expo.ios.infoPlist` includes `NFCReaderUsageDescription`. Currently present. Note that iOS also requires the `com.apple.developer.nfc.readersession.formats` entitlement in the provisioning profile — this cannot be set in `app.json` alone. Confirm the EAS build profile targets a provisioning profile that includes NFC capability.
- If these entries are missing or the native build predates the config change, do a clean rebuild.

### (e) Is the payload parseable?

The payload must be a plain UTF-8 text string starting with `tutoria:` (defined as `NFC_TAG_PREFIX` in `src/utils/constants.ts`).

- Call `parseNdefPayload(payload, tagId)` from `src/services/nfc/tagParser.ts` against the raw string read from the card.
- If `isValid` is `false`, check: leading/trailing whitespace (`trimmed` is applied), wrong prefix (e.g. `Tutoria:` with capital T), or an empty `moduleId` after the colon.
- The record must be NDEF type Text (`Ndef.text.decodePayload`). Other NDEF record types (URI, MIME) will decode to garbage.
- Log line to look for: there is no explicit log for a parse failure — add one temporarily: `console.log('[NFC] parseNdefPayload result:', result)` in `readTag()`.

### (f) Is `cancelTechnologyRequest` called in the `finally` block?

`readTag()` in `src/services/nfc/nfcManager.ts` already calls `NfcManager.cancelTechnologyRequest().catch(() => {})` in its `finally` block. If this is missing (e.g. after a code edit), the NFC session stays open and subsequent scans hang indefinitely.

- Confirm the `finally` block is present and unconditional.
- If a scan appears to succeed once then hangs on retries, the `cancelTechnologyRequest` is likely not running.
- On Android, a missing cancel leaves the NDEF technology lock held; the next `requestTechnology` call will time out.

## Key log lines to search

| Log string | Meaning |
|---|---|
| `[NFC] Mock scan returning moduleId:` | Mock mode is active |
| `[API] Network error` | Scan succeeded but subsequent API call failed |
| No log at all after tap | `useNfc` is not mounted or `NfcManager.start()` was not called |

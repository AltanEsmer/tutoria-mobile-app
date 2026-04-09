---
name: nfc-card-mastery
description: Expert in Tutoria's NFC card reading flow using NTAG215 tags, react-native-nfc-manager, NDEF payload parsing, and the phygital learning model. Use for NFC scanning implementation, tag parsing, NFC lifecycle management, or debugging NFC-related issues.
---

# NFC Card Mastery

Tutoria uses **physical NFC cards** (NTAG215) as the primary way children start learning sessions — tapping a card against their device instantly launches the corresponding module, bridging the tactile feel of a physical card with a digital learning experience (phygital). Understanding the NFC layer is essential because it sits at the very entry point of the core learning loop: no card tap, no session. This document covers everything needed to understand, build, and debug NFC card interactions in this project.

---

## Key Concepts

### NFC (Near Field Communication)
NFC is a short-range wireless protocol (≤ 4 cm). In Tutoria, the device acts as a **reader** and the physical cards are passive **tags** — no battery required on the card. The underlying library is [`react-native-nfc-manager`](https://github.com/revtel/react-native-nfc-manager) v3.

### NTAG215 Cards
NTAG215 is a specific NFC tag IC (integrated circuit) made by NXP. Key properties relevant to this project:
- **Capacity:** 504 bytes of user memory
- **Standard:** ISO/IEC 14443-3 (Type 2 Tag)
- **NDEF support:** Yes — the tag stores one NDEF message
- **Use case here:** Each physical learning card has one NDEF Text record written to it containing a module identifier in the format `tutoria:<moduleId>`

### NDEF (NFC Data Exchange Format)
NDEF is the data format standard for NFC messages. Each NDEF message contains one or more **records**. Tutoria cards use a single **NDEF Text record** (TNF `0x01`, type `T`). The decoded payload is a plain UTF-8 string like `tutoria:module-a`.

### NDEF Text Record payload structure
When `Ndef.text.decodePayload()` is called, it strips the language code prefix and returns the raw string. A Tutoria card payload looks like:

```
tutoria:module-a
└──────┘└───────┘
prefix   moduleId
```

The prefix `tutoria:` (defined as `NFC_TAG_PREFIX` in `src/utils/constants.ts`) identifies this as a valid Tutoria card and differentiates it from any other NFC tags the user might accidentally tap.

### NFC Manager Lifecycle
The `react-native-nfc-manager` library requires an explicit lifecycle:
1. **`NfcManager.isSupported()`** — check hardware capability
2. **`NfcManager.start()`** — start the manager (once, at app boot)
3. **`NfcManager.requestTechnology(NfcTech.Ndef)`** — open an NFC session for reading NDEF tags
4. **`NfcManager.getTag()`** — retrieve tag data once it's tapped
5. **`NfcManager.cancelTechnologyRequest()`** — close the session (MUST always be called, even on error)

Skipping step 5 on Android causes the NFC subsystem to become stuck and future reads will fail.

### Phygital Learning Model
"Phygital" = physical + digital. Each Tutoria learning card maps `1:1` to a module in the backend. The child taps the card → the app reads the `moduleId` → the app navigates to that module's session screen. This means:
- Cards are **not** stored in the app database — they are just physical triggers
- The `moduleId` on the card must match a valid module ID in the backend
- A card with an unrecognised `moduleId` results in `isValid: false` (gracefully handled)

---

## Architecture Overview

NFC data flows through four layers before reaching the UI:

```
Physical Card (NTAG215)
        │  tap
        ▼
┌─────────────────────────────────────────────┐
│         nfcManager.ts  (service layer)      │
│  initNfc() · isNfcEnabled() · readTag()     │
│  Manages NFC session lifecycle with the     │
│  react-native-nfc-manager library.          │
└──────────────────┬──────────────────────────┘
                   │  raw NDEF string payload
                   ▼
┌─────────────────────────────────────────────┐
│         tagParser.ts   (parsing layer)      │
│  parseNdefPayload(payload, tagId)           │
│  Validates prefix, extracts moduleId,       │
│  returns NfcTagPayload object.              │
└──────────────────┬──────────────────────────┘
                   │  NfcTagPayload
                   ▼
┌─────────────────────────────────────────────┐
│         useNfc.ts      (hook layer)         │
│  Initialises NFC on mount, exposes scan()   │
│  and wraps store actions. Bridges the       │
│  service layer with React component world.  │
└──────────────────┬──────────────────────────┘
                   │  store updates (Zustand)
                   ▼
┌─────────────────────────────────────────────┐
│      useNfcStore.ts    (state layer)        │
│  isScanning · isSupported · isEnabled       │
│  lastTag · error                            │
└──────────────────┬──────────────────────────┘
                   │  reactive state
                   ▼
       UI Components (src/components/nfc/)
       Navigation / session screen triggers
```

### Barrel export
`src/services/nfc/index.ts` re-exports everything from both service files, so consumers import from `'../services/nfc'` rather than reaching into individual files:

```typescript
import { initNfc, readTag, cleanupNfc } from '../services/nfc';
```

---

## NFC Manager (`nfcManager.ts`)

**Path:** `src/services/nfc/nfcManager.ts`

This is the only file that directly imports from `react-native-nfc-manager`. All other code goes through this abstraction.

### `initNfc(): Promise<boolean>`
Call once at app start (e.g., inside an app-level `useEffect`). Returns `true` if the hardware supports NFC **and** the manager started successfully.

```typescript
const supported = await initNfc();
// supported === false on simulators, iPads without NFC, or old Android devices
```

Internally: checks `isSupported()` → if true, calls `NfcManager.start()` → returns supported flag. Any exception is caught and returns `false` to prevent crashes on unsupported hardware.

### `isNfcEnabled(): Promise<boolean>`
Separate from support — a device can support NFC but have it turned off in Settings. Use this to show a "Please enable NFC" prompt.

```typescript
const enabled = await isNfcEnabled();
if (!enabled) {
  // Show UI prompting user to enable NFC in device settings
}
```

> **Android vs iOS:** On Android, `isEnabled()` reflects the NFC toggle in Settings. On iOS, NFC cannot be disabled by the user — `isEnabled()` always returns `true` if the hardware is present.

### `readTag(): Promise<NfcTagPayload | null>`
The main scanning function. Awaits a tag tap, decodes the NDEF payload, and returns a parsed `NfcTagPayload`. Returns `null` if:
- No tag was tapped before timeout/cancellation
- The tag has no NDEF message
- An exception occurred at any point

```typescript
const tag = await readTag();
if (tag === null) {
  // Scan was cancelled, timed out, or tag was unreadable
}
if (tag && !tag.isValid) {
  // Tag was read but it's not a valid Tutoria card
}
if (tag?.isValid) {
  // Navigate to module: tag.moduleId
}
```

**Internal flow of `readTag()`:**
1. `NfcManager.requestTechnology(NfcTech.Ndef)` — opens the NFC session (blocks until a tag is presented or cancelled)
2. `NfcManager.getTag()` — retrieves the tag data object
3. Validate that `tag.ndefMessage` exists and has at least one record
4. `Ndef.text.decodePayload(new Uint8Array(record.payload))` — decode bytes → UTF-8 string
5. `parseNdefPayload(payload, tagId)` — delegate to tagParser for business logic
6. `finally`: **always** calls `NfcManager.cancelTechnologyRequest()` regardless of success/failure

### `cleanupNfc(): void`
Synchronous cleanup function, safe to call on component unmount. Internally calls `cancelTechnologyRequest()` and swallows any errors. Register this in `useEffect` cleanup:

```typescript
useEffect(() => {
  initNfc();
  return () => cleanupNfc();
}, []);
```

### Error handling pattern
All async functions in `nfcManager.ts` use `try/catch/finally` and return `null` or `false` rather than throwing. This is intentional — the NFC layer should never crash the app due to hardware issues or user cancellation. Error state is propagated upward through the hook/store, not via exceptions.

---

## Tag Parser (`tagParser.ts`)

**Path:** `src/services/nfc/tagParser.ts`

Pure, side-effect-free parsing logic. No NFC library imports — easy to unit test.

### `parseNdefPayload(payload: string, tagId: string): NfcTagPayload`

Parses the decoded NDEF text string and the hardware tag ID into a structured `NfcTagPayload`.

**Input examples:**

| `payload`           | `tagId`        | Result                                         |
|---------------------|----------------|------------------------------------------------|
| `"tutoria:module-a"` | `"04:AB:12:..."` | `{ moduleId: "module-a", isValid: true, ... }` |
| `"tutoria:"`        | `"04:AB:12:..."` | `{ moduleId: "", isValid: false, ... }`        |
| `"other:data"`      | `"04:AB:12:..."` | `{ moduleId: "", isValid: false, ... }`        |
| `"  tutoria:xyz  "` | `"04:AB:12:..."` | `{ moduleId: "xyz", isValid: true, ... }`      |

**Logic:**
1. Trim whitespace from the payload
2. Check that it starts with `NFC_TAG_PREFIX` (`"tutoria:"`)
3. Slice off the prefix to get `moduleId`
4. `isValid` is `true` only when `moduleId.length > 0`

### `NfcTagPayload` type

```typescript
interface NfcTagPayload {
  tagId: string;    // Hardware UID of the physical card (e.g. "04:AB:CD:12:34:56:78")
  moduleId: string; // The learning module this card triggers (e.g. "module-a")
  isValid: boolean; // false if prefix missing or moduleId empty
  rawData?: string; // The original trimmed payload string (for debugging)
}
```

`tagId` comes directly from the NFC hardware — it can be used for analytics or to identify a specific physical card, but it is **not** used for routing. `moduleId` is the routing key.

### `NFC_TAG_PREFIX` constant

Defined in `src/utils/constants.ts`:
```typescript
export const NFC_TAG_PREFIX = 'tutoria:';
```

This prefix namespace ensures Tutoria cards are unambiguous. Any NFC tag not starting with `tutoria:` is treated as invalid and the scan gracefully no-ops.

---

## useNfc Hook

**Path:** `src/hooks/useNfc.ts`

The React bridge between the service layer and UI components. This hook should be used in any component or screen that needs NFC functionality.

### What it does on mount
```typescript
useEffect(() => {
  (async () => {
    const supported = await initNfc();
    store.setSupported(supported);
    if (supported) {
      const enabled = await isNfcEnabled();
      store.setEnabled(enabled);
    }
  })();

  return () => {
    cleanupNfc(); // Always clean up on unmount
  };
}, []); // Runs once
```

On mount, the hook initialises the NFC manager and populates the store's `isSupported` and `isEnabled` flags. These flags drive conditional rendering (e.g., hiding the scan button on unsupported devices, showing an "Enable NFC" prompt).

### `scan()` — the main action

```typescript
const scan = useCallback(async () => {
  store.setScanning(true);
  store.setError(null);

  try {
    const tag = await readTag(); // Blocks until tap or cancellation
    store.setLastTag(tag);
    return tag;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'NFC scan failed';
    store.setError(message);
    return null;
  } finally {
    store.setScanning(false);
  }
}, []);
```

Call `scan()` when the user taps the "Scan card" button. It:
1. Sets `isScanning: true` → shows scanning UI
2. Clears any previous error
3. Awaits the hardware tap (or cancellation)
4. Stores the result in `lastTag`
5. Always sets `isScanning: false` in `finally`

### Return value
The hook returns the entire store state spread plus the `scan` function:

```typescript
const { isScanning, isSupported, isEnabled, lastTag, error, scan } = useNfc();
```

### Typical usage in a screen

```typescript
function ScanScreen() {
  const { isSupported, isEnabled, isScanning, lastTag, error, scan } = useNfc();

  useEffect(() => {
    if (lastTag?.isValid) {
      router.push(`/module/${lastTag.moduleId}`);
    }
  }, [lastTag]);

  if (!isSupported) return <Text>NFC not supported on this device.</Text>;
  if (!isEnabled)  return <Text>Please enable NFC in Settings.</Text>;

  return (
    <Button onPress={scan} disabled={isScanning}>
      {isScanning ? 'Scanning...' : 'Tap your card'}
    </Button>
  );
}
```

---

## NFC Store (`useNfcStore.ts`)

**Path:** `src/stores/useNfcStore.ts`

A [Zustand](https://github.com/pmndrs/zustand) store that holds all NFC-related runtime state. The hook writes to it; UI components read from it.

### State shape

```typescript
interface NfcStore {
  // Read-only status flags
  isScanning:   boolean;           // true while readTag() is awaiting a tap
  isSupported:  boolean;           // true if device hardware supports NFC
  isEnabled:    boolean;           // true if NFC is enabled in device settings

  // Scan results
  lastTag:      NfcTagPayload | null; // The most recently read tag (null if never scanned)
  error:        string | null;        // Error message from last failed scan (null if none)

  // Actions (setters)
  setScanning:  (scanning: boolean) => void;
  setSupported: (supported: boolean) => void;
  setEnabled:   (enabled: boolean) => void;
  setLastTag:   (tag: NfcTagPayload | null) => void;
  setError:     (error: string | null) => void;
}
```

### Direct store subscription (outside hook)

If a component only needs to react to `lastTag` without triggering a scan, it can subscribe directly:

```typescript
import { useNfcStore } from '../stores/useNfcStore';

function LastTagDisplay() {
  const lastTag = useNfcStore((s) => s.lastTag);
  return <Text>{lastTag?.moduleId ?? 'No scan yet'}</Text>;
}
```

Using a selector (`(s) => s.lastTag`) avoids unnecessary re-renders when unrelated state changes.

### Resetting after navigation

After successfully navigating to a module, consider clearing `lastTag` to prevent stale data:

```typescript
const setLastTag = useNfcStore((s) => s.setLastTag);
// After navigation:
setLastTag(null);
```

### `NfcScanState` interface

`src/utils/types.ts` also exports `NfcScanState` which mirrors the non-action fields of `NfcStore`. This can be used as a prop type when passing NFC state down to presentational components.

---

## Best Practices

### 1. Always call `cancelTechnologyRequest()` — even on success
The NFC session MUST be explicitly closed after every read attempt, whether it succeeded, failed, or was cancelled. `nfcManager.ts` handles this in the `finally` block of `readTag()`. If you ever bypass `readTag()` to call the library directly, make sure you follow the same pattern:

```typescript
try {
  await NfcManager.requestTechnology(NfcTech.Ndef);
  // ... do work
} finally {
  NfcManager.cancelTechnologyRequest().catch(() => {});
}
```

### 2. Call `initNfc()` exactly once
`NfcManager.start()` should be called once per app lifecycle. The `useNfc` hook handles this. Do not call `initNfc()` in multiple hooks simultaneously — the second call will fail silently because the manager is already started.

### 3. Check `isSupported` and `isEnabled` before rendering scan UI
Never show a "Tap your card" button if `isSupported` is false or `isEnabled` is false. Gate the entire NFC UI:

```typescript
if (!isSupported) return <UnsupportedDeviceMessage />;
if (!isEnabled) return <EnableNfcPrompt />;
// safe to render scan UI
```

### 4. Validate `isValid` before routing
`readTag()` can return a non-null `NfcTagPayload` with `isValid: false` (unknown card brand, card with no module ID, etc.). Always check `tag.isValid` before navigating:

```typescript
const tag = await scan();
if (tag?.isValid) {
  router.push(`/module/${tag.moduleId}`);
} else if (tag) {
  // Show "This card is not a Tutoria card" message
}
```

### 5. Handle Android NFC Settings navigation
On Android, if NFC is supported but disabled, you can deep-link the user to the NFC settings screen:

```typescript
import { Linking } from 'react-native';
// Android only:
Linking.sendIntent('android.settings.NFC_SETTINGS');
```

### 6. Use `useCallback` for `scan` (already done in hook)
`readTag()` is asynchronous and long-running. The `scan` function is already memoised with `useCallback` in `useNfc.ts`. Avoid recreating scan closures in components — use the hook's returned `scan` directly.

### 7. Keep the NFC service layer free of React dependencies
`nfcManager.ts` and `tagParser.ts` contain zero React imports. This is intentional — keep all React/Zustand bindings in the hook layer. This makes the service layer portable and unit-testable without a React environment.

### 8. iOS requires background NFC entitlement for background scanning
For foreground scanning (user taps button → scan), the `NFCReaderUsageDescription` key in `Info.plist` is sufficient. Background scanning requires a separate entitlement not currently used in this project.

---

## Common Pitfalls

### 1. Forgetting to cancel the technology request
**Symptom:** After one successful or failed scan, subsequent `readTag()` calls immediately return `null` without waiting for a tag, or the Android NFC toast never appears again.  
**Cause:** `requestTechnology()` was called but `cancelTechnologyRequest()` was never called.  
**Fix:** The `finally` block in `readTag()` always calls cancel. If you're writing new code that uses `NfcTech` directly, wrap it in `try/finally`.

### 2. Calling `initNfc()` on every scan
**Symptom:** App starts logging errors like "NFC Manager already started" in the console.  
**Cause:** `initNfc()` is being called in a scan handler instead of once on mount.  
**Fix:** `initNfc()` belongs in a `useEffect(..., [])` (run once). The `useNfc` hook already does this correctly.

### 3. Android vs iOS permission differences
**Android:** Requires `<uses-permission android:name="android.permission.NFC" />` in `AndroidManifest.xml`. This is a normal (not dangerous) permission — no runtime prompt needed.  
**iOS:** Requires `NFCReaderUsageDescription` in `Info.plist` (a usage description string). NFC is only available on iPhone 7 and later. The system shows a native NFC scanning sheet automatically when `requestTechnology()` is called — you do NOT need to build a custom scanner UI on iOS.

### 4. Testing on simulators
**iOS Simulator:** NFC is not supported at all — `isSupported()` returns `false`. `initNfc()` will also return `false`. The entire NFC flow is a no-op. You must use a physical iPhone.  
**Android Emulator:** Most emulators do not have NFC hardware. Some extended emulator images (e.g., Google Play AVDs) expose an NFC toggle, but it requires manual tag injection via the emulator's extended controls. See [Testing NFC Without Physical Cards](#testing-nfc-without-physical-cards).

### 5. `tag.id` may be empty or undefined
The `tagId` from `NfcManager.getTag()` is hardware-dependent. Some tags report their UID; others do not (or the UID is randomised by privacy features). Never rely on `tagId` for module routing — always use `moduleId` from the parsed payload. `tagId` is only for analytics or debugging.

### 6. Payload encoding edge cases
`Ndef.text.decodePayload()` returns the language code stripped from the payload. The raw record bytes include a language code prefix (e.g., `en`). If a card is programmed with an unusual language code or using a URI record type instead of a Text record, decoding will produce an unexpected string and `parseNdefPayload` will return `isValid: false`. Ensure cards are written using the **Text** record type with UTF-8 encoding.

---

## Testing NFC Without Physical Cards

### Strategy 1: Mock the `useNfc` hook
The cleanest approach for component testing. Create a mock for `src/hooks/useNfc.ts` in your test setup:

```typescript
// __mocks__/useNfc.ts
export const useNfc = jest.fn(() => ({
  isSupported: true,
  isEnabled: true,
  isScanning: false,
  lastTag: null,
  error: null,
  scan: jest.fn().mockResolvedValue({
    tagId: 'mock-tag-id',
    moduleId: 'module-a',
    isValid: true,
    rawData: 'tutoria:module-a',
  }),
}));
```

### Strategy 2: Unit test `tagParser.ts` directly
`tagParser.ts` has no side effects and no hardware dependencies — it's a pure function. Write unit tests for it in isolation:

```typescript
import { parseNdefPayload } from '../src/services/nfc/tagParser';

test('valid tutoria card', () => {
  const result = parseNdefPayload('tutoria:module-a', 'tag-123');
  expect(result).toEqual({
    tagId: 'tag-123',
    moduleId: 'module-a',
    isValid: true,
    rawData: 'tutoria:module-a',
  });
});

test('unknown card brand', () => {
  const result = parseNdefPayload('other:data', 'tag-456');
  expect(result.isValid).toBe(false);
  expect(result.moduleId).toBe('');
});

test('empty moduleId after prefix', () => {
  const result = parseNdefPayload('tutoria:', 'tag-789');
  expect(result.isValid).toBe(false);
});
```

### Strategy 3: Mock the service layer
Mock `src/services/nfc/nfcManager.ts` to bypass hardware calls:

```typescript
jest.mock('../src/services/nfc/nfcManager', () => ({
  initNfc: jest.fn().mockResolvedValue(true),
  isNfcEnabled: jest.fn().mockResolvedValue(true),
  readTag: jest.fn().mockResolvedValue({
    tagId: 'mock-id',
    moduleId: 'module-a',
    isValid: true,
    rawData: 'tutoria:module-a',
  }),
  cleanupNfc: jest.fn(),
}));
```

### Strategy 4: Android Emulator NFC tag injection
On an Android AVD that has NFC enabled:
1. Open the emulator's **Extended Controls** (⋮ → NFC)
2. Under "NFC Tag Emulation", add a new NDEF Text tag
3. Set the payload to `tutoria:<moduleId>` (e.g., `tutoria:module-a`)
4. With the app in foreground and a scan in progress, the emulator injects the tag

This is the closest to real hardware you can get without a physical card in a development environment.

### Strategy 5: Develop with `isSupported: false` UI path
Build and test the "NFC not supported" fallback UI path (which renders on simulators) to ensure graceful degradation. This makes much of the surrounding UI testable without any NFC hardware.

---

## Quick Reference

### Key Files

| File | Purpose |
|------|---------|
| `src/services/nfc/nfcManager.ts` | NFC session management, hardware interface |
| `src/services/nfc/tagParser.ts` | NDEF payload parsing, module ID extraction |
| `src/services/nfc/index.ts` | Barrel export for the NFC service |
| `src/hooks/useNfc.ts` | React hook: lifecycle + scanning |
| `src/stores/useNfcStore.ts` | Zustand store: NFC runtime state |
| `src/utils/constants.ts` | `NFC_TAG_PREFIX`, `SUPPORTED_TAG_TECH` |
| `src/utils/types.ts` | `NfcTagPayload`, `NfcScanState` types |
| `src/components/nfc/` | NFC UI components (scanning UI) |

### Key Functions

| Function | File | Description |
|----------|------|-------------|
| `initNfc()` | `nfcManager.ts` | Initialize NFC manager (call once on app start) |
| `isNfcEnabled()` | `nfcManager.ts` | Check if NFC is enabled in device settings |
| `readTag()` | `nfcManager.ts` | Await a tag tap and return parsed payload |
| `cleanupNfc()` | `nfcManager.ts` | Cancel any open NFC session (call on unmount) |
| `parseNdefPayload()` | `tagParser.ts` | Parse raw NDEF string into `NfcTagPayload` |
| `useNfc()` | `useNfc.ts` | React hook exposing `scan()` and store state |
| `useNfcStore()` | `useNfcStore.ts` | Zustand store for NFC state subscriptions |

### Key Constants

| Constant | Value | Purpose |
|----------|-------|---------|
| `NFC_TAG_PREFIX` | `"tutoria:"` | Namespace prefix for all Tutoria NFC cards |
| `SUPPORTED_TAG_TECH` | `"Ndef"` | The NFC technology type used for tag reads |

### NFC Tag Payload Format

```
"tutoria:module-a"
 ^^^^^^^^ ^^^^^^^^
 prefix   moduleId  →  maps to a backend module
```

### `NfcTagPayload` shape

```typescript
{
  tagId:    string;           // Hardware UID (for debug/analytics only)
  moduleId: string;           // Learning module ID (routing key)
  isValid:  boolean;          // true if prefix correct + moduleId non-empty
  rawData?: string;           // Original payload string (debug)
}
```

### Zustand store state at a glance

```typescript
isScanning:  boolean           // Awaiting a tap?
isSupported: boolean           // NFC hardware present?
isEnabled:   boolean           // NFC on in device settings?
lastTag:     NfcTagPayload | null
error:       string | null
```

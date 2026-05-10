---
name: nfc-write-card
description: Write or verify a Tutoria NTAG215 card payload (`tutoria:<moduleId>`). Use when the user wants to program a physical NFC card or check what's on one.
---

## Payload contract

The canonical payload format is a plain UTF-8 text string:

```
tutoria:<moduleId>
```

- `NFC_TAG_PREFIX` (`'tutoria:'`) is defined in `src/utils/constants.ts`.
- The parser lives in `src/services/nfc/tagParser.ts` — `parseNdefPayload(payload, tagId)`.
- A payload is valid when `moduleId` is non-empty after stripping the prefix. The function returns `{ tagId, moduleId, isValid, rawData }`.
- `moduleId` must match a real module slug from the Tutoria curriculum (e.g. `module-a`, `stage-1-lesson-3`). Confirm the slug exists before writing.

## Writing a card today (NFC Tools mobile app)

1. Open the NFC Tools app on Android or iOS.
2. Tap "Write" -> "Add a record" -> "Text".
3. Set the language to `en` and enter the payload exactly: `tutoria:<moduleId>` (no trailing space, no quotes).
4. Tap "OK" then "Write / X bytes".
5. Hold the phone over the NTAG215 card until the write confirmation appears.
6. Immediately verify (see below) before distributing the card.

## Adding an in-app writer (Phase NFC-2b)

This capability is tracked as Phase NFC-2b in `docs/READINESS.md`. The implementation entry point is `src/services/nfc/nfcManager.ts`. Write a new exported async function alongside the existing `readTag`:

```ts
import NfcManager, { NfcTech, Ndef } from 'react-native-nfc-manager';

export async function writeTag(moduleId: string): Promise<boolean> {
  const payload = `${NFC_TAG_PREFIX}${moduleId}`;  // import NFC_TAG_PREFIX from utils/constants
  try {
    await NfcManager.requestTechnology(NfcTech.Ndef);
    const message = Ndef.encodeMessage([Ndef.textRecord(payload)]);
    await NfcManager.writeNdefMessage(message);
    return true;
  } catch {
    return false;
  } finally {
    NfcManager.cancelTechnologyRequest().catch(() => {});
  }
}
```

`NfcManager.start()` must have already been called before invoking `writeTag`. It is called by `initNfc()` (also in `nfcManager.ts`), which runs on app mount via `useNfc` (`src/hooks/useNfc.ts`).

## Validation after writing

Before claiming success — whether via NFC Tools or the in-app writer — re-read the card and run the payload through `parseNdefPayload`:

1. Trigger a scan via `useNfc().scan()` or call `readTag()` directly.
2. Pass the returned `rawData` string to `parseNdefPayload(rawData, tagId)`.
3. Assert `result.isValid === true` and `result.moduleId === <expected moduleId>`.
4. If `isValid` is false, the raw text on the card does not start with `tutoria:` — rewrite the card.
5. If `moduleId` is empty, the prefix was written but the slug is missing — rewrite with the full payload.

Log the full `NfcTagPayload` object to the console so the caller can confirm the round-trip. Do not mark the task done until `isValid` is `true`.

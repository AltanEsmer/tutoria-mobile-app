import { Platform } from 'react-native';
import NfcManager, { NfcTech, Ndef } from 'react-native-nfc-manager';
import type { NfcTagPayload } from '../../utils/types';
import { parseNdefPayload } from './tagParser';

const NFC_MOCK = process.env.EXPO_PUBLIC_ENABLE_NFC_MOCK === 'true';

// NFC Forum Type 2 (NTAG215) READ command: 0x30 + page → returns 16 bytes (4 pages).
const T2T_READ = 0x30;

/**
 * Walk the NFC Forum Type 2 TLV blocks and return the bytes of the first
 * NDEF-Message TLV (type 0x03). Skips NULL/lock/memory-control TLVs and stops at
 * the Terminator TLV (0xFE).
 */
function extractNdefMessageBytes(data: number[]): number[] {
  let i = 0;
  while (i < data.length) {
    const type = data[i];
    if (type === undefined || type === 0xfe) break; // Terminator / end of data
    if (type === 0x00) {
      i += 1; // NULL TLV is a single byte
      continue;
    }
    let len = data[i + 1] ?? 0;
    let valueStart = i + 2;
    if (len === 0xff) {
      // 3-byte length format
      len = ((data[i + 2] ?? 0) << 8) | (data[i + 3] ?? 0);
      valueStart = i + 4;
    }
    if (type === 0x03) {
      return data.slice(valueStart, valueStart + len);
    }
    i = valueStart + len; // skip lock-control (0x01) / memory-control (0x02) TLVs
  }
  return [];
}

/**
 * iOS only. NFCNDEFReaderSession (NfcTech.Ndef) silently fails to surface some
 * otherwise-valid NTAG215 cards. This reads the Type 2 data area directly over a
 * Mifare tag session — the same low-level path NFC Tools uses — and decodes the
 * NDEF text payload. Assumes a Mifare session is already open.
 */
async function readNdefTextViaMifareIOS(): Promise<string> {
  const data: number[] = [];
  // Data area starts at page 4; READ returns 4 pages (16 bytes) at a time. Our
  // payload is tiny, so stop as soon as the Terminator TLV (0xFE) appears.
  for (let page = 4; page <= 36; page += 4) {
    const resp = await NfcManager.sendMifareCommandIOS([T2T_READ, page]);
    if (!resp || resp.length === 0) break;
    data.push(...resp);
    if (resp.includes(0xfe)) break; // Terminator TLV — no more NDEF data
  }
  const ndefBytes = extractNdefMessageBytes(data);
  if (ndefBytes.length === 0) return '';
  const records = Ndef.decodeMessage(ndefBytes);
  if (!records || records.length === 0) return '';
  return Ndef.text.decodePayload(new Uint8Array(records[0].payload));
}

/**
 * Initialize the NFC manager. Call once on app start.
 */
export async function initNfc(): Promise<boolean> {
  if (NFC_MOCK) return true;
  try {
    const supported = await NfcManager.isSupported();
    if (supported) {
      await NfcManager.start();
    }
    return supported;
  } catch (err) {
    console.warn(`[NFC/${Platform.OS}] initNfc failed:`, err instanceof Error ? err.message : err);
    return false;
  }
}

/**
 * Check if NFC is currently enabled on the device.
 */
export async function isNfcEnabled(): Promise<boolean> {
  if (NFC_MOCK) return true;
  try {
    return await NfcManager.isEnabled();
  } catch (err) {
    console.warn(
      `[NFC/${Platform.OS}] isNfcEnabled failed:`,
      err instanceof Error ? err.message : err,
    );
    return false;
  }
}

/**
 * Read an NDEF tag. Returns parsed tag payload or null when no readable tag is present.
 * Throws on real errors (NFC disabled, permission denied, request cancelled) so the
 * caller can surface a message to the user — previously every failure was swallowed
 * and Android users saw the scan button silently do nothing.
 */
export async function readTag(): Promise<NfcTagPayload | null> {
  if (NFC_MOCK) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    const moduleId = process.env.EXPO_PUBLIC_NFC_MOCK_MODULE_ID ?? 'module-a';
    console.warn('[NFC] Mock scan returning moduleId:', moduleId);
    return {
      tagId: 'mock-tag-001',
      moduleId,
      isValid: true,
      rawData: `tutoria:${moduleId}`,
    };
  }

  try {
    let payload: string;
    let tagId: string;

    if (Platform.OS === 'ios') {
      // Use a Mifare tag session (like NFC Tools) rather than the NDEF reader
      // session: iOS's NFCNDEFReaderSession silently fails to detect some valid
      // NTAG215 cards, while a tag session reads their Type 2 data directly.
      await NfcManager.requestTechnology(NfcTech.MifareIOS, {
        alertMessage: 'Hold your Tutoria card near the top of your iPhone',
      });
      const tag = await NfcManager.getTag();
      tagId = tag?.id || '';
      payload = await readNdefTextViaMifareIOS();
    } else {
      await NfcManager.requestTechnology(NfcTech.Ndef);
      const tag = await NfcManager.getTag();
      if (!tag || !tag.ndefMessage || tag.ndefMessage.length === 0) {
        return null;
      }
      tagId = tag.id || '';
      payload = Ndef.text.decodePayload(new Uint8Array(tag.ndefMessage[0].payload));
    }

    if (!payload) {
      return null;
    }

    const parsed = parseNdefPayload(payload, tagId);

    if (parsed.isValid && Platform.OS === 'ios') {
      try {
        await NfcManager.setAlertMessageIOS('Card detected!');
      } catch {
        // swallow — UX polish must not break the real return
      }
    } else if (!parsed.isValid && Platform.OS === 'ios') {
      try {
        await NfcManager.invalidateSessionWithErrorIOS('This is not a Tutoria card');
      } catch {
        // swallow — UX polish must not break the real return
      }
    }

    return parsed;
  } catch (err) {
    console.warn(`[NFC/${Platform.OS}] readTag failed:`, err instanceof Error ? err.message : err);
    throw err instanceof Error ? err : new Error('NFC scan failed');
  } finally {
    NfcManager.cancelTechnologyRequest().catch(() => {});
  }
}

/**
 * Clean up NFC resources. Call on app unmount.
 */
export function cleanupNfc(): void {
  if (NFC_MOCK) return;
  NfcManager.cancelTechnologyRequest().catch(() => {});
}

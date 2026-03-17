import NfcManager, { NfcTech, Ndef } from 'react-native-nfc-manager';
import { parseNdefPayload } from './tagParser';
import type { NfcTagPayload } from '../../utils/types';

/**
 * Initialize the NFC manager. Call once on app start.
 */
export async function initNfc(): Promise<boolean> {
  try {
    const supported = await NfcManager.isSupported();
    if (supported) {
      await NfcManager.start();
    }
    return supported;
  } catch {
    return false;
  }
}

/**
 * Check if NFC is currently enabled on the device.
 */
export async function isNfcEnabled(): Promise<boolean> {
  try {
    return await NfcManager.isEnabled();
  } catch {
    return false;
  }
}

/**
 * Read an NDEF tag. Returns parsed tag payload or null on failure.
 */
export async function readTag(): Promise<NfcTagPayload | null> {
  try {
    await NfcManager.requestTechnology(NfcTech.Ndef);
    const tag = await NfcManager.getTag();

    if (!tag || !tag.ndefMessage || tag.ndefMessage.length === 0) {
      return null;
    }

    const record = tag.ndefMessage[0];
    const payload = Ndef.text.decodePayload(new Uint8Array(record.payload));
    const tagId = tag.id || '';

    return parseNdefPayload(payload, tagId);
  } catch {
    return null;
  } finally {
    NfcManager.cancelTechnologyRequest().catch(() => {});
  }
}

/**
 * Clean up NFC resources. Call on app unmount.
 */
export function cleanupNfc(): void {
  NfcManager.cancelTechnologyRequest().catch(() => {});
}

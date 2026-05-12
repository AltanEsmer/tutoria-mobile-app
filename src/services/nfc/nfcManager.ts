import { Platform } from 'react-native';
import NfcManager, { NfcTech, Ndef } from 'react-native-nfc-manager';
import type { NfcTagPayload } from '../../utils/types';
import { parseNdefPayload } from './tagParser';

const NFC_MOCK = process.env.EXPO_PUBLIC_ENABLE_NFC_MOCK === 'true';

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
    await NfcManager.requestTechnology(NfcTech.Ndef);
    const tag = await NfcManager.getTag();

    if (!tag || !tag.ndefMessage || tag.ndefMessage.length === 0) {
      return null;
    }

    const record = tag.ndefMessage[0];
    const payload = Ndef.text.decodePayload(new Uint8Array(record.payload));
    const tagId = tag.id || '';

    return parseNdefPayload(payload, tagId);
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

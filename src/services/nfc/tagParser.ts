import { NFC_TAG_PREFIX } from '../../utils/constants';
import type { NfcTagPayload } from '../../utils/types';

/**
 * Parse an NDEF text record payload into a NfcTagPayload.
 * Expected format: "tutoria:<moduleId>" (e.g., "tutoria:module-a")
 */
export function parseNdefPayload(payload: string, tagId: string): NfcTagPayload {
  const trimmed = payload.trim();

  if (!trimmed.startsWith(NFC_TAG_PREFIX)) {
    return {
      tagId,
      moduleId: '',
      isValid: false,
      rawData: trimmed,
    };
  }

  const moduleId = trimmed.slice(NFC_TAG_PREFIX.length);

  return {
    tagId,
    moduleId,
    isValid: moduleId.length > 0,
    rawData: trimmed,
  };
}

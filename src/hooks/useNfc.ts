import { useCallback, useEffect } from 'react';
import { initNfc, isNfcEnabled, readTag, cleanupNfc } from '../services/nfc';
import { useNfcStore } from '../stores/useNfcStore';

/**
 * Hook for NFC scanning lifecycle.
 * Initializes NFC on mount and provides scan/cleanup methods.
 */
export function useNfc() {
  // Individual selectors keep refs stable — avoids re-running effects on unrelated state updates
  const setSupported = useNfcStore((s) => s.setSupported);
  const setEnabled = useNfcStore((s) => s.setEnabled);
  const setScanning = useNfcStore((s) => s.setScanning);
  const setError = useNfcStore((s) => s.setError);
  const setLastTag = useNfcStore((s) => s.setLastTag);
  const setScanState = useNfcStore((s) => s.setScanState);

  const isScanning = useNfcStore((s) => s.isScanning);
  const isSupported = useNfcStore((s) => s.isSupported);
  const isEnabled = useNfcStore((s) => s.isEnabled);
  const error = useNfcStore((s) => s.error);
  const lastTag = useNfcStore((s) => s.lastTag);
  const scanState = useNfcStore((s) => s.scanState);

  useEffect(() => {
    (async () => {
      const supported = await initNfc();
      setSupported(supported);
      if (supported) {
        const enabled = await isNfcEnabled();
        setEnabled(enabled);
      }
    })();

    return () => {
      cleanupNfc();
    };
  }, [setSupported, setEnabled]);

  const scan = useCallback(async () => {
    setScanning(true);
    setError(null);
    setScanState('listening');

    try {
      const tag = await readTag();

      if (tag === null) {
        setScanState('parse_error');
        setError('No NDEF message found — unrecognized card');
        setLastTag(null);
        return null;
      }

      if (tag.isValid) {
        setScanState('found');
      } else {
        // isValid === false: iOS sheet already displayed the error via invalidateSessionWithErrorIOS
        setScanState('not_tutoria_card');
      }

      setLastTag(tag);
      return tag;
    } catch (err) {
      // iOS errors arrive as typed class instances (UserCancel, Timeout, SessionInvalidated)
      // from react-native-nfc-manager's buildNfcExceptionIOS — those instances carry empty
      // messages. We therefore check both err.message substrings AND the constructor name
      // (lowercase) so the heuristic is permissive across native bridge versions.
      const message = err instanceof Error ? err.message : 'NFC scan failed';
      const errorKey =
        `${message} ${err instanceof Error ? err.constructor.name : ''}`.toLowerCase();

      if (errorKey.includes('user') || errorKey.includes('cancel')) {
        // User tapped Cancel on the iOS Core NFC modal — no error UI needed
        setScanState('idle');
      } else if (errorKey.includes('timeout')) {
        // iOS 60-second session window expired with no tag detected
        setScanState('parse_error');
        setError('Scan timed out — try again');
      } else if (errorKey.includes('invalidate')) {
        // Session was invalidated (either by the app via invalidateSessionWithErrorIOS
        // after detecting a non-Tutoria payload, or by sessionInvalidated native error).
        // The iOS sheet already conveyed the error; no duplicate message needed.
        setScanState('not_tutoria_card');
      } else {
        // Generic error (Android or unrecognised iOS condition)
        setScanState('parse_error');
        setError(message);
      }

      return null;
    } finally {
      setScanning(false);
    }
  }, [setScanning, setError, setLastTag, setScanState]);

  return {
    isScanning,
    isSupported,
    isEnabled,
    error,
    lastTag,
    scanState,
    scan,
  };
}

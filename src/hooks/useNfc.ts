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

  const isScanning = useNfcStore((s) => s.isScanning);
  const isSupported = useNfcStore((s) => s.isSupported);
  const isEnabled = useNfcStore((s) => s.isEnabled);
  const error = useNfcStore((s) => s.error);
  const lastTag = useNfcStore((s) => s.lastTag);

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

    try {
      const tag = await readTag();
      setLastTag(tag);
      return tag;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'NFC scan failed';
      setError(message);
      return null;
    } finally {
      setScanning(false);
    }
  }, [setScanning, setError, setLastTag]);

  return {
    isScanning,
    isSupported,
    isEnabled,
    error,
    lastTag,
    scan,
  };
}

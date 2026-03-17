import { useCallback, useEffect } from 'react';
import { useNfcStore } from '../stores/useNfcStore';
import { initNfc, isNfcEnabled, readTag, cleanupNfc } from '../services/nfc';

/**
 * Hook for NFC scanning lifecycle.
 * Initializes NFC on mount and provides scan/cleanup methods.
 */
export function useNfc() {
  const store = useNfcStore();

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
      cleanupNfc();
    };
  }, []);

  const scan = useCallback(async () => {
    store.setScanning(true);
    store.setError(null);

    try {
      const tag = await readTag();
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

  return {
    ...store,
    scan,
  };
}

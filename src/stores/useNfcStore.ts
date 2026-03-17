import { create } from 'zustand';
import type { NfcTagPayload } from '../utils/types';

interface NfcStore {
  isScanning: boolean;
  isSupported: boolean;
  isEnabled: boolean;
  lastTag: NfcTagPayload | null;
  error: string | null;
  setScanning: (scanning: boolean) => void;
  setSupported: (supported: boolean) => void;
  setEnabled: (enabled: boolean) => void;
  setLastTag: (tag: NfcTagPayload | null) => void;
  setError: (error: string | null) => void;
}

export const useNfcStore = create<NfcStore>((set) => ({
  isScanning: false,
  isSupported: false,
  isEnabled: false,
  lastTag: null,
  error: null,
  setScanning: (isScanning) => set({ isScanning }),
  setSupported: (isSupported) => set({ isSupported }),
  setEnabled: (isEnabled) => set({ isEnabled }),
  setLastTag: (lastTag) => set({ lastTag }),
  setError: (error) => set({ error }),
}));

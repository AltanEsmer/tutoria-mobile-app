import { create } from 'zustand';

import type { NetworkState } from '../utils/types';

interface NetworkStore extends NetworkState {
  setNetworkState: (state: Partial<NetworkState>) => void;
}

export const useNetworkStore = create<NetworkStore>((set) => ({
  isOnline: true,
  isInternetReachable: null,
  connectionType: null,
  setNetworkState: (state) => set((prev) => ({ ...prev, ...state })),
}));

import { create } from 'zustand';

import type { NetworkState } from '../utils/types';

interface NetworkStore extends NetworkState {
  /** True once we have received at least one confirmed-online event from NetInfo. */
  hasBeenOnline: boolean;
  setNetworkState: (state: Partial<Omit<NetworkStore, 'setNetworkState'>>) => void;
}

export const useNetworkStore = create<NetworkStore>((set) => ({
  isOnline: true,
  isInternetReachable: null,
  connectionType: null,
  hasBeenOnline: false,
  setNetworkState: (state) => set((prev) => ({ ...prev, ...state })),
}));

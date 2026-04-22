import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { useEffect } from 'react';

import { useNetworkStore } from '../stores/useNetworkStore';

export function useNetworkState() {
  // Use a targeted selector — subscribing to the entire store triggers re-renders
  // on every network event, causing the whole layout tree to re-render continuously.
  const setNetworkState = useNetworkStore((s) => s.setNetworkState);

  useEffect(() => {
    const applyState = (state: NetInfoState) => {
      // Three-way check: true = online, false = offline, null = unknown (ignore).
      // Treating null as offline caused false-positive "You're offline" banners
      // because NetInfo emits null during network transitions on Android/iOS.
      if (state.isConnected === true) {
        const current = useNetworkStore.getState();
        // Skip the write if nothing changed — prevents redundant re-renders.
        if (
          current.isOnline === true &&
          current.hasBeenOnline === true &&
          current.isInternetReachable === state.isInternetReachable &&
          current.connectionType === state.type
        ) {
          return;
        }
        setNetworkState({
          isOnline: true,
          hasBeenOnline: true,
          isInternetReachable: state.isInternetReachable,
          connectionType: state.type,
        });
      } else if (state.isConnected === false) {
        // Only mark offline once we have previously confirmed an online state.
        // This prevents startup false-positives where NetInfo briefly returns
        // isConnected: false before the network stack has fully initialised.
        const current = useNetworkStore.getState();
        if (!current.hasBeenOnline) return;

        if (
          current.isOnline === false &&
          current.isInternetReachable === state.isInternetReachable &&
          current.connectionType === state.type
        ) {
          return;
        }
        setNetworkState({
          isOnline: false,
          isInternetReachable: state.isInternetReachable,
          connectionType: state.type,
        });
      }
      // isConnected === null means the state is still being determined — skip entirely.
    };

    NetInfo.fetch().then(applyState);
    const unsubscribe = NetInfo.addEventListener(applyState);

    return () => {
      unsubscribe();
    };
  }, [setNetworkState]);

  // Read return values with targeted selectors to avoid subscribing to the full store.
  const isOnline = useNetworkStore((s) => s.isOnline);
  const isInternetReachable = useNetworkStore((s) => s.isInternetReachable);
  const connectionType = useNetworkStore((s) => s.connectionType);

  return { isOnline, isInternetReachable, connectionType };
}

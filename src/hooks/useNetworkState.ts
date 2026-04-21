import NetInfo from '@react-native-community/netinfo';
import { useEffect } from 'react';

import { useNetworkStore } from '../stores/useNetworkStore';

export function useNetworkState() {
  const { isOnline, isInternetReachable, connectionType, setNetworkState } = useNetworkStore();

  useEffect(() => {
    NetInfo.fetch().then((state) => {
      setNetworkState({
        isOnline: state.isConnected ?? true,
        isInternetReachable: state.isInternetReachable,
        connectionType: state.type,
      });
    });

    const unsubscribe = NetInfo.addEventListener((state) => {
      setNetworkState({
        isOnline: state.isConnected ?? true,
        isInternetReachable: state.isInternetReachable,
        connectionType: state.type,
      });
    });

    return () => {
      unsubscribe();
    };
  }, [setNetworkState]);

  return { isOnline, isInternetReachable, connectionType };
}

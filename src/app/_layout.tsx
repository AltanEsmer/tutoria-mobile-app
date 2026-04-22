import { Slot } from 'expo-router';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { useFonts, Lexend_400Regular, Lexend_700Bold } from '@expo-google-fonts/lexend';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { useNetworkState } from '@/hooks/useNetworkState';
import { useNetworkStore } from '@/stores/useNetworkStore';
import { useProgressStore } from '@/stores/useProgressStore';

// TODO Phase 4: Re-introduce ClerkProvider and auth guard when Clerk JWTs replace the bypass token.

function RootLayoutInner() {
  useNetworkState();

  // Drain offline queue when connectivity is restored
  const isOnline = useNetworkStore((s) => s.isOnline);
  const prevOnlineRef = useRef(isOnline);
  useEffect(() => {
    if (isOnline && !prevOnlineRef.current) {
      useProgressStore.getState().drainQueue();
    }
    prevOnlineRef.current = isOnline;
  }, [isOnline]);

  return (
    <>
      <OfflineBanner />
      <Slot />
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Lexend_400Regular, Lexend_700Bold });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#FF9F1C" />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider initialMetrics={initialWindowMetrics}>
          <RootLayoutInner />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

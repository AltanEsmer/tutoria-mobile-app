import { ClerkProvider, useAuth } from '@clerk/clerk-expo';
import { useFonts, Lexend_400Regular, Lexend_700Bold } from '@expo-google-fonts/lexend';
import { setAudioModeAsync } from 'expo-audio';
import { Slot, useRouter, useSegments } from 'expo-router';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { useNetworkState } from '@/hooks/useNetworkState';
import { setAuthToken, setTokenGetter, setSignOutHandler } from '@/services/api/client';
import { useNetworkStore } from '@/stores/useNetworkStore';
import { useProgressStore } from '@/stores/useProgressStore';
import { CLERK_ENABLED, CLERK_PUBLISHABLE_KEY } from '@/utils/constants';
import { tokenCache } from '@/utils/tokenCache';

const Spinner = () => (
  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
    <ActivityIndicator size="large" color="#FF9F1C" />
  </View>
);

/**
 * Registers Clerk's getToken/signOut with the API client and enforces the
 * signed-in/signed-out redirect guard. Rendered only inside <ClerkProvider>.
 */
function ClerkAuthGate({ children }: { children: ReactNode }) {
  const { isSignedIn, isLoaded, getToken, signOut } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [isAuthReady, setIsAuthReady] = useState(false);

  // Refs keep the latest functions without re-triggering the effect on every render.
  // getToken / signOut can change reference when Clerk refreshes internally.
  const getTokenRef = useRef(getToken);
  const signOutRef = useRef(signOut);
  const routerRef = useRef(router);
  useEffect(() => {
    getTokenRef.current = getToken;
    signOutRef.current = signOut;
    routerRef.current = router;
  });

  // Register the token getter when auth state changes. Using refs avoids the race
  // where cleanup (setTokenGetter(null)) briefly fires mid-navigation, causing
  // unauthenticated requests and 401 errors.
  useEffect(() => {
    if (!isLoaded) return;

    // Wrapped in an async function so the setIsAuthReady call is deferred off the
    // synchronous effect body (avoids cascading-render lint and matches prior behavior).
    async function setupAuth() {
      if (isSignedIn) {
        setTokenGetter(async () => {
          const token = await getTokenRef.current();
          if (__DEV__ && !token) {
            console.warn(
              '[Auth] getToken() returned null — verify EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY matches the backend Clerk instance',
            );
          }
          return token;
        });
        setSignOutHandler(() => {
          signOutRef.current();
          routerRef.current.replace('/(auth)/sign-in');
        });
      } else {
        setTokenGetter(null);
        setAuthToken(null);
        setSignOutHandler(null);
      }
      setIsAuthReady(true);
    }

    setupAuth();
  }, [isSignedIn, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inPublicGroup = segments[0] === '(public)';

    if (!isSignedIn && inPublicGroup) {
      router.replace('/(auth)/sign-in');
    } else if (isSignedIn && inAuthGroup) {
      router.replace('/(public)/(tabs)/home');
    }
  }, [isLoaded, isSignedIn, segments, router]);

  if (!isLoaded || !isAuthReady) {
    return <Spinner />;
  }

  return <>{children}</>;
}

function RootLayoutInner() {
  useNetworkState();

  // Boot-time audio session: play through the loudspeaker on both platforms.
  //   iOS: playsInSilentMode keeps playback audible when the ringer is muted.
  //   Android: shouldRouteThroughEarpiece=false forces the speaker route — without it,
  //   AudioManager may default to the earpiece on some devices after recording, leaving
  //   pronunciation playback inaudible.
  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: 'duckOthers',
      shouldPlayInBackground: false,
      shouldRouteThroughEarpiece: false,
    }).catch(() => {});
  }, []);

  // Drain offline queue when connectivity is restored
  const isOnline = useNetworkStore((s) => s.isOnline);
  const prevOnlineRef = useRef(isOnline);
  useEffect(() => {
    if (isOnline && !prevOnlineRef.current) {
      useProgressStore
        .getState()
        .drainQueue()
        .then(() => useProgressStore.getState().invalidate())
        .catch(() => {});
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
    return <Spinner />;
  }

  const tree = (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <RootLayoutInner />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );

  // No real Clerk key: skip the provider and run on the bypass token.
  if (!CLERK_ENABLED) {
    return <ErrorBoundary>{tree}</ErrorBoundary>;
  }

  return (
    <ErrorBoundary>
      <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} tokenCache={tokenCache}>
        <ClerkAuthGate>{tree}</ClerkAuthGate>
      </ClerkProvider>
    </ErrorBoundary>
  );
}

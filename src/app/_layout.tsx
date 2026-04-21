import { ClerkProvider, useAuth } from '@clerk/clerk-expo';
import * as SecureStore from 'expo-secure-store';
import { Slot, useRouter, useSegments } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, Lexend_400Regular, Lexend_700Bold } from '@expo-google-fonts/lexend';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { useNetworkState } from '@/hooks/useNetworkState';
import { useAuthStore } from '@/stores/useAuthStore';
import { useNetworkStore } from '@/stores/useNetworkStore';
import { useProgressStore } from '@/stores/useProgressStore';
import { setAuthToken, setTokenGetter, setSignOutHandler } from '@/services/api/client';
import { tokenCache } from '@/utils/tokenCache';
import { CLERK_PUBLISHABLE_KEY } from '@/utils/constants';

function RootLayoutInner() {
  const { isSignedIn, isLoaded, getToken, signOut } = useAuth();
  useNetworkState();
  const segments = useSegments();
  const router = useRouter();
  const [isAuthReady, setIsAuthReady] = useState(false);

  // Refs keep the latest functions without re-triggering the effect on every render.
  // getToken / signOut can change reference when Clerk refreshes internally.
  const getTokenRef = useRef(getToken);
  const signOutRef = useRef(signOut);
  const routerRef = useRef(router);
  // Sync refs after every render so effects always read the latest value.
  useEffect(() => {
    getTokenRef.current = getToken;
    signOutRef.current = signOut;
    routerRef.current = router;
  });

  // Register the token getter once when auth state changes.
  // Using refs avoids the race condition where cleanup (setTokenGetter(null)) briefly
  // fires mid-navigation, causing unauthenticated requests and 401 errors.
  useEffect(() => {
    if (!isLoaded) return;

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

  // Drain offline queue when connectivity is restored
  const isOnline = useNetworkStore((s) => s.isOnline);
  const prevOnlineRef = useRef(isOnline);
  useEffect(() => {
    if (isOnline && !prevOnlineRef.current) {
      useProgressStore.getState().drainQueue();
    }
    prevOnlineRef.current = isOnline;
  }, [isOnline]);

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
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#FF9F1C" />
      </View>
    );
  }

  return (
    <>
      <OfflineBanner />
      <Slot />
    </>
  );
}

export default function RootLayout() {
  const [hasHydrated, setHasHydrated] = useState(false);
  const [fontsLoaded] = useFonts({ Lexend_400Regular, Lexend_700Bold });

  useEffect(() => {
    async function hydrate() {
      try {
        const token = await SecureStore.getItemAsync('clerk-token');
        const userId = await SecureStore.getItemAsync('clerk-user-id');
        if (token && userId) {
          useAuthStore.getState().setAuth(userId, token);
        }
      } catch {
        // Ignore hydration errors — user will just need to sign in
      } finally {
        setHasHydrated(true);
      }
    }
    hydrate();
  }, []);

  if (!hasHydrated || !fontsLoaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#FF9F1C" />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} tokenCache={tokenCache}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <SafeAreaProvider>
            <RootLayoutInner />
          </SafeAreaProvider>
        </GestureHandlerRootView>
      </ClerkProvider>
    </ErrorBoundary>
  );
}

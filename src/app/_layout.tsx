import { ClerkProvider, useAuth } from '@clerk/clerk-expo';
import * as SecureStore from 'expo-secure-store';
import { Slot, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { useAuthStore } from '@/stores/useAuthStore';
import { tokenCache } from '@/utils/tokenCache';
import { CLERK_PUBLISHABLE_KEY } from '@/utils/constants';

function RootLayoutInner() {
  const { isSignedIn, isLoaded } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inPublicGroup = segments[0] === '(public)';

    if (!isSignedIn && inPublicGroup) {
      router.replace('/(auth)/sign-in');
    } else if (isSignedIn && inAuthGroup) {
      router.replace('/(public)/home');
    }
  }, [isLoaded, isSignedIn, segments]);

  return <Slot />;
}

export default function RootLayout() {
  const [hasHydrated, setHasHydrated] = useState(false);

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

  if (!hasHydrated) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#4F46E5" />
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

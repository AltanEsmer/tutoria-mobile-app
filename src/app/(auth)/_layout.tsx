import { useAuth } from '@clerk/clerk-expo';
import { Redirect, Stack } from 'expo-router';
import { CLERK_ENABLED } from '@/utils/constants';

function GuardedAuthLayout() {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) return null;

  if (isSignedIn) {
    return <Redirect href="/(public)/(tabs)/home" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function AuthLayout() {
  // Bypass mode (no Clerk key): auth screens are unreachable; land on home.
  if (!CLERK_ENABLED) {
    return <Redirect href="/(public)/(tabs)/home" />;
  }

  return <GuardedAuthLayout />;
}

import { useAuth } from '@clerk/clerk-expo';
import { Redirect, Stack } from 'expo-router';
import { CLERK_ENABLED } from '@/utils/constants';

function PublicStack() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="lesson/[moduleId]" />
    </Stack>
  );
}

function GuardedPublicLayout() {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) return null;

  if (!isSignedIn) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return <PublicStack />;
}

export default function PublicLayout() {
  // Bypass mode (no Clerk key): no auth guard, render the stack directly.
  if (!CLERK_ENABLED) {
    return <PublicStack />;
  }

  return <GuardedPublicLayout />;
}

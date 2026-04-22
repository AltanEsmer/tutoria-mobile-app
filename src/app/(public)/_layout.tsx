import { Stack } from 'expo-router';

// TODO Phase 4: Restore Clerk auth guard when JWTs replace the bypass token.
export default function PublicLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="lesson/[moduleId]" />
    </Stack>
  );
}

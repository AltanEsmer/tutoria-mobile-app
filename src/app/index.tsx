import { Redirect } from 'expo-router';

// Entry point: always land on Home while Clerk auth is bypassed.
// TODO Phase 4: Restore conditional redirect to /(auth)/sign-in for unauthenticated users.
export default function Index() {
  return <Redirect href="/(public)/(tabs)/home" />;
}

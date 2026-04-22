import { Redirect } from 'expo-router';

// TODO Phase 4: Restore Clerk auth guard when JWTs replace the bypass token.
export default function AuthLayout() {
  return <Redirect href="/(public)/(tabs)/home" />;
}

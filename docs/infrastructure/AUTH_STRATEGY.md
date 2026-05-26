# Authentication Strategy — Tutoria Mobile App

> **Audience:** Mobile engineers and anyone integrating the Tutoria client with the backend API.
> **Last updated:** 2026-05-26
> **Scope:** React Native/Expo 55 client authentication UX and API authorization.

Tutoria uses [Clerk](https://clerk.com) for the mobile client's sign-in, sign-up, and session experience, while the Cloudflare Workers backend currently accepts only a single static bypass token. These two concerns are deliberately decoupled: Clerk controls the user-facing identity layer, and the API client always sends the static token to the backend. This document describes the current code, the tension between the two layers, and the single change needed to connect them once the backend is ready.

---

## Table of Contents

1. [Problem Statement](#1-problem-statement)
2. [Strategy: Clerk for Client UX, Bypass Token for the API](#2-strategy-clerk-for-client-ux-bypass-token-for-the-api)
3. [How It Works Today](#3-how-it-works-today)
4. [Required Change to Honor the Strategy](#4-required-change-to-honor-the-strategy)
5. [Setup Steps](#5-setup-steps)
6. [Migration Path](#6-migration-path)
7. [Cross-References and Caveats](#7-cross-references-and-caveats)

---

## 1. Problem Statement

The mobile client needs a robust, production-quality authentication UX — sign-in with email/password, sign-up, forgot-password, session persistence across restarts, and automatic token refresh. Clerk provides all of this out of the box for Expo apps.

The Tutoria backend (a separate Cloudflare Workers repository, outside this repo) does not yet validate Clerk JWTs. Its sole authentication mechanism today is a single static token:

```
Authorization: Bearer tutoria-integration-test-2026
```

Any request bearing a different token — including a Clerk-issued JWT — will be rejected.

The developer who sets up the mobile client supplies their own Clerk publishable key obtained from the Clerk dashboard. The app must therefore:

- Present a fully functional Clerk-powered auth UX when the key is present.
- Keep every API call authorized by sending the static bypass token, regardless of whether a Clerk session exists.
- Transition to sending Clerk JWTs with minimal code changes once the backend supports them.

---

## 2. Strategy: Clerk for Client UX, Bypass Token for the API

The chosen approach decouples authentication (who the user is, managed by Clerk) from API authorization (what the backend will accept, currently a static token).

```
┌─────────────────────┐   sign-in / sign-up / forgot-password   ┌──────────┐
│   React Native App  │ ◀──────────────────────────────────────▶ │  Clerk   │
│                     │   session + JWT issued and cached         │  (IdP)   │
│  Clerk UX handles:  │                                           └──────────┘
│  • Login screens    │
│  • Session state    │   ALL API requests                        ┌─────────────────────┐
│  • Token refresh    │ ─────────────────────────────────────────▶│  Cloudflare Worker  │
│                     │   Authorization: Bearer tutoria-           │  (bypass token only) │
│                     │   integration-test-2026                   └─────────────────────┘
└─────────────────────┘
```

Clerk handles the user's identity entirely on the client side. The API client, however, ignores the Clerk JWT when building the `Authorization` header and always sends the bypass token. The two concerns share no code path today; they will be joined by a single flag (`BACKEND_SUPPORTS_CLERK`) when the backend is ready.

---

## 3. How It Works Today

### 3.1 The `CLERK_ENABLED` gate — `src/utils/constants.ts`

```typescript
// src/utils/constants.ts  lines 7–14
export const CLERK_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || '';

export const CLERK_ENABLED =
  /^pk_(test|live)_/.test(CLERK_PUBLISHABLE_KEY) &&
  !CLERK_PUBLISHABLE_KEY.includes('your_key_here');
```

`CLERK_ENABLED` is `true` only when `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` holds a real Clerk key matching the pattern `pk_test_…` or `pk_live_…`, and does not contain the placeholder string `your_key_here`. An empty variable (the default in CI and local development without a `.env`) keeps Clerk entirely off; the app runs straight through to the home screen without any auth screens.

### 3.2 Conditional `ClerkProvider` — `src/app/_layout.tsx`

```typescript
// src/app/_layout.tsx  lines 153–165
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
```

When `CLERK_ENABLED` is `false`, `ClerkProvider` is never mounted and `ClerkAuthGate` is never rendered; the whole tree runs bypass-token mode. When `CLERK_ENABLED` is `true`, `ClerkProvider` wraps the tree and `ClerkAuthGate` activates.

`ClerkAuthGate` (lines 28–97) does two things:

1. **Registers token helpers with the API client.** On sign-in, it calls `setTokenGetter(async () => getToken())` and `setSignOutHandler(...)` from `src/services/api/client`. On sign-out it nulls both out.
2. **Enforces route guards.** Users not signed in who navigate to `(public)` routes are redirected to `/(auth)/sign-in`; signed-in users navigating to `(auth)` routes are redirected to `/(public)/(tabs)/home`.

The `tokenCache` used by `ClerkProvider` is defined in `src/utils/tokenCache.ts` and backed by `expo-secure-store`, so Clerk sessions survive app restarts without using unencrypted `AsyncStorage`.

### 3.3 Route guards — `(auth)/_layout.tsx` and `(public)/_layout.tsx`

Both layouts check `CLERK_ENABLED` before rendering a guard:

- `src/app/(auth)/_layout.tsx` (lines 17–24): when `CLERK_ENABLED` is `false`, immediately redirects to `/(public)/(tabs)/home`. When `true`, renders `GuardedAuthLayout`, which redirects already-signed-in users away.
- `src/app/(public)/_layout.tsx` (lines 26–33): when `CLERK_ENABLED` is `false`, renders the public stack with no guard. When `true`, renders `GuardedPublicLayout`, which redirects unsigned-in users to `/(auth)/sign-in`.

### 3.4 Request interceptor — `src/services/api/client.ts`

```typescript
// src/services/api/client.ts  line 22
const BYPASS_TOKEN = 'tutoria-integration-test-2026';
```

```typescript
// src/services/api/client.ts  lines 98–109
apiClient.interceptors.request.use(async (config) => {
  if (_getToken) {
    const token = await _getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      return config;
    }
  }
  config.headers.Authorization = `Bearer ${BYPASS_TOKEN}`;
  return config;
});
```

The interceptor resolves a Clerk JWT when `_getToken` is registered and returns a non-null value; otherwise it falls back to the bypass token. `_getToken` is set only when `CLERK_ENABLED` is `true` and a user is signed in (see §3.2 above).

**This is the design tension.** With the current code, once a user signs in under Clerk, the interceptor begins sending Clerk JWTs to the backend. Because the backend cannot validate those JWTs, every request returns `401 Unauthorized`. The response interceptor (lines 112–126) will call the sign-out handler on a non-retryable `401`, logging the user out immediately. The chosen strategy — always send the bypass token regardless of Clerk state — is not yet enforced by the code.

### 3.5 Supplementary token helpers

Two helper functions are exported from `src/services/api/client.ts` for contexts that cannot use the Axios interceptor (e.g., `expo-file-system` native downloads):

- `getAuthHeader()` (line 82): synchronous, always returns `Bearer tutoria-integration-test-2026`. Safe to call anywhere.
- `getAuthHeaderAsync()` (lines 89–96): async, returns a Clerk JWT when one is available, otherwise the bypass token — subject to the same design tension described above.

The deprecated `setAuthToken()` function (line 69) mutates `apiClient.defaults.headers.common` directly. It is kept only for backward compatibility; `setTokenGetter` is the correct interface for Clerk integration.

---

## 4. Required Change to Honor the Strategy

> **Status: proposed follow-up — not yet implemented.**
> This section describes a code change that is out of scope for this documentation task. It must be completed before setting a real `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` in a non-development environment.

### 4.1 Add `BACKEND_SUPPORTS_CLERK` to `src/utils/constants.ts`

```typescript
// Proposed addition to src/utils/constants.ts
//
// Set to true when the Cloudflare Worker is updated to verify Clerk JWTs via
// its JWKS endpoint. While false, the request interceptor always sends the
// static bypass token, even when a Clerk session is active.
export const BACKEND_SUPPORTS_CLERK = false;
```

### 4.2 Update the request interceptor in `src/services/api/client.ts`

The interceptor at lines 98–109 must check `BACKEND_SUPPORTS_CLERK` before injecting the Clerk JWT:

```typescript
// Proposed replacement for the request interceptor block
// (src/services/api/client.ts  lines 98–109)
import { BACKEND_SUPPORTS_CLERK } from '../../utils/constants';

apiClient.interceptors.request.use(async (config) => {
  if (BACKEND_SUPPORTS_CLERK && _getToken) {
    const token = await _getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      return config;
    }
  }
  // Backend does not yet validate Clerk JWTs — always send the bypass token.
  config.headers.Authorization = `Bearer ${BYPASS_TOKEN}`;
  return config;
});
```

The same guard should be applied to `getAuthHeaderAsync()` so that native file-system downloads also fall back to the bypass token until the backend is ready:

```typescript
// Proposed replacement for getAuthHeaderAsync()
export async function getAuthHeaderAsync(): Promise<string> {
  if (BACKEND_SUPPORTS_CLERK && _getToken) {
    const token = await _getToken();
    if (token) return `Bearer ${token}`;
  }
  return `Bearer ${BYPASS_TOKEN}`;
}
```

With `BACKEND_SUPPORTS_CLERK = false`, the app can be shipped with a real Clerk publishable key. Users get the full Clerk UX — sign-in, sign-up, session persistence, route guards — while every API call continues to use the bypass token transparently.

---

## 5. Setup Steps

### 5.1 Obtain a Clerk publishable key

1. Create or sign in to a [Clerk](https://clerk.com) account.
2. Create a new application in the Clerk dashboard.
3. Under **API Keys**, copy the **Publishable key** — it will look like `pk_test_abc123...` (development) or `pk_live_abc123...` (production).

### 5.2 Set the key in `.env`

Create (or edit) `.env` in the project root:

```
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_actual_key_here
```

Do not commit this file — it is listed in `.gitignore`. For CI pipelines, inject the key as a secret environment variable.

### 5.3 What `CLERK_ENABLED` then does

Once the key is set, `CLERK_ENABLED` (in `src/utils/constants.ts` line 12) evaluates to `true`. This activates:

- `ClerkProvider` wrapping the app tree (`src/app/_layout.tsx` line 160).
- `ClerkAuthGate`, which registers the token getter and sign-out handler.
- Route guards in `(auth)/_layout.tsx` and `(public)/_layout.tsx` (both respond to `CLERK_ENABLED`).

Without the proposed `BACKEND_SUPPORTS_CLERK` fix (§4), the request interceptor will begin injecting Clerk JWTs into API calls, causing `401` errors. Complete §4 before enabling Clerk in any environment where real API calls are made.

### 5.4 What the route guards enforce

| Condition | Result |
|---|---|
| `CLERK_ENABLED = false` (no key) | All routes accessible; no auth screens rendered; bypass token used |
| `CLERK_ENABLED = true`, user not signed in, navigates to `(public)` | Redirected to `/(auth)/sign-in` |
| `CLERK_ENABLED = true`, user signed in, navigates to `(auth)` | Redirected to `/(public)/(tabs)/home` |

---

## 6. Migration Path

When the Cloudflare Workers backend is updated to validate Clerk JWTs, the client migration requires exactly one change: flip `BACKEND_SUPPORTS_CLERK` to `true` in `src/utils/constants.ts`.

No changes to screens, routes, or Clerk configuration are needed. The interceptor will automatically start injecting live Clerk JWTs once the flag is set, and the bypass token will no longer be sent to authenticated endpoints.

**Backend prerequisites for the migration:**

- The Worker must fetch Clerk's JWKS endpoint (`https://<your-clerk-instance>.clerk.accounts.dev/.well-known/jwks.json`) on cold start and cache the keys in Cloudflare KV by `kid`.
- The Worker must verify the JWT signature, `exp` claim, and `iss` claim on every authenticated route.
- When an unknown `kid` is encountered (key rotation), the Worker must re-fetch the JWKS rather than rejecting the token immediately.
- Profile ownership checks must use `jwt.sub` (the Clerk user ID) as the authoritative identity anchor.

Once both sides are updated, the static bypass token should be retired. Remove the `BYPASS_TOKEN` constant, `getAuthHeader()`, and the deprecated `setAuthToken()` export from `src/services/api/client.ts` as a final cleanup step.

---

## 7. Cross-References and Caveats

### 7.1 `docs/infrastructure/SECURITY.md`

Section 1.1 of that document describes an aspirational Clerk JWT flow in which the backend verifies tokens via JWKS (see the sequence diagram at line 31 and the interceptor code snippet at line 58–97). That description reflects the target architecture, not the current code. The actual interceptor in `src/services/api/client.ts` diverges: it uses a registered callback rather than calling `useAuth()` inside a factory function, and the bypass token fallback is the live behavior today.

Section 1.2's code snippet (`createAuthenticatedClient`) is a design reference and does not exist in the codebase — `src/services/api/client.ts` is a singleton Axios instance, not a factory.

### 7.2 `docs/API_INTEGRATION.md`

That document may describe `setAuthToken()` as the primary token injection mechanism. That function (now deprecated at `src/services/api/client.ts` line 69) mutates `apiClient.defaults.headers` and is superseded by the `setTokenGetter` / request interceptor pattern. The deprecated function remains in place only to avoid breaking any call sites that predate the current architecture.

### 7.3 `src/stores/useAuthStore.ts`

`useAuthStore` exposes `setAuth` / `clearAuth` but `ClerkAuthGate` does not write to it. The store is currently vestigial: Clerk's own `useAuth()` hook is the authoritative source of sign-in state. `useAuthStore` should not be read by components for auth decisions; use `useAuth()` (when `CLERK_ENABLED`) or assume signed-in (when `CLERK_ENABLED` is `false`).

### 7.4 Summary of live vs. aspirational behavior

| Concern | Current behavior | Target behavior (post-migration) |
|---|---|---|
| Client auth UX | Clerk (when key is set) | Clerk |
| API `Authorization` header | Always bypass token | Clerk JWT (when `BACKEND_SUPPORTS_CLERK = true`) |
| Backend JWT validation | Not implemented | Clerk JWKS verification |
| `useAuthStore` | Vestigial, not written | Retire or repurpose |

---

*This document should be updated when `BACKEND_SUPPORTS_CLERK` is flipped to `true` or when the bypass token is retired.*

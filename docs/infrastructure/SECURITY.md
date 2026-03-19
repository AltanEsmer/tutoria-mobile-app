# Security Architecture — Tutoria Mobile App

> **Audience:** Engineers, security reviewers, and compliance personnel.
> **Last updated:** 2025
> **Scope:** React Native/Expo 55 client + Cloudflare Worker backend.

Tutoria serves children aged 6–12 with dyslexia. Every security decision must be evaluated through the lens of **protecting minors' data**. COPPA (US) and GDPR-K (EU) obligations apply. When in doubt, collect less, store less, and disclose more.

---

## Table of Contents

1. [Authentication & Authorization](#1-authentication--authorization)
2. [Secure Storage](#2-secure-storage)
3. [NFC Security](#3-nfc-security)
4. [Network Security](#4-network-security)
5. [Data Privacy — Children's Data](#5-data-privacy--childrens-data)
6. [Input Validation](#6-input-validation)
7. [Error Handling Security](#7-error-handling-security)
8. [Security Checklist](#8-security-checklist)

---

## 1. Authentication & Authorization

### 1.1 Clerk JWT Flow

Tutoria uses [Clerk](https://clerk.com) as the identity provider. The mobile client never handles raw passwords — all credential exchange happens within Clerk's SDK.

```
┌─────────────┐     1. Sign in / Sign up      ┌─────────────┐
│  Expo App   │ ─────────────────────────────▶ │    Clerk    │
│             │ ◀───────────────────────────── │  (IdP/STS)  │
│             │     2. session + JWT issued     └─────────────┘
│             │
│             │     3. JWT in Authorization     ┌─────────────────────┐
│             │ ─────────────────────────────▶ │  Cloudflare Worker  │
│             │ ◀───────────────────────────── │  (verifies w/ JWKS) │
└─────────────┘     4. Protected response       └─────────────────────┘
```

**Token lifecycle:**

| Property | Value |
|---|---|
| Token type | Short-lived JWT (RS256) |
| Default expiry | 60 seconds (Clerk session token) |
| Refresh mechanism | Clerk SDK auto-refreshes via `getToken()` before each request |
| JWKS endpoint | `https://clerk.your-domain.com/.well-known/jwks.json` |
| Backend verification | Worker fetches JWKS on cold start, caches in KV with TTL |

The backend **must not** trust tokens beyond their `exp` claim. The Clerk JWKS public keys must be rotated gracefully — cache keys by `kid` and re-fetch when an unknown `kid` is encountered.

### 1.2 Bearer Token Injection — Axios Interceptor

Tokens are injected at the HTTP client level via a request interceptor. This centralizes the logic and prevents any individual call from accidentally omitting the header.

```typescript
// src/lib/apiClient.ts
import axios from 'axios';
import { useAuth } from '@clerk/clerk-expo';

export function createAuthenticatedClient() {
  const { getToken } = useAuth();

  const client = axios.create({
    baseURL: process.env.EXPO_PUBLIC_API_BASE_URL,
    timeout: 30_000,
  });

  client.interceptors.request.use(async (config) => {
    // getToken() returns a fresh token or a cached one that is still valid.
    // Clerk handles refresh transparently. Never cache this value yourself.
    const token = await getToken();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  });

  // Response interceptor: handle 401 explicitly
  client.interceptors.response.use(
    (response) => response,
    async (error) => {
      if (error.response?.status === 401) {
        // Force sign-out; do not silently retry with a stale token.
        // Navigation to sign-in screen is handled by the auth context.
      }
      return Promise.reject(error);
    }
  );

  return client;
}
```

**Rules:**
- Never call `getToken()` outside the interceptor and cache the result in a variable for reuse. Tokens expire in 60 s.
- Never log `config.headers.Authorization` — strip it in any debug middleware.
- The interceptor must not retry on `401`. A `401` means the session is invalid; the user must re-authenticate.

### 1.3 Token Storage — expo-secure-store

Clerk's Expo SDK requires a custom token cache to persist sessions across app restarts. This cache **must** use `expo-secure-store`, not `AsyncStorage`.

```typescript
// src/lib/tokenCache.ts
import * as SecureStore from 'expo-secure-store';
import { TokenCache } from '@clerk/clerk-expo/dist/cache';

const TOKEN_KEY_PREFIX = 'clerk_token_';

export const secureTokenCache: TokenCache = {
  async getToken(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(`${TOKEN_KEY_PREFIX}${key}`);
    } catch {
      // If secure store is unavailable (e.g., device without secure hardware),
      // return null and let Clerk prompt for re-authentication.
      return null;
    }
  },

  async saveToken(key: string, token: string): Promise<void> {
    await SecureStore.setItemAsync(`${TOKEN_KEY_PREFIX}${key}`, token, {
      // Require device unlock (biometric or PIN) to access the value.
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  },

  async clearToken(key: string): Promise<void> {
    await SecureStore.deleteItemAsync(`${TOKEN_KEY_PREFIX}${key}`);
  },
};
```

```tsx
// App.tsx
import { ClerkProvider } from '@clerk/clerk-expo';
import { secureTokenCache } from './src/lib/tokenCache';

export default function App() {
  return (
    <ClerkProvider
      publishableKey={process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!}
      tokenCache={secureTokenCache}
    >
      {/* ... */}
    </ClerkProvider>
  );
}
```

> ⚠️ **Never** use `AsyncStorage` as the `tokenCache`. AsyncStorage is unencrypted and readable by any process with file system access on a rooted/jailbroken device.

### 1.4 Profile-Level Authorization

Tutoria's data model has **parent/tutor accounts** that own **child profiles**. A profile belongs to exactly one Clerk user.

Authorization rules enforced **on the backend** (not just the client):

| Resource | Rule |
|---|---|
| `GET /profiles/:id` | `profile.clerkUserId === jwt.sub` |
| `PATCH /profiles/:id` | `profile.clerkUserId === jwt.sub` |
| `GET /modules/:id/progress/:profileId` | Profile must be owned by `jwt.sub` |
| `POST /pronunciation/analyze` | Profile in request body must be owned by `jwt.sub` |
| `GET /nfc/:moduleId` | Authenticated; no profile ownership check needed (public module data) |

The client **must not** use profile ownership checks as a security gate — they are UI helpers only. The Worker validates ownership on every request by joining the profile against the authenticated user's `sub` claim.

```typescript
// Cloudflare Worker — ownership check pattern
async function assertProfileOwnership(
  db: D1Database,
  profileId: string,
  clerkUserId: string
): Promise<void> {
  const profile = await db
    .prepare('SELECT id FROM profiles WHERE id = ?1 AND clerk_user_id = ?2')
    .bind(profileId, clerkUserId)
    .first();

  if (!profile) {
    throw new Response('Forbidden', { status: 403 });
  }
}
```

### 1.5 Session Management

- Clerk manages session revocation. A revoked session's tokens will fail JWKS validation.
- On sign-out, call `signOut()` from `useAuth()` and await it — this clears the secure token cache.
- The app must handle token expiry gracefully: navigate to the sign-in screen, do not queue failed requests for retry.
- Idle session timeout: defer to Clerk's dashboard setting (recommended: 7 days for parent accounts).

---

## 2. Secure Storage

### 2.1 Storage Classification

| Data | Storage | Reason |
|---|---|---|
| Clerk session tokens | `expo-secure-store` | Encrypted, hardware-backed |
| Clerk publishable key | `expo-secure-store` (via `.env`) | Low sensitivity, but keep out of source |
| Active child profile ID | `expo-secure-store` | Ties identity to a minor |
| User preferences (theme, font size) | `AsyncStorage` | Non-sensitive |
| Cached module metadata | `AsyncStorage` | Public content |
| NFC tag module ID (last scanned) | `AsyncStorage` | Non-sensitive lookup key |
| Audio recordings | **Never persisted** | Streamed to API, discarded client-side |
| Full API responses with child progress | `AsyncStorage` (TTL-limited) | Evictable cache; no PII in progress data |
| Clerk secret key | **Never on client** | Server-side only |
| Azure/Gemini/Mistral API keys | **Never on client** | Worker secrets (Cloudflare KV/Secrets) |

### 2.2 expo-secure-store Usage

`expo-secure-store` maps to:
- **iOS:** Keychain Services with `kSecAttrAccessibleWhenUnlockedThisDeviceOnly` — data cannot be restored to another device via iCloud backup.
- **Android:** Android Keystore System — AES-256 encryption, keys are hardware-backed on devices with a secure element.

```typescript
import * as SecureStore from 'expo-secure-store';

// Writing
await SecureStore.setItemAsync('active_profile_id', profileId, {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
});

// Reading
const profileId = await SecureStore.getItemAsync('active_profile_id');

// Deleting (e.g., on sign-out)
await SecureStore.deleteItemAsync('active_profile_id');
```

> ⚠️ `expo-secure-store` has a **2048-byte value limit**. Do not store large JSON blobs. Store identifiers or short tokens only.

### 2.3 AsyncStorage Usage

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

// Store non-sensitive cached data with a timestamp for TTL enforcement
const CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutes

await AsyncStorage.setItem(
  `module_cache_${moduleId}`,
  JSON.stringify({ data: moduleData, cachedAt: Date.now() })
);

// On read, check TTL
const raw = await AsyncStorage.getItem(`module_cache_${moduleId}`);
if (raw) {
  const { data, cachedAt } = JSON.parse(raw);
  if (Date.now() - cachedAt < CACHE_TTL_MS) {
    return data;
  }
  await AsyncStorage.removeItem(`module_cache_${moduleId}`);
}
```

**Never store in AsyncStorage:**
- Session tokens or any bearer credentials
- Raw audio or speech recordings
- Full name + profile ID pairs (treat combined PII carefully)
- Anything from the `expo-secure-store` classification table above

### 2.4 Audio Recording Lifecycle

Audio is the most sensitive data Tutoria handles — it is a child's voice.

```
1. User taps "Record" ──▶ RecordingSession starts (in-memory buffer only)
2. User taps "Stop"   ──▶ Audio blob is held in memory (never written to disk by the app)
3.                    ──▶ POST /pronunciation/analyze (multipart, HTTPS, with Bearer token)
4. Worker receives    ──▶ Forwards to Azure Speech (TTS), Gemini/Mistral (analysis)
5. Worker responds    ──▶ Analysis result (JSON, no audio) returned to client
6. Client discards    ──▶ Audio blob is released from memory
7. Worker discards    ──▶ Audio is NOT persisted to R2 or D1 unless explicitly required
                           If temporarily stored in R2 for async processing,
                           delete after processing is confirmed (max 24 h retention).
```

> **Compliance note:** If audio is forwarded to Azure Speech, Gemini, or Mistral, this constitutes third-party data sharing. See [Section 5.6](#56-third-party-data-sharing) for disclosure requirements.

### 2.5 On-Device Encryption at Rest

| Platform | Mechanism | Scope |
|---|---|---|
| iOS | AES-256 via Keychain + Data Protection | `expo-secure-store` items; files with `NSFileProtectionCompleteUnlessOpen` or stricter |
| Android | AES-256 via Android Keystore | `expo-secure-store` items; full-disk or file-based encryption (Android 10+) |
| Expo SQLite / file cache | **Not encrypted by default** | Do not store sensitive data in Expo SQLite |

---

## 3. NFC Security

### 3.1 NTAG215 Threat Model

NTAG215 tags (used for Tutoria's physical learning cards) are passive ISO 14443-A tags. They **do not support cryptographic authentication**. Any NFC-capable device can:

- Read the NDEF payload without authentication.
- Write a cloned payload to a blank NTAG215 with commodity tools (e.g., Flipper Zero, NFC Tools).

**Consequence:** A cloned card will produce the same NDEF payload as the original. The app cannot distinguish an authentic card from a clone at the NFC layer.

### 3.2 Security Model: Card as Lookup Key, Not Credential

The critical design principle is:

> **A scanned NFC card triggers a server-side lookup. It does not grant authorization.**

The card contains only a `moduleId` (a non-secret identifier). The server validates that:
1. The `moduleId` exists in D1.
2. The authenticated user (JWT `sub`) has access to that module.
3. The profile making the request owns the progress data being retrieved.

```
NFC Card (NTAG215)
  NDEF Payload: { "moduleId": "mod_abc123" }
        │
        ▼
  App reads tag
        │
        ▼
  POST /nfc/scan
  Authorization: Bearer <clerk_jwt>
  Body: { moduleId: "mod_abc123", profileId: "prof_xyz" }
        │
        ▼
  Worker: validateModuleId(moduleId)          ← exists? valid format?
          assertProfileOwnership(profileId)   ← does this user own the profile?
          fetchModuleData(moduleId)           ← return public module content
```

A cloned card with a valid `moduleId` will only load the same public module content as the original — it cannot escalate privileges or access another user's data.

### 3.3 Tag Payload Validation

NDEF payloads must be validated on both client and server.

**Expected format:**

```json
{ "moduleId": "mod_[a-zA-Z0-9_-]{8,32}" }
```

**Client-side (pre-flight, UX only):**

```typescript
const MODULE_ID_REGEX = /^mod_[a-zA-Z0-9_-]{8,32}$/;

function validateNfcPayload(rawPayload: string): string | null {
  try {
    const parsed = JSON.parse(rawPayload);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof parsed.moduleId === 'string' &&
      MODULE_ID_REGEX.test(parsed.moduleId)
    ) {
      return parsed.moduleId;
    }
  } catch {
    // Malformed JSON
  }
  return null; // Signal invalid tag to UI
}
```

**Server-side (authoritative):**

```typescript
// Cloudflare Worker
const MODULE_ID_REGEX = /^mod_[a-zA-Z0-9_-]{8,32}$/;

function validateModuleId(moduleId: unknown): string {
  if (typeof moduleId !== 'string' || !MODULE_ID_REGEX.test(moduleId)) {
    throw new Response(JSON.stringify({ error: 'Invalid moduleId' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return moduleId;
}
```

**Validation rules:**

| Rule | Value |
|---|---|
| Prefix | Must start with `mod_` |
| Character set | `[a-zA-Z0-9_-]` only (no spaces, no special chars) |
| Length (suffix) | 8–32 characters |
| Max total payload size | 144 bytes (NTAG215 limit; reject payloads larger than this) |
| JSON structure | Exactly one key: `moduleId` |

### 3.4 Sensitive Data in NDEF Payloads

**Never write to an NFC tag:**
- User IDs, profile IDs, or any account identifiers
- Session tokens or any credentials
- Progress data or scores
- Child's name or any PII

NDEF payloads are publicly readable. Treat everything on a tag as public information.

### 3.5 Physical Attack Surface

| Attack | Mitigation |
|---|---|
| Card cloning | Server-side lookup model; cloned card has same access as original (none elevated) |
| Relay attack | NFC range is ~2–5 cm; relay attacks are impractical in a child's learning context |
| Malicious tag injection | Client-side payload validation before API call; server-side validation as gatekeeper |
| Tag overwrite | NTAG215 supports write-locking; production cards should be locked after programming |

> **Recommendation:** Lock NTAG215 tags after writing the NDEF payload during manufacturing. Use the `LOCK` command to set the OTP (One-Time Programmable) lock bits, preventing any further writes.

---

## 4. Network Security

### 4.1 HTTPS-Only Policy

All communication between the app and the Cloudflare Worker must use HTTPS/TLS 1.2+.

- **No HTTP fallback.** The Axios `baseURL` must always use `https://`.
- Cloudflare enforces TLS termination at the edge; configure the Worker route to reject non-HTTPS requests.
- On iOS, App Transport Security (ATS) enforces HTTPS by default. **Do not add ATS exceptions** in `Info.plist`.
- On Android, ensure `android:usesCleartextTraffic="false"` is set in `AndroidManifest.xml` (Expo default).

```typescript
// Explicit HTTPS enforcement in Axios client
const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL!;

if (!BASE_URL.startsWith('https://')) {
  throw new Error('API base URL must use HTTPS');
}

const client = axios.create({ baseURL: BASE_URL });
```

### 4.2 Certificate Pinning

Native certificate pinning is not natively supported by Expo's managed workflow without ejecting to bare workflow or using a custom native module.

**Current posture:** Rely on Cloudflare's TLS infrastructure and OS-level certificate validation.

**If elevated risk warrants pinning:**
- Use [`react-native-ssl-pinning`](https://github.com/MaxToyberman/react-native-ssl-pinning) with a bare workflow.
- Pin to Cloudflare's intermediate CA, not the leaf certificate (leaf certs rotate frequently).
- Implement a certificate rotation strategy with a grace period (serve both old and new cert fingerprints during transition).
- Note: Aggressive pinning can cause app outages during certificate rotation. Weigh the risk carefully for a consumer app targeting children.

**Practical alternative for Expo managed workflow:**
- Enable Cloudflare's HSTS (`Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`).
- Monitor for certificate transparency log entries for your domain.

### 4.3 API Request/Response Validation

**Request side (client):**
- Validate all data before sending (see [Section 6](#6-input-validation)).
- Set `Content-Type: application/json` explicitly on POST/PATCH requests.
- Never include credentials (other than the Authorization header) in the URL or query string.

**Response side (client):**
- Do not use `eval()` or `Function()` to process API responses.
- Validate response shape with a schema (e.g., Zod) before rendering:

```typescript
import { z } from 'zod';

const ModuleSchema = z.object({
  id: z.string(),
  title: z.string(),
  difficulty: z.enum(['easy', 'medium', 'hard']),
});

const response = await apiClient.get(`/modules/${moduleId}`);
const module = ModuleSchema.parse(response.data); // throws if shape is wrong
```

### 4.4 Timeout Configuration

| Request type | Timeout | Rationale |
|---|---|---|
| Default Axios timeout | 30 000 ms | General API calls |
| Pronunciation analysis | 20 000 ms | Azure Speech + AI inference latency |
| NFC module lookup | 10 000 ms | Should be fast; timeout quickly on failure |
| Auth (Clerk SDK) | Managed by Clerk | Do not override |

```typescript
// Per-request timeout override
const result = await apiClient.post('/pronunciation/analyze', formData, {
  timeout: 20_000,
  headers: { 'Content-Type': 'multipart/form-data' },
});
```

Always handle `ECONNABORTED` (timeout) separately from network errors in the error handler.

### 4.5 Rate Limiting — Client-Side Awareness

The pronunciation endpoint enforces **5 requests per 60 seconds** per user (enforced in the Cloudflare Worker via KV-backed counters).

**Client responsibilities:**

```typescript
// src/hooks/usePronunciationRateLimit.ts
const RATE_LIMIT = 5;
const WINDOW_MS = 60_000;

export function usePronunciationRateLimit() {
  const [attempts, setAttempts] = useState<number[]>([]);

  const canAttempt = (): boolean => {
    const now = Date.now();
    const recent = attempts.filter((t) => now - t < WINDOW_MS);
    return recent.length < RATE_LIMIT;
  };

  const recordAttempt = () => {
    const now = Date.now();
    setAttempts((prev) => [...prev.filter((t) => now - t < WINDOW_MS), now]);
  };

  const remainingAttempts = (): number => {
    const now = Date.now();
    const recent = attempts.filter((t) => now - t < WINDOW_MS);
    return Math.max(0, RATE_LIMIT - recent.length);
  };

  return { canAttempt, recordAttempt, remainingAttempts };
}
```

- If the server returns `429 Too Many Requests`, display the `Retry-After` header value as a countdown. **Do not auto-retry.**
- Do not implement exponential back-off for `429` — it constitutes a retry spam pattern for rate-limited endpoints.
- Disable the record button while the rate limit is active.

---

## 5. Data Privacy — Children's Data

### 5.1 Regulatory Scope

| Regulation | Applicability |
|---|---|
| COPPA (US) | App targets children under 13; parental consent required before collecting any personal information |
| GDPR-K (EU) | Children under 16 (varies by member state, min 13) require parental consent for data processing |
| CCPA (California) | Applies if users are California residents; children's data has heightened protections |

**Practical obligations for Tutoria:**

1. A parent or guardian creates the Clerk account and consents to data collection on behalf of the child.
2. The child never directly provides consent (they are not the account holder).
3. A verifiable parental consent mechanism must be implemented before a child's data is collected.
4. Parents must be able to review, correct, and delete their child's data at any time.

### 5.2 Minimal Data Collection Principle

Collect only what is necessary to deliver the learning experience.

| Data point | Collected? | Justification |
|---|---|---|
| Child's display name | ✅ Yes | Required for personalized UI |
| Child's date of birth | ⚠️ Age range only | Used for COPPA age gate; do not store full DOB |
| Child's photo | ❌ No | Not required; use avatar selection instead |
| Child's email or phone | ❌ No | Parent account handles contact |
| Device identifiers (IDFA, GAID) | ❌ No | Not required for learning features |
| Location data | ❌ No | Not required |
| Pronunciation audio recordings | ⚠️ Transient | Processed, not permanently stored (see §2.4) |
| Reading progress and scores | ✅ Yes | Core learning feature; minimal PII |
| NFC card scan history | ⚠️ Minimal | Store module ID + timestamp only; no location |

### 5.3 Audio Recording Handling

Children's voice recordings are sensitive biometric-adjacent data.

**Principles:**
- Audio is used solely for pronunciation feedback — it is **not** used for training AI models.
- Audio is **not** retained on the server beyond the duration of the API request unless temporarily required for async processing (max 24-hour retention in R2, then auto-deleted via lifecycle policy).
- The privacy policy must explicitly state that audio is sent to third-party AI services (Azure, Gemini, Mistral) for processing.
- Users (parents) must be notified that their child's voice is being processed by these services.

**R2 lifecycle policy (if temporary storage is used):**

```json
{
  "rules": [
    {
      "id": "delete-audio-after-24h",
      "status": "Enabled",
      "filter": { "prefix": "audio-tmp/" },
      "expiration": { "days": 1 }
    }
  ]
}
```

### 5.4 Profile Data Scope

Child profiles in D1 should contain only:

```sql
CREATE TABLE profiles (
  id          TEXT PRIMARY KEY,             -- Internal ID (not exposed to NFC)
  clerk_user_id TEXT NOT NULL,              -- Parent/tutor's Clerk user ID
  display_name  TEXT NOT NULL,             -- Child's first name or nickname (not full name)
  avatar_id     TEXT,                      -- Reference to a preset avatar (no photo uploads)
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL
);
```

**Do not add columns for:** full legal name, date of birth (beyond age tier), school name, address, or any contact information.

Progress data (scores, completed modules) should be stored in a separate table and linked by profile ID — not embedded in the profile row.

### 5.5 Parent/Tutor Consent Model

Consent is implicit in the Clerk account creation flow:

1. A parent/tutor creates a Clerk account (they are the data subject for consent purposes).
2. During onboarding, the app presents the privacy policy and terms of service, with explicit acceptance required before creating any child profiles.
3. The `clerk_user_id` on each profile record serves as the consent anchor — that Clerk user accepted the terms on behalf of the child.
4. Age gate: if a user attempts to create their own account and indicates they are under 13 (COPPA) or the applicable GDPR-K age, the flow must route them to a parental consent path, not allow independent account creation.

```typescript
// Onboarding: enforce consent before profile creation
if (!user.publicMetadata.privacyConsentAcceptedAt) {
  // Block navigation to profile creation
  // Show consent screen with privacy policy and terms
}
```

### 5.6 Third-Party Data Sharing

| Service | Data shared | Purpose | Retention by third party |
|---|---|---|---|
| Azure Cognitive Services (Speech) | Child's voice audio (transient) | Pronunciation recognition | Microsoft's standard data processing terms; audio not retained for training by default under commercial terms |
| Google Gemini | Pronunciation text + context | AI analysis/feedback | Google's API terms; review data retention policy for your tier |
| Mistral AI | Pronunciation text + context | AI analysis/feedback | Mistral's API terms; review data retention policy |
| Clerk | Parent/tutor account data (email, session) | Authentication | Clerk's privacy policy |
| Cloudflare | Request metadata (IP, headers) | Infrastructure | Cloudflare's privacy policy |

**Disclosure requirements:**
- The privacy policy must name each third-party service and the data shared.
- For COPPA, the privacy policy must be accessible to parents before any data is collected.
- Review each service's data processing agreement (DPA) to confirm it covers children's data and is COPPA/GDPR-K compliant. Azure and Cloudflare offer DPAs; confirm Gemini and Mistral tier-specific terms.

### 5.7 Data Retention and Deletion

| Data type | Retention | Deletion trigger |
|---|---|---|
| Child profile | Indefinite while account active | Parent requests deletion OR account closure |
| Progress data | Indefinite while profile active | Profile deletion |
| Audio recordings (transient R2) | Max 24 hours | R2 lifecycle policy (automatic) |
| NFC scan logs | 90 days rolling | Automatic purge via D1 scheduled query |
| Clerk session tokens | Per session TTL | Sign-out or Clerk session expiry |
| Error logs (Sentry) | 30 days | Sentry retention policy |

**Right to Erasure (GDPR Article 17 / COPPA parental request):**

The app must provide a clear mechanism for a parent to:
1. Delete a specific child's profile and all associated data.
2. Close their entire account, deleting all profiles and data.

This should be a server-side cascade delete, not a soft-delete, unless a 30-day grace period is required for undoing accidental deletion (clearly communicated to the user).

```typescript
// Cloudflare Worker — cascade delete on profile removal
async function deleteProfile(db: D1Database, profileId: string, clerkUserId: string) {
  await assertProfileOwnership(db, profileId, clerkUserId);

  await db.batch([
    db.prepare('DELETE FROM progress WHERE profile_id = ?1').bind(profileId),
    db.prepare('DELETE FROM nfc_scan_logs WHERE profile_id = ?1').bind(profileId),
    db.prepare('DELETE FROM profiles WHERE id = ?1').bind(profileId),
  ]);
}
```

---

## 6. Input Validation

### 6.1 Principle: Server is the Source of Truth

Client-side validation improves UX (instant feedback, prevents unnecessary API calls). It is **not** a security control. Every input validated on the client must also be validated on the server. Never rely solely on client-side validation to prevent malicious input.

### 6.2 Client-Side Validation Patterns

```typescript
// Profile name validation
const DISPLAY_NAME_REGEX = /^[a-zA-ZÀ-ÿ\s'-]{1,50}$/;

function validateDisplayName(name: string): string | null {
  const trimmed = name.trim();
  if (trimmed.length === 0) return 'Name is required';
  if (trimmed.length > 50) return 'Name must be 50 characters or fewer';
  if (!DISPLAY_NAME_REGEX.test(trimmed)) return 'Name contains invalid characters';
  return null; // valid
}

// Module ID validation (also used for NFC payloads)
const MODULE_ID_REGEX = /^mod_[a-zA-Z0-9_-]{8,32}$/;

function validateModuleId(id: string): boolean {
  return MODULE_ID_REGEX.test(id);
}
```

### 6.3 Server-Side Validation (Cloudflare Worker)

All inputs from the request body, query parameters, and path parameters must be validated before use:

```typescript
import { z } from 'zod';

// Define schemas once, reuse for validation and type inference
const CreateProfileSchema = z.object({
  displayName: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, 'Invalid characters in display name'),
  avatarId: z.string().regex(/^avatar_[a-zA-Z0-9_-]{4,16}$/).optional(),
});

const NfcScanSchema = z.object({
  moduleId: z.string().regex(/^mod_[a-zA-Z0-9_-]{8,32}$/),
  profileId: z.string().uuid(),
});

// Usage in route handler
const body = await request.json();
const parsed = CreateProfileSchema.safeParse(body);
if (!parsed.success) {
  return new Response(
    JSON.stringify({ error: 'Validation failed', details: parsed.error.flatten() }),
    { status: 400, headers: { 'Content-Type': 'application/json' } }
  );
}
```

### 6.4 XSS Prevention

Tutoria renders child profile names and module content in the UI. Prevent XSS:

- **React Native's text rendering is not a browser DOM** — classic HTML injection does not apply to `<Text>` components. However, if `WebView` is used to render module content, treat it as a browser.
- Never use `dangerouslySetInnerHTML` in any web-adjacent components.
- If a `WebView` renders HTML content (e.g., rich reading exercises), use `originWhitelist={[]}` and `sandboxing`:

```tsx
<WebView
  source={{ html: sanitizedHtml }}
  originWhitelist={['about:blank']}   // Blocks all navigation
  javaScriptEnabled={false}           // Disable JS in rendered content
  mixedContentMode="never"
/>
```

- Sanitize any HTML content generated from user input or fetched from the API using a server-side sanitizer (e.g., DOMPurify equivalent) before storing in D1 or R2.

### 6.5 SQL Injection Prevention

All D1 queries must use **parameterized statements**. Never concatenate user input into SQL strings.

```typescript
// ✅ CORRECT — parameterized
const profile = await db
  .prepare('SELECT * FROM profiles WHERE id = ?1 AND clerk_user_id = ?2')
  .bind(profileId, clerkUserId)
  .first();

// ❌ WRONG — never do this
const profile = await db
  .prepare(`SELECT * FROM profiles WHERE id = '${profileId}'`)
  .first();
```

D1's `prepare().bind()` API exclusively uses parameterized queries — it is not possible to interpolate values directly. Enforce this pattern in code reviews.

### 6.6 Webhook Signature Verification (Svix / Clerk)

Clerk webhooks are signed with HMAC-SHA256 via Svix. Always verify the signature before processing:

```typescript
import { Webhook } from 'svix';

async function handleClerkWebhook(request: Request, env: Env): Promise<Response> {
  const svixId = request.headers.get('svix-id');
  const svixTimestamp = request.headers.get('svix-timestamp');
  const svixSignature = request.headers.get('svix-signature');

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response('Missing Svix headers', { status: 400 });
  }

  const body = await request.text();
  const wh = new Webhook(env.CLERK_WEBHOOK_SECRET);

  let event: unknown;
  try {
    event = wh.verify(body, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    });
  } catch {
    return new Response('Invalid signature', { status: 401 });
  }

  // Process verified event...
  return new Response('OK', { status: 200 });
}
```

**Never process a webhook payload that fails signature verification.** A failed verification indicates either a misconfigured secret or a spoofed request.

---

## 7. Error Handling Security

### 7.1 Error Message Policy

Error messages exposed to the client must never leak:
- Stack traces or file paths
- SQL query fragments
- Internal service names or versions
- User data from other accounts
- API keys, secrets, or tokens

**Pattern: generic client message + structured internal log**

```typescript
// Cloudflare Worker error handler
function handleError(error: unknown, context: string): Response {
  const requestId = crypto.randomUUID();

  // Internal log (goes to Logpush / Sentry — NOT sent to client)
  console.error(JSON.stringify({
    requestId,
    context,
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  }));

  // Generic client response
  return new Response(
    JSON.stringify({
      error: 'An unexpected error occurred',
      requestId, // Allow client to reference this in support tickets
    }),
    { status: 500, headers: { 'Content-Type': 'application/json' } }
  );
}
```

### 7.2 No Stack Traces in Production

Ensure `NODE_ENV=production` (or the Cloudflare Worker equivalent) disables verbose error output. Never include `error.stack` in API responses.

In the React Native app:

```typescript
// src/lib/errorBoundary.tsx — global error boundary
export class AppErrorBoundary extends React.Component {
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Report to Sentry (PII-scrubbed — see §7.3)
    Sentry.captureException(error, { extra: { componentStack: info.componentStack } });
    // Do NOT log error.stack to console in production
    if (__DEV__) {
      console.error(error, info);
    }
  }

  render() {
    if (this.state.hasError) {
      // Generic error screen — no technical details
      return <ErrorScreen />;
    }
    return this.props.children;
  }
}
```

### 7.3 Sentry PII Scrubbing

Sentry is configured to scrub PII before events are transmitted.

```typescript
// src/lib/sentry.ts
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  environment: process.env.EXPO_PUBLIC_ENV, // 'production' | 'staging'
  beforeSend(event) {
    // Strip Authorization headers from breadcrumbs and request data
    if (event.request?.headers) {
      delete event.request.headers['Authorization'];
      delete event.request.headers['authorization'];
    }

    // Strip user PII — only retain a hashed identifier for deduplication
    if (event.user) {
      event.user = {
        id: event.user.id, // Clerk user ID (non-PII)
        // Remove email, username, ip_address
      };
    }

    // Redact any values that look like tokens (Bearer ey...)
    const eventStr = JSON.stringify(event);
    if (/Bearer\s+[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+/.test(eventStr)) {
      // Log the detection internally; drop the event to be safe
      console.warn('[Sentry] Potential token in event — event dropped');
      return null;
    }

    return event;
  },

  // Do not send events in development
  enabled: process.env.EXPO_PUBLIC_ENV === 'production',
});
```

### 7.4 Graceful Degradation

The app must remain functional (in a degraded state) when backend services are unavailable, without exposing internal state:

| Failure scenario | User-facing behaviour | What NOT to show |
|---|---|---|
| API timeout | "Connection is slow. Please try again." | Timeout value, endpoint URL |
| 401 Unauthorized | Navigate to sign-in screen | JWT details, expiry time |
| 403 Forbidden | "You don't have access to this." | Profile IDs, ownership structure |
| 404 Not Found | "This content could not be found." | Internal resource paths |
| 429 Rate Limited | Countdown timer to next available attempt | Rate limit config, user request count |
| 500 Server Error | "Something went wrong. Request ID: {id}" | Stack trace, SQL errors |
| NFC read failure | "Could not read card. Try again." | Raw NDEF payload, hardware error codes |

---

## 8. Security Checklist

### 8.1 Pre-Release Security Review

| # | Area | Check | Status |
|---|---|---|---|
| 1 | Auth | Clerk JWT verified on every authenticated Worker route | ☐ |
| 2 | Auth | `exp` claim checked; expired tokens rejected with 401 | ☐ |
| 3 | Auth | Profile ownership validated on all profile-scoped endpoints | ☐ |
| 4 | Auth | Sign-out clears expo-secure-store token cache | ☐ |
| 5 | Auth | Webhook HMAC signature verified before processing | ☐ |
| 6 | Storage | Session tokens stored in expo-secure-store, not AsyncStorage | ☐ |
| 7 | Storage | `WHEN_UNLOCKED_THIS_DEVICE_ONLY` set on secure store items | ☐ |
| 8 | Storage | Audio recordings not written to disk or persisted in AsyncStorage | ☐ |
| 9 | Storage | No API keys or secrets hardcoded in client source or `.env` committed to git | ☐ |
| 10 | NFC | NDEF payload validated (regex + length) before API call | ☐ |
| 11 | NFC | Server validates moduleId independently of client | ☐ |
| 12 | NFC | No PII in NDEF payload | ☐ |
| 13 | NFC | Production cards locked (write-protect bit set) | ☐ |
| 14 | Network | All API base URLs use `https://` | ☐ |
| 15 | Network | ATS exceptions absent from `Info.plist` | ☐ |
| 16 | Network | `android:usesCleartextTraffic="false"` in manifest | ☐ |
| 17 | Network | Axios default timeout set to 30 000 ms | ☐ |
| 18 | Network | Pronunciation endpoint timeout set to 20 000 ms | ☐ |
| 19 | Network | 429 responses show countdown, no auto-retry | ☐ |
| 20 | Privacy | Privacy policy names all third-party data processors | ☐ |
| 21 | Privacy | Parental consent captured before first child profile creation | ☐ |
| 22 | Privacy | Age gate prevents children from self-registering | ☐ |
| 23 | Privacy | Profile deletion cascade-deletes all associated data | ☐ |
| 24 | Privacy | Audio data retention policy enforced (R2 lifecycle rule active) | ☐ |
| 25 | Privacy | DPAs in place with Azure, Gemini, Mistral for children's data | ☐ |
| 26 | Validation | All server routes validate input with parameterized D1 queries | ☐ |
| 27 | Validation | Response shapes validated with Zod schemas on the client | ☐ |
| 28 | Validation | No `dangerouslySetInnerHTML` or unguarded WebView JS execution | ☐ |
| 29 | Errors | No stack traces in production API responses | ☐ |
| 30 | Errors | Sentry PII scrubbing configured; Authorization headers stripped | ☐ |
| 31 | Errors | `requestId` included in 5xx responses for support traceability | ☐ |
| 32 | Errors | Sentry disabled or in dry-run mode in development | ☐ |
| 33 | Secrets | `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SECRET`, AI API keys stored in Cloudflare Secrets | ☐ |
| 34 | Secrets | `.env` files are `.gitignore`d; no secrets in git history | ☐ |
| 35 | Secrets | `EXPO_PUBLIC_*` variables contain no secrets (they are bundled into the app) | ☐ |

### 8.2 Dependency Security

| Check | Tool | Frequency |
|---|---|---|
| Audit npm dependencies for known CVEs | `npm audit` | Before every release |
| Check for outdated dependencies | `npm outdated` | Monthly |
| Review Expo SDK security advisories | Expo changelog / security page | With each SDK update |
| Review Clerk SDK changelog | Clerk releases | With each SDK update |
| Scan for hardcoded secrets | `git-secrets` or `truffleHog` | Pre-commit hook |

### 8.3 Incident Response

If a security incident is suspected (data breach, unauthorized access, token leak):

1. **Revoke** all active Clerk sessions via the Clerk dashboard.
2. **Rotate** Cloudflare Worker secrets (`CLERK_WEBHOOK_SECRET`, AI API keys).
3. **Invalidate** any KV-cached JWKS entries.
4. **Notify** affected parents within 72 hours (GDPR breach notification requirement).
5. **Preserve** Cloudflare Logpush logs for forensic analysis.
6. **Assess** whether children's data was exposed; if so, escalate to legal/compliance.

---

*This document should be reviewed and updated with every significant change to the authentication flow, data model, or third-party integrations.*

# Tutoria — Testing Strategy

> **App:** Tutoria React Native / Expo 55 (TypeScript 5.9)  
> **State:** No tests currently exist. This document defines the full testing strategy from setup through CI.

---

## Table of Contents

1. [Testing Philosophy](#1-testing-philosophy)
2. [Setup & Tooling](#2-setup--tooling)
3. [Unit Testing](#3-unit-testing)
4. [Integration Testing](#4-integration-testing)
5. [E2E Testing](#5-e2e-testing)
6. [Mocking Strategy](#6-mocking-strategy)
7. [CI Integration](#7-ci-integration)

---

## 1. Testing Philosophy

### 1.1 The Testing Pyramid

Tutoria follows the classic testing pyramid. Tests are cheap, fast, and numerous at the bottom; expensive, slow, and minimal at the top.

```
         /‾‾‾‾‾‾‾‾‾‾‾‾\
        /   E2E (Maestro) \       ← 5–10 critical flows
       /‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾\
      /  Integration (RNTL) \     ← 15–25 screen-level tests
     /‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾\
    /    Unit (Jest pure TS)   \  ← 60–80 focused unit tests
   /‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾\
```

| Layer | Tool | Speed | Count |
|---|---|---|---|
| Unit | Jest | < 5 s | ~70 tests |
| Integration | Jest + RNTL | < 30 s | ~20 tests |
| E2E | Maestro | minutes | ~8 flows |

### 1.2 What to Test

**✅ Must test:**
- All `src/services/api/` functions — request shapes, error paths, response parsing
- All `src/services/nfc/` functions — tag parsing, NDEF validation, error recovery
- All `src/stores/` — every state transition and action, reset behaviour
- All `src/hooks/` — lifecycle, side-effects, error states
- `src/utils/` type guards and helper logic

**⬜ Should test (when components exist):**
- Screen components that contain meaningful conditional rendering
- Navigation guard behaviour (authenticated vs. guest routes)
- NFC scan → lesson launch happy path at integration level

**❌ Do not test:**
- Third-party library internals (Clerk, expo-av, NfcManager)
- Purely presentational/style-only components with no logic
- `src/utils/types.ts` — it is a type declaration file, not runtime code
- Auto-generated boilerplate (`registerRootComponent`, etc.)

### 1.3 Coverage Targets

| Path | Branch | Function | Line |
|---|---|---|---|
| `src/services/**` | **80 %** | **80 %** | **80 %** |
| `src/stores/**` | **80 %** | **80 %** | **80 %** |
| `src/hooks/**` | **60 %** | **60 %** | **60 %** |
| `src/components/**` | **60 %** | **60 %** | **60 %** |
| Overall project | 65 % | 65 % | 65 % |

These thresholds are enforced in `jest.config.js` and fail the CI pipeline if not met.

---

## 2. Setup & Tooling

### 2.1 Packages to Install

```bash
npm install --save-dev \
  jest \
  jest-expo \
  @testing-library/react-native \
  @testing-library/jest-native \
  @types/jest \
  axios-mock-adapter \
  react-test-renderer
```

> **Why `jest-expo`?**  
> It ships with the correct Babel preset, `transformIgnorePatterns`, and module resolver for the Expo SDK. Never configure these manually when the preset handles them.

### 2.2 `jest.config.js`

Create at the project root:

```js
// jest.config.js
/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',

  // Extend jest-native matchers (toBeVisible, toHaveTextContent, etc.)
  setupFilesAfterFramework: [
    '@testing-library/jest-native/extend-expect',
    '<rootDir>/jest.setup.ts',
  ],

  // Modules that must be transformed (ESM packages used by Expo ecosystem)
  transformIgnorePatterns: [
    'node_modules/(?!(' +
      '(jest-)?react-native' +
      '|@react-native(-community)?' +
      '|expo(nent)?' +
      '|@expo(nent)?/.*' +
      '|@expo-google-fonts/.*' +
      '|react-navigation' +
      '|@react-navigation/.*' +
      '|@clerk/.*' +
      '|react-native-nfc-manager' +
      '|expo-av' +
      '|expo-speech' +
      '|expo-haptics' +
      '|expo-secure-store' +
      '|expo-router' +
      '))',
  ],

  // Static asset stubs
  moduleNameMapper: {
    '\\.(jpg|jpeg|png|gif|webp|svg)$': '<rootDir>/__mocks__/fileMock.js',
  },

  // Coverage collection
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/utils/types.ts',        // type-only file
    '!src/**/__tests__/**',
    '!src/**/index.ts',           // barrel exports, no logic
  ],

  // Enforce coverage thresholds — CI fails if these are not met
  coverageThresholds: {
    './src/services/': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    './src/stores/': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    global: {
      branches: 60,
      functions: 60,
      lines: 65,
      statements: 65,
    },
  },

  testPathPattern: 'src/.*\\.test\\.(ts|tsx)$',
  testEnvironment: 'node',
};
```

### 2.3 `jest.setup.ts`

Create at the project root. This file runs after the test framework is installed for every test suite.

```ts
// jest.setup.ts
import '@testing-library/jest-native/extend-expect';

// ── Silence React Native's noisy logs in test output ──────────────────────
jest.spyOn(console, 'error').mockImplementation((...args) => {
  // Still throw on prop-type errors so they surface as failures
  if (typeof args[0] === 'string' && args[0].includes('Warning:')) return;
  console.warn(...args);
});

// ── Global fetch stub (used by usePronunciation base64 conversion) ─────────
global.fetch = jest.fn();

// ── FileReader stub ────────────────────────────────────────────────────────
global.FileReader = class {
  result: string | null = null;
  onloadend: (() => void) | null = null;
  onerror: ((e: unknown) => void) | null = null;

  readAsDataURL(blob: Blob) {
    // Simulate async read — resolves with a fake base64 data URL
    setTimeout(() => {
      this.result = 'data:audio/wav;base64,UklGRiQAAABXQVZF';
      this.onloadend?.();
    }, 0);
  }
} as unknown as typeof FileReader;
```

### 2.4 Static Asset Mock

```js
// __mocks__/fileMock.js
module.exports = 'test-file-stub';
```

### 2.5 `package.json` Test Scripts

Add these to the `scripts` section of `package.json`:

```json
{
  "scripts": {
    "test":          "jest --passWithNoTests",
    "test:watch":    "jest --watch",
    "test:coverage": "jest --coverage --coverageReporters=text --coverageReporters=lcov"
  }
}
```

- `npm test` — run all tests once (used in CI)
- `npm run test:watch` — re-run on file change during development
- `npm run test:coverage` — produce coverage report + `coverage/lcov.info` for Codecov/Coveralls

### 2.6 Recommended Test File Co-location

```
src/
├── services/api/
│   ├── client.ts
│   ├── client.test.ts          ← unit: axios config, interceptors
│   ├── modules.ts
│   ├── modules.test.ts         ← unit: each exported function
│   └── ...
├── services/nfc/
│   ├── tagParser.ts
│   ├── tagParser.test.ts       ← unit: parseNdefPayload
│   ├── nfcManager.ts
│   └── nfcManager.test.ts      ← unit: initNfc, readTag, cleanupNfc
├── stores/
│   ├── useAuthStore.ts
│   ├── useAuthStore.test.ts    ← unit: state transitions
│   └── ...
├── hooks/
│   ├── useNfc.ts
│   ├── useNfc.test.ts          ← unit: renderHook, lifecycle
│   └── ...
```

---

## 3. Unit Testing

### 3.1 API Services

Every function in `src/services/api/` delegates to the central `apiClient` (Axios instance). The strategy:

1. Create an `axios-mock-adapter` on the shared `apiClient` instance.
2. Register mock routes with `.onGet()`, `.onPost()`, etc.
3. Assert the return value and, when relevant, the shape of the outgoing request.
4. Always test the network error path and the 4xx/5xx error path.

#### Example: `src/services/api/modules.test.ts`

```ts
import MockAdapter from 'axios-mock-adapter';
import apiClient from './client';
import {
  getMissions,
  getModuleStatus,
  startOrResumeModule,
  completeWord,
  abandonModule,
  batchModuleStatus,
} from './modules';
import type { Mission, ModuleStatus, SessionData, WordCompletionResponse } from '../../utils/types';

// ── Shared mock adapter ────────────────────────────────────────────────────
const mock = new MockAdapter(apiClient);

afterEach(() => mock.reset());
afterAll(() => mock.restore());

// ── Fixtures ───────────────────────────────────────────────────────────────
const PROFILE_ID = 'profile-abc';
const MODULE_ID  = 'module-a';

const mockMission: Mission = {
  moduleId: MODULE_ID,
  moduleName: 'Module A',
  label: 'A',
  wordsLeft: 5,
  color: '#4CAF50',
  priority: 1,
  completedWords: 3,
  totalWords: 8,
  attempts: 0,
};

const mockStatus: ModuleStatus = {
  attempts: 1,
  canAttempt: true,
  cooldownEndsAt: null,
  hasActiveSession: false,
  sessionData: null,
};

// ── getMissions ────────────────────────────────────────────────────────────
describe('getMissions', () => {
  it('returns an array of missions for a profile', async () => {
    mock.onGet('/v1/modules/missions', { params: { profileId: PROFILE_ID } })
        .reply(200, [mockMission]);

    const result = await getMissions(PROFILE_ID);

    expect(result).toHaveLength(1);
    expect(result[0].moduleId).toBe(MODULE_ID);
    expect(result[0].wordsLeft).toBe(5);
  });

  it('propagates a 403 error', async () => {
    mock.onGet('/v1/modules/missions').reply(403, { error: 'Forbidden' });

    await expect(getMissions(PROFILE_ID)).rejects.toMatchObject({
      response: { status: 403 },
    });
  });

  it('propagates a network error', async () => {
    mock.onGet('/v1/modules/missions').networkError();

    await expect(getMissions(PROFILE_ID)).rejects.toThrow();
  });
});

// ── startOrResumeModule ────────────────────────────────────────────────────
describe('startOrResumeModule', () => {
  it('POSTs profileId in the request body', async () => {
    const mockSession: SessionData = {
      words: [],
      wordData: {},
      totalWords: 5,
      position: 0,
      started: true,
      completedWords: 0,
      remainingWords: 5,
      moduleName: 'Module A',
      failedWords: [],
    };

    mock.onPost(`/v1/modules/${MODULE_ID}`).reply((config) => {
      const body = JSON.parse(config.data);
      expect(body.profileId).toBe(PROFILE_ID);
      return [200, mockSession];
    });

    const session = await startOrResumeModule(MODULE_ID, PROFILE_ID);
    expect(session.totalWords).toBe(5);
    expect(session.started).toBe(true);
  });
});

// ── completeWord ───────────────────────────────────────────────────────────
describe('completeWord', () => {
  it('sends word completion and returns response', async () => {
    const req = { profileId: PROFILE_ID, wordId: 'word-1', isCorrect: true };
    const mockResponse: WordCompletionResponse = {
      success: true,
      completedWords: 4,
      totalWords: 8,
      remainingWords: 4,
      isModuleComplete: false,
      failedWords: [],
    };

    mock.onPost(`/v1/modules/${MODULE_ID}/word`).reply(200, mockResponse);

    const result = await completeWord(MODULE_ID, req);
    expect(result.success).toBe(true);
    expect(result.completedWords).toBe(4);
  });
});

// ── abandonModule ──────────────────────────────────────────────────────────
describe('abandonModule', () => {
  it('issues a DELETE request', async () => {
    mock.onDelete(`/v1/modules/${MODULE_ID}`).reply(204);

    await expect(abandonModule(MODULE_ID, PROFILE_ID)).resolves.toBeUndefined();
  });
});
```

#### Example: `src/services/api/client.test.ts`

```ts
import MockAdapter from 'axios-mock-adapter';
import apiClient, { setAuthToken } from './client';

const mock = new MockAdapter(apiClient);

afterEach(() => {
  mock.reset();
  setAuthToken(null); // always reset auth header
});

describe('setAuthToken', () => {
  it('adds a Bearer Authorization header when token is provided', async () => {
    setAuthToken('my-test-token');

    mock.onGet('/v1/health').reply((config) => {
      expect(config.headers?.Authorization).toBe('Bearer my-test-token');
      return [200, { ok: true }];
    });

    await apiClient.get('/v1/health');
  });

  it('removes the Authorization header when token is null', async () => {
    setAuthToken('initial-token');
    setAuthToken(null);

    mock.onGet('/v1/health').reply((config) => {
      expect(config.headers?.Authorization).toBeUndefined();
      return [200, {}];
    });

    await apiClient.get('/v1/health');
  });
});

describe('response interceptor', () => {
  it('passes through 2xx responses unchanged', async () => {
    mock.onGet('/v1/health').reply(200, { ok: true });
    const { data } = await apiClient.get('/v1/health');
    expect(data.ok).toBe(true);
  });

  it('rejects on 500 server errors', async () => {
    mock.onGet('/v1/health').reply(500, { error: 'Server Error' });
    await expect(apiClient.get('/v1/health')).rejects.toMatchObject({
      response: { status: 500 },
    });
  });

  it('rejects on network errors', async () => {
    mock.onGet('/v1/health').networkError();
    await expect(apiClient.get('/v1/health')).rejects.toThrow();
  });
});
```

---

### 3.2 NFC Service

`tagParser.ts` is pure TypeScript with no React Native dependencies — test it directly. `nfcManager.ts` wraps `react-native-nfc-manager` and must be tested with the NFC mock (see §6.1).

#### Example: `src/services/nfc/tagParser.test.ts`

```ts
import { parseNdefPayload } from './tagParser';

const TAG_ID = 'tag-001';

describe('parseNdefPayload — valid tags', () => {
  it('parses a well-formed "tutoria:<moduleId>" payload', () => {
    const result = parseNdefPayload('tutoria:module-a', TAG_ID);

    expect(result.isValid).toBe(true);
    expect(result.moduleId).toBe('module-a');
    expect(result.tagId).toBe(TAG_ID);
    expect(result.rawData).toBe('tutoria:module-a');
  });

  it('trims leading and trailing whitespace before parsing', () => {
    const result = parseNdefPayload('  tutoria:module-b  ', TAG_ID);
    expect(result.isValid).toBe(true);
    expect(result.moduleId).toBe('module-b');
  });

  it('accepts module IDs containing hyphens and numbers', () => {
    const result = parseNdefPayload('tutoria:stage-2-module-7', TAG_ID);
    expect(result.isValid).toBe(true);
    expect(result.moduleId).toBe('stage-2-module-7');
  });
});

describe('parseNdefPayload — invalid tags', () => {
  it('returns isValid=false when prefix is missing', () => {
    const result = parseNdefPayload('module-a', TAG_ID);
    expect(result.isValid).toBe(false);
    expect(result.moduleId).toBe('');
  });

  it('returns isValid=false for an empty string', () => {
    const result = parseNdefPayload('', TAG_ID);
    expect(result.isValid).toBe(false);
  });

  it('returns isValid=false when only the prefix is present (no moduleId)', () => {
    const result = parseNdefPayload('tutoria:', TAG_ID);
    // moduleId.length === 0 → isValid is false
    expect(result.isValid).toBe(false);
    expect(result.moduleId).toBe('');
  });

  it('returns isValid=false for a different app prefix', () => {
    const result = parseNdefPayload('otherap:module-x', TAG_ID);
    expect(result.isValid).toBe(false);
  });

  it('preserves rawData even for invalid tags', () => {
    const result = parseNdefPayload('garbage-data', TAG_ID);
    expect(result.rawData).toBe('garbage-data');
    expect(result.tagId).toBe(TAG_ID);
  });
});
```

#### Example: `src/services/nfc/nfcManager.test.ts`

```ts
// The NFC mock is configured in __mocks__/react-native-nfc-manager.ts (see §6.1)
jest.mock('react-native-nfc-manager');

import NfcManager, { NfcTech, Ndef } from 'react-native-nfc-manager';
import { initNfc, isNfcEnabled, readTag, cleanupNfc } from './nfcManager';

const mockedNfcManager = NfcManager as jest.Mocked<typeof NfcManager>;

describe('initNfc', () => {
  it('returns true and calls start() when NFC is supported', async () => {
    mockedNfcManager.isSupported.mockResolvedValue(true);
    mockedNfcManager.start.mockResolvedValue(undefined);

    const result = await initNfc();

    expect(result).toBe(true);
    expect(mockedNfcManager.start).toHaveBeenCalledTimes(1);
  });

  it('returns false without calling start() when NFC is unsupported', async () => {
    mockedNfcManager.isSupported.mockResolvedValue(false);

    const result = await initNfc();

    expect(result).toBe(false);
    expect(mockedNfcManager.start).not.toHaveBeenCalled();
  });

  it('catches exceptions and returns false', async () => {
    mockedNfcManager.isSupported.mockRejectedValue(new Error('Hardware error'));

    const result = await initNfc();
    expect(result).toBe(false);
  });
});

describe('readTag', () => {
  beforeEach(() => {
    mockedNfcManager.requestTechnology.mockResolvedValue(undefined);
    mockedNfcManager.cancelTechnologyRequest.mockResolvedValue(undefined);
  });

  it('parses a valid tutoria NDEF tag', async () => {
    const payloadBytes = Array.from(
      new TextEncoder().encode('\x02en' + 'tutoria:module-a'),
    );

    mockedNfcManager.getTag.mockResolvedValue({
      id: 'tag-001',
      ndefMessage: [{ payload: payloadBytes, type: [], id: [] }],
    } as any);

    (Ndef.text.decodePayload as jest.Mock).mockReturnValue('tutoria:module-a');

    const result = await readTag();
    expect(result?.isValid).toBe(true);
    expect(result?.moduleId).toBe('module-a');
  });

  it('returns null when the tag has no NDEF message', async () => {
    mockedNfcManager.getTag.mockResolvedValue({ id: 'tag-002', ndefMessage: [] } as any);
    const result = await readTag();
    expect(result).toBeNull();
  });

  it('returns null and still cancels tech request on exception', async () => {
    mockedNfcManager.requestTechnology.mockRejectedValue(new Error('Scan failed'));
    const result = await readTag();
    expect(result).toBeNull();
    expect(mockedNfcManager.cancelTechnologyRequest).toHaveBeenCalled();
  });
});
```

---

### 3.3 Zustand Stores

Zustand stores are plain JavaScript objects. Test them without React by calling `getState()` and `setState()` directly. **Always reset state in `beforeEach`** to avoid test pollution.

#### Example: `src/stores/useAuthStore.test.ts`

```ts
import { useAuthStore } from './useAuthStore';

// Reset to initial state before every test
beforeEach(() => {
  useAuthStore.setState({ isSignedIn: false, userId: null, token: null });
});

describe('initial state', () => {
  it('starts signed out with no user or token', () => {
    const { isSignedIn, userId, token } = useAuthStore.getState();
    expect(isSignedIn).toBe(false);
    expect(userId).toBeNull();
    expect(token).toBeNull();
  });
});

describe('setAuth', () => {
  it('marks the user as signed in and stores credentials', () => {
    useAuthStore.getState().setAuth('user-123', 'tok-abc');

    const { isSignedIn, userId, token } = useAuthStore.getState();
    expect(isSignedIn).toBe(true);
    expect(userId).toBe('user-123');
    expect(token).toBe('tok-abc');
  });
});

describe('clearAuth', () => {
  it('resets all auth state to initial values', () => {
    // Pre-condition: user is signed in
    useAuthStore.setState({ isSignedIn: true, userId: 'user-123', token: 'tok-abc' });

    useAuthStore.getState().clearAuth();

    const { isSignedIn, userId, token } = useAuthStore.getState();
    expect(isSignedIn).toBe(false);
    expect(userId).toBeNull();
    expect(token).toBeNull();
  });
});
```

#### Example: `src/stores/useLessonStore.test.ts`

```ts
import { useLessonStore } from './useLessonStore';
import type { SessionData, WordData } from '../utils/types';

const INITIAL_STATE = {
  currentSession: null,
  currentWord: null,
  isLoading: false,
  error: null,
};

beforeEach(() => {
  useLessonStore.setState(INITIAL_STATE);
});

const mockSession: SessionData = {
  words: ['word-1', 'word-2'],
  wordData: {
    'word-1': { id: 'word-1', display_text: 'cat', target_ipa: '/kæt/', audio_path: 'cat.mp3' },
    'word-2': { id: 'word-2', display_text: 'dog', target_ipa: '/dɒɡ/', audio_path: 'dog.mp3' },
  },
  totalWords: 2,
  position: 0,
  started: true,
  completedWords: 0,
  remainingWords: 2,
  moduleName: 'Module A',
  failedWords: [],
};

describe('setSession', () => {
  it('stores the session and makes it accessible', () => {
    useLessonStore.getState().setSession(mockSession);
    expect(useLessonStore.getState().currentSession).toEqual(mockSession);
  });

  it('accepts null to clear the session', () => {
    useLessonStore.setState({ currentSession: mockSession });
    useLessonStore.getState().setSession(null);
    expect(useLessonStore.getState().currentSession).toBeNull();
  });
});

describe('setLoading / setError', () => {
  it('independently updates loading state', () => {
    useLessonStore.getState().setLoading(true);
    expect(useLessonStore.getState().isLoading).toBe(true);

    useLessonStore.getState().setLoading(false);
    expect(useLessonStore.getState().isLoading).toBe(false);
  });

  it('stores an error message', () => {
    useLessonStore.getState().setError('Something went wrong');
    expect(useLessonStore.getState().error).toBe('Something went wrong');
  });
});

describe('reset', () => {
  it('clears all lesson state back to initial values', () => {
    useLessonStore.setState({
      currentSession: mockSession,
      currentWord: mockSession.wordData['word-1'] as WordData,
      isLoading: true,
      error: 'Previous error',
    });

    useLessonStore.getState().reset();

    expect(useLessonStore.getState()).toMatchObject(INITIAL_STATE);
  });
});
```

---

### 3.4 Hooks

Use `renderHook` from `@testing-library/react-native`. Always mock service layer imports so hooks don't trigger real native calls. Reset Zustand stores in `beforeEach`.

#### Example: `src/hooks/useNfc.test.ts`

```ts
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useNfc } from './useNfc';
import * as nfcService from '../services/nfc';
import { useNfcStore } from '../stores/useNfcStore';

jest.mock('../services/nfc');

const mockInitNfc     = nfcService.initNfc      as jest.MockedFunction<typeof nfcService.initNfc>;
const mockIsNfcEnabled = nfcService.isNfcEnabled as jest.MockedFunction<typeof nfcService.isNfcEnabled>;
const mockReadTag     = nfcService.readTag       as jest.MockedFunction<typeof nfcService.readTag>;
const mockCleanupNfc  = nfcService.cleanupNfc    as jest.MockedFunction<typeof nfcService.cleanupNfc>;

const INITIAL_NFC_STATE = {
  isScanning: false, isSupported: false, isEnabled: false,
  lastTag: null, error: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  useNfcStore.setState(INITIAL_NFC_STATE);

  mockInitNfc.mockResolvedValue(true);
  mockIsNfcEnabled.mockResolvedValue(true);
  mockCleanupNfc.mockImplementation(() => {});
});

describe('mount lifecycle', () => {
  it('calls initNfc and isNfcEnabled on mount', async () => {
    renderHook(() => useNfc());

    await waitFor(() => {
      expect(mockInitNfc).toHaveBeenCalledTimes(1);
      expect(mockIsNfcEnabled).toHaveBeenCalledTimes(1);
    });
  });

  it('sets isSupported=true when hardware is available', async () => {
    mockInitNfc.mockResolvedValue(true);
    const { result } = renderHook(() => useNfc());

    await waitFor(() => {
      expect(result.current.isSupported).toBe(true);
    });
  });

  it('sets isEnabled=false when NFC hardware is disabled', async () => {
    mockIsNfcEnabled.mockResolvedValue(false);
    const { result } = renderHook(() => useNfc());

    await waitFor(() => {
      expect(result.current.isEnabled).toBe(false);
    });
  });

  it('does not call isNfcEnabled when hardware is unsupported', async () => {
    mockInitNfc.mockResolvedValue(false);
    renderHook(() => useNfc());

    await waitFor(() => expect(mockInitNfc).toHaveBeenCalled());
    expect(mockIsNfcEnabled).not.toHaveBeenCalled();
  });

  it('calls cleanupNfc on unmount', async () => {
    const { unmount } = renderHook(() => useNfc());
    unmount();
    expect(mockCleanupNfc).toHaveBeenCalledTimes(1);
  });
});

describe('scan()', () => {
  it('returns the parsed tag and stores it on success', async () => {
    const mockTag = { tagId: 'tag-001', moduleId: 'module-a', isValid: true, rawData: 'tutoria:module-a' };
    mockReadTag.mockResolvedValue(mockTag);

    const { result } = renderHook(() => useNfc());

    let scanResult: typeof mockTag | null = null;
    await act(async () => {
      scanResult = await result.current.scan();
    });

    expect(scanResult).toEqual(mockTag);
    expect(result.current.lastTag).toEqual(mockTag);
    expect(result.current.isScanning).toBe(false);
  });

  it('stores an error message and returns null when scan throws', async () => {
    mockReadTag.mockRejectedValue(new Error('NFC antenna blocked'));

    const { result } = renderHook(() => useNfc());

    await act(async () => {
      await result.current.scan();
    });

    expect(result.current.error).toBe('NFC antenna blocked');
    expect(result.current.lastTag).toBeNull();
    expect(result.current.isScanning).toBe(false);
  });
});
```

#### Example: `src/hooks/useAudio.test.ts`

```ts
// expo-av is mocked in __mocks__/expo-av.ts (see §6.3)
jest.mock('expo-av');
jest.mock('../services/api/audio');

import { renderHook, act } from '@testing-library/react-native';
import { Audio } from 'expo-av';
import { useAudio } from './useAudio';
import { getAudioProxyUrl } from '../services/api/audio';

const mockGetAudioProxyUrl = getAudioProxyUrl as jest.MockedFunction<typeof getAudioProxyUrl>;

const mockSound = {
  playAsync: jest.fn().mockResolvedValue(undefined),
  stopAsync: jest.fn().mockResolvedValue(undefined),
  unloadAsync: jest.fn().mockResolvedValue(undefined),
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGetAudioProxyUrl.mockReturnValue('https://proxy.tutoria.ac/audio/cat.mp3');
  (Audio.Sound.createAsync as jest.Mock).mockResolvedValue({ sound: mockSound });
});

describe('play()', () => {
  it('resolves the proxy URL and plays the sound', async () => {
    const { result } = renderHook(() => useAudio());

    await act(async () => {
      await result.current.play('audio/cat.mp3');
    });

    expect(mockGetAudioProxyUrl).toHaveBeenCalledWith('audio/cat.mp3');
    expect(Audio.Sound.createAsync).toHaveBeenCalledWith({
      uri: 'https://proxy.tutoria.ac/audio/cat.mp3',
    });
    expect(mockSound.playAsync).toHaveBeenCalledTimes(1);
  });

  it('unloads the previous sound before playing a new one', async () => {
    const { result } = renderHook(() => useAudio());

    await act(async () => { await result.current.play('audio/cat.mp3'); });
    await act(async () => { await result.current.play('audio/dog.mp3'); });

    expect(mockSound.unloadAsync).toHaveBeenCalledTimes(1);
  });
});

describe('stop()', () => {
  it('stops and unloads the current sound', async () => {
    const { result } = renderHook(() => useAudio());

    await act(async () => { await result.current.play('audio/cat.mp3'); });
    await act(async () => { await result.current.stop(); });

    expect(mockSound.stopAsync).toHaveBeenCalledTimes(1);
    expect(mockSound.unloadAsync).toHaveBeenCalledTimes(1);
  });

  it('does nothing when no sound is loaded', async () => {
    const { result } = renderHook(() => useAudio());
    await act(async () => { await result.current.stop(); });
    expect(mockSound.stopAsync).not.toHaveBeenCalled();
  });
});
```

### 3.5 Constants and Utilities

```ts
// src/utils/constants.test.ts
import {
  NFC_TAG_PREFIX,
  MAX_MODULE_ATTEMPTS,
  COOLDOWN_HOURS,
  MASTERY_DAYS_REQUIRED,
  PRONUNCIATION_TIMEOUT_MS,
} from './constants';

describe('constants sanity checks', () => {
  it('NFC_TAG_PREFIX is "tutoria:"', () => {
    expect(NFC_TAG_PREFIX).toBe('tutoria:');
  });

  it('module attempt limits are positive integers', () => {
    expect(MAX_MODULE_ATTEMPTS).toBeGreaterThan(0);
    expect(Number.isInteger(MAX_MODULE_ATTEMPTS)).toBe(true);
  });

  it('COOLDOWN_HOURS is a positive number', () => {
    expect(COOLDOWN_HOURS).toBeGreaterThan(0);
  });

  it('MASTERY_DAYS_REQUIRED is at least 1', () => {
    expect(MASTERY_DAYS_REQUIRED).toBeGreaterThanOrEqual(1);
  });

  it('pronunciation timeout is a reasonable value (> 5 s, < 60 s)', () => {
    expect(PRONUNCIATION_TIMEOUT_MS).toBeGreaterThan(5_000);
    expect(PRONUNCIATION_TIMEOUT_MS).toBeLessThan(60_000);
  });
});
```

---

## 4. Integration Testing

Integration tests use `@testing-library/react-native` to render full screen components and assert on UI behaviour. They are slower than unit tests but verify that stores, hooks, and components work together.

### 4.1 Setup Pattern for Screen Tests

```ts
// src/__tests__/helpers/renderWithProviders.tsx
import React from 'react';
import { render } from '@testing-library/react-native';
import { ClerkProvider } from '@clerk/clerk-expo';

/**
 * Wraps a component in any global providers required for rendering.
 * Extend this as more providers are added (theme, navigation, etc.).
 */
export function renderWithProviders(ui: React.ReactElement) {
  return render(
    <ClerkProvider publishableKey="pk_test_stub">
      {ui}
    </ClerkProvider>,
  );
}
```

### 4.2 Auth Guard Behaviour

When components are added to `src/app/`, verify that unauthenticated users cannot reach protected routes:

```ts
// src/app/__tests__/authGuard.test.tsx
import React from 'react';
import { renderWithProviders } from '../helpers/renderWithProviders';
import { useAuthStore } from '../../stores/useAuthStore';

// Import the protected screen once it exists
// import HomeScreen from '../(app)/home';

beforeEach(() => {
  useAuthStore.setState({ isSignedIn: false, userId: null, token: null });
});

it('redirects to sign-in when the user is not authenticated', () => {
  // const { queryByTestId } = renderWithProviders(<HomeScreen />);
  // expect(queryByTestId('home-screen')).toBeNull();
  // expect(queryByTestId('sign-in-screen')).not.toBeNull();
  //
  // Placeholder until HomeScreen is implemented.
  expect(useAuthStore.getState().isSignedIn).toBe(false);
});
```

### 4.3 NFC Scan → Lesson Launch Flow

This integration test exercises the full path: `useNfc.scan()` → parsed tag stored in `useNfcStore` → lesson screen reads `lastTag` → calls `startOrResumeModule`.

```ts
// src/__tests__/integration/nfcToLesson.test.ts
import { act } from '@testing-library/react-native';
import MockAdapter from 'axios-mock-adapter';
import apiClient from '../../services/api/client';
import { useNfcStore } from '../../stores/useNfcStore';
import { useLessonStore } from '../../stores/useLessonStore';
import { startOrResumeModule } from '../../services/api/modules';

const mock = new MockAdapter(apiClient);

afterEach(() => {
  mock.reset();
  useNfcStore.setState({ isScanning: false, isSupported: true, isEnabled: true, lastTag: null, error: null });
  useLessonStore.setState({ currentSession: null, currentWord: null, isLoading: false, error: null });
});

it('sets the lesson session when a valid NFC tag is scanned', async () => {
  // 1. Simulate NFC scan result already stored in the NFC store
  const validTag = { tagId: 'tag-001', moduleId: 'module-a', isValid: true, rawData: 'tutoria:module-a' };

  const mockSession = {
    words: ['word-1'], wordData: { 'word-1': { id: 'word-1', display_text: 'cat', target_ipa: '/kæt/', audio_path: 'cat.mp3' } },
    totalWords: 1, position: 0, started: true, completedWords: 0, remainingWords: 1, moduleName: 'Module A', failedWords: [],
  };

  mock.onPost('/v1/modules/module-a').reply(200, mockSession);

  // 2. Simulate lesson screen logic: read tag from store, call API
  await act(async () => {
    useNfcStore.setState({ lastTag: validTag });
    const session = await startOrResumeModule(validTag.moduleId, 'profile-abc');
    useLessonStore.getState().setSession(session);
  });

  // 3. Verify lesson state is populated
  const lesson = useLessonStore.getState();
  expect(lesson.currentSession?.moduleName).toBe('Module A');
  expect(lesson.currentSession?.totalWords).toBe(1);
});
```

### 4.4 Progress Tracking Verification

```ts
// src/__tests__/integration/progressFlow.test.ts
import { act } from '@testing-library/react-native';
import MockAdapter from 'axios-mock-adapter';
import apiClient from '../../services/api/client';
import { getProgress } from '../../services/api/progress';
import { useProgressStore } from '../../stores/useProgressStore';

const mock = new MockAdapter(apiClient);

afterEach(() => {
  mock.reset();
  useProgressStore.setState({ activities: [], streakDays: 0, isLoading: false });
});

it('populates the progress store from the API response', async () => {
  mock.onGet('/v1/progress/profile-abc').reply(200, {
    streakDays: 5,
    activities: [
      { id: 'cat', displayText: 'cat', isCorrect: true, daysCorrect: 3, mastered: false, lastDate: '2024-01-10' },
    ],
    items: {},
  });

  await act(async () => {
    useProgressStore.getState().setLoading(true);
    const data = await getProgress('profile-abc');
    useProgressStore.getState().setActivities(data.activities);
    useProgressStore.getState().setStreakDays(data.streakDays);
    useProgressStore.getState().setLoading(false);
  });

  const state = useProgressStore.getState();
  expect(state.streakDays).toBe(5);
  expect(state.activities).toHaveLength(1);
  expect(state.activities[0].displayText).toBe('cat');
  expect(state.isLoading).toBe(false);
});
```

---

## 5. E2E Testing

E2E tests run on a real device or simulator and exercise the app from the user's perspective. Tutoria uses **Maestro** because it is mobile-first, YAML-based, and works well with Expo Dev Client builds.

### 5.1 Maestro Installation

```bash
# macOS / Linux
curl -Ls "https://get.maestro.mobile.dev" | bash

# Verify
maestro --version
```

> For Windows, use WSL2 with an Android emulator connected over ADB, or run tests in CI using a Linux runner.

### 5.2 Project Structure for Maestro

```
e2e/
├── .maestro/
│   └── config.yaml          ← global app configuration
├── flows/
│   ├── 01_sign_in.yaml
│   ├── 02_profile_select.yaml
│   ├── 03_nfc_scan_lesson.yaml
│   ├── 04_word_completion.yaml
│   └── 05_progress_check.yaml
└── README.md
```

### 5.3 Global Config

```yaml
# e2e/.maestro/config.yaml
appId: ac.tutoria.mobile
---
```

### 5.4 Flow: Sign In → Profile Select → Home

```yaml
# e2e/flows/01_sign_in.yaml
appId: ac.tutoria.mobile
---
- launchApp:
    clearState: true
    env:
      EXPO_PUBLIC_ENABLE_NFC_MOCK: "true"

# Wait for Clerk sign-in screen
- assertVisible: "Sign in to Tutoria"
- tapOn: "Email address"
- inputText: "${TEST_EMAIL}"
- tapOn: "Continue"
- tapOn: "Password"
- inputText: "${TEST_PASSWORD}"
- tapOn: "Continue"

# Should land on profile selection
- assertVisible: "Select a profile"
- tapOn:
    text: "TestProfile"
- assertVisible: "Home"            # home screen headline
```

### 5.5 Flow: NFC Scan → Lesson → Word Completion

When `EXPO_PUBLIC_ENABLE_NFC_MOCK=true` is set, the app uses mock NFC data instead of real hardware (see §6.1). The mock injects a predetermined `tutoria:module-a` payload.

```yaml
# e2e/flows/03_nfc_scan_lesson.yaml
appId: ac.tutoria.mobile
env:
  EXPO_PUBLIC_ENABLE_NFC_MOCK: "true"
  EXPO_PUBLIC_NFC_MOCK_MODULE_ID: "module-a"
---
# Home screen — tap the NFC scan button
- assertVisible: "Home"
- tapOn:
    id: "btn-scan-nfc"

# Modal appears asking user to hold the card
- assertVisible: "Hold your Tutoria card near the back of your phone"

# Mock immediately resolves — lesson screen appears
- assertVisible: "Module A"
- assertVisible:
    id: "word-display"

# Attempt pronunciation — mock returns "correct"
- tapOn:
    id: "btn-record"
- waitForAnimationToEnd
- tapOn:
    id: "btn-stop-record"
- assertVisible: "Correct!"

# Advance to next word
- tapOn:
    id: "btn-next-word"
```

### 5.6 Flow: Progress Tracking Verification

```yaml
# e2e/flows/05_progress_check.yaml
appId: ac.tutoria.mobile
---
- assertVisible: "Home"
- tapOn:
    id: "tab-progress"
- assertVisible: "Your Progress"
- assertVisible:
    id: "streak-count"
- assertTrue:
    id: "activity-list"
    enabled: true
```

### 5.7 Running E2E Tests

```bash
# Run all flows in order
maestro test e2e/flows/

# Run a single flow
maestro test e2e/flows/03_nfc_scan_lesson.yaml

# Run against a specific device (Android)
maestro --device emulator-5554 test e2e/flows/
```

---

## 6. Mocking Strategy

### 6.1 NFC Mock — `react-native-nfc-manager`

Create a manual mock at `__mocks__/react-native-nfc-manager.ts`. This file is picked up automatically by Jest due to the `moduleNameMapper` fallback for `node_modules`.

```ts
// __mocks__/react-native-nfc-manager.ts

const NfcManager = {
  isSupported: jest.fn().mockResolvedValue(false),
  start: jest.fn().mockResolvedValue(undefined),
  isEnabled: jest.fn().mockResolvedValue(false),
  requestTechnology: jest.fn().mockResolvedValue(undefined),
  getTag: jest.fn().mockResolvedValue(null),
  cancelTechnologyRequest: jest.fn().mockResolvedValue(undefined),
};

export const NfcTech = {
  Ndef: 'Ndef',
  NfcA: 'NfcA',
  NfcB: 'NfcB',
};

export const Ndef = {
  text: {
    decodePayload: jest.fn().mockReturnValue(''),
  },
};

export default NfcManager;
```

**NFC mock mode for E2E / manual QA:** Set `EXPO_PUBLIC_ENABLE_NFC_MOCK=true` in your `.env.local`. The app (once built) should detect this flag and simulate an NFC read using the value of `EXPO_PUBLIC_NFC_MOCK_MODULE_ID` instead of calling the real `NfcManager`. Implement this conditional in `nfcManager.ts`:

```ts
// Pseudo-code — add to nfcManager.ts when implementing NFC mock mode
const NFC_MOCK_ENABLED = process.env.EXPO_PUBLIC_ENABLE_NFC_MOCK === 'true';
const NFC_MOCK_MODULE_ID = process.env.EXPO_PUBLIC_NFC_MOCK_MODULE_ID ?? 'module-a';

export async function readTag(): Promise<NfcTagPayload | null> {
  if (NFC_MOCK_ENABLED) {
    return parseNdefPayload(`tutoria:${NFC_MOCK_MODULE_ID}`, 'mock-tag-id');
  }
  // ... real implementation
}
```

### 6.2 Clerk Auth Mock

```ts
// __mocks__/@clerk/clerk-expo.ts

export const useAuth = jest.fn(() => ({
  isSignedIn: false,
  userId: null,
  getToken: jest.fn().mockResolvedValue(null),
  signOut: jest.fn().mockResolvedValue(undefined),
}));

export const useUser = jest.fn(() => ({
  user: null,
  isLoaded: true,
}));

export const useSignIn = jest.fn(() => ({
  signIn: { create: jest.fn() },
  setActive: jest.fn(),
  isLoaded: true,
}));

export const ClerkProvider = ({ children }: { children: React.ReactNode }) => children;
```

Helper for per-test auth overrides:

```ts
// src/__tests__/helpers/mockAuth.ts
import { useAuth } from '@clerk/clerk-expo';

export function mockSignedIn(userId = 'user-test-123', token = 'test-tok') {
  (useAuth as jest.Mock).mockReturnValue({
    isSignedIn: true,
    userId,
    getToken: jest.fn().mockResolvedValue(token),
    signOut: jest.fn(),
  });
}

export function mockSignedOut() {
  (useAuth as jest.Mock).mockReturnValue({
    isSignedIn: false,
    userId: null,
    getToken: jest.fn().mockResolvedValue(null),
    signOut: jest.fn(),
  });
}
```

### 6.3 Audio Mock — `expo-av`

```ts
// __mocks__/expo-av.ts
const mockSound = {
  playAsync: jest.fn().mockResolvedValue(undefined),
  stopAsync: jest.fn().mockResolvedValue(undefined),
  unloadAsync: jest.fn().mockResolvedValue(undefined),
};

const mockRecording = {
  stopAndUnloadAsync: jest.fn().mockResolvedValue(undefined),
  getURI: jest.fn().mockReturnValue('file:///tmp/recording.wav'),
};

export const Audio = {
  Sound: {
    createAsync: jest.fn().mockResolvedValue({ sound: mockSound }),
  },
  Recording: {
    createAsync: jest.fn().mockResolvedValue({ recording: mockRecording }),
  },
  RecordingOptionsPresets: {
    HIGH_QUALITY: {},
  },
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
};
```

### 6.4 Haptics Mock — `expo-haptics`

```ts
// __mocks__/expo-haptics.ts
export const impactAsync = jest.fn().mockResolvedValue(undefined);
export const notificationAsync = jest.fn().mockResolvedValue(undefined);
export const selectionAsync = jest.fn().mockResolvedValue(undefined);

export const ImpactFeedbackStyle = {
  Light: 'light',
  Medium: 'medium',
  Heavy: 'heavy',
};

export const NotificationFeedbackType = {
  Success: 'success',
  Warning: 'warning',
  Error: 'error',
};
```

### 6.5 Speech Mock — `expo-speech`

```ts
// __mocks__/expo-speech.ts
export const speak = jest.fn();
export const stop = jest.fn();
export const isSpeakingAsync = jest.fn().mockResolvedValue(false);
export const getAvailableVoicesAsync = jest.fn().mockResolvedValue([]);
```

### 6.6 Pronunciation API Mock

The pronunciation check endpoint calls an AI service with a 20-second timeout. Never hit this service in tests. Mock `src/services/api/pronunciation.ts` wholesale:

```ts
// In any test file that indirectly triggers pronunciation:
jest.mock('../services/api/pronunciation');
import { checkPronunciation } from '../services/api/pronunciation';

const mockCheckPronunciation = checkPronunciation as jest.MockedFunction<typeof checkPronunciation>;

// Default: successful "correct" response
mockCheckPronunciation.mockResolvedValue({
  overallIsCorrect: true,
  similarity: 0.92,
  ipa_transcription_user: '/kæt/',
  ipa_transcription_reference: '/kæt/',
  resultType: 'correct',
  feedback: 'Great pronunciation!',
  audioIssue: null,
  errorType: null,
  highlightedSegment: null,
  pronunciation_match: true,
  azure: null,
  debug: null,
});
```

For testing the "incorrect" path:

```ts
mockCheckPronunciation.mockResolvedValue({
  overallIsCorrect: false,
  similarity: 0.41,
  ipa_transcription_user: '/kɛt/',
  ipa_transcription_reference: '/kæt/',
  resultType: 'incorrect',
  feedback: 'Try to open your mouth more for the "æ" sound.',
  audioIssue: null,
  errorType: null,
  highlightedSegment: 'æ',
  pronunciation_match: false,
  azure: null,
  debug: null,
});
```

### 6.7 Network State Mock (Offline Tests)

For testing offline behaviour once network-aware UI is added:

```ts
// __mocks__/@react-native-community/netinfo.ts
const mockNetInfo = {
  addEventListener: jest.fn(() => jest.fn()),  // returns unsubscribe fn
  fetch: jest.fn().mockResolvedValue({
    isConnected: true,
    isInternetReachable: true,
    type: 'wifi',
  }),
};

export default mockNetInfo;

// Helper to simulate offline state in a test
export function mockOffline() {
  mockNetInfo.fetch.mockResolvedValue({
    isConnected: false,
    isInternetReachable: false,
    type: 'none',
  });
}
```

---

## 7. CI Integration

### 7.1 GitHub Actions Workflow

Create `.github/workflows/test.yml`:

```yaml
name: Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  unit-and-integration:
    name: Unit & Integration Tests
    runs-on: ubuntu-latest
    timeout-minutes: 15

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run tests with coverage
        run: npm run test:coverage
        env:
          # Ensure NFC and other native modules fall through to mocks
          EXPO_PUBLIC_ENABLE_NFC_MOCK: 'true'
          # Stub Clerk key — the Clerk mock doesn't use it but the module expects it
          EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_stub_for_ci'

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v4
        with:
          files: ./coverage/lcov.info
          flags: unit
          fail_ci_if_error: false   # don't fail the whole build on upload errors
        env:
          CODECOV_TOKEN: ${{ secrets.CODECOV_TOKEN }}

      - name: Upload test results artifact
        if: always()   # upload even on failure to inspect failures
        uses: actions/upload-artifact@v4
        with:
          name: test-results
          path: |
            coverage/
          retention-days: 14
```

### 7.2 PR Status Checks

Configure branch protection rules on `main` and `develop` in GitHub Settings → Branches:

| Rule | Value |
|---|---|
| Require status checks to pass | ✅ |
| Required checks | `Tests / Unit & Integration Tests` |
| Require branches to be up to date | ✅ |
| Restrict force pushes | ✅ |

With these rules, PRs will be blocked from merging if `npm run test:coverage` fails or if coverage thresholds in `jest.config.js` are not met.

### 7.3 Maestro E2E in CI (Optional)

E2E tests are expensive and hardware-dependent. Run them on a schedule or on demand rather than on every PR:

```yaml
name: E2E Tests (Scheduled)

on:
  schedule:
    - cron: '0 2 * * *'   # 02:00 UTC daily
  workflow_dispatch:        # allow manual trigger

jobs:
  maestro-android:
    name: Maestro E2E — Android
    runs-on: ubuntu-latest
    timeout-minutes: 40

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Maestro
        run: curl -Ls "https://get.maestro.mobile.dev" | bash

      - name: Setup Android Emulator
        uses: reactivecircus/android-emulator-runner@v2
        with:
          api-level: 33
          profile: pixel_5
          script: |
            # Build Expo dev client (or use a pre-built APK artifact)
            npx expo run:android --no-build-cache
            # Run all Maestro flows
            ~/.maestro/bin/maestro test e2e/flows/ \
              --env TEST_EMAIL=${{ secrets.E2E_TEST_EMAIL }} \
              --env TEST_PASSWORD=${{ secrets.E2E_TEST_PASSWORD }}

      - name: Upload Maestro screenshots
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: maestro-screenshots
          path: ~/.maestro/tests/
```

### 7.4 Coverage Badges

Add to `README.md` once Codecov is connected:

```md
[![codecov](https://codecov.io/gh/<org>/tutoria-mobile-app/graph/badge.svg?token=<TOKEN>)](https://codecov.io/gh/<org>/tutoria-mobile-app)
```

### 7.5 Recommended Development Workflow

```
┌─────────────────────────────────────────────────────────┐
│  Local Development                                       │
│                                                         │
│  1. Write failing unit test  →  npm run test:watch      │
│  2. Implement feature                                   │
│  3. All tests pass                                      │
│  4. npm run test:coverage  (verify thresholds locally)  │
└────────────────────────┬────────────────────────────────┘
                         │ git push / PR
                         ▼
┌─────────────────────────────────────────────────────────┐
│  CI (GitHub Actions)                                    │
│                                                         │
│  • npm ci                                               │
│  • npm run test:coverage        ← fails PR if thresholds│
│  • Upload lcov → Codecov                                │
│  • PR status check blocks merge on failure              │
└─────────────────────────────────────────────────────────┘
                         │ merge to main
                         ▼
┌─────────────────────────────────────────────────────────┐
│  Nightly CI                                             │
│                                                         │
│  • Maestro E2E on Android emulator                      │
│  • Notify Slack/email on failure                        │
└─────────────────────────────────────────────────────────┘
```

---

## Appendix A — Quick Reference: Test File Checklist

When adding a new module to `src/`, follow this checklist:

- [ ] Create a co-located `*.test.ts(x)` file
- [ ] Add a `beforeEach` that resets any Zustand stores the module touches
- [ ] Cover the **happy path**, at least one **error path**, and any **edge cases** (empty arrays, nulls, boundary values)
- [ ] Mock all I/O (API calls with `axios-mock-adapter`, native modules with `__mocks__/`)
- [ ] Run `npm run test:coverage` locally to ensure thresholds are still met

## Appendix B — Key Dependency Versions (at time of writing)

| Package | Version |
|---|---|
| `jest` | ^29 |
| `jest-expo` | ~55 (matches Expo SDK) |
| `@testing-library/react-native` | ^13 |
| `@testing-library/jest-native` | ^5 |
| `axios-mock-adapter` | ^2 |
| `react-test-renderer` | matches React version (19.x) |
| Maestro CLI | latest stable |

> Always keep `jest-expo` pinned to the same major version as your Expo SDK. Mismatches cause transform failures on Expo-internal packages.

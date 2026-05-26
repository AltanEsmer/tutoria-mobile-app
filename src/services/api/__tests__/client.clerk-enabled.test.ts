jest.mock('../../../utils/constants', () => ({
  ...jest.requireActual('../../../utils/constants'),
  BACKEND_SUPPORTS_CLERK: true,
}));

import apiClient, { getAuthHeaderAsync, setSignOutHandler, setTokenGetter } from '../client';

const BYPASS = 'Bearer tutoria-integration-test-2026';

// Reach into the registered axios interceptor handlers so we can exercise the
// real token-injection logic without making network calls.
type Handler = { fulfilled: (v: unknown) => unknown; rejected: (e: unknown) => Promise<unknown> };
const requestInterceptor = (apiClient.interceptors.request as unknown as { handlers: Handler[] })
  .handlers[0];
const responseInterceptor = (apiClient.interceptors.response as unknown as { handlers: Handler[] })
  .handlers[0];

afterEach(() => {
  setTokenGetter(null);
  setSignOutHandler(null);
  jest.clearAllMocks();
});

describe('getAuthHeaderAsync (BACKEND_SUPPORTS_CLERK = true)', () => {
  it('returns a Clerk JWT when the getter yields a token', async () => {
    setTokenGetter(async () => 'jwt-123');
    expect(await getAuthHeaderAsync()).toBe('Bearer jwt-123');
  });

  it('falls back to the bypass token when the getter yields null', async () => {
    setTokenGetter(async () => null);
    expect(await getAuthHeaderAsync()).toBe(BYPASS);
  });

  it('returns the bypass token when no getter is registered', async () => {
    expect(await getAuthHeaderAsync()).toBe(BYPASS);
  });
});

describe('request interceptor (BACKEND_SUPPORTS_CLERK = true)', () => {
  it('injects a fresh Clerk JWT when a getter is registered', async () => {
    setTokenGetter(async () => 'jwt-abc');
    const config = await requestInterceptor.fulfilled({ headers: {} });
    expect((config as { headers: Record<string, string> }).headers.Authorization).toBe(
      'Bearer jwt-abc',
    );
  });

  it('falls back to the bypass token when the getter yields null', async () => {
    setTokenGetter(async () => null);
    const config = await requestInterceptor.fulfilled({ headers: {} });
    expect((config as { headers: Record<string, string> }).headers.Authorization).toBe(BYPASS);
  });

  it('injects the bypass token when no getter is registered', async () => {
    const config = await requestInterceptor.fulfilled({ headers: {} });
    expect((config as { headers: Record<string, string> }).headers.Authorization).toBe(BYPASS);
  });
});

describe('response interceptor — 401 handling (BACKEND_SUPPORTS_CLERK = true)', () => {
  it('injects a fresh Authorization header for retry on 401 when getter yields a token', async () => {
    setTokenGetter(async () => 'fresh-jwt');

    const signOut = jest.fn();
    setSignOutHandler(signOut);

    const error = {
      response: { status: 401 },
      config: { headers: {} as Record<string, string>, _silenceErrorLogging: true },
    };

    // The interceptor will attempt a retry (network call fails in test env, that's fine).
    // What matters: sign-out was NOT called (a fresh token existed) and the header was
    // updated before the retry was dispatched.
    await responseInterceptor.rejected(error).catch(() => {
      /* network error from retry in test env — expected */
    });

    expect(signOut).not.toHaveBeenCalled();
    expect(error.config.headers['Authorization']).toBe('Bearer fresh-jwt');
  });

  it('calls sign-out when getter yields null on 401', async () => {
    const signOut = jest.fn();
    setTokenGetter(async () => null);
    setSignOutHandler(signOut);

    await expect(
      responseInterceptor.rejected({
        response: { status: 401 },
        config: { headers: {}, _silenceErrorLogging: true },
      }),
    ).rejects.toBeDefined();

    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it('calls sign-out on 401 when no token getter is set', async () => {
    const signOut = jest.fn();
    setSignOutHandler(signOut);

    await expect(
      responseInterceptor.rejected({
        response: { status: 401 },
        config: { _silenceErrorLogging: true },
      }),
    ).rejects.toBeDefined();

    expect(signOut).toHaveBeenCalledTimes(1);
  });
});

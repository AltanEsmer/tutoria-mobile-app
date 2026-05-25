import apiClient, {
  getAuthHeaderAsync,
  setSignOutHandler,
  setTokenGetter,
} from '../client';

const BYPASS = 'Bearer tutoria-integration-test-2026';

// Reach into the registered axios interceptor handlers so we can exercise the
// real token-injection logic without making network calls.
type Handler = { fulfilled: (v: unknown) => unknown; rejected: (e: unknown) => unknown };
const requestInterceptor = (apiClient.interceptors.request as unknown as { handlers: Handler[] })
  .handlers[0];
const responseInterceptor = (apiClient.interceptors.response as unknown as { handlers: Handler[] })
  .handlers[0];

afterEach(() => {
  setTokenGetter(null);
  setSignOutHandler(null);
  jest.clearAllMocks();
});

describe('getAuthHeaderAsync', () => {
  it('returns the bypass token when no Clerk getter is registered', async () => {
    expect(await getAuthHeaderAsync()).toBe(BYPASS);
  });

  it('returns a Clerk JWT when the getter yields a token', async () => {
    setTokenGetter(async () => 'jwt-123');
    expect(await getAuthHeaderAsync()).toBe('Bearer jwt-123');
  });

  it('falls back to the bypass token when the getter yields null', async () => {
    setTokenGetter(async () => null);
    expect(await getAuthHeaderAsync()).toBe(BYPASS);
  });
});

describe('request interceptor', () => {
  it('injects the bypass token when Clerk is not active', async () => {
    const config = await requestInterceptor.fulfilled({ headers: {} });
    expect((config as { headers: Record<string, string> }).headers.Authorization).toBe(BYPASS);
  });

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
});

describe('response interceptor — 401 handling', () => {
  it('calls the sign-out handler on a 401 when no token getter is set', async () => {
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

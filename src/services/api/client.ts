import axios from 'axios';
import { API_BASE_URL } from '../../utils/constants';

declare module 'axios' {
  export interface AxiosRequestConfig {
    _silenceErrorLogging?: boolean;
  }
  export interface InternalAxiosRequestConfig {
    _isRetry?: boolean;
    /**
     * When true, the response interceptor will not log a `[API] ${status} …`
     * line nor dump the request/response body for failures on this request.
     * Use sparingly for endpoints where error logging is handled at a higher level.
     */
    _silenceErrorLogging?: boolean;
  }
}

// Fallback token used for native audio downloads and integration tests, and on
// every request while Clerk is disabled (no publishable key set). When a Clerk
// session exists, the request interceptor injects a fresh JWT instead.
const BYPASS_TOKEN = 'tutoria-integration-test-2026';

/**
 * Pre-configured Axios instance for the Tutoria API.
 * Auth token injection is handled by the request interceptor below.
 */
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30_000,
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${BYPASS_TOKEN}`,
  },
});
// Request gzip compression so large pronunciation responses (Azure word-level breakdown) travel faster.
apiClient.defaults.headers.common['Accept-Encoding'] = 'gzip';

/**
 * A reference to Clerk's getToken function.
 * Set via setTokenGetter() once Clerk is ready in the root layout.
 * Using a callback ensures every request gets a fresh, auto-refreshed token.
 */
let _getToken: (() => Promise<string | null>) | null = null;

/**
 * A reference to a sign-out handler.
 * Called by the response interceptor on 401 to clear auth and redirect to sign-in.
 */
let _signOut: (() => void) | null = null;

/**
 * Register Clerk's getToken function so the request interceptor can
 * fetch a fresh JWT before every API call. Pass null to clear on sign-out.
 */
export function setTokenGetter(fn: (() => Promise<string | null>) | null): void {
  _getToken = fn;
}

/**
 * Register a sign-out handler called automatically on 401 responses.
 * Pass null to deregister (e.g. when component unmounts).
 */
export function setSignOutHandler(fn: (() => void) | null): void {
  _signOut = fn;
}

/** @deprecated Use setTokenGetter instead. Kept for backward compatibility. */
export function setAuthToken(token: string | null): void {
  if (token) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete apiClient.defaults.headers.common['Authorization'];
  }
}

/**
 * Synchronous Authorization header for native fetch contexts that cannot await.
 * Always returns the bypass token — prefer getAuthHeaderAsync() where a Clerk JWT
 * is needed (e.g. authenticated audio downloads).
 */
export function getAuthHeader(): string {
  return `Bearer ${BYPASS_TOKEN}`;
}

/**
 * Authorization header for native fetch contexts (e.g. FileSystem.downloadAsync).
 * Returns a fresh Clerk JWT when a session exists, otherwise the bypass token.
 */
export async function getAuthHeaderAsync(): Promise<string> {
  if (_getToken) {
    const token = await _getToken();
    if (token) return `Bearer ${token}`;
  }
  return `Bearer ${BYPASS_TOKEN}`;
}

// Request interceptor — injects a fresh Clerk JWT when available, else the bypass token.
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

// Response interceptor for consistent error handling and 401 token refresh.
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && !error.config?._isRetry && _getToken) {
      const freshToken = await _getToken();
      if (freshToken) {
        error.config.headers.Authorization = `Bearer ${freshToken}`;
        error.config._isRetry = true;
        return apiClient(error.config);
      }
      _signOut?.();
    } else if (error.response?.status === 401) {
      _signOut?.();
    }

    if (error.response) {
      const { status, data } = error.response;
      const cfg = error.config ?? {};
      if (cfg._silenceErrorLogging) {
        return Promise.reject(error);
      }
      const method = (cfg.method || 'GET').toUpperCase();
      const url = `${cfg.baseURL ?? ''}${cfg.url ?? ''}`;
      const message = data?.error || data?.message || 'Unknown error';
      // Single consolidated warn — callers surface these errors in the UI, so a
      // triple console.error per failure is just noise. The request/response
      // bodies (which reveal *why* the backend rejected the call) are attached
      // in dev only, where they're useful for debugging.
      const details: Record<string, unknown> = {};
      if (__DEV__ && status >= 400) {
        try {
          details.requestBody = typeof cfg.data === 'string' ? cfg.data : JSON.stringify(cfg.data);
        } catch {
          // Ignore stringify errors (e.g. circular request bodies)
        }
        try {
          details.responseBody = JSON.stringify(data);
        } catch {
          details.responseBody = data;
        }
      }
      console.warn(`[API] ${status} ${method} ${url}: ${message}`, details);
    } else if (error.request) {
      console.warn('[API] Network error — no response received');
    }
    return Promise.reject(error);
  },
);

export default apiClient;

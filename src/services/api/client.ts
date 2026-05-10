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

// TODO Phase 4: Remove bypass token and switch to Clerk JWTs via setTokenGetter.
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

let _signOut: (() => void) | null = null;

// TODO Phase 4: Re-enable setTokenGetter to inject Clerk JWTs.
export function setTokenGetter(_fn: (() => Promise<string | null>) | null): void {
  // no-op until Phase 4
}

/**
 * Register a sign-out handler called automatically on 401 responses.
 * Pass null to deregister (e.g. when component unmounts).
 */
export function setSignOutHandler(fn: (() => void) | null): void {
  _signOut = fn;
}

/** @deprecated Use setTokenGetter instead. Kept for backward compatibility. */
export function setAuthToken(_token: string | null): void {
  // no-op until Phase 4
}

/** Returns the current Authorization header value for use in native fetch contexts (e.g. FileSystem.downloadAsync). */
export function getAuthHeader(): string {
  return `Bearer ${BYPASS_TOKEN}`;
}

// Request interceptor — injects the static bypass token on every request
// TODO Phase 4: Replace with Clerk JWT from _getToken()
apiClient.interceptors.request.use((config) => {
  config.headers.Authorization = `Bearer ${BYPASS_TOKEN}`;
  return config;
});

// Response interceptor for consistent error handling
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
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
      console.error(`[API] ${status} ${method} ${url}: ${message}`);
      // For 4xx/5xx, dump the full response body and request body so we can see
      // *why* the backend rejected the call. The default `data?.error` extract
      // hides nested validation messages, stack traces and missing-field hints.
      if (status >= 400) {
        try {
          const bodyPreview = typeof cfg.data === 'string' ? cfg.data : JSON.stringify(cfg.data);
          console.error('[API] request body:', bodyPreview);
        } catch {
          // Ignore stringify errors (e.g. circular request bodies)
        }
        try {
          console.error('[API] response body:', JSON.stringify(data));
        } catch {
          console.error('[API] response body (non-serialisable):', data);
        }
      }
    } else if (error.request) {
      console.error('[API] Network error — no response received');
    }
    return Promise.reject(error);
  },
);

export default apiClient;

import axios from 'axios';
import { API_BASE_URL } from '../../utils/constants';

declare module 'axios' {
  export interface InternalAxiosRequestConfig {
    _isRetry?: boolean;
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
      console.error(`[API] ${status}: ${data?.error || 'Unknown error'}`);
    } else if (error.request) {
      console.error('[API] Network error — no response received');
    }
    return Promise.reject(error);
  },
);

export default apiClient;

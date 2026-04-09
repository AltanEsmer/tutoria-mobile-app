import axios from 'axios';
import { API_BASE_URL } from '../../utils/constants';

declare module 'axios' {
  export interface InternalAxiosRequestConfig {
    _isRetry?: boolean;
  }
}

/**
 * Pre-configured Axios instance for the Tutoria API.
 * Auth token injection is handled by the request interceptor below.
 */
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30_000,
  headers: {
    'Content-Type': 'application/json',
  },
});

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

// Request interceptor — fetches a fresh Clerk JWT before every request
apiClient.interceptors.request.use(async (config) => {
  if (_getToken) {
    const token = await _getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Response interceptor for consistent error handling and 401 token refresh
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
    }

    if (error.response?.status === 401) {
      _signOut?.();
      return Promise.reject(error);
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

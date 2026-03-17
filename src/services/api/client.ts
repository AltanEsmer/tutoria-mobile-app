import axios from 'axios';
import { API_BASE_URL } from '../../utils/constants';

/**
 * Pre-configured Axios instance for the Tutoria API.
 * Auth token injection is handled by the interceptor below.
 */
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30_000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Set the auth token for all subsequent requests.
 * Called after Clerk provides a session token.
 */
export function setAuthToken(token: string | null): void {
  if (token) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete apiClient.defaults.headers.common['Authorization'];
  }
}

// Response interceptor for consistent error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
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

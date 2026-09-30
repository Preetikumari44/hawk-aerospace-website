/** Hawk API client — single axios-like wrapper using fetch.
 *  No external deps. Token auto-attached. Refresh on 401. */

import { getToken, getRefreshToken, setTokens, clearTokens } from '../context/AuthContext';

// Determine platform
const isReactNative = typeof navigator !== 'undefined' && (navigator as any).product === 'ReactNative';

// Import environment variables
// For React Native: use react-native-dotenv (@env module)
// For Web: webpack DefinePlugin replaces process.env.REACT_APP_API_URL with literal string
let REACT_APP_API_URL = '';

if (isReactNative) {
  // React Native: Load from @env module (react-native-dotenv)
  try {
    const env = require('@env');
    REACT_APP_API_URL = env.REACT_APP_API_URL || '';
  } catch (e) {
    // @env not available
  }
} else {
  // Web: webpack DefinePlugin replaces the text 'process.env.REACT_APP_API_URL' at build time
  // @ts-ignore
  REACT_APP_API_URL = process.env.REACT_APP_API_URL || '';
}

// Simple platform-specific API base URLs
const getApiBase = () => {
  // Priority 1: Environment variable (injected by webpack DefinePlugin or @env)
  if (REACT_APP_API_URL) {
    return REACT_APP_API_URL;
  }

  // Priority 2: Development defaults (never a production URL)
  if (isReactNative) {
    const Platform = require('react-native').Platform;
    if (Platform.OS === 'android') {
      return 'http://10.0.2.2:3001/api';
    } else {
      return 'http://localhost:3001/api';
    }
  } else {
    return 'http://localhost:3001/api';
  }
};

const API_BASE = getApiBase();

let isRefreshing = false;
let refreshQueue: Array<() => void> = [];

function processQueue() {
  refreshQueue.forEach((cb) => cb());
  refreshQueue = [];
}

// Map HTTP status codes to user-friendly messages
function getStatusMessage(status: number): string {
  switch (status) {
    case 400:
      return 'Invalid request. Please check your input and try again.';
    case 401:
      return 'Your session has expired. Please log in again.';
    case 403:
      return 'You do not have permission to perform this action.';
    case 404:
      return 'The requested resource was not found.';
    case 408:
      return 'Request timeout. Please check your connection and try again.';
    case 429:
      return 'Too many requests. Please wait a moment and try again.';
    case 500:
      return 'Server error. Please try again later.';
    case 502:
      return 'Bad gateway. The server is temporarily unavailable.';
    case 503:
      return 'Service unavailable. Please try again later.';
    case 504:
      return 'Gateway timeout. The server is taking too long to respond.';
    default:
      if (status >= 500) {
        return 'Server error. Please try again later.';
      }
      return 'Something went wrong. Please try again.';
  }
}

async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) {
      return false;
    }

    const data = await res.json();
    const apiData = data?.data || data;
    setTokens(apiData.accessToken, apiData.refreshToken);
    return true;
  } catch (error) {
    return false;
  }
}

export interface ApiResponse<T = unknown> {
  data: T;
  status: number;
  ok: boolean;
}

export interface ApiError {
  message: string;
  statusCode: number;
  error?: string;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });
  } catch (error: any) {
    // Network errors (no internet, server down, etc.)
    if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
      throw {
        message: 'Unable to connect to server. Please check your internet connection and try again.',
        statusCode: 0,
        error: 'NETWORK_ERROR',
      } as ApiError;
    }
    
    throw {
      message: 'Connection error. Please check your network and try again.',
      statusCode: 0,
      error: 'NETWORK_ERROR',
    } as ApiError;
  }

  // Auto-refresh on 401
  if (res.status === 401 && token) {
    if (!isRefreshing) {
      isRefreshing = true;
      const refreshed = await refreshAccessToken();
      isRefreshing = false;

      if (refreshed) {
        processQueue();
        // Retry original request w/ new token
        headers.Authorization = `Bearer ${getToken()}`;
        try {
          res = await fetch(`${API_BASE}${path}`, { ...options, headers });
        } catch (retryError: any) {
          throw {
            message: 'Connection error. Please check your network and try again.',
            statusCode: 0,
            error: 'NETWORK_ERROR',
          } as ApiError;
        }
      } else {
        clearTokens();
        throw { message: 'Your session has expired. Please log in again.', statusCode: 401 } as ApiError;
      }
    } else {
      // Wait for in-flight refresh
      await new Promise<void>((resolve) => refreshQueue.push(resolve));
      headers.Authorization = `Bearer ${getToken()}`;
      try {
        res = await fetch(`${API_BASE}${path}`, { ...options, headers });
      } catch (retryError: any) {
        throw {
          message: 'Connection error. Please check your network and try again.',
          statusCode: 0,
          error: 'NETWORK_ERROR',
        } as ApiError;
      }
    }
  }

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    // Extract error message from various response structures
    const errorMessage = data?.message || data?.error || getStatusMessage(res.status);
    
    throw {
      message: errorMessage,
      statusCode: res.status,
      error: data?.error,
    } as ApiError;
  }

  // For 204 No Content, return empty data
  if (res.status === 204) {
    return { data: null as T, status: res.status, ok: true };
  }

  // Unwrap backend response if it's in the format { success: true, data: T }
  const responseData = data?.success && data?.data !== undefined ? data.data : data;

  return { data: responseData as T, status: res.status, ok: true };
}

// ── Convenience methods ─────────────────────────────────

export const api = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),

  post: <T>(path: string, body?: unknown) => 
    request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),

  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),

  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),

  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

export { API_BASE };

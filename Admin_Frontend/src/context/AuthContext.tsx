/** AuthContext — JWT storage + user state + login/logout.
 *  Works on both React Native (AsyncStorage) and web (localStorage). */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Platform } from 'react-native';
import { authApi, type LoginResponse } from '../api/auth.api';

// ── Token storage (module-level for API client access) ──

let _accessToken: string | null = null;
let _refreshToken: string | null = null;

export function getToken(): string | null { return _accessToken; }
export function getRefreshToken(): string | null { return _refreshToken; }

export function setTokens(access: string, refresh: string, rememberMe: boolean = false) {
  _accessToken = access;
  _refreshToken = refresh;
  persistTokens(access, refresh, rememberMe);
}

export function clearTokens() {
  _accessToken = null;
  _refreshToken = null;
  removePersistedTokens();
}

// ── Platform-specific persistence ──────────────────────

const STORAGE_KEY_ACCESS = '@hawk_access_token';
const STORAGE_KEY_REFRESH = '@hawk_refresh_token';

async function persistTokens(access: string, refresh: string, rememberMe: boolean = false) {
  if (Platform.OS === 'web') {
    localStorage.setItem(STORAGE_KEY_ACCESS, access);
    localStorage.setItem(STORAGE_KEY_REFRESH, refresh);
    localStorage.setItem(STORAGE_KEY_REMEMBER_ME, String(rememberMe));
  } else {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.multiSet([
        [STORAGE_KEY_ACCESS, access],
        [STORAGE_KEY_REFRESH, refresh],
        [STORAGE_KEY_REMEMBER_ME, String(rememberMe)],
      ]);
    } catch { /* AsyncStorage not available */ }
  }
}

async function removePersistedTokens() {
  if (Platform.OS === 'web') {
    localStorage.removeItem(STORAGE_KEY_ACCESS);
    localStorage.removeItem(STORAGE_KEY_REFRESH);
    localStorage.removeItem(STORAGE_KEY_REMEMBER_ME);
  } else {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.multiRemove([STORAGE_KEY_ACCESS, STORAGE_KEY_REFRESH, STORAGE_KEY_REMEMBER_ME]);
    } catch { /* noop */ }
  }
}

async function loadPersistedTokens(): Promise<{ access: string | null; refresh: string | null; rememberMe: boolean }> {
  if (Platform.OS === 'web') {
    return {
      access: localStorage.getItem(STORAGE_KEY_ACCESS),
      refresh: localStorage.getItem(STORAGE_KEY_REFRESH),
      rememberMe: localStorage.getItem(STORAGE_KEY_REMEMBER_ME) === 'true',
    };
  }
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const values = await AsyncStorage.multiGet([STORAGE_KEY_ACCESS, STORAGE_KEY_REFRESH, STORAGE_KEY_REMEMBER_ME]);
    return { 
      access: values[0][1], 
      refresh: values[1][1],
      rememberMe: values[2][1] === 'true',
    };
  } catch {
    return { access: null, refresh: null, rememberMe: false };
  }
}

// ── User type ──────────────────────────────────────────

export interface AuthUser {
  uid: string;
  email: string;
  role: string;
  displayName?: string;
}

// ── Context ────────────────────────────────────────────

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  login: async () => {},
  logout: async () => {},
});

// Store rememberMe preference
const STORAGE_KEY_REMEMBER_ME = '@hawk_remember_me';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Hydrate from storage on mount
  useEffect(() => {
    (async () => {
      try {
        const { access, refresh, rememberMe } = await loadPersistedTokens();
        
        // Only restore session if rememberMe was true
        if (access && refresh && rememberMe) {
          _accessToken = access;
          _refreshToken = refresh;
          // Decode user from JWT payload (base64 middle segment)
          try {
            const payload = JSON.parse(atob(access.split('.')[1]));
            
            if (payload && payload.uid && payload.email) {
              const userInfo: AuthUser = {
                uid: payload.uid,
                email: payload.email,
                role: payload.role || 'user',
                displayName: payload.displayName || payload.email
              };
              setUser(userInfo);
            } else {
              clearTokens();
            }
          } catch (jwtError) {
            clearTokens();
          }
        } else if (access && refresh && !rememberMe) {
          clearTokens();
        }
      } catch (storageError) {
        // Silent error handling
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (email: string, password: string, rememberMe: boolean = false) => {
    try {
      const response = await authApi.adminLogin(email, password, rememberMe);
      
      // Handle the nested response structure: response.data.data
      const apiData = response.data?.data || response.data;
      
      if (!apiData || !apiData.user) {
        throw new Error('Invalid response from server. Please try again.');
      }
      
      if (!apiData.accessToken || !apiData.refreshToken) {
        throw new Error('Authentication tokens not received. Please try again.');
      }
      
      setTokens(apiData.accessToken, apiData.refreshToken, rememberMe);
      
      // Extract user info from the response with safe property access
      const user = apiData.user;
      const profile = user.profile || {};
      
      const userInfo: AuthUser = {
        uid: user.uid,
        email: user.email,
        role: user.role,
        displayName: profile.displayName || 
                    (profile.firstName && profile.lastName ? `${profile.firstName} ${profile.lastName}` : '') ||
                    user.email
      };
      
      setUser(userInfo);
    } catch (error: any) {
      // Clear any partial state
      clearTokens();
      setUser(null);
      
      // Re-throw with enhanced message if needed
      if (error.message && error.statusCode !== undefined) {
        // Already a properly formatted error from API client
        throw error;
      }
      
      // Generic fallback for unexpected errors
      throw {
        message: error.message || 'An unexpected error occurred. Please try again.',
        statusCode: 500,
        error: 'UNKNOWN_ERROR',
      };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      // Call the backend logout endpoint
      await authApi.logout();
    } catch (error: any) {
      // Continue with logout even if API call fails
    } finally {
      // Always clear tokens and user state
      clearTokens();
      setUser(null);
    }
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

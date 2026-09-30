/** Auth API — admin login + OTP flows */

import { api } from './client';

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
  refreshExpiresIn: string;
  user: {
    uid: string;
    email: string;
    password?: string;
    role: string;
    status: string;
    profile?: {
      firstName?: string;
      lastName?: string;
      displayName?: string;
      phone?: string;
    };
    permissions?: Record<string, boolean>;
    settings?: Record<string, any>;
    metadata?: Record<string, any>;
    authCredentials?: Record<string, any>;
    lastPasswordChange?: any;
    updatedAt?: any;
  };
}

export interface OtpResponse {
  message: string;
  expiresIn: number;
}

export const authApi = {
  /** Admin email/password login */
  adminLogin: (email: string, password: string, rememberMe?: boolean) =>
    api.post<LoginResponse>('/auth/admin-login', { email, password, rememberMe }),

  /** Request OTP for phone auth */
  requestOtp: (phone: string, role: string) =>
    api.post<OtpResponse>('/auth/request-otp', { phone, role }),

  /** Verify OTP */
  verifyOtp: (phone: string, otp: string) =>
    api.post<LoginResponse>('/auth/verify-otp', { phone, otp }),

  /** Refresh token */
  refresh: (refreshToken: string) =>
    api.post<LoginResponse>('/auth/refresh', { refreshToken }),

  /** Logout (optional - clears server-side session if implemented) */
  logout: () => {
    console.log('🔴 authApi.logout() called - about to make API request');
    const result = api.post<{ message: string }>('/auth/logout', {});
    console.log('🔴 authApi.logout() - API call initiated, returning promise');
    return result;
  },
};

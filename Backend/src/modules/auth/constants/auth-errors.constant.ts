/**
 * Auth Error Messages - Industry-standard user-friendly error messages
 * Organized by error category for consistent UX across authentication flows
 */

export const AUTH_ERRORS = {
  // ── Credential Errors ──
  INVALID_CREDENTIALS: {
    message: 'Incorrect email or password. Please check your credentials and try again.',
    code: 'INVALID_CREDENTIALS',
    statusCode: 401,
  },
  
  INVALID_EMAIL: {
    message: 'The email address you entered is not registered. Please check and try again.',
    code: 'INVALID_EMAIL',
    statusCode: 401,
  },
  
  INVALID_PASSWORD: {
    message: 'The password you entered is incorrect. Please try again.',
    code: 'INVALID_PASSWORD',
    statusCode: 401,
  },
  
  // ── Account Status Errors ──
  ACCOUNT_BLOCKED: {
    message: 'Your account has been blocked. Please contact support for assistance.',
    code: 'ACCOUNT_BLOCKED',
    statusCode: 403,
  },
  
  ACCOUNT_SUSPENDED: {
    message: 'Your account has been temporarily suspended. Please contact support for more information.',
    code: 'ACCOUNT_SUSPENDED',
    statusCode: 403,
  },
  
  ACCOUNT_INACTIVE: {
    message: 'Your account is inactive. Please contact an administrator to activate your account.',
    code: 'ACCOUNT_INACTIVE',
    statusCode: 403,
  },
  
  ACCOUNT_PENDING: {
    message: 'Your account is pending approval. Please wait for administrator confirmation.',
    code: 'ACCOUNT_PENDING',
    statusCode: 403,
  },
  
  // ── Authorization Errors ──
  INSUFFICIENT_PERMISSIONS: {
    message: 'You do not have permission to access this resource.',
    code: 'INSUFFICIENT_PERMISSIONS',
    statusCode: 403,
  },
  
  ADMIN_ACCESS_REQUIRED: {
    message: 'Administrative access is required. Please sign in with an admin account.',
    code: 'ADMIN_ACCESS_REQUIRED',
    statusCode: 403,
  },
  
  // ── Token/Session Errors ──
  SESSION_EXPIRED: {
    message: 'Your session has expired. Please sign in again to continue.',
    code: 'SESSION_EXPIRED',
    statusCode: 401,
  },
  
  INVALID_TOKEN: {
    message: 'Invalid authentication token. Please sign in again.',
    code: 'INVALID_TOKEN',
    statusCode: 401,
  },
  
  TOKEN_REFRESH_FAILED: {
    message: 'Unable to refresh your session. Please sign in again.',
    code: 'TOKEN_REFRESH_FAILED',
    statusCode: 401,
  },
  
  // ── Rate Limiting ──
  TOO_MANY_ATTEMPTS: {
    message: 'Too many login attempts. Please wait a few minutes and try again.',
    code: 'TOO_MANY_ATTEMPTS',
    statusCode: 429,
  },
  
  RATE_LIMIT_EXCEEDED: {
    message: 'You have made too many requests. Please wait before trying again.',
    code: 'RATE_LIMIT_EXCEEDED',
    statusCode: 429,
  },
  
  // ── Validation Errors ──
  MISSING_CREDENTIALS: {
    message: 'Email and password are required.',
    code: 'MISSING_CREDENTIALS',
    statusCode: 400,
  },
  
  INVALID_EMAIL_FORMAT: {
    message: 'Please enter a valid email address.',
    code: 'INVALID_EMAIL_FORMAT',
    statusCode: 400,
  },
  
  PASSWORD_TOO_SHORT: {
    message: 'Password must be at least 8 characters long.',
    code: 'PASSWORD_TOO_SHORT',
    statusCode: 400,
  },
  
  // ── OTP Errors ──
  INVALID_OTP: {
    message: 'The verification code you entered is incorrect. Please try again.',
    code: 'INVALID_OTP',
    statusCode: 401,
  },
  
  OTP_EXPIRED: {
    message: 'Your verification code has expired. Please request a new one.',
    code: 'OTP_EXPIRED',
    statusCode: 401,
  },
  
  OTP_NOT_FOUND: {
    message: 'No verification code found. Please request a new one.',
    code: 'OTP_NOT_FOUND',
    statusCode: 404,
  },
  
  // ── Server/Service Errors ──
  SERVER_ERROR: {
    message: 'An unexpected error occurred. Please try again later.',
    code: 'SERVER_ERROR',
    statusCode: 500,
  },
  
  SERVICE_UNAVAILABLE: {
    message: 'Authentication service is temporarily unavailable. Please try again in a few moments.',
    code: 'SERVICE_UNAVAILABLE',
    statusCode: 503,
  },
  
  DATABASE_ERROR: {
    message: 'Unable to process your request due to a database error. Please try again later.',
    code: 'DATABASE_ERROR',
    statusCode: 500,
  },
  
  FIREBASE_UNAVAILABLE: {
    message: 'Authentication service is not configured. Please contact support.',
    code: 'FIREBASE_UNAVAILABLE',
    statusCode: 503,
  },
} as const;

/**
 * Helper to create consistent error responses
 */
export function createAuthError(errorKey: keyof typeof AUTH_ERRORS, additionalInfo?: string) {
  const error = AUTH_ERRORS[errorKey];
  return {
    ...error,
    message: additionalInfo ? `${error.message} ${additionalInfo}` : error.message,
  };
}

/**
 * Map account status to appropriate error
 */
export function getAccountStatusError(status: string) {
  switch (status) {
    case 'blocked':
      return AUTH_ERRORS.ACCOUNT_BLOCKED;
    case 'suspended':
      return AUTH_ERRORS.ACCOUNT_SUSPENDED;
    case 'inactive':
      return AUTH_ERRORS.ACCOUNT_INACTIVE;
    case 'pending':
      return AUTH_ERRORS.ACCOUNT_PENDING;
    default:
      return AUTH_ERRORS.ACCOUNT_INACTIVE;
  }
}

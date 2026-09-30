/** Industry-standard error messages for authentication and API errors */

export const AUTH_ERRORS = {
  // Credential errors
  INVALID_CREDENTIALS: 'Invalid email or password. Please check your credentials and try again.',
  WRONG_PASSWORD: 'Invalid email or password. Please check your credentials and try again.',
  USER_NOT_FOUND: 'Invalid email or password. Please check your credentials and try again.',
  
  // Account status errors
  ACCOUNT_BLOCKED: 'Your account has been blocked. Please contact support for assistance.',
  ACCOUNT_SUSPENDED: 'Your account has been suspended. Please contact your administrator.',
  ACCOUNT_PENDING: 'Your account is pending approval. Please wait for administrator verification.',
  ACCOUNT_INACTIVE: 'Your account is currently inactive. Please contact support.',
  ACCOUNT_DISABLED: 'Your account has been disabled. Please contact support for assistance.',
  
  // Session errors
  SESSION_EXPIRED: 'Your session has expired. Please log in again.',
  TOKEN_EXPIRED: 'Your session has expired. Please log in again.',
  TOKEN_INVALID: 'Invalid session token. Please log in again.',
  TOKEN_REFRESH_FAILED: 'Unable to refresh session. Please log in again.',
  
  // Verification errors
  OTP_EXPIRED: 'Your verification code has expired. Please request a new code.',
  OTP_INVALID: 'Incorrect verification code. Please check and try again.',
  PHONE_VERIFICATION_REQUIRED: 'Phone verification is required. Please complete the verification process.',
  
  // Input validation errors
  EMAIL_REQUIRED: 'Please enter your email address',
  PASSWORD_REQUIRED: 'Please enter your password',
  EMAIL_AND_PASSWORD_REQUIRED: 'Please enter both email and password',
  EMAIL_INVALID: 'Please enter a valid email address',
  PHONE_REQUIRED: 'Phone number is required for verification.',
  
  // Generic auth errors
  UNAUTHORIZED: 'You are not authorized to access this resource.',
  FORBIDDEN: 'You do not have permission to perform this action.',
} as const;

export const NETWORK_ERRORS = {
  NO_CONNECTION: 'Unable to connect to server. Please check your internet connection.',
  CONNECTION_FAILED: 'Connection error. Please check your network and try again.',
  TIMEOUT: 'Request timed out. Please check your connection and try again.',
  SERVER_UNREACHABLE: 'Unable to reach the server. Please try again later.',
} as const;

export const SERVER_ERRORS = {
  INTERNAL_ERROR: 'Server error. Please try again later or contact support.',
  SERVICE_UNAVAILABLE: 'Service temporarily unavailable. Please try again in a few moments.',
  BAD_GATEWAY: 'Bad gateway. The server is temporarily unavailable.',
  GATEWAY_TIMEOUT: 'Gateway timeout. The server is taking too long to respond.',
  MAINTENANCE: 'The service is currently under maintenance. Please try again later.',
} as const;

export const RATE_LIMIT_ERRORS = {
  TOO_MANY_REQUESTS: 'Too many requests. Please wait a moment and try again.',
  TOO_MANY_LOGIN_ATTEMPTS: 'Too many login attempts. Please wait a few minutes and try again.',
  RATE_LIMIT_EXCEEDED: 'Rate limit exceeded. Please slow down and try again.',
} as const;

export const VALIDATION_ERRORS = {
  INVALID_REQUEST: 'Invalid request. Please check your input and try again.',
  MISSING_FIELDS: 'Required fields are missing. Please fill in all required information.',
  INVALID_FORMAT: 'Invalid format. Please check your input and try again.',
} as const;

export const GENERIC_ERRORS = {
  UNKNOWN: 'An unexpected error occurred. Please try again.',
  REQUEST_FAILED: 'Request failed. Please try again.',
  NOT_FOUND: 'The requested resource was not found.',
  SOMETHING_WENT_WRONG: 'Something went wrong. Please try again.',
} as const;

/**
 * Get a user-friendly error message based on status code and error type
 */
export function getErrorMessage(statusCode: number, errorType?: string, originalMessage?: string): string {
  // Use original message if it's already user-friendly
  if (originalMessage && isUserFriendlyMessage(originalMessage)) {
    return originalMessage;
  }

  // Map status codes to messages
  switch (statusCode) {
    case 0:
      return NETWORK_ERRORS.NO_CONNECTION;
    case 400:
      return VALIDATION_ERRORS.INVALID_REQUEST;
    case 401:
      return AUTH_ERRORS.SESSION_EXPIRED;
    case 403:
      return AUTH_ERRORS.FORBIDDEN;
    case 404:
      return GENERIC_ERRORS.NOT_FOUND;
    case 408:
      return NETWORK_ERRORS.TIMEOUT;
    case 429:
      return RATE_LIMIT_ERRORS.TOO_MANY_REQUESTS;
    case 500:
      return SERVER_ERRORS.INTERNAL_ERROR;
    case 502:
      return SERVER_ERRORS.BAD_GATEWAY;
    case 503:
      return SERVER_ERRORS.SERVICE_UNAVAILABLE;
    case 504:
      return SERVER_ERRORS.GATEWAY_TIMEOUT;
    default:
      if (statusCode >= 500) {
        return SERVER_ERRORS.INTERNAL_ERROR;
      }
      return originalMessage || GENERIC_ERRORS.UNKNOWN;
  }
}

/**
 * Check if a message is already user-friendly (not technical/cryptic)
 */
function isUserFriendlyMessage(message: string): boolean {
  const technicalPatterns = [
    /\berror\s*:\s*\w+/i,  // "Error: Something"
    /\bexception\b/i,       // "Exception"
    /\bstack\s+trace\b/i,   // "Stack trace"
    /\bat\s+\w+\.\w+/i,     // "at Module.function"
    /^\w+Error:/i,          // "TypeError:", "ReferenceError:"
  ];
  
  return !technicalPatterns.some(pattern => pattern.test(message));
}

/**
 * Map backend error messages to frontend-friendly messages
 */
export function mapBackendError(backendMessage: string): string {
  const lowerMessage = backendMessage.toLowerCase();
  
  // Map common backend messages
  if (lowerMessage.includes('invalid admin credentials') || 
      lowerMessage.includes('invalid credentials')) {
    return AUTH_ERRORS.INVALID_CREDENTIALS;
  }
  
  if (lowerMessage.includes('account is blocked')) {
    return AUTH_ERRORS.ACCOUNT_BLOCKED;
  }
  
  if (lowerMessage.includes('account is suspended')) {
    return AUTH_ERRORS.ACCOUNT_SUSPENDED;
  }
  
  if (lowerMessage.includes('account is pending')) {
    return AUTH_ERRORS.ACCOUNT_PENDING;
  }
  
  if (lowerMessage.includes('session expired') || 
      lowerMessage.includes('token expired')) {
    return AUTH_ERRORS.SESSION_EXPIRED;
  }
  
  if (lowerMessage.includes('invalid token')) {
    return AUTH_ERRORS.TOKEN_INVALID;
  }
  
  // Return original if no mapping found
  return backendMessage;
}

/**
 * Input Sanitization Utilities
 * Prevents XSS, SQL injection, and prompt injection attacks
 */

/**
 * Sanitize user input to prevent XSS attacks
 * Removes HTML tags and dangerous characters
 */
export function sanitizeInput(input: string): string {
  if (!input) return '';
  
  return input
    // Remove HTML tags
    .replace(/<[^>]*>/g, '')
    // Remove script content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove event handlers
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    // Remove javascript: protocol
    .replace(/javascript:/gi, '')
    // Trim whitespace
    .trim();
}

/**
 * Sanitize search query - more permissive for search functionality
 * Allows alphanumeric, spaces, and common punctuation
 */
export function sanitizeSearchQuery(query: string): string {
  if (!query) return '';
  
  return query
    // Remove any HTML tags
    .replace(/<[^>]*>/g, '')
    // Remove dangerous SQL characters (but keep @ for email search)
    .replace(/[;'"\\]/g, '')
    // Remove control characters
    .replace(/[\x00-\x1F\x7F]/g, '')
    // Trim and limit length
    .trim()
    .slice(0, 200); // Max 200 characters for search
}

/**
 * Detect potential injection attacks
 * Returns true if suspicious patterns are found
 */
export function detectInjectionAttempt(input: string): boolean {
  if (!input) return false;
  
  const suspiciousPatterns = [
    // SQL injection patterns
    /(\bUNION\b|\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bDROP\b)/i,
    // XSS patterns
    /<script|javascript:|onerror=|onload=/i,
    // Prompt injection patterns (for AI/LLM attacks)
    /(ignore previous|disregard all|system prompt|you are now|new instructions)/i,
    // Command injection
    /[;&|`$()]/,
  ];
  
  return suspiciousPatterns.some(pattern => pattern.test(input));
}

/**
 * Validate and sanitize email input
 */
export function sanitizeEmail(email: string): string {
  if (!email) return '';
  
  // Basic email validation pattern
  const emailPattern = /^[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  
  const cleaned = email.trim().toLowerCase();
  
  // Return empty if not valid email format
  if (!emailPattern.test(cleaned)) {
    return '';
  }
  
  return cleaned;
}

/**
 * Validate and sanitize phone number
 * Supports Indian format: +91XXXXXXXXXX or 10 digits
 */
export function sanitizePhone(phone: string): string {
  if (!phone) return '';
  
  // Remove all non-digit characters except +
  const cleaned = phone.replace(/[^\d+]/g, '');
  
  // Validate format
  if (cleaned.length === 10 || (cleaned.startsWith('+91') && cleaned.length === 13)) {
    return cleaned;
  }
  
  return '';
}

/**
 * Sanitize numeric input (IDs, amounts, etc.)
 */
export function sanitizeNumeric(input: string, allowDecimal: boolean = false): string {
  if (!input) return '';
  
  if (allowDecimal) {
    return input.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1');
  }
  
  return input.replace(/\D/g, '');
}

/**
 * Sanitize and validate dropdown selection
 * Ensures value is from allowed options
 */
export function sanitizeDropdownValue(value: string, allowedValues: string[]): string {
  if (!value || !allowedValues.includes(value)) {
    return '';
  }
  return value;
}

/**
 * Log suspicious activity for security monitoring
 */
export function logSuspiciousActivity(
  input: string,
  userId?: string,
  context?: string
): void {
  console.warn('[SECURITY] Suspicious input detected:', {
    context,
    userId,
    input: input.substring(0, 100), // Log first 100 chars only
    timestamp: new Date().toISOString(),
  });
  
  // TODO: In production, send to security monitoring service
  // Example: sendToSecurityMonitoring({ input, userId, context, timestamp });
}

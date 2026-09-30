import { Throttle } from '@nestjs/throttler';

/**
 * Preset rate limits for different endpoint types
 * 
 * Usage:
 *   @RateLimit.WRITE()
 *   @Post()
 *   createResource() { ... }
 */
export const RateLimit = {
  // Auth endpoints (already protected by AuthRateLimitGuard, but good to document)
  AUTH: () => Throttle({ default: { limit: 10, ttl: 60000 } }), // 10 requests per minute
  
  // Read operations
  READ_PUBLIC: () => Throttle({ default: { limit: 60, ttl: 60000 } }), // 60 requests per minute
  READ_SENSITIVE: () => Throttle({ default: { limit: 30, ttl: 60000 } }), // 30 requests per minute
  
  // Write operations
  WRITE: () => Throttle({ default: { limit: 20, ttl: 60000 } }), // 20 requests per minute
  WRITE_SENSITIVE: () => Throttle({ default: { limit: 10, ttl: 60000 } }), // 10 requests per minute
  
  // File operations
  UPLOAD: () => Throttle({ default: { limit: 5, ttl: 60000 } }), // 5 requests per minute
  
  // Search/List operations (can be expensive)
  SEARCH: () => Throttle({ default: { limit: 20, ttl: 60000 } }), // 20 requests per minute
  
  // Admin operations (more lenient)
  ADMIN: () => Throttle({ default: { limit: 100, ttl: 60000 } }), // 100 requests per minute
};

import type { Request } from 'express';

/**
 * Extracts the real client IP address from a request, accounting for proxy headers.
 * 
 * Priority order:
 * 1. X-Forwarded-For (first IP in the chain)
 * 2. X-Real-IP
 * 3. CF-Connecting-IP (Cloudflare)
 * 4. X-Client-IP
 * 5. request.ip (falls back to direct connection IP)
 * 
 * @param request Express request object
 * @returns The extracted client IP address or 'unknown' if none found
 */
export function extractClientIp(request: Request): string {
  // X-Forwarded-For: Most common proxy header (comma-separated list)
  // Format: "client, proxy1, proxy2"
  const xForwardedFor = request.headers['x-forwarded-for'];
  if (xForwardedFor) {
    const ips = (Array.isArray(xForwardedFor) ? xForwardedFor[0] : xForwardedFor)
      .split(',')
      .map(ip => ip.trim())
      .filter(ip => ip.length > 0);
    
    if (ips.length > 0) {
      return ips[0]; // First IP is the original client
    }
  }

  // X-Real-IP: Used by nginx and other proxies
  const xRealIp = request.headers['x-real-ip'];
  if (xRealIp && typeof xRealIp === 'string') {
    return xRealIp.trim();
  }

  // CF-Connecting-IP: Cloudflare's header for original client IP
  const cfConnectingIp = request.headers['cf-connecting-ip'];
  if (cfConnectingIp && typeof cfConnectingIp === 'string') {
    return cfConnectingIp.trim();
  }

  // X-Client-IP: Less common but still used
  const xClientIp = request.headers['x-client-ip'];
  if (xClientIp && typeof xClientIp === 'string') {
    return xClientIp.trim();
  }

  // Fallback to request.ip (works when trust proxy is enabled)
  if (request.ip) {
    return request.ip;
  }

  // Last resort: socket remote address
  if (request.socket?.remoteAddress) {
    return request.socket.remoteAddress;
  }

  return 'unknown';
}

/**
 * Creates a simple fingerprint from User-Agent for additional rate limiting context.
 * This helps prevent bypassing rate limits by rotating IPs while using the same client.
 * 
 * @param request Express request object
 * @returns A simple hash of the User-Agent or 'no-ua' if not present
 */
export function extractUserAgentFingerprint(request: Request): string {
  const userAgent = request.headers['user-agent'];
  
  if (!userAgent || typeof userAgent !== 'string') {
    return 'no-ua';
  }

  // Simple hash for fingerprinting (not cryptographic, just for bucketing)
  let hash = 0;
  for (let i = 0; i < userAgent.length; i++) {
    const char = userAgent.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return Math.abs(hash).toString(36);
}

/**
 * Validates if an IP address is from a private/internal network.
 * This can help detect if trust proxy configuration is missing.
 * 
 * @param ip IP address to check
 * @returns true if the IP is from a private network
 */
export function isPrivateIp(ip: string): boolean {
  // Remove IPv6 prefix if present
  const cleanIp = ip.replace(/^::ffff:/, '');
  
  // Localhost
  if (cleanIp === '127.0.0.1' || cleanIp === '::1' || cleanIp === 'localhost') {
    return true;
  }

  // Private IPv4 ranges
  const privateRanges = [
    /^10\./,                      // 10.0.0.0/8
    /^172\.(1[6-9]|2\d|3[01])\./,  // 172.16.0.0/12
    /^192\.168\./,                 // 192.168.0.0/16
    /^169\.254\./,                 // 169.254.0.0/16 (link-local)
  ];

  return privateRanges.some(range => range.test(cleanIp));
}

/**
 * Gets a composite client identifier for rate limiting.
 * Combines IP address with User-Agent fingerprint for more robust rate limiting.
 * 
 * @param request Express request object
 * @param prefix Optional prefix for the key (e.g., 'auth', 'api')
 * @returns A composite key suitable for rate limiting
 */
export function getClientIdentifier(request: Request, prefix?: string): string {
  const ip = extractClientIp(request);
  const uaFingerprint = extractUserAgentFingerprint(request);
  
  const key = `${ip}:${uaFingerprint}`;
  return prefix ? `${prefix}:${key}` : key;
}

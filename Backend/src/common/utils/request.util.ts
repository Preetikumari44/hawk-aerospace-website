import type { Request } from 'express';

/**
 * Extract real client IP address from request
 * Handles proxy headers (X-Forwarded-For, X-Real-IP)
 */
export function getClientIp(req: Request): string {
  // Check X-Forwarded-For (proxies/load balancers)
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ips = (forwarded as string).split(',').map(ip => ip.trim());
    // Return first IP (original client)
    return ips[0];
  }

  // Check X-Real-IP (nginx)
  const realIp = req.headers['x-real-ip'];
  if (realIp) {
    return realIp as string;
  }

  // Fallback to req.ip or socket address
  return req.ip || req.socket?.remoteAddress || '0.0.0.0';
}

/**
 * Extract User-Agent string from request
 */
export function getUserAgent(req: Request): string {
  return req.headers['user-agent'] || 'Unknown';
}

/**
 * Parse User-Agent string into structured data
 * Basic implementation - consider ua-parser-js for production
 */
export function parseUserAgent(userAgent: string): {
  browser?: string;
  os?: string;
  device?: string;
  platform?: 'ios' | 'android' | 'web';
} {
  // Extract browser
  const browserMatch = userAgent.match(/(Chrome|Firefox|Safari|Edge|Opera|MSIE|Trident)[\s/]?([\d.]+)?/i);
  const browser = browserMatch ? `${browserMatch[1]} ${browserMatch[2] || ''}`.trim() : undefined;

  // Extract OS
  let os: string | undefined;
  if (/Windows NT/i.test(userAgent)) {
    const winMatch = userAgent.match(/Windows NT ([\d.]+)/i);
    os = winMatch ? `Windows ${winMatch[1]}` : 'Windows';
  } else if (/Mac OS X/i.test(userAgent)) {
    const macMatch = userAgent.match(/Mac OS X ([\d_]+)/i);
    os = macMatch ? `macOS ${macMatch[1].replace(/_/g, '.')}` : 'macOS';
  } else if (/Android/i.test(userAgent)) {
    const androidMatch = userAgent.match(/Android ([\d.]+)/i);
    os = androidMatch ? `Android ${androidMatch[1]}` : 'Android';
  } else if (/iOS|iPhone|iPad/i.test(userAgent)) {
    const iosMatch = userAgent.match(/OS ([\d_]+)/i);
    os = iosMatch ? `iOS ${iosMatch[1].replace(/_/g, '.')}` : 'iOS';
  } else if (/Linux/i.test(userAgent)) {
    os = 'Linux';
  }

  // Detect device type
  let device: string;
  if (/Mobile|Android|iPhone/i.test(userAgent)) {
    device = 'mobile';
  } else if (/iPad|Tablet/i.test(userAgent)) {
    device = 'tablet';
  } else {
    device = 'desktop';
  }

  // Detect platform
  let platform: 'ios' | 'android' | 'web' = 'web';
  if (/iPhone|iPad|iPod/i.test(userAgent)) {
    platform = 'ios';
  } else if (/Android/i.test(userAgent)) {
    platform = 'android';
  }

  return {
    browser,
    os,
    device,
    platform,
  };
}

/**
 * Extract device info from request headers and user agent
 */
export function getDeviceInfo(req: Request): {
  deviceId?: string;
  deviceName?: string;
  platform: 'ios' | 'android' | 'web';
  os?: string;
  browser?: string;
} {
  const userAgent = getUserAgent(req);
  const parsed = parseUserAgent(userAgent);

  // Check for custom device headers (if mobile app sends them)
  const deviceId = req.headers['x-device-id'] as string | undefined;
  const deviceName = req.headers['x-device-name'] as string | undefined;

  return {
    deviceId,
    deviceName: deviceName || `${parsed.device || 'Unknown'} Device`,
    platform: parsed.platform || 'web',
    os: parsed.os,
    browser: parsed.browser,
  };
}

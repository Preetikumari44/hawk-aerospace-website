import type { Request } from 'express';

import {
  extractClientIp,
  extractUserAgentFingerprint,
  getClientIdentifier,
  isPrivateIp,
} from './ip-extraction.util';

describe('IP Extraction Utilities', () => {
  describe('extractClientIp', () => {
    it('should extract IP from X-Forwarded-For header (first IP)', () => {
      const request = {
        headers: {
          'x-forwarded-for': '203.0.113.1, 198.51.100.1, 192.0.2.1',
        },
      } as unknown as Request;

      expect(extractClientIp(request)).toBe('203.0.113.1');
    });

    it('should handle X-Forwarded-For with single IP', () => {
      const request = {
        headers: {
          'x-forwarded-for': '203.0.113.1',
        },
      } as unknown as Request;

      expect(extractClientIp(request)).toBe('203.0.113.1');
    });

    it('should handle X-Forwarded-For as array', () => {
      const request = {
        headers: {
          'x-forwarded-for': ['203.0.113.1, 198.51.100.1'],
        },
      } as unknown as Request;

      expect(extractClientIp(request)).toBe('203.0.113.1');
    });

    it('should extract IP from X-Real-IP header', () => {
      const request = {
        headers: {
          'x-real-ip': '203.0.113.1',
        },
      } as unknown as Request;

      expect(extractClientIp(request)).toBe('203.0.113.1');
    });

    it('should extract IP from CF-Connecting-IP header (Cloudflare)', () => {
      const request = {
        headers: {
          'cf-connecting-ip': '203.0.113.1',
        },
      } as unknown as Request;

      expect(extractClientIp(request)).toBe('203.0.113.1');
    });

    it('should extract IP from X-Client-IP header', () => {
      const request = {
        headers: {
          'x-client-ip': '203.0.113.1',
        },
      } as unknown as Request;

      expect(extractClientIp(request)).toBe('203.0.113.1');
    });

    it('should fallback to request.ip', () => {
      const request = {
        headers: {},
        ip: '203.0.113.1',
      } as unknown as Request;

      expect(extractClientIp(request)).toBe('203.0.113.1');
    });

    it('should fallback to socket.remoteAddress', () => {
      const request = {
        headers: {},
        socket: {
          remoteAddress: '203.0.113.1',
        },
      } as unknown as Request;

      expect(extractClientIp(request)).toBe('203.0.113.1');
    });

    it('should return "unknown" when no IP is available', () => {
      const request = {
        headers: {},
      } as unknown as Request;

      expect(extractClientIp(request)).toBe('unknown');
    });

    it('should prioritize X-Forwarded-For over other headers', () => {
      const request = {
        headers: {
          'x-forwarded-for': '203.0.113.1',
          'x-real-ip': '198.51.100.1',
          'cf-connecting-ip': '192.0.2.1',
        },
        ip: '10.0.0.1',
      } as unknown as Request;

      expect(extractClientIp(request)).toBe('203.0.113.1');
    });

    it('should trim whitespace from IPs', () => {
      const request = {
        headers: {
          'x-forwarded-for': ' 203.0.113.1 , 198.51.100.1 ',
        },
      } as unknown as Request;

      expect(extractClientIp(request)).toBe('203.0.113.1');
    });
  });

  describe('extractUserAgentFingerprint', () => {
    it('should create fingerprint from User-Agent', () => {
      const request = {
        headers: {
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        },
      } as unknown as Request;

      const fingerprint = extractUserAgentFingerprint(request);
      expect(fingerprint).toBeTruthy();
      expect(fingerprint).not.toBe('no-ua');
    });

    it('should return consistent fingerprint for same User-Agent', () => {
      const userAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)';
      const request1 = {
        headers: { 'user-agent': userAgent },
      } as unknown as Request;
      const request2 = {
        headers: { 'user-agent': userAgent },
      } as unknown as Request;

      expect(extractUserAgentFingerprint(request1)).toBe(
        extractUserAgentFingerprint(request2),
      );
    });

    it('should return different fingerprints for different User-Agents', () => {
      const request1 = {
        headers: { 'user-agent': 'Mozilla/5.0 (Windows)' },
      } as unknown as Request;
      const request2 = {
        headers: { 'user-agent': 'Mozilla/5.0 (Macintosh)' },
      } as unknown as Request;

      expect(extractUserAgentFingerprint(request1)).not.toBe(
        extractUserAgentFingerprint(request2),
      );
    });

    it('should return "no-ua" when User-Agent is missing', () => {
      const request = {
        headers: {},
      } as unknown as Request;

      expect(extractUserAgentFingerprint(request)).toBe('no-ua');
    });

    it('should handle array User-Agent header', () => {
      const request = {
        headers: {
          'user-agent': ['Mozilla/5.0'],
        },
      } as unknown as Request;

      expect(extractUserAgentFingerprint(request)).toBe('no-ua');
    });
  });

  describe('isPrivateIp', () => {
    it('should detect localhost IPs', () => {
      expect(isPrivateIp('127.0.0.1')).toBe(true);
      expect(isPrivateIp('::1')).toBe(true);
      expect(isPrivateIp('localhost')).toBe(true);
    });

    it('should detect 10.x.x.x range', () => {
      expect(isPrivateIp('10.0.0.1')).toBe(true);
      expect(isPrivateIp('10.255.255.255')).toBe(true);
    });

    it('should detect 172.16-31.x.x range', () => {
      expect(isPrivateIp('172.16.0.1')).toBe(true);
      expect(isPrivateIp('172.31.255.255')).toBe(true);
    });

    it('should detect 192.168.x.x range', () => {
      expect(isPrivateIp('192.168.0.1')).toBe(true);
      expect(isPrivateIp('192.168.255.255')).toBe(true);
    });

    it('should detect link-local 169.254.x.x range', () => {
      expect(isPrivateIp('169.254.0.1')).toBe(true);
      expect(isPrivateIp('169.254.255.255')).toBe(true);
    });

    it('should not detect public IPs as private', () => {
      expect(isPrivateIp('203.0.113.1')).toBe(false);
      expect(isPrivateIp('8.8.8.8')).toBe(false);
      expect(isPrivateIp('1.1.1.1')).toBe(false);
    });

    it('should handle IPv6-mapped IPv4 addresses', () => {
      expect(isPrivateIp('::ffff:127.0.0.1')).toBe(true);
      expect(isPrivateIp('::ffff:10.0.0.1')).toBe(true);
    });
  });

  describe('getClientIdentifier', () => {
    it('should create composite identifier with IP and UA fingerprint', () => {
      const request = {
        headers: {
          'x-forwarded-for': '203.0.113.1',
          'user-agent': 'Mozilla/5.0',
        },
      } as unknown as Request;

      const identifier = getClientIdentifier(request);
      expect(identifier).toContain('203.0.113.1');
      expect(identifier).toContain(':');
    });

    it('should include prefix when provided', () => {
      const request = {
        headers: {
          'x-forwarded-for': '203.0.113.1',
          'user-agent': 'Mozilla/5.0',
        },
      } as unknown as Request;

      const identifier = getClientIdentifier(request, 'auth');
      expect(identifier).toMatch(/^auth:/);
    });

    it('should create consistent identifier for same request', () => {
      const request = {
        headers: {
          'x-forwarded-for': '203.0.113.1',
          'user-agent': 'Mozilla/5.0',
        },
      } as unknown as Request;

      expect(getClientIdentifier(request)).toBe(getClientIdentifier(request));
    });

    it('should create different identifiers for different IPs', () => {
      const request1 = {
        headers: {
          'x-forwarded-for': '203.0.113.1',
          'user-agent': 'Mozilla/5.0',
        },
      } as unknown as Request;
      const request2 = {
        headers: {
          'x-forwarded-for': '203.0.113.2',
          'user-agent': 'Mozilla/5.0',
        },
      } as unknown as Request;

      expect(getClientIdentifier(request1)).not.toBe(getClientIdentifier(request2));
    });

    it('should create different identifiers for different User-Agents', () => {
      const request1 = {
        headers: {
          'x-forwarded-for': '203.0.113.1',
          'user-agent': 'Mozilla/5.0 (Windows)',
        },
      } as unknown as Request;
      const request2 = {
        headers: {
          'x-forwarded-for': '203.0.113.1',
          'user-agent': 'Mozilla/5.0 (Macintosh)',
        },
      } as unknown as Request;

      expect(getClientIdentifier(request1)).not.toBe(getClientIdentifier(request2));
    });
  });
});

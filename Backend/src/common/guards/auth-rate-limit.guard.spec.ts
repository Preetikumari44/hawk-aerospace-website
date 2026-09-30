import { HttpException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { ExecutionContext } from '@nestjs/common';

import { AuthRateLimitGuard } from './auth-rate-limit.guard';
import { AuthRateLimitService } from '../services/auth-rate-limit.service';

describe('AuthRateLimitGuard', () => {
  const createContext = (overrides?: { ip?: string; headers?: Record<string, string> }) => {
    const response = {
      setHeader: jest.fn(),
    };

    const request = {
      ip: overrides?.ip || '127.0.0.1',
      socket: { remoteAddress: '127.0.0.1' },
      headers: overrides?.headers || {
        'user-agent': 'test-agent',
      },
    };

    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    } as unknown as ExecutionContext;

    return { context, response, request };
  };

  it('sets rate limit headers and allows the first request', () => {
    const guard = new AuthRateLimitGuard(
      {
        get: jest.fn().mockImplementation((key: string, defaultValue: number) => defaultValue),
      } as unknown as ConfigService,
      new AuthRateLimitService(),
    );
    const { context, response } = createContext();

    expect(guard.canActivate(context)).toBe(true);
    expect(response.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', '10');
    expect(response.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', '9');
  });

  it('blocks requests after the limit is reached', () => {
    const rateLimitService = new AuthRateLimitService();
    const guard = new AuthRateLimitGuard(
      {
        get: jest.fn().mockImplementation((key: string, defaultValue: number) => defaultValue),
      } as unknown as ConfigService,
      rateLimitService,
    );
    const { context } = createContext();

    for (let attempt = 0; attempt < 10; attempt += 1) {
      expect(guard.canActivate(context)).toBe(true);
    }

    expect(() => guard.canActivate(context)).toThrow(HttpException);
  });

  it('uses X-Forwarded-For header when present', () => {
    const rateLimitService = new AuthRateLimitService();
    const guard = new AuthRateLimitGuard(
      {
        get: jest.fn().mockImplementation((key: string, defaultValue: number) => defaultValue),
      } as unknown as ConfigService,
      rateLimitService,
    );
    
    const { context: context1 } = createContext({
      headers: {
        'x-forwarded-for': '203.0.113.1',
        'user-agent': 'test-agent',
      },
    });
    const { context: context2 } = createContext({
      headers: {
        'x-forwarded-for': '203.0.113.2',
        'user-agent': 'test-agent',
      },
    });

    // Different IPs should have separate rate limits
    for (let i = 0; i < 10; i++) {
      expect(guard.canActivate(context1)).toBe(true);
      expect(guard.canActivate(context2)).toBe(true);
    }

    // Both should now be at limit
    expect(() => guard.canActivate(context1)).toThrow(HttpException);
    expect(() => guard.canActivate(context2)).toThrow(HttpException);
  });

  it('uses User-Agent fingerprint in addition to IP', () => {
    const rateLimitService = new AuthRateLimitService();
    const guard = new AuthRateLimitGuard(
      {
        get: jest.fn().mockImplementation((key: string, defaultValue: number) => defaultValue),
      } as unknown as ConfigService,
      rateLimitService,
    );
    
    // Same IP, different User-Agents should have separate limits
    const { context: context1 } = createContext({
      ip: '203.0.113.1',
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows)',
      },
    });
    const { context: context2 } = createContext({
      ip: '203.0.113.1',
      headers: {
        'user-agent': 'Mozilla/5.0 (Macintosh)',
      },
    });

    for (let i = 0; i < 10; i++) {
      expect(guard.canActivate(context1)).toBe(true);
      expect(guard.canActivate(context2)).toBe(true);
    }

    // Both should now be at limit
    expect(() => guard.canActivate(context1)).toThrow(HttpException);
    expect(() => guard.canActivate(context2)).toThrow(HttpException);
  });

  it('warns when using private IP in production', () => {
    const mockLogger = {
      warn: jest.fn(),
      log: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
    };

    const guard = new AuthRateLimitGuard(
      {
        get: jest.fn().mockImplementation((key: string, defaultValue?: any) => {
          if (key === 'NODE_ENV') return 'production';
          return defaultValue;
        }),
      } as unknown as ConfigService,
      new AuthRateLimitService(),
    );

    // Replace the logger
    (guard as any).logger = mockLogger;

    const { context } = createContext({ ip: '127.0.0.1' });
    guard.canActivate(context);

    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Rate limiting using private IP address'),
    );
  });
});

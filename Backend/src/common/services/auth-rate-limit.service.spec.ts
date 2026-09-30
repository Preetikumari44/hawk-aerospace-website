import { AuthRateLimitService } from './auth-rate-limit.service';

describe('AuthRateLimitService', () => {
  it('allows requests until the limit is reached', () => {
    const service = new AuthRateLimitService();

    const first = service.check('auth:127.0.0.1', 2, 60_000, 1_000);
    const second = service.check('auth:127.0.0.1', 2, 60_000, 1_500);
    const third = service.check('auth:127.0.0.1', 2, 60_000, 2_000);

    expect(first.allowed).toBe(true);
    expect(first.remaining).toBe(1);
    expect(second.allowed).toBe(true);
    expect(second.remaining).toBe(0);
    expect(third.allowed).toBe(false);
    expect(third.retryAfterMs).toBeGreaterThan(0);
  });

  it('resets the bucket after the window expires', () => {
    const service = new AuthRateLimitService();

    service.check('auth:127.0.0.1', 1, 1_000, 1_000);
    const blocked = service.check('auth:127.0.0.1', 1, 1_000, 1_500);
    const allowedAgain = service.check('auth:127.0.0.1', 1, 1_000, 2_100);

    expect(blocked.allowed).toBe(false);
    expect(allowedAgain.allowed).toBe(true);
  });
});

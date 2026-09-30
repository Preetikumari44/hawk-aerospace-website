import { Injectable } from '@nestjs/common';

export interface AuthRateLimitDecision {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterMs: number;
}

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

@Injectable()
export class AuthRateLimitService {
  private readonly buckets = new Map<string, RateLimitBucket>();

  check(key: string, limit: number, windowMs: number, now = Date.now()): AuthRateLimitDecision {
    const bucket = this.buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      const resetAt = now + windowMs;
      this.buckets.set(key, { count: 1, resetAt });

      return {
        allowed: true,
        limit,
        remaining: Math.max(limit - 1, 0),
        resetAt,
        retryAfterMs: 0,
      };
    }

    if (bucket.count >= limit) {
      return {
        allowed: false,
        limit,
        remaining: 0,
        resetAt: bucket.resetAt,
        retryAfterMs: Math.max(bucket.resetAt - now, 0),
      };
    }

    bucket.count += 1;

    return {
      allowed: true,
      limit,
      remaining: Math.max(limit - bucket.count, 0),
      resetAt: bucket.resetAt,
      retryAfterMs: 0,
    };
  }

  reset(): void {
    this.buckets.clear();
  }
}

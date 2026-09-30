import { Injectable, Logger } from '@nestjs/common';

import { CacheService } from '../../../common/cache/cache.service';

export interface LockoutInfo {
  attempts: number;
  lockedUntil?: Date;
  reason?: string;
}

@Injectable()
export class AccountLockoutService {
  private readonly logger = new Logger(AccountLockoutService.name);
  private readonly LOCKOUT_PREFIX = 'lockout:';
  private readonly ATTEMPTS_PREFIX = 'attempts:';

  // Lockout thresholds
  private readonly LOCKOUT_THRESHOLDS = [
    { attempts: 3, duration: 15 * 60 * 1000, label: '15 minutes' }, // 3 attempts = 15 min
    { attempts: 5, duration: 60 * 60 * 1000, label: '1 hour' }, // 5 attempts = 1 hour
    { attempts: 10, duration: 24 * 60 * 60 * 1000, label: '24 hours' }, // 10+ = 24 hours
  ];

  constructor(private readonly cacheService: CacheService) {}

  /**
   * Check if an account is locked
   */
  async isAccountLocked(identifier: string): Promise<{
    locked: boolean;
    lockedUntil?: Date;
    attempts: number;
  }> {
    try {
      const lockoutKey = `${this.LOCKOUT_PREFIX}${identifier}`;
      const lockoutData = await this.cacheService.get<{
        lockedUntil: string;
        attempts: number;
      }>(lockoutKey);

      if (lockoutData && lockoutData.lockedUntil) {
        const lockedUntil = new Date(lockoutData.lockedUntil);
        const now = new Date();

        if (now < lockedUntil) {
          // Still locked
          return {
            locked: true,
            lockedUntil,
            attempts: lockoutData.attempts,
          };
        } else {
          // Lockout expired, clear it
          await this.clearLockout(identifier);
        }
      }

      // Check current attempts
      const attempts = await this.getFailedAttempts(identifier);

      return {
        locked: false,
        attempts,
      };
    } catch (error) {
      this.logger.error('Error checking account lockout:', error);
      // Fail open - don't block login if we can't check
      return { locked: false, attempts: 0 };
    }
  }

  /**
   * Record a failed login attempt
   */
  async recordFailedAttempt(identifier: string): Promise<{
    shouldLock: boolean;
    lockDuration?: number;
    lockUntil?: Date;
    attempts: number;
  }> {
    try {
      const attemptsKey = `${this.ATTEMPTS_PREFIX}${identifier}`;

      // Increment attempts
      let attempts = (await this.cacheService.get<number>(attemptsKey)) || 0;
      attempts++;

      // Store attempts with 1 hour TTL (resets after 1 hour of no attempts)
      await this.cacheService.set(attemptsKey, attempts, 60 * 60 * 1000);

      this.logger.log(
        `Failed login attempt ${attempts} recorded for ${identifier}`,
      );

      // Check if we should lock the account
      const threshold = this.LOCKOUT_THRESHOLDS.find(
        t => attempts >= t.attempts,
      );

      if (threshold) {
        const lockUntil = new Date(Date.now() + threshold.duration);
        await this.lockAccount(identifier, lockUntil, attempts);

        return {
          shouldLock: true,
          lockDuration: threshold.duration,
          lockUntil,
          attempts,
        };
      }

      return {
        shouldLock: false,
        attempts,
      };
    } catch (error) {
      this.logger.error('Error recording failed attempt:', error);
      return { shouldLock: false, attempts: 0 };
    }
  }

  /**
   * Reset failed attempts counter (on successful login)
   */
  async resetAttempts(identifier: string): Promise<void> {
    try {
      const attemptsKey = `${this.ATTEMPTS_PREFIX}${identifier}`;
      const lockoutKey = `${this.LOCKOUT_PREFIX}${identifier}`;

      await Promise.all([
        this.cacheService.delete(attemptsKey),
        this.cacheService.delete(lockoutKey),
      ]);

      this.logger.debug(`Reset login attempts for ${identifier}`);
    } catch (error) {
      this.logger.error('Error resetting attempts:', error);
    }
  }

  /**
   * Lock an account until a specific time
   */
  async lockAccount(
    identifier: string,
    lockedUntil: Date,
    attempts: number,
  ): Promise<void> {
    try {
      const lockoutKey = `${this.LOCKOUT_PREFIX}${identifier}`;
      const ttl = lockedUntil.getTime() - Date.now();

      await this.cacheService.set(
        lockoutKey,
        {
          lockedUntil: lockedUntil.toISOString(),
          attempts,
          reason: 'Multiple failed login attempts',
        },
        ttl,
      );

      this.logger.warn(
        `Account ${identifier} locked until ${lockedUntil.toISOString()} (${attempts} failed attempts)`,
      );
    } catch (error) {
      this.logger.error('Error locking account:', error);
    }
  }

  /**
   * Manually unlock an account (admin action)
   */
  async unlockAccount(identifier: string): Promise<void> {
    try {
      await this.clearLockout(identifier);
      this.logger.log(`Account ${identifier} manually unlocked`);
    } catch (error) {
      this.logger.error('Error unlocking account:', error);
      throw error;
    }
  }

  /**
   * Get current failed attempts count
   */
  async getFailedAttempts(identifier: string): Promise<number> {
    try {
      const attemptsKey = `${this.ATTEMPTS_PREFIX}${identifier}`;
      return (await this.cacheService.get<number>(attemptsKey)) || 0;
    } catch (error) {
      this.logger.error('Error getting failed attempts:', error);
      return 0;
    }
  }

  /**
   * Get lockout info for display
   */
  async getLockoutInfo(identifier: string): Promise<LockoutInfo | null> {
    try {
      const lockoutKey = `${this.LOCKOUT_PREFIX}${identifier}`;
      const lockoutData = await this.cacheService.get<{
        lockedUntil: string;
        attempts: number;
        reason: string;
      }>(lockoutKey);

      if (!lockoutData) {
        const attempts = await this.getFailedAttempts(identifier);
        return { attempts };
      }

      return {
        attempts: lockoutData.attempts,
        lockedUntil: new Date(lockoutData.lockedUntil),
        reason: lockoutData.reason,
      };
    } catch (error) {
      this.logger.error('Error getting lockout info:', error);
      return null;
    }
  }

  /**
   * Calculate remaining lockout time in seconds
   */
  getRemainingLockoutTime(lockedUntil: Date): number {
    const now = new Date();
    const remaining = lockedUntil.getTime() - now.getTime();
    return Math.max(0, Math.ceil(remaining / 1000));
  }

  /**
   * Format lockout duration for user display
   */
  formatLockoutDuration(seconds: number): string {
    if (seconds < 60) {
      return `${seconds} second${seconds !== 1 ? 's' : ''}`;
    }

    const minutes = Math.ceil(seconds / 60);
    if (minutes < 60) {
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }

    const hours = Math.ceil(minutes / 60);
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  }

  /**
   * Clear lockout data
   */
  private async clearLockout(identifier: string): Promise<void> {
    const attemptsKey = `${this.ATTEMPTS_PREFIX}${identifier}`;
    const lockoutKey = `${this.LOCKOUT_PREFIX}${identifier}`;

    await Promise.all([
      this.cacheService.delete(attemptsKey),
      this.cacheService.delete(lockoutKey),
    ]);
  }
}

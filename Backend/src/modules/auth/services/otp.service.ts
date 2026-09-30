import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomInt } from 'crypto';

import { CacheService } from '../../../common/cache/cache.service';

interface StoredOtp {
  code: string;
  phone: string;
  expiresAt: number;
  attempts: number;
}

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private readonly OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_ATTEMPTS = 6;
  private readonly OTP_LENGTH = 6;

  constructor(
    private readonly configService: ConfigService,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * Generate a 6-digit OTP code
   */
  generateOtp(): string {
    const min = Math.pow(10, this.OTP_LENGTH - 1);
    const max = Math.pow(10, this.OTP_LENGTH) - 1;
    return randomInt(min, max).toString();
  }

  /**
   * Store OTP in Redis with expiration
   */
  async storeOtp(phone: string, code: string): Promise<void> {
    try {
      const key = this.getRedisKey(phone);
      const data: StoredOtp = {
        code,
        phone,
        expiresAt: Date.now() + this.OTP_EXPIRY_MS,
        attempts: 0,
      };

      this.logger.log(`Storing OTP for ${phone}, key: ${key}`);
      this.logger.debug(`OTP data:`, data);
      
      await this.cacheService.set(key, JSON.stringify(data), this.OTP_EXPIRY_MS);
      
      this.logger.log(`✅ OTP stored successfully for ${phone}`);
      
      // Verify it was stored
      const verification = await this.cacheService.get<string>(key);
      if (verification) {
        this.logger.log(`✅ OTP storage verified for ${phone}`);
      } else {
        this.logger.error(`❌ OTP storage verification FAILED for ${phone} - key not found after set!`);
      }
    } catch (error: any) {
      this.logger.error(`❌ Failed to store OTP for ${phone}:`, error.message, error.stack);
      throw error;
    }
  }

  /**
   * Verify OTP code
   */
  async verifyOtp(phone: string, code: string): Promise<{ valid: boolean; error?: string }> {
    const key = this.getRedisKey(phone);
    const storedData = await this.cacheService.get<string>(key);

    if (!storedData) {
      this.logger.warn(`OTP verification failed: No OTP found for ${phone}`);
      return { valid: false, error: 'OTP_NOT_FOUND' };
    }

    // Handle both string (in-memory) and object (Redis auto-deserialized) formats
    const stored: StoredOtp = typeof storedData === 'string' 
      ? JSON.parse(storedData) 
      : storedData as any;

    // Check expiration
    if (Date.now() > stored.expiresAt) {
      await this.cacheService.delete(key);
      this.logger.warn(`OTP verification failed: Expired for ${phone}`);
      return { valid: false, error: 'OTP_EXPIRED' };
    }

    // Check max attempts
    if (stored.attempts >= this.MAX_ATTEMPTS) {
      await this.cacheService.delete(key);
      this.logger.warn(`OTP verification failed: Max attempts exceeded for ${phone}`);
      return { valid: false, error: 'MAX_ATTEMPTS_EXCEEDED' };
    }

    // Verify code
    if (stored.code !== code) {
      stored.attempts++;
      await this.cacheService.set(
        key,
        JSON.stringify(stored),
        Math.ceil((stored.expiresAt - Date.now()) / 1000),
      );
      this.logger.warn(
        `OTP verification failed: Invalid code for ${phone} (attempt ${stored.attempts}/${this.MAX_ATTEMPTS})`,
      );
      return {
        valid: false,
        error: 'INVALID_OTP',
      };
    }

    // Success - delete OTP
    await this.cacheService.delete(key);
    this.logger.log(`OTP verified successfully for ${phone}`);
    return { valid: true };
  }

  /**
   * Check if OTP exists for phone number
   */
  async hasOtp(phone: string): Promise<boolean> {
    const key = this.getRedisKey(phone);
    const data = await this.cacheService.get(key);
    return data !== null;
  }

  /**
   * Delete OTP (used for cleanup)
   */
  async deleteOtp(phone: string): Promise<void> {
    const key = this.getRedisKey(phone);
    await this.cacheService.delete(key);
    this.logger.log(`OTP deleted for ${phone}`);
  }

  /**
   * Get remaining attempts for phone number
   */
  async getRemainingAttempts(phone: string): Promise<number> {
    const key = this.getRedisKey(phone);
    const storedData = await this.cacheService.get<string>(key);

    if (!storedData) {
      return this.MAX_ATTEMPTS;
    }

    // Handle both string (in-memory) and object (Redis auto-deserialized) formats
    const stored: StoredOtp =
      typeof storedData === 'string' ? JSON.parse(storedData) : (storedData as any);
    return Math.max(0, this.MAX_ATTEMPTS - (stored.attempts ?? 0));
  }

  private getRedisKey(phone: string): string {
    return `otp:${phone}`;
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import { CacheService } from '../../../common/cache/cache.service';
import type { JwtPayload } from '../../../common/interfaces/jwt-payload.interface';

/**
 * Service to manage JWT token denylist (blocklist) for logout functionality
 * Uses Redis/cache to store invalidated tokens until their natural expiration
 */
@Injectable()
export class TokenDenylistService {
  private readonly logger = new Logger(TokenDenylistService.name);
  private readonly DENYLIST_PREFIX = 'token:denylist:';

  constructor(
    private readonly cacheService: CacheService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Add a token to the denylist
   * @param token The JWT token to invalidate
   * @returns true if successfully added, false otherwise
   */
  async addToken(token: string): Promise<boolean> {
    try {
      // Decode token without verification to get expiration
      const decoded = this.jwtService.decode(token) as JwtPayload & { exp: number; jti?: string };
      
      if (!decoded || !decoded.exp) {
        this.logger.warn('Cannot denylist token: missing expiration');
        return false;
      }

      // Calculate TTL: time until token naturally expires
      const now = Math.floor(Date.now() / 1000);
      const ttl = (decoded.exp - now) * 1000; // Convert to milliseconds

      if (ttl <= 0) {
        // Token already expired, no need to denylist
        return true;
      }

      // Use token's jti (if available) or the token itself as key
      const tokenId = decoded.jti || this.hashToken(token);
      const key = `${this.DENYLIST_PREFIX}${tokenId}`;

      // Store in cache with TTL matching token expiration
      await this.cacheService.set(key, {
        uid: decoded.uid,
        invalidatedAt: new Date().toISOString(),
        expiresAt: new Date(decoded.exp * 1000).toISOString(),
      }, ttl);

      this.logger.log(`Token for user ${decoded.uid} added to denylist (TTL: ${Math.round(ttl / 1000)}s)`);
      return true;
    } catch (error) {
      this.logger.error('Error adding token to denylist:', error);
      return false;
    }
  }

  /**
   * Check if a token is in the denylist
   * @param token The JWT token to check
   * @returns true if token is denylisted (invalidated), false otherwise
   */
  async isTokenDenylisted(token: string): Promise<boolean> {
    try {
      // Decode token to get identifier
      const decoded = this.jwtService.decode(token) as JwtPayload & { jti?: string };
      
      if (!decoded) {
        return false;
      }

      const tokenId = decoded.jti || this.hashToken(token);
      const key = `${this.DENYLIST_PREFIX}${tokenId}`;

      const entry = await this.cacheService.get(key);
      return entry !== null;
    } catch (error) {
      this.logger.error('Error checking token denylist:', error);
      // Fail open: if we can't check, allow the request
      // The token will still be validated by JWT verification
      return false;
    }
  }

  /**
   * Add both access and refresh tokens to denylist
   * @param accessToken The access token
   * @param refreshToken The refresh token
   */
  async denylistTokenPair(accessToken?: string, refreshToken?: string): Promise<void> {
    const promises: Promise<boolean>[] = [];

    if (accessToken) {
      promises.push(this.addToken(accessToken));
    }

    if (refreshToken) {
      promises.push(this.addToken(refreshToken));
    }

    await Promise.all(promises);
  }

  /**
   * Remove a token from the denylist (for testing or admin override)
   * @param token The JWT token to remove
   */
  async removeToken(token: string): Promise<void> {
    try {
      const decoded = this.jwtService.decode(token) as JwtPayload & { jti?: string };
      
      if (!decoded) {
        return;
      }

      const tokenId = decoded.jti || this.hashToken(token);
      const key = `${this.DENYLIST_PREFIX}${tokenId}`;

      await this.cacheService.delete(key);
      this.logger.log(`Token removed from denylist`);
    } catch (error) {
      this.logger.error('Error removing token from denylist:', error);
    }
  }

  /**
   * Clear all denylisted tokens (use with caution)
   */
  async clearAll(): Promise<void> {
    try {
      await this.cacheService.deletePattern(`${this.DENYLIST_PREFIX}.*`);
      this.logger.warn('All denylisted tokens cleared');
    } catch (error) {
      this.logger.error('Error clearing denylist:', error);
    }
  }

  /**
   * Get statistics about the denylist
   */
  async getStats() {
    const cacheStats = await this.cacheService.getStats();
    return {
      cacheType: cacheStats.type,
      cacheConnected: cacheStats.connected,
      // Note: We can't easily count only denylist keys without scanning all keys
      // This would require additional implementation for Redis SCAN
    };
  }

  /**
   * Create a simple hash of the token for use as a cache key
   * This is a simple implementation - in production, consider using crypto.createHash
   */
  private hashToken(token: string): string {
    // Simple hash for key generation
    // In production, consider using: crypto.createHash('sha256').update(token).digest('hex')
    let hash = 0;
    for (let i = 0; i < token.length; i++) {
      const char = token.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }
}

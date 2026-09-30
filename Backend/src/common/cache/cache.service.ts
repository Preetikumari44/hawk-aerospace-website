import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from '@upstash/redis';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

@Injectable()
export class CacheService implements OnModuleInit {
  private readonly logger = new Logger(CacheService.name);
  private memoryCache = new Map<string, CacheEntry<any>>();
  private redisClient: Redis | null = null;
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes default
  private useRedis: boolean = false;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    // Initialize Redis when the module is ready
    const redisUrl = this.configService.get<string>('UPSTASH_REDIS_REST_URL');
    const redisToken = this.configService.get<string>('UPSTASH_REDIS_REST_TOKEN');

    this.logger.log('🔧 CacheService initialization...');
    this.logger.log(`Redis URL: ${redisUrl ? 'SET (' + redisUrl.substring(0, 40) + '...)' : 'MISSING'}`);
    this.logger.log(`Redis Token: ${redisToken ? 'SET (length: ' + redisToken.length + ')' : 'MISSING'}`);

    if (redisUrl && redisToken) {
      try {
        this.redisClient = new Redis({
          url: redisUrl,
          token: redisToken,
        });
        this.useRedis = true;
        this.logger.log('✅ Upstash Redis cache initialized successfully');
      } catch (error) {
        this.logger.error('❌ Failed to initialize Redis, falling back to in-memory cache:', error);
        this.useRedis = false;
      }
    } else {
      this.useRedis = false;
      this.logger.warn('⚠️  Redis credentials not found. Using in-memory cache. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN for distributed caching.');
    }
  }

  /**
   * Get cached data if available and not expired
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      this.logger.debug(`[GET] Key: ${key}, UseRedis: ${this.useRedis}`);
      
      if (this.useRedis && this.redisClient) {
        const result = await this.getFromRedis<T>(key);
        this.logger.debug(`[GET] Redis result for ${key}: ${result ? 'FOUND' : 'NOT FOUND'}`);
        return result;
      }
      const result = this.getFromMemory<T>(key);
      this.logger.debug(`[GET] Memory result for ${key}: ${result ? 'FOUND' : 'NOT FOUND'}`);
      return result;
    } catch (error) {
      this.logger.error(`❌ Error getting cache key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set cached data with optional TTL
   */
  async set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): Promise<void> {
    try {
      this.logger.debug(`[SET] Key: ${key}, TTL: ${ttl}s, UseRedis: ${this.useRedis}`);
      
      if (this.useRedis && this.redisClient) {
        await this.setInRedis(key, data, ttl);
        this.logger.debug(`[SET] ✅ Stored in Redis: ${key}`);
      } else {
        this.setInMemory(key, data, ttl);
        this.logger.debug(`[SET] ✅ Stored in Memory: ${key}`);
      }
    } catch (error) {
      this.logger.error(`❌ Error setting cache key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Delete specific cache entry
   */
  async delete(key: string): Promise<void> {
    try {
      if (this.useRedis && this.redisClient) {
        await this.redisClient.del(key);
      } else {
        this.memoryCache.delete(key);
      }
    } catch (error) {
      this.logger.error(`Error deleting cache key ${key}:`, error);
    }
  }

  /**
   * Delete all cache entries matching a pattern
   */
  async deletePattern(pattern: string): Promise<void> {
    try {
      if (this.useRedis && this.redisClient) {
        await this.deletePatternFromRedis(pattern);
      } else {
        this.deletePatternFromMemory(pattern);
      }
    } catch (error) {
      this.logger.error(`Error deleting cache pattern ${pattern}:`, error);
    }
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    try {
      if (this.useRedis && this.redisClient) {
        await this.redisClient.flushdb();
        this.logger.log('Redis cache cleared');
      } else {
        this.memoryCache.clear();
        this.logger.log('Memory cache cleared');
      }
    } catch (error) {
      this.logger.error('Error clearing cache:', error);
    }
  }

  /**
   * Get cache stats
   */
  async getStats() {
    try {
      if (this.useRedis && this.redisClient) {
        const dbsize = await this.redisClient.dbsize();
        return {
          type: 'redis',
          connected: true,
          size: dbsize,
          url: process.env.UPSTASH_REDIS_REST_URL?.substring(0, 30) + '...',
        };
      } else {
        return {
          type: 'memory',
          connected: true,
          size: this.memoryCache.size,
          keys: Array.from(this.memoryCache.keys()),
        };
      }
    } catch (error: any) {
      this.logger.error('Error getting cache stats:', error);
      return {
        type: this.useRedis ? 'redis' : 'memory',
        connected: false,
        error: error?.message || 'Unknown error',
      };
    }
  }

  // Private Redis methods
  private async getFromRedis<T>(key: string): Promise<T | null> {
    this.logger.debug(`[GET-REDIS] Fetching key: ${key}`);
    const data = await this.redisClient!.get<T>(key);
    this.logger.debug(`[GET-REDIS] Result: ${data ? 'FOUND (type: ' + typeof data + ')' : 'NOT FOUND'}`);
    if (data) {
      this.logger.debug(`[GET-REDIS] Data preview: ${JSON.stringify(data).substring(0, 100)}`);
    }
    return data;
  }

  private async setInRedis<T>(key: string, data: T, ttl: number): Promise<void> {
    const ttlSeconds = Math.ceil(ttl / 1000);
    this.logger.debug(`[SET-REDIS] Storing key: ${key}, TTL: ${ttlSeconds}s, Data type: ${typeof data}`);
    this.logger.debug(`[SET-REDIS] Data preview: ${JSON.stringify(data).substring(0, 100)}`);
    
    const result = await this.redisClient!.set(key, data, { ex: ttlSeconds });
    
    this.logger.debug(`[SET-REDIS] Set result: ${result}`);
    
    // Immediately verify
    const verification = await this.redisClient!.get(key);
    this.logger.debug(`[SET-REDIS] Immediate verification: ${verification ? 'FOUND' : 'NOT FOUND'}`);
    if (verification) {
      this.logger.debug(`[SET-REDIS] Verified data type: ${typeof verification}`);
    }
  }

  private async deletePatternFromRedis(pattern: string): Promise<void> {
    // Convert JS regex pattern to Redis pattern
    // Replace .* with * for Redis SCAN pattern
    const redisPattern = pattern.replace(/\.\*/g, '*');
    
    let cursor = '0';
    let deletedCount = 0;

    do {
      // Scan for keys matching the pattern
      const result = await this.redisClient!.scan(cursor, { match: redisPattern, count: 100 });
      cursor = result[0];
      const keys = result[1];

      if (keys.length > 0) {
        await this.redisClient!.del(...keys);
        deletedCount += keys.length;
      }
    } while (cursor !== '0');

    this.logger.log(`Deleted ${deletedCount} keys matching pattern: ${redisPattern}`);
  }

  // Private Memory methods
  private getFromMemory<T>(key: string): T | null {
    const entry = this.memoryCache.get(key);
    
    if (!entry) {
      return null;
    }

    const now = Date.now();
    const isExpired = now - entry.timestamp > entry.ttl;

    if (isExpired) {
      this.memoryCache.delete(key);
      return null;
    }

    return entry.data;
  }

  private setInMemory<T>(key: string, data: T, ttl: number): void {
    this.memoryCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  private deletePatternFromMemory(pattern: string): void {
    const regex = new RegExp(pattern);
    const keysToDelete = Array.from(this.memoryCache.keys()).filter(key => regex.test(key));
    keysToDelete.forEach(key => this.memoryCache.delete(key));
  }
}

import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';

import { CacheService } from '../../../common/cache/cache.service';
import { TokenDenylistService } from './token-denylist.service';

describe('TokenDenylistService', () => {
  let service: TokenDenylistService;
  let cacheService: jest.Mocked<CacheService>;
  let jwtService: jest.Mocked<JwtService>;

  const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOiJ0ZXN0LXVzZXIiLCJyb2xlIjoiY3VzdG9tZXIiLCJleHAiOjk5OTk5OTk5OTl9.test';
  const mockDecodedToken = {
    uid: 'test-user',
    role: 'customer',
    status: 'active',
    exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenDenylistService,
        {
          provide: CacheService,
          useValue: {
            set: jest.fn(),
            get: jest.fn(),
            delete: jest.fn(),
            deletePattern: jest.fn(),
            getStats: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            decode: jest.fn(),
            verifyAsync: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
            getOrThrow: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TokenDenylistService>(TokenDenylistService);
    cacheService = module.get(CacheService);
    jwtService = module.get(JwtService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('addToken', () => {
    it('should add a valid token to denylist', async () => {
      jwtService.decode.mockReturnValue(mockDecodedToken);
      cacheService.set.mockResolvedValue(undefined);

      const result = await service.addToken(mockToken);

      expect(result).toBe(true);
      expect(jwtService.decode).toHaveBeenCalledWith(mockToken);
      expect(cacheService.set).toHaveBeenCalled();
    });

    it('should return false for token without expiration', async () => {
      jwtService.decode.mockReturnValue({ uid: 'test-user', role: 'customer' });

      const result = await service.addToken(mockToken);

      expect(result).toBe(false);
      expect(cacheService.set).not.toHaveBeenCalled();
    });

    it('should return true for already expired token', async () => {
      const expiredToken = {
        ...mockDecodedToken,
        exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
      };
      jwtService.decode.mockReturnValue(expiredToken);

      const result = await service.addToken(mockToken);

      expect(result).toBe(true);
      expect(cacheService.set).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      jwtService.decode.mockImplementation(() => {
        throw new Error('Decode error');
      });

      const result = await service.addToken(mockToken);

      expect(result).toBe(false);
    });
  });

  describe('isTokenDenylisted', () => {
    it('should return true for denylisted token', async () => {
      jwtService.decode.mockReturnValue(mockDecodedToken);
      cacheService.get.mockResolvedValue({
        uid: 'test-user',
        invalidatedAt: new Date().toISOString(),
      });

      const result = await service.isTokenDenylisted(mockToken);

      expect(result).toBe(true);
      expect(cacheService.get).toHaveBeenCalled();
    });

    it('should return false for non-denylisted token', async () => {
      jwtService.decode.mockReturnValue(mockDecodedToken);
      cacheService.get.mockResolvedValue(null);

      const result = await service.isTokenDenylisted(mockToken);

      expect(result).toBe(false);
    });

    it('should fail open on errors', async () => {
      jwtService.decode.mockImplementation(() => {
        throw new Error('Decode error');
      });

      const result = await service.isTokenDenylisted(mockToken);

      expect(result).toBe(false);
    });
  });

  describe('denylistTokenPair', () => {
    it('should add both tokens to denylist', async () => {
      jwtService.decode.mockReturnValue(mockDecodedToken);
      cacheService.set.mockResolvedValue(undefined);

      await service.denylistTokenPair('access-token', 'refresh-token');

      expect(cacheService.set).toHaveBeenCalledTimes(2);
    });

    it('should handle only access token', async () => {
      jwtService.decode.mockReturnValue(mockDecodedToken);
      cacheService.set.mockResolvedValue(undefined);

      await service.denylistTokenPair('access-token');

      expect(cacheService.set).toHaveBeenCalledTimes(1);
    });

    it('should handle only refresh token', async () => {
      jwtService.decode.mockReturnValue(mockDecodedToken);
      cacheService.set.mockResolvedValue(undefined);

      await service.denylistTokenPair(undefined, 'refresh-token');

      expect(cacheService.set).toHaveBeenCalledTimes(1);
    });
  });

  describe('removeToken', () => {
    it('should remove token from denylist', async () => {
      jwtService.decode.mockReturnValue(mockDecodedToken);
      cacheService.delete.mockResolvedValue(undefined);

      await service.removeToken(mockToken);

      expect(cacheService.delete).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      jwtService.decode.mockImplementation(() => {
        throw new Error('Decode error');
      });

      await expect(service.removeToken(mockToken)).resolves.not.toThrow();
    });
  });

  describe('clearAll', () => {
    it('should clear all denylisted tokens', async () => {
      cacheService.deletePattern.mockResolvedValue(undefined);

      await service.clearAll();

      expect(cacheService.deletePattern).toHaveBeenCalledWith(
        expect.stringContaining('token:denylist:'),
      );
    });
  });

  describe('getStats', () => {
    it('should return cache stats for Redis', async () => {
      const mockStats = {
        type: 'redis',
        connected: true,
        size: 10,
        url: 'https://redis.example.com...',
      };
      cacheService.getStats.mockResolvedValue(mockStats);

      const result = await service.getStats();

      expect(result).toEqual({
        cacheType: 'redis',
        cacheConnected: true,
      });
    });

    it('should return cache stats for memory', async () => {
      const mockStats = {
        type: 'memory',
        connected: true,
        size: 5,
        keys: ['key1', 'key2'],
      };
      cacheService.getStats.mockResolvedValue(mockStats);

      const result = await service.getStats();

      expect(result).toEqual({
        cacheType: 'memory',
        cacheConnected: true,
      });
    });
  });
});

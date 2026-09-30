import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { getEnvFilePaths, validateEnv } from './app.config';

describe('app config', () => {
  let temporaryDirectory: string | null = null;
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    if (temporaryDirectory) {
      rmSync(temporaryDirectory, { recursive: true, force: true });
      temporaryDirectory = null;
    }
    process.env.NODE_ENV = originalEnv;
  });

  it('finds Backend env files when launched from workspace root', () => {
    temporaryDirectory = join(tmpdir(), `hawk-env-${Date.now()}`);
    const backendDirectory = join(temporaryDirectory, 'Backend');
    const backendEnvPath = join(backendDirectory, '.env');
    const rootEnvPath = join(temporaryDirectory, '.env');

    mkdirSync(backendDirectory, { recursive: true });
    writeFileSync(backendEnvPath, 'FIREBASE_DATABASE_ID=hawk-2i2u');
    writeFileSync(rootEnvPath, 'FIREBASE_DATABASE_ID=wrong-default');

    expect(
      getEnvFilePaths(
        temporaryDirectory,
        join(backendDirectory, 'dist', 'src', 'common', 'config'),
      ),
    ).toEqual([backendEnvPath, rootEnvPath]);
  });

  it('keeps named Firestore database id in validated config', () => {
    expect(
      validateEnv({
        FIREBASE_DATABASE_ID: 'hawk-2i2u',
      }).FIREBASE_DATABASE_ID,
    ).toBe('hawk-2i2u');
  });

  describe('JWT Secret Validation', () => {
    describe('Production Environment', () => {
      beforeEach(() => {
        process.env.NODE_ENV = 'production';
      });

      it('should throw error when JWT_SECRET is missing', () => {
        expect(() => {
          validateEnv({
            NODE_ENV: 'production',
            JWT_REFRESH_SECRET: 'a'.repeat(64),
          });
        }).toThrow('Missing required environment variable: JWT_SECRET');
      });

      it('should throw error when JWT_REFRESH_SECRET is missing', () => {
        expect(() => {
          validateEnv({
            NODE_ENV: 'production',
            JWT_SECRET: 'a'.repeat(64),
          });
        }).toThrow('Missing required environment variable: JWT_REFRESH_SECRET');
      });

      it('should throw error when JWT_SECRET is too short', () => {
        expect(() => {
          validateEnv({
            NODE_ENV: 'production',
            JWT_SECRET: 'short',
            JWT_REFRESH_SECRET: 'a'.repeat(64),
          });
        }).toThrow('JWT_SECRET must be at least 32 characters long');
      });

      it('should throw error when JWT_SECRET contains well-known default', () => {
        expect(() => {
          validateEnv({
            NODE_ENV: 'production',
            JWT_SECRET: 'dev-jwt-secret-change-me-extended-to-32-chars',
            JWT_REFRESH_SECRET: 'a'.repeat(64),
          });
        }).toThrow('JWT_SECRET contains a well-known or default value');
      });

      it('should throw error when JWT_SECRET has too many repeated characters', () => {
        expect(() => {
          validateEnv({
            NODE_ENV: 'production',
            JWT_SECRET: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
            JWT_REFRESH_SECRET: 'b'.repeat(64),
          });
        }).toThrow('JWT_SECRET contains too many repeated characters');
      });

      it('should accept valid JWT secrets', () => {
        const config = validateEnv({
          NODE_ENV: 'production',
          JWT_SECRET: 'K7gNU3sdo+OL0wNhqoVWhr3g6s1xYv72ol/pe/Unols=',
          JWT_REFRESH_SECRET: 'XkhZG4fW2t2w5bPullWx/uUpq+5qWQvVnq0EKrFV4Zs=',
          MONGODB_URI: 'mongodb://localhost:27017/test',
          CORS_ORIGIN: 'https://example.com',
        });

        expect(config.JWT_SECRET).toBe('K7gNU3sdo+OL0wNhqoVWhr3g6s1xYv72ol/pe/Unols=');
        expect(config.JWT_REFRESH_SECRET).toBe('XkhZG4fW2t2w5bPullWx/uUpq+5qWQvVnq0EKrFV4Zs=');
      });
    });

    describe('Development Environment', () => {
      beforeEach(() => {
        process.env.NODE_ENV = 'development';
      });

      it('should auto-generate JWT_SECRET if missing', () => {
        const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

        const config = validateEnv({
          NODE_ENV: 'development',
        });

        expect(config.JWT_SECRET).toBeTruthy();
        expect(config.JWT_SECRET.length).toBeGreaterThan(20);
        expect(config.JWT_SECRET).toMatch(/^dev-/);
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('JWT_SECRET not set'),
        );

        consoleSpy.mockRestore();
      });

      it('should auto-generate JWT_REFRESH_SECRET if missing', () => {
        const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

        const config = validateEnv({
          NODE_ENV: 'development',
        });

        expect(config.JWT_REFRESH_SECRET).toBeTruthy();
        expect(config.JWT_REFRESH_SECRET.length).toBeGreaterThan(20);
        expect(config.JWT_REFRESH_SECRET).toMatch(/^dev-refresh-/);
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('JWT_REFRESH_SECRET not set'),
        );

        consoleSpy.mockRestore();
      });

      it('should warn about weak secrets in development', () => {
        const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

        validateEnv({
          NODE_ENV: 'development',
          JWT_SECRET: 'weak-secret',
          JWT_REFRESH_SECRET: 'another-weak-secret',
        });

        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('JWT_SECRET validation warning'),
        );
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('JWT_REFRESH_SECRET validation warning'),
        );

        consoleSpy.mockRestore();
      });

      it('should accept user-provided secrets in development', () => {
        const config = validateEnv({
          NODE_ENV: 'development',
          JWT_SECRET: 'K7gNU3sdo+OL0wNhqoVWhr3g6s1xYv72ol/pe/Unols=',
          JWT_REFRESH_SECRET: 'XkhZG4fW2t2w5bPullWx/uUpq+5qWQvVnq0EKrFV4Zs=',
        });

        expect(config.JWT_SECRET).toBe('K7gNU3sdo+OL0wNhqoVWhr3g6s1xYv72ol/pe/Unols=');
        expect(config.JWT_REFRESH_SECRET).toBe('XkhZG4fW2t2w5bPullWx/uUpq+5qWQvVnq0EKrFV4Zs=');
      });
    });

    describe('Test Environment', () => {
      beforeEach(() => {
        process.env.NODE_ENV = 'test';
      });

      it('should auto-generate secrets in test environment', () => {
        const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

        const config = validateEnv({
          NODE_ENV: 'test',
        });

        expect(config.JWT_SECRET).toBeTruthy();
        expect(config.JWT_REFRESH_SECRET).toBeTruthy();

        consoleSpy.mockRestore();
      });
    });

    describe('Well-Known Secret Detection', () => {
      beforeEach(() => {
        process.env.NODE_ENV = 'production';
      });

      it('should detect "changeme" variations', () => {
        expect(() => {
          validateEnv({
            NODE_ENV: 'production',
            JWT_SECRET: 'please-changeme-this-is-a-long-secret-key',
            JWT_REFRESH_SECRET: 'b'.repeat(64),
          });
        }).toThrow('contains a well-known or default value');
      });

      it('should detect "your-secret-here" variations', () => {
        expect(() => {
          validateEnv({
            NODE_ENV: 'production',
            JWT_SECRET: 'your-secret-here-extended-to-be-long-enough',
            JWT_REFRESH_SECRET: 'b'.repeat(64),
          });
        }).toThrow('contains a well-known or default value');
      });

      it('should be case-insensitive for well-known secrets', () => {
        expect(() => {
          validateEnv({
            NODE_ENV: 'production',
            JWT_SECRET: 'DEV-JWT-SECRET-CHANGE-ME-BUT-LONGER-NOW',
            JWT_REFRESH_SECRET: 'b'.repeat(64),
          });
        }).toThrow('contains a well-known or default value');
      });
    });
  });
});

import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import { hashPassword } from '../../common/utils/password.util';
import type { FirestoreUserDocument } from '../../database/firestore/contracts';
import { FirebaseAdminService } from '../../firebase/firebase-admin.service';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { TokenDenylistService } from './services/token-denylist.service';

import { SessionTrackingService } from './services/session-tracking.service';
import { LoginHistoryService } from './services/login-history.service';
import { AccountLockoutService } from './services/account-lockout.service';

describe('AuthService', () => {
  it('removes password material from admin login response', async () => {
    const password = 'SecurePassword123!';
    const passwordHash = hashPassword(password);
    const user = {
      uid: 'admin1',
      role: 'super_admin',
      status: 'active',
      name: 'Super Admin',
      email: 'admin@test.com',
      phone: null,
      authProvider: 'email',
      profileData: { name: 'Super Admin' },
      verification: { isVerified: true, documents: [] },
      adminApproval: true,
      permissions: { canManageUsers: true },
      authCredentials: { passwordHash },
      password: 'legacy-bcrypt-hash',
      nested: {
        passwordHash: 'nested-secret',
        safe: 'keep-me',
      },
      createdAt: '2026-06-25T00:00:00.000Z',
      updatedAt: '2026-06-25T00:00:00.000Z',
      lastLogin: null,
    } satisfies FirestoreUserDocument & Record<string, unknown>;

    const configValues: Record<string, string> = {
      JWT_SECRET: 'access-secret',
      JWT_EXPIRES_IN: '15m',
      JWT_REFRESH_SECRET: 'refresh-secret',
      JWT_REFRESH_EXPIRES_IN: '7d',
    };

    const service = new AuthService(
      {
        getOrThrow: jest.fn((key: string) => configValues[key]),
      } as unknown as ConfigService,
      {
        signAsync: jest
          .fn()
          .mockResolvedValueOnce('access-token')
          .mockResolvedValueOnce('refresh-token'),
      } as unknown as JwtService,
      {} as FirebaseAdminService,
      {
        findByEmail: jest.fn().mockResolvedValue(user),
        updateLoginTracking: jest.fn().mockImplementation(async (uid: string) => user),
      } as unknown as UsersService,
      {
        denylistTokenPair: jest.fn(),
        isTokenDenylisted: jest.fn().mockResolvedValue(false),
      } as unknown as TokenDenylistService,
      {
        createSession: jest.fn().mockResolvedValue('session123'),
      } as unknown as SessionTrackingService,
      {
        logAttempt: jest.fn().mockResolvedValue('log123'),
      } as unknown as LoginHistoryService,
      {
        isAccountLocked: jest.fn().mockResolvedValue({ locked: false, attempts: 0 }),
        resetAttempts: jest.fn(),
        recordFailedAttempt: jest.fn().mockResolvedValue({ shouldLock: false, attempts: 0 }),
      } as unknown as AccountLockoutService,
      {} as never,
      {} as never,
      undefined,
    );

    const response = await service.adminLogin({ email: 'admin@test.com', password });
    const responseUser = response.user as Record<string, unknown>;

    expect(response.accessToken).toBe('access-token');
    expect(response.refreshToken).toBe('refresh-token');
    expect(responseUser.email).toBe('admin@test.com');
    expect(responseUser).not.toHaveProperty('password');
    expect(responseUser).not.toHaveProperty('authCredentials');
    expect(responseUser.nested).toEqual({ safe: 'keep-me' });

    const serializedUser = JSON.stringify(responseUser);
    expect(serializedUser).not.toContain(passwordHash);
    expect(serializedUser).not.toContain('legacy-bcrypt-hash');
    expect(serializedUser).not.toContain('nested-secret');
  });
});

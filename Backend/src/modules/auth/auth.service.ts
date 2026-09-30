import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';

import type { AppRole } from '../../common/constants/roles.constant';
import { ADMINISTRATIVE_ROLES } from '../../common/constants/roles.constant';
import { ROOT_COLLECTIONS } from '../../common/constants/collection-paths.constant';
import type { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import type { CurrentUser } from '../../common/interfaces/current-user.interface';
import { hashPassword, verifyPassword } from '../../common/utils/password.util';
import type { FirestoreUserDocument } from '../../database/firestore/contracts';
import { FirebaseAdminService } from '../../firebase/firebase-admin.service';
import { NotificationService } from '../notification/notification.service';
import { NotificationChannel, NotificationPriority } from '../notification/interfaces/notification-provider.interface';
import { UsersService } from '../users/users.service';
import { AdminLoginDto } from './dto/admin-login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LogoutDto } from './dto/logout.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RequestOtpDto } from './dto/request-otp.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SwitchRoleDto } from './dto/switch-role.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { Optional } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { AccountLockoutService } from './services/account-lockout.service';
import { LoginHistoryService } from './services/login-history.service';
import { OtpService } from './services/otp.service';
import { SessionTrackingService } from './services/session-tracking.service';
import { TokenDenylistService } from './services/token-denylist.service';

interface ResolvedIdentity {
  uid: string;
  phone?: string | null;
  email?: string | null;
}

type SanitizedUser = Omit<FirestoreUserDocument, 'authCredentials'> & Record<string, unknown>;

const SENSITIVE_RESPONSE_FIELDS = new Set([
  'password',
  'passwordHash',
  'authCredentials',
  'lastPasswordChange',
  'refreshToken',
  'refreshTokenHash',
  'resetToken',
  'otpCode',
  'privateKey',
]);

@Injectable()
export class AuthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly firebaseAdminService: FirebaseAdminService,
    private readonly usersService: UsersService,
    private readonly tokenDenylistService: TokenDenylistService,
    private readonly sessionTrackingService: SessionTrackingService,
    private readonly loginHistoryService: LoginHistoryService,
    private readonly accountLockoutService: AccountLockoutService,
    private readonly otpService: OtpService,
    private readonly notificationService: NotificationService,
    @Optional() private readonly eventEmitter?: EventEmitter2,
  ) {}

  async requestOtp(dto: RequestOtpDto) {
    const devOtpEnabled = this.configService.get<boolean>('AUTH_DEV_OTP_ENABLED', false);
    const firebaseEnabled = this.firebaseAdminService.isEnabled();

    console.log('[AUTH] OTP Request:', {
      phone: dto.phone,
      role: dto.role,
      firebaseEnabled,
      devOtpEnabled,
      timestamp: new Date().toISOString(),
    });

    // Development bypass for whitelisted test phone numbers: return the fixed
    // dev code immediately. No Twilio SMS and no Redis record - verification
    // happens in `resolveIdentity` against AUTH_DEV_OTP_CODE. This keeps dev
    // testing working without depending on (or spending) SMS/twilio credits.
    if (devOtpEnabled && this.isDevOtpPhone(dto.phone)) {
      console.log('[AUTH] Development OTP bypass for:', dto.phone);
      return {
        delivery: 'development-bypass',
        phone: dto.phone,
        roleHint: dto.role ?? 'customer',
        challengeExpiresIn: '5m',
        developmentBypassEnabled: true,
        notice: `Development mode: Use OTP code from AUTH_DEV_OTP_CODE`,
      };
    }

    // Firebase-first OTP (no Twilio): the mobile app sends the OTP via the
    // Firebase Auth SDK, then calls verify-otp with a firebaseIdToken.
    // Backend-generated SMS OTP is only a fallback for environments without
    // Firebase (dev/web tools).
    if (firebaseEnabled && !this.isDevOtpPhone(dto.phone)) {
      return {
        delivery: 'firebase-client-flow',
        phone: dto.phone,
        roleHint: dto.role ?? 'customer',
        challengeExpiresIn: '5m',
        developmentBypassEnabled: false,
        notice:
          'Use Firebase Auth SDK on the mobile app to send the OTP, then call verify-otp with firebaseIdToken.',
      };
    }

    // Check if OTP already sent recently (rate limiting)
    const hasExistingOtp = await this.otpService.hasOtp(dto.phone);
    if (hasExistingOtp) {
      console.log('[AUTH] OTP already sent recently for:', dto.phone);
      return {
        delivery: 'backend-sms',
        phone: dto.phone,
        roleHint: dto.role ?? 'customer',
        challengeExpiresIn: '5m',
        notice: 'OTP already sent. Please check your SMS or wait for expiration.',
      };
    }

    // Generate OTP
    const otpCode = this.otpService.generateOtp();
    console.log('[AUTH] Generated OTP:', { phone: dto.phone, code: otpCode });

    // Store OTP in Redis
    await this.otpService.storeOtp(dto.phone, otpCode);

    // Send OTP via Twilio (for web/Postman)
    try {
      const smsResult = await this.notificationService.dispatch({
        channels: [NotificationChannel.SMS],
        targets: { phones: [dto.phone] },
        priority: NotificationPriority.HIGH,
        subject: 'HAWK OTP',
        body: `Your HAWK verification code is: ${otpCode}. Valid for 5 minutes. Do not share this code.`,
      });

      console.log('[AUTH] SMS sent via Twilio:', smsResult);

      if (smsResult[0]?.sent > 0) {
        return {
          delivery: 'backend-sms',
          phone: dto.phone,
          roleHint: dto.role ?? 'customer',
          challengeExpiresIn: '5m',
          provider: 'twilio',
          notice: 'OTP sent via SMS. Check your phone.',
        };
      } else {
        throw new Error(smsResult[0]?.error || 'SMS send failed');
      }
    } catch (error: any) {
      console.error('[AUTH] Failed to send OTP via Twilio:', error);

      const isDevPhone = this.isDevOtpPhone(dto.phone);

      // Test phone numbers: allow dev OTP bypass
      if (devOtpEnabled && isDevPhone) {
        return {
          delivery: 'development-bypass',
          phone: dto.phone,
          roleHint: dto.role ?? 'customer',
          challengeExpiresIn: '5m',
          developmentBypassEnabled: true,
          notice: `Development mode: Use OTP code from AUTH_DEV_OTP_CODE`,
        };
      }

      // Real phone numbers: always use Firebase Auth SDK
      if (firebaseEnabled) {
        return {
          delivery: 'firebase-client-flow',
          phone: dto.phone,
          roleHint: dto.role ?? 'customer',
          challengeExpiresIn: '5m',
          developmentBypassEnabled: false,
          notice:
            'Backend SMS failed. Use Firebase Auth SDK on mobile app to send OTP, then provide firebaseIdToken.',
        };
      }

      if (devOtpEnabled) {
        return {
          delivery: 'development-bypass',
          phone: dto.phone,
          roleHint: dto.role ?? 'customer',
          challengeExpiresIn: '5m',
          developmentBypassEnabled: true,
          notice: `Development mode: Use OTP code from AUTH_DEV_OTP_CODE`,
        };
      }

      throw new ServiceUnavailableException(
        'Failed to send OTP. Please try again later or contact support.',
      );
    }
  }

  async verifyOtp(dto: VerifyOtpDto, ipAddress = '0.0.0.0', userAgent = 'Unknown', deviceInfo?: any) {
    let identity;
    try {
      identity = await this.resolveIdentity(dto);
    } catch (error) {
      // Log failed attempt
      if (identity?.uid) {
        await this.loginHistoryService.logAttempt({
          userId: identity.uid,
          method: 'phone',
          status: 'failed',
          failureReason: 'invalid_otp',
          ipAddress,
          userAgent,
          deviceInfo,
        });
      }
      // Let specific errors from resolveIdentity bubble up
      throw error;
    }

    const role: AppRole = dto.role ?? 'customer';
    let existing;
    
    try {
      existing =
        (await this.usersService.findByUid(identity.uid)) ||
        (identity.phone ? await this.usersService.findByPhone(identity.phone) : null);
    } catch (error) {
      throw new ServiceUnavailableException(
        'Unable to verify your account. Please try again later.',
      );
    }

    const user = existing
      ? await this.usersService.updateLoginTracking(existing.uid, ipAddress)
      : await this.usersService.upsertAuthenticatedUser({
          uid: identity.uid,
          role,
          name: dto.name || undefined,
          phone: identity.phone,
          email: identity.email,
          status: role === 'customer' ? 'active' : 'pending',
          ipAddress,
        });

    // Auto-create customer profile for new users (all users start as customers)
    if (!existing && user && user.role === 'customer') {
      await this.autoCreateCustomerProfile(user);
    }

    // Refer & Earn: attach a fresh signup to the inviter's referral record.
    const referralCode = (dto as { referralCode?: string }).referralCode;
    if (!existing && referralCode && typeof referralCode === 'string' && referralCode.trim()) {
      try {
        this.eventEmitter?.emit('referral.signed_up', {
          inviteeUid: user.uid,
          inviteePhone: identity.phone ?? dto.phone,
          code: referralCode.trim().toUpperCase(),
        });
      } catch {
        /* referral listener not loaded — ignore */
      }
    }

    if (user.status === 'blocked') {
      await this.loginHistoryService.logAttempt({
        userId: user.uid,
        method: 'phone',
        status: 'blocked',
        failureReason: 'account_blocked',
        ipAddress,
        userAgent,
        deviceInfo,
      });
      throw new ForbiddenException(
        'Your account has been blocked. Please contact support for assistance.',
      );
    }

    if (user.status === 'suspended') {
      await this.loginHistoryService.logAttempt({
        userId: user.uid,
        method: 'phone',
        status: 'blocked',
        failureReason: 'account_suspended',
        ipAddress,
        userAgent,
        deviceInfo,
      });
      throw new ForbiddenException(
        'Your account has been suspended. Please contact your administrator.',
      );
    }

    return this.issueTokenPair(user, false, ipAddress, userAgent, deviceInfo, 'phone');
  }

  async adminLogin(dto: AdminLoginDto, ipAddress = '0.0.0.0', userAgent = 'Unknown', deviceInfo?: any) {
    let user;
    try {
      user = await this.usersService.findByEmail(dto.email);
    } catch (error) {
      // Database or service error
      throw new ServiceUnavailableException(
        'Unable to process login request. Please try again later.',
      );
    }

    // User not found or not an admin
    if (!user || !this.isAdministrativeRole(user.role)) {
      // Log failed attempt (no user to associate, use email as identifier)
      throw new UnauthorizedException(
        'Invalid email or password. Please check your credentials and try again.',
      );
    }

    // Check account lockout BEFORE password verification
    const lockStatus = await this.accountLockoutService.isAccountLocked(dto.email);
    if (lockStatus.locked) {
      const remaining = this.accountLockoutService.getRemainingLockoutTime(lockStatus.lockedUntil!);
      const duration = this.accountLockoutService.formatLockoutDuration(remaining);
      
      await this.loginHistoryService.logAttempt({
        userId: user.uid,
        method: 'email',
        status: 'blocked',
        failureReason: 'account_locked',
        ipAddress,
        userAgent,
        deviceInfo,
      });

      throw new ForbiddenException(
        `Account temporarily locked due to multiple failed login attempts. Please try again in ${duration}.`,
      );
    }

    // Check password
    const passwordHash = user.authCredentials?.passwordHash;
    if (!passwordHash || !verifyPassword(dto.password, passwordHash)) {
      // Record failed attempt
      const lockoutResult = await this.accountLockoutService.recordFailedAttempt(dto.email);
      
      await this.loginHistoryService.logAttempt({
        userId: user.uid,
        method: 'email',
        status: 'failed',
        failureReason: 'invalid_credentials',
        ipAddress,
        userAgent,
        deviceInfo,
      });

      if (lockoutResult.shouldLock) {
        const duration = this.accountLockoutService.formatLockoutDuration(
          this.accountLockoutService.getRemainingLockoutTime(lockoutResult.lockUntil!),
        );
        throw new ForbiddenException(
          `Too many failed login attempts. Your account has been locked for ${duration}.`,
        );
      }

      throw new UnauthorizedException(
        `Invalid email or password. ${3 - lockoutResult.attempts} attempt(s) remaining.`,
      );
    }

    // Check account status
    if (user.status === 'blocked') {
      await this.loginHistoryService.logAttempt({
        userId: user.uid,
        method: 'email',
        status: 'blocked',
        failureReason: 'account_blocked',
        ipAddress,
        userAgent,
        deviceInfo,
      });
      throw new ForbiddenException(
        'Your account has been blocked. Please contact support for assistance.',
      );
    }

    if (user.status === 'suspended') {
      await this.loginHistoryService.logAttempt({
        userId: user.uid,
        method: 'email',
        status: 'blocked',
        failureReason: 'account_suspended',
        ipAddress,
        userAgent,
        deviceInfo,
      });
      throw new ForbiddenException(
        'Your account has been suspended. Please contact your administrator.',
      );
    }

    if (user.status === 'pending') {
      await this.loginHistoryService.logAttempt({
        userId: user.uid,
        method: 'email',
        status: 'blocked',
        failureReason: 'account_pending',
        ipAddress,
        userAgent,
        deviceInfo,
      });
      throw new ForbiddenException(
        'Your account is pending approval. Please wait for administrator verification.',
      );
    }

    if (user.status !== 'active') {
      throw new ForbiddenException(
        'Your account is currently inactive. Please contact support.',
      );
    }

    // Reset lockout counter on successful login
    await this.accountLockoutService.resetAttempts(dto.email);

    // Update login tracking
    const updatedUser = await this.usersService.updateLoginTracking(user.uid, ipAddress);

    return this.issueTokenPair(updatedUser, dto.rememberMe, ipAddress, userAgent, deviceInfo, 'email');
  }

  async refresh(dto: RefreshTokenDto) {
    try {
      // Check if token is denylisted before verification
      const isDenylisted = await this.tokenDenylistService.isTokenDenylisted(dto.refreshToken);
      if (isDenylisted) {
        throw new UnauthorizedException(
          'This session has been invalidated. Please log in again.',
        );
      }

      const payload = await this.jwtService.verifyAsync<JwtPayload>(dto.refreshToken, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });

      const user = await this.usersService.getByUid(payload.uid);
      return this.issueTokenPair(user);
    } catch (error: any) {
      // Distinguish between expired and invalid tokens
      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedException(
          'Your session has expired. Please log in again.',
        );
      }
      if (error.name === 'JsonWebTokenError') {
        throw new UnauthorizedException(
          'Invalid session token. Please log in again.',
        );
      }
      throw new UnauthorizedException(
        'Unable to refresh session. Please log in again.',
      );
    }
  }

  async logout(accessToken: string, dto?: LogoutDto) {
    try {
      // Add both access token and refresh token (if provided) to denylist
      await this.tokenDenylistService.denylistTokenPair(
        accessToken,
        dto?.refreshToken,
      );

      return {
        success: true,
        message: 'Logged out successfully. Your session has been invalidated.',
      };
    } catch (error) {
      // Even if denylist fails, return success to client
      // The tokens will still expire naturally
      return {
        success: true,
        message: 'Logged out successfully',
      };
    }
  }

  async switchRole(
    dto: SwitchRoleDto,
    currentUser: CurrentUser,
    ipAddress = '0.0.0.0',
    userAgent = 'Unknown',
    deviceInfo?: any,
  ) {
    const targetRole = dto.role as AppRole;
    const SELF_SERVICE_ROLES = new Set<AppRole>(['customer', 'aggregator', 'pilot', 'technician', 'vendor', 'fleet_manager']);

    if (!SELF_SERVICE_ROLES.has(targetRole)) {
      throw new BadRequestException(`Role '${targetRole}' cannot be switched to.`);
    }

    const userDoc = await this.usersService.getByUid(currentUser.uid);

    if (userDoc.role === targetRole) {
      // No-op — already on the requested role. Re-issue current session.
      return this.issueTokenPair(userDoc, false, ipAddress, userAgent, deviceInfo, 'phone');
    }

    // ── Admin-approval gate ──────────────────────────────────────────
    // A role switch must NEVER bypass the admin. The user may only switch to
    // the always-available customer role, roles in their `approvedRoles`
    // (granted via a reviewed role application), or a restricted role they
    // already hold/have held (their main role — e.g. a pilot switching back
    // to pilot after visiting customer — must never be asked for the
    // application form again). Switching to any other restricted role
    // (sales / fleet / technician the user never held) still requires an
    // approved role application.
    const approvedRoles: AppRole[] = (Array.isArray(userDoc.approvedRoles)
      ? userDoc.approvedRoles
      : userDoc.role === 'customer'
        ? (['customer'] as AppRole[])
        : ([] as AppRole[]));

    const existingRoles: AppRole[] = Array.isArray(userDoc.roles) && userDoc.roles.length
      ? [...userDoc.roles]
      : [userDoc.role];

    const legacyApproved =
      userDoc.adminApproval === true && existingRoles.includes(targetRole);

    const previouslyHeld = existingRoles.includes(targetRole);

    const canSwitch =
      targetRole === 'customer' ||
      approvedRoles.includes(targetRole) ||
      legacyApproved ||
      previouslyHeld;

    if (!canSwitch) {
      throw new ForbiddenException(
        `Role '${targetRole}' has not been approved for your account. Please apply for the ${targetRole} role from Account settings and wait for admin approval.`,
      );
    }

    if (!existingRoles.includes(targetRole)) {
      existingRoles.push(targetRole);
    }

    // Preserve every legitimately-held role so a later switch-back keeps
    // working (switching to customer must not drop the user's main role).
    const nextApprovedRoles: AppRole[] = (
      ['customer', ...approvedRoles, ...existingRoles, userDoc.role, targetRole] as AppRole[]
    ).filter((r, i, arr) => arr.indexOf(r) === i);

    const now = new Date().toISOString();
    const db = this.firebaseAdminService.firestore();

    const updatedUser: FirestoreUserDocument = {
      ...userDoc,
      role: targetRole,
      roles: existingRoles,
      primaryRole: targetRole,
      approvedRoles: nextApprovedRoles,
      status: targetRole === 'customer' ? 'active' : 'active',
      updatedAt: now,
      profileData: {
        ...userDoc.profileData,
        previousRole: userDoc.role,
        lastRoleSwitch: now,
      },
      permissions: this.getPermissionsForRole(targetRole),
    };

    await db.collection(ROOT_COLLECTIONS.users).doc(currentUser.uid).set(updatedUser, { merge: true });

    // Auto-create role-specific collection document if it doesn't exist
    await this.autoCreateRoleDocument(currentUser.uid, targetRole, updatedUser);

    console.log(`[AUTH] User ${currentUser.uid} switched role from ${userDoc.role} to ${targetRole}`);
    console.log(`[AUTH] Roles now: ${existingRoles.join(', ')}`);

    return this.issueTokenPair(updatedUser, false, ipAddress, userAgent, deviceInfo, 'phone');
  }

  private getPermissionsForRole(role: AppRole): Record<string, boolean> {
    switch (role) {
      case 'customer':
        return {
          'bookings.create': true,
          'bookings.read': true,
          'bookings.cancel': true,
          'profile.update': true,
        };
      case 'pilot':
        return {
          'missions.accept': true,
          'missions.execute': true,
          'profile.update': true,
        };
      case 'technician':
        return {
          'maintenance.create': true,
          'maintenance.update': true,
          'profile.update': true,
        };
      case 'vendor':
      case 'fleet_manager':
        return {
          'fleet.manage': true,
          'drones.assign': true,
          'pilots.assign': true,
          'bookings.assign': true,
          'maintenance.approve': true,
          'profile.update': true,
        };
      case 'aggregator':
        return {
          'customers.manage': true,
          'bookings.create': true,
          'profile.update': true,
        };
      default:
        return { 'profile.update': true };
    }
  }

  private async autoCreateRoleDocument(
    uid: string,
    role: AppRole,
    userDoc: FirestoreUserDocument,
  ): Promise<void> {
    const db = this.firebaseAdminService.firestore();
    const now = new Date().toISOString();

    try {
      const roleCollectionMap: Record<string, string> = {
        customer: 'customers',
        pilot: 'pilots',
        technician: 'technicians',
        fleet_manager: 'fleet_managers',
        vendor: 'fleet_managers',
        aggregator: 'aggregators',
      };

      const collectionName = roleCollectionMap[role];
      if (!collectionName) return;

      const roleDocRef = db.collection(collectionName).doc(uid);
      const roleDoc = await roleDocRef.get();

      if (!roleDoc.exists) {
        console.log(`[AUTH] Auto-creating ${collectionName} document for user ${uid}`);

        let roleSpecificData: Record<string, any> = {};

        switch (role) {
          case 'customer':
            roleSpecificData = {
              uid,
              customerType: 'direct',
              managedByAggregatorUid: null,
              totalBookings: 0,
              completedBookings: 0,
              activeBookings: 0,
              cancelledBookings: 0,
              lifetimeRevenue: 0,
              averageRating: 0,
            };
            break;
          case 'fleet_manager':
          case 'vendor':
            roleSpecificData = {
              uid,
              activeBookings: 0,
              assignedDrones: 0,
              assignedPilots: 0,
              completedBookings: 0,
              totalRevenue: 0,
              rating: 0,
              coverageRadius: 100,
              region: userDoc.profileData?.timezone || 'Asia/Kolkata',
            };
            break;
          case 'pilot':
            roleSpecificData = {
              uid,
              totalMissions: 0,
              completedMissions: 0,
              cancelledMissions: 0,
              totalEarnings: 0,
              rating: 0,
              isAvailable: true,
            };
            break;
          case 'technician':
            roleSpecificData = {
              uid,
              completedTickets: 0,
              activeTickets: 0,
              totalEarnings: 0,
              rating: 0,
              isAvailable: true,
            };
            break;
          case 'aggregator':
            roleSpecificData = {
              uid,
              totalCustomers: 0,
              totalBookings: 0,
              completedBookings: 0,
              totalCommission: 0,
              rating: 0,
            };
            break;
        }

        await roleDocRef.set({
          ...roleSpecificData,
          createdAt: now,
          updatedAt: now,
        });

        console.log(`[AUTH] ${collectionName} document created for ${uid}`);
      } else {
        // Update existing role document timestamps
        await roleDocRef.set({ updatedAt: now }, { merge: true });
      }
    } catch (error) {
      console.error(`[AUTH] Failed to auto-create ${role} document for ${uid}:`, error);
    }
  }

  private async resolveIdentity(dto: VerifyOtpDto): Promise<ResolvedIdentity> {
    console.log('[AUTH] Resolving identity:', {
      hasFirebaseToken: !!dto.firebaseIdToken,
      hasPhone: !!dto.phone,
      hasOtpCode: !!dto.otpCode,
      firebaseEnabled: this.firebaseAdminService.isEnabled(),
      timestamp: new Date().toISOString(),
    });

    // Option 1: Firebase ID Token (mobile app flow)
    if (dto.firebaseIdToken) {
      if (!this.firebaseAdminService.isEnabled()) {
        console.error('[AUTH] Firebase not enabled but ID token provided');
        throw new ServiceUnavailableException(
          'Authentication service is currently unavailable. Please try again later.',
        );
      }

      try {
        console.log('[AUTH] Verifying Firebase ID token...');
        const decodedToken = await this.firebaseAdminService.verifyIdToken(dto.firebaseIdToken);
        console.log('[AUTH] Firebase token verified successfully:', {
          uid: decodedToken.uid,
          phone: decodedToken.phone_number,
        });
        return {
          uid: decodedToken.uid,
          phone: decodedToken.phone_number ?? dto.phone ?? null,
          email: decodedToken.email ?? null,
        };
      } catch (error: any) {
        console.error('[AUTH] Firebase token verification failed:', {
          code: error.code,
          message: error.message,
        });
        if (error.code === 'auth/id-token-expired') {
          throw new UnauthorizedException(
            'Your verification code has expired. Please request a new code.',
          );
        }
        if (error.code === 'auth/invalid-id-token') {
          throw new UnauthorizedException(
            'Invalid verification code. Please try again.',
          );
        }
        throw new UnauthorizedException(
          'Unable to verify your identity. Please try again.',
        );
      }
    }

    // Option 2: Development bypass (ONLY for whitelisted test phone numbers).
    // Checked BEFORE the real OTP path so test numbers + fixed code always work
    // regardless of any OTP previously stored in Redis by requestOtp.
    const devOtpEnabled = this.configService.get<boolean>('AUTH_DEV_OTP_ENABLED', false);
    const devOtpCode = this.configService.get<string>('AUTH_DEV_OTP_CODE', '123456');

    if (devOtpEnabled && dto.phone && this.isDevOtpPhone(dto.phone)) {
      if (!dto.otpCode || dto.otpCode !== devOtpCode) {
        console.error('[AUTH] Invalid development OTP code');
        throw new UnauthorizedException(
          'Incorrect verification code. Please check and try again.',
        );
      }

      console.log('[AUTH] Development OTP verified successfully');

      // Check if user exists by phone to reuse existing UID
      const existingUserDev = await this.usersService.findByPhone(dto.phone);
      const uidDev = existingUserDev?.uid ?? this.generateShortUid();

      return {
        uid: uidDev,
        phone: dto.phone,
        email: null,
      };
    }

    // Option 3: Backend OTP (web/Postman flow via Twilio)
    if (dto.phone && dto.otpCode) {
      console.log('[AUTH] Verifying backend OTP...');

      const verification = await this.otpService.verifyOtp(dto.phone, dto.otpCode);

      if (!verification.valid) {
        const remaining = await this.otpService.getRemainingAttempts(dto.phone);

        if (verification.error === 'OTP_EXPIRED') {
          throw new UnauthorizedException(
            'OTP has expired. Please request a new code.',
          );
        }

        if (verification.error === 'MAX_ATTEMPTS_EXCEEDED') {
          throw new UnauthorizedException(
            'Too many failed attempts. Please request a new OTP.',
          );
        }

        if (verification.error === 'OTP_NOT_FOUND') {
          throw new UnauthorizedException(
            'No OTP found. Please request a new code.',
          );
        }

        throw new UnauthorizedException(
          `Invalid OTP code. ${remaining} attempt(s) remaining.`,
        );
      }

      console.log('[AUTH] Backend OTP verified successfully');
      
      // Check if user exists by phone to reuse existing UID
      const existingUser = await this.usersService.findByPhone(dto.phone);
      const uid = existingUser?.uid ?? this.generateShortUid();
      
      return {
        uid,
        phone: dto.phone,
        email: null,
      };
    }

    console.error('[AUTH] No valid authentication method provided');
    throw new UnauthorizedException(
      'Phone verification is required. Please provide firebaseIdToken or OTP code.',
    );
  }

  private getDevOtpPhones(): string[] {
    const raw = this.configService.get<string>('AUTH_DEV_OTP_PHONES', '');
    return raw
      .split(',')
      .map((p) => p.trim())
      .filter((p) => p.length > 0)
      .map((p) => (p.startsWith('+') ? p : `+${p}`));
  }

  private isDevOtpPhone(phone: string): boolean {
    const normalized = phone.startsWith('+') ? phone : `+${phone}`;
    return this.getDevOtpPhones().includes(normalized);
  }

  /**
   * Generate a short random UID similar to Firestore auto-generated IDs
   * Format: 20 character alphanumeric string (like: gs2jjBY9NZa3BQbq6Sv1)
   */
  private generateShortUid(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let uid = '';
    for (let i = 0; i < 20; i++) {
      uid += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return uid;
  }

  private async issueTokenPair(
    user: FirestoreUserDocument,
    rememberMe?: boolean,
    ipAddress?: string,
    userAgent?: string,
    deviceInfo?: any,
    method?: 'phone' | 'email',
  ) {
    const payload: JwtPayload = {
      uid: user.uid,
      role: user.role,
      status: user.status,
      phone: user.phone,
      email: user.email,
      permissions: user.permissions,
    };

    // Use different expiration times based on rememberMe flag
    const accessExpiresIn = rememberMe 
      ? '7d'  // 7 days for remember me
      : this.configService.getOrThrow<string>('JWT_EXPIRES_IN');
    
    const refreshExpiresIn = rememberMe
      ? '30d'  // 30 days for remember me
      : this.configService.getOrThrow<string>('JWT_REFRESH_EXPIRES_IN');

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.getOrThrow<string>('JWT_SECRET'),
        expiresIn: accessExpiresIn,
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: refreshExpiresIn,
      }),
    ]);

    // Create session if we have context information
    let sessionId: string | undefined;
    if (ipAddress && userAgent) {
      try {
        sessionId = await this.sessionTrackingService.createSession({
          uid: user.uid,
          accessToken,
          refreshToken,
          ipAddress,
          userAgent,
          deviceInfo,
          method: method || 'phone',
        });

        // Log successful login
        await this.loginHistoryService.logAttempt({
          userId: user.uid,
          method: method || 'phone',
          status: 'success',
          ipAddress,
          userAgent,
          deviceInfo,
          sessionId,
        });
      } catch (error) {
        // Session tracking is non-critical, log but don't fail login
        console.error('Failed to create session or log login history:', error);
      }
    }

    return {
      accessToken,
      refreshToken,
      expiresIn: accessExpiresIn,
      refreshExpiresIn: refreshExpiresIn,
      sessionId,
      user: this.sanitizeUserForResponse(user),
    };
  }

  /**
   * Forgot password - generate reset token and send email
   */
  async forgotPassword(dto: ForgotPasswordDto) {
    try {
      const user = await this.usersService.findByEmail(dto.email);

      // Don't reveal if email exists or not (security)
      if (!user || !this.isAdministrativeRole(user.role)) {
        return {
          success: true,
          message: 'If an account with that email exists, a password reset link has been sent.',
        };
      }

      // Generate reset token
      const resetToken = randomUUID();
      const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Store reset token in user document
      await this.usersService.updateAuthCredentials(user.uid, {
        resetToken,
        resetTokenExpiry: resetTokenExpiry.toISOString(),
      });

      // TODO: Send email via NotificationService
      // await this.notificationService.sendEmail(dto.email, 'password-reset', { resetToken });

      return {
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.',
        // Only include token in development
        ...(this.configService.get('NODE_ENV') === 'development' && { resetToken }),
      };
    } catch (error) {
      // Don't leak error details
      return {
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.',
      };
    }
  }

  /**
   * Reset password using token
   */
  async resetPassword(dto: ResetPasswordDto) {
    // Find user by reset token
    const user = await this.usersService.findByResetToken(dto.resetToken);

    if (!user) {
      throw new BadRequestException(
        'Invalid or expired reset token. Please request a new password reset link.',
      );
    }

    // Check token expiry
    const tokenExpiry = user.authCredentials?.resetTokenExpiry;
    if (!tokenExpiry || new Date(tokenExpiry) < new Date()) {
      throw new BadRequestException(
        'Reset token has expired. Please request a new password reset link.',
      );
    }

    // Hash new password
    const passwordHash = hashPassword(dto.newPassword);

    // Update password and clear reset token
    await this.usersService.updateAuthCredentials(user.uid, {
      passwordHash,
      resetToken: null,
      resetTokenExpiry: null,
      lastPasswordChange: new Date().toISOString(),
    });

    // Revoke all existing sessions (force re-login)
    await this.sessionTrackingService.revokeAllSessions(
      user.uid,
      'Password reset - all sessions invalidated',
    );

    return {
      success: true,
      message: 'Password reset successfully. Please log in with your new password.',
    };
  }

  private sanitizeUserForResponse(user: FirestoreUserDocument): SanitizedUser {
    return this.stripSensitiveFields(user) as SanitizedUser;
  }

  private stripSensitiveFields(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map((item) => this.stripSensitiveFields(item));
    }

    if (!this.isPlainObject(value)) {
      return value;
    }

    const result: Record<string, unknown> = {};
    
    for (const [key, nestedValue] of Object.entries(value)) {
      // Skip sensitive fields entirely
      if (SENSITIVE_RESPONSE_FIELDS.has(key)) {
        continue;
      }
      
      // Recursively sanitize nested objects
      result[key] = this.stripSensitiveFields(nestedValue);
    }
    
    return result;
  }

  private isPlainObject(value: unknown): value is Record<string, unknown> {
    if (typeof value !== 'object' || value === null) {
      return false;
    }

    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  }

  private isAdministrativeRole(role: FirestoreUserDocument['role']): boolean {
    return ADMINISTRATIVE_ROLES.includes(role as (typeof ADMINISTRATIVE_ROLES)[number]);
  }

  /**
   * Auto-create customer profile in customers collection for new users
   * This matches the seed data structure where users and customers are separate collections
   */
  private async autoCreateCustomerProfile(user: FirestoreUserDocument): Promise<void> {
    try {
      console.log(`[AUTH] Auto-creating customer profile for new user: ${user.uid}`);
      
      const minimalCustomerProfile = {
        uid: user.uid,
        customerType: 'direct',
        managedByAggregatorUid: null,
        occupation: null,
        totalLandHolding: 0,
        landUnit: 'acres',
        state: null,
        district: null,
        taluka: null,
        village: null,
        address: null,
        pincode: null,
        geoLocation: null,
        totalBookings: 0,
        completedBookings: 0,
        cancelledBookings: 0,
        activeBookings: 0,
        lifetimeRevenue: 0,
        averageRating: 0,
        notificationSettings: {
          push: true,
          sms: true,
          email: true,
          whatsapp: false,
        },
      };

      await this.firebaseAdminService
        .firestore()
        .collection('customers')
        .doc(user.uid)
        .set(minimalCustomerProfile);

      console.log(`[AUTH] ✅ Customer profile created successfully for: ${user.uid}`);
    } catch (error) {
      console.error(`[AUTH] Failed to auto-create customer profile for ${user.uid}:`, error);
      // Don't throw error - customer profile creation is non-critical for login
      // The profile will be created on first access to /api/customers/me
    }
  }
}

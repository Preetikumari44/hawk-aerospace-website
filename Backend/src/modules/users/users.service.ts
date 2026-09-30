import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { CollectionReference, Query } from 'firebase-admin/firestore';

import { ROOT_COLLECTIONS } from '../../common/constants/collection-paths.constant';
import type { AppRole } from '../../common/constants/roles.constant';
import { CacheService } from '../../common/cache/cache.service';
import { hashPassword } from '../../common/utils/password.util';
import { FirebaseAdminService } from '../../firebase/firebase-admin.service';
import type {
  FirestoreUserDocument,
  UserProfileData,
  VerificationState,
  UserAuthCredentials,
} from '../../database/firestore/contracts';
import { CreateUserDto } from './dto/create-user.dto';
import { SetLanguageDto } from './dto/set-language.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UserFilterDto } from './dto/user-filter.dto';

export interface UpsertAuthenticatedUserInput {
  uid: string;
  role: FirestoreUserDocument['role'];
  name?: string;
  phone?: string | null;
  email?: string | null;
  status?: FirestoreUserDocument['status'];
  ipAddress?: string;
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly firebaseAdminService: FirebaseAdminService,
    private readonly cacheService: CacheService,
  ) {}

  async createUser(dto: CreateUserDto): Promise<FirestoreUserDocument> {
    this.assertIdentityFields(dto.email, dto.phone);

    const uid = dto.phone ? `phone:${dto.phone}` : `email:${dto.email!.toLowerCase()}`;
    const userDocument = this.buildUserDocument(uid, dto);

    await this.collection().doc(uid).set(userDocument);
    
    // Invalidate user lists cache
    await this.cacheService.deletePattern('users-list:.*');
    
    return userDocument;
  }

  async upsertAuthenticatedUser(
    input: UpsertAuthenticatedUserInput,
  ): Promise<FirestoreUserDocument> {
    const existing = await this.findByUid(input.uid);
    if (existing) {
      // Update existing user and increment login count
      // Also populate missing new fields if they don't exist
      const updatedDocument: FirestoreUserDocument = {
        ...existing,
        phone: input.phone ?? existing.phone,
        email: input.email ?? existing.email,
        name: input.name ?? existing.name,
        role: existing.role ?? input.role,
        roles: existing.roles ?? [existing.role ?? input.role],
        primaryRole: existing.primaryRole ?? existing.role ?? input.role,
        approvedRoles: existing.approvedRoles ?? this.resolveApprovedRoles(existing),
        status: existing.status ?? input.status ?? 'active',
        profileData: {
          ...existing.profileData,
          photoUrl: existing.profileData?.photoUrl ?? null,
          language: existing.profileData?.language ?? 'en',
          timezone: existing.profileData?.timezone ?? this.detectTimezone(input.ipAddress),
          preferences: existing.profileData?.preferences ?? {},
        },
        verification: {
          ...existing.verification,
          emailVerified: existing.verification?.emailVerified ?? (!!existing.email && existing.role === 'customer'),
          phoneVerified: existing.verification?.phoneVerified ?? true,
          kycStatus: existing.verification?.kycStatus ?? (existing.role === 'customer' ? 'approved' : 'pending'),
        },
        permissions: existing.permissions ?? this.getDefaultPermissions(existing.role ?? input.role),
        lastLogin: new Date().toISOString(),
        lastLoginIp: input.ipAddress ?? existing.lastLoginIp ?? null,
        loginCount: (existing.loginCount ?? 0) + 1,
        updatedAt: new Date().toISOString(),
      };

      await this.collection().doc(input.uid).set(updatedDocument, { merge: true });
      
      // Invalidate caches
      await this.cacheService.delete(`user:${input.uid}`);
      await this.cacheService.deletePattern('users-list:.*');
      
      return updatedDocument;
    }

    // Detect timezone based on IP or default to Asia/Kolkata
    const timezone = this.detectTimezone(input.ipAddress);

    // Create new user matching seed data structure
    const created: FirestoreUserDocument = {
      uid: input.uid,
      role: input.role, // Legacy field for backward compatibility
      roles: [input.role],
      primaryRole: input.role,
      approvedRoles: input.role === 'customer' ? ['customer'] : [],
      status: input.status ?? (input.role === 'customer' ? 'active' : 'pending'),
      name: input.name ?? '',
      email: input.email ?? null,
      phone: input.phone ?? null,
      authProvider: input.phone ? 'phone' : 'email',
      profileData: {
        name: input.name,
        photoUrl: null,
        language: 'en',
        timezone: timezone,
        preferences: {},
      },
      verification: {
        isVerified: input.role === 'customer', // Auto-verify customers
        emailVerified: !!input.email && input.role === 'customer', // True if email provided and customer
        phoneVerified: true, // Phone is verified after OTP
        kycStatus: input.role === 'customer' ? 'approved' : 'pending',
        documents: [],
      },
      adminApproval: input.role === 'customer',
      permissions: this.getDefaultPermissions(input.role),
      lastLogin: new Date().toISOString(),
      lastLoginIp: input.ipAddress ?? null,
      loginCount: 1, // First login
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await this.collection().doc(input.uid).set(created);
    
    // Invalidate user lists cache
    await this.cacheService.deletePattern('users-list:.*');
    
    return created;
  }

  /**
   * Update login tracking for existing users
   */
  async updateLoginTracking(
    uid: string,
    ipAddress?: string,
  ): Promise<FirestoreUserDocument> {
    const existing = await this.getByUid(uid);
    
    const updated: FirestoreUserDocument = {
      ...existing,
      lastLogin: new Date().toISOString(),
      lastLoginIp: ipAddress ?? existing.lastLoginIp ?? null,
      loginCount: (existing.loginCount ?? 0) + 1,
      updatedAt: new Date().toISOString(),
    };

    await this.collection().doc(uid).set(updated, { merge: true });
    
    // Invalidate caches
    await this.cacheService.delete(`user:${uid}`);
    await this.cacheService.deletePattern('users-list:.*');
    
    return updated;
  }

  /**
   * Detect timezone based on IP address (simple implementation)
   * In production, you might want to use a geolocation service
   */
  private detectTimezone(ipAddress?: string): string {
    // Default to Asia/Kolkata for Indian users
    // In a real application, you would use IP geolocation to determine timezone
    return 'Asia/Kolkata';
  }

  /**
   * Derive the approved-roles list for legacy users that predate the
   * `approvedRoles` field. Only roles that were explicitly granted by an admin
   * (or the always-available customer role) are considered "approved".
   */
  private resolveApprovedRoles(existing: FirestoreUserDocument): FirestoreUserDocument['approvedRoles'] {
    if (existing.role === 'customer') {
      return ['customer'];
    }

    const explicitlyApproved =
      existing.adminApproval === true ||
      existing.verification?.isVerified === true ||
      existing.status === 'active';

    if (!explicitlyApproved) {
      return ['customer'];
    }

    const granted: AppRole[] = (existing.roles?.length ? existing.roles : [existing.role]) ?? [];
    return granted.includes('customer' as any) ? granted : (['customer', ...granted] as AppRole[]);
  }

  private getDefaultPermissions(role: FirestoreUserDocument['role']): Record<string, boolean> {
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
        return {
          'fleet.manage': true,
          'drones.assign': true,
          'profile.update': true,
        };
      case 'aggregator':
        return {
          'customers.manage': true,
          'bookings.create': true,
          'profile.update': true,
        };
      default:
        return {
          'profile.update': true,
        };
    }
  }

  async findByUid(uid: string): Promise<FirestoreUserDocument | null> {
    const cacheKey = `user:${uid}`;
    const cached = await this.cacheService.get<FirestoreUserDocument>(cacheKey);
    
    if (cached) {
      this.logger.log(`Cache hit for user: ${uid}`);
      return cached;
    }
    
    const snapshot = await this.collection().doc(uid).get();
    if (!snapshot.exists) {
      return null;
    }

    const user = snapshot.data() ?? null;
    
    if (user) {
      // Cache for 5 minutes
      await this.cacheService.set(cacheKey, user, 5 * 60 * 1000);
    }
    
    return user;
  }

  async findByEmail(email: string): Promise<FirestoreUserDocument | null> {
    const snapshot = await this.collection()
      .where('email', '==', email.toLowerCase())
      .limit(1)
      .get();

    return snapshot.empty ? null : snapshot.docs[0].data();
  }

  async findByPhone(phone: string): Promise<FirestoreUserDocument | null> {
    const snapshot = await this.collection().where('phone', '==', phone).limit(1).get();

    return snapshot.empty ? null : snapshot.docs[0].data();
  }

  async findMany(filter: UserFilterDto) {
    const cacheKey = `users-list:${JSON.stringify(filter)}`;
    const cached = await this.cacheService.get<any>(cacheKey);
    
    if (cached) {
      this.logger.log(`Cache hit for users list`);
      return cached;
    }
    
    let query: Query<FirestoreUserDocument> = this.collection();

    if (filter.role) {
      query = query.where('role', '==', filter.role);
    }

    if (filter.status) {
      query = query.where('status', '==', filter.status);
    }

    const startIndex = (filter.page - 1) * filter.limit;
    let items: FirestoreUserDocument[];
    let total: number;

    if (filter.search) {
      // Substring search can't run in Firestore — scan the role/status-filtered set.
      const snapshot = await query.get();
      this.logger.log(`Firestore read (search scan): ${snapshot.docs.length} users`);
      const search = filter.search.toLowerCase();
      let matched = snapshot.docs.map((doc) => doc.data());
      matched = matched.filter((user) =>
        [user.name, user.email, user.phone]
          .filter((value): value is string => typeof value === 'string')
          .some((value) => value.toLowerCase().includes(search)),
      );
      if (!filter.includeDeleted) {
        matched = matched.filter((user) => !user.deletedAt);
      }
      total = matched.length;
      items = matched.slice(startIndex, startIndex + filter.limit);
    } else {
      // Bounded: page server-side via count() + offset/limit.
      const [countSnap, pageSnap] = await Promise.all([
        query.count().get(),
        query.offset(startIndex).limit(filter.limit).get(),
      ]);
      total = countSnap.data().count;
      items = pageSnap.docs.map((doc) => doc.data());
      // deletedAt is optional/absent on docs, so it can't be excluded in the query.
      // Drop any soft-deleted rows that landed in this page (rare in practice).
      if (!filter.includeDeleted) {
        items = items.filter((user) => !user.deletedAt);
      }
    }

    const result = {
      items,
      meta: {
        page: filter.page,
        limit: filter.limit,
        total,
      },
    };
    
    // Cache for 3 minutes
    await this.cacheService.set(cacheKey, result, 3 * 60 * 1000);
    
    return result;
  }

  async getByUid(uid: string): Promise<FirestoreUserDocument> {
    // findByUid already has caching, so this will benefit from it
    const user = await this.findByUid(uid);
    if (!user) {
      throw new NotFoundException(`User ${uid} not found.`);
    }

    return user;
  }

  async updateOwnProfile(uid: string, dto: UpdateProfileDto): Promise<FirestoreUserDocument> {
    const existing = await this.getByUid(uid);
    
    // Convert LocationDto to plain object if present
    const locationPlain = dto.location 
      ? { lat: dto.location.lat, lng: dto.location.lng }
      : undefined;
    
    const profileData: UserProfileData = {
      ...existing.profileData,
      ...(dto.name ? { name: dto.name } : {}),
      ...(dto.language ? { language: dto.language } : {}),
      ...(locationPlain ? { location: locationPlain } : {}),
      ...(dto.address ? { address: dto.address } : {}),
      ...(dto.dob ? { dob: dto.dob } : {}),
      ...(dto.phone ? { phone: dto.phone } : {}),
      ...(dto.profilePhoto ? { photoUrl: dto.profilePhoto } : {}),
    };

    const updatedUser: FirestoreUserDocument = {
      ...existing,
      ...(dto.name ? { name: dto.name } : {}),
      ...(dto.email ? { email: dto.email.toLowerCase() } : {}),
      profileData,
      updatedAt: new Date().toISOString(),
    };

    await this.collection().doc(uid).set(updatedUser, { merge: true });
    
    // Invalidate caches
    await this.cacheService.delete(`user:${uid}`);
    await this.cacheService.deletePattern('users-list:.*');
    
    return updatedUser;
  }

  async setLanguage(uid: string, dto: SetLanguageDto): Promise<FirestoreUserDocument> {
    return this.updateOwnProfile(uid, {
      language: dto.language,
    });
  }

  async updateStatus(uid: string, dto: UpdateUserStatusDto): Promise<FirestoreUserDocument> {
    const existing = await this.getByUid(uid);
    const verification: VerificationState = {
      ...existing.verification,
      ...(dto.isVerified !== undefined ? { isVerified: dto.isVerified } : {}),
    };

    const updatedUser: FirestoreUserDocument = {
      ...existing,
      status: dto.status,
      adminApproval: dto.adminApproval ?? existing.adminApproval,
      verification,
      updatedAt: new Date().toISOString(),
    };

    await this.collection().doc(uid).set(updatedUser, { merge: true });
    
    // Invalidate caches
    await this.cacheService.delete(`user:${uid}`);
    await this.cacheService.deletePattern('users-list:.*');
    
    return updatedUser;
  }

  async softDelete(uid: string): Promise<{ deleted: true }> {
    const existing = await this.getByUid(uid);
    await this.collection()
      .doc(uid)
      .set(
        {
          ...existing,
          status: 'suspended',
          deletedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );

    // Invalidate caches
    await this.cacheService.delete(`user:${uid}`);
    await this.cacheService.deletePattern('users-list:.*');

    return { deleted: true };
  }

  async updateAuthCredentials(
    uid: string,
    credentials: Partial<UserAuthCredentials>,
  ): Promise<void> {
    const existing = await this.getByUid(uid);
    const updatedUser: FirestoreUserDocument = {
      ...existing,
      authCredentials: {
        ...existing.authCredentials,
        ...credentials,
      },
      updatedAt: new Date().toISOString(),
    };

    await this.collection().doc(uid).set(updatedUser, { merge: true });
    
    // Invalidate caches
    await this.cacheService.delete(`user:${uid}`);
    await this.cacheService.deletePattern('users-list:.*');
  }

  async findByResetToken(resetToken: string): Promise<FirestoreUserDocument | null> {
    const snapshot = await this.collection()
      .where('authCredentials.resetToken', '==', resetToken)
      .limit(1)
      .get();

    return snapshot.empty ? null : snapshot.docs[0].data();
  }

  private collection(): CollectionReference<FirestoreUserDocument> {
    const usersCollection: CollectionReference<FirestoreUserDocument> = this.firebaseAdminService
      .firestore()
      .collection(ROOT_COLLECTIONS.users);

    return usersCollection;
  }

  private assertIdentityFields(email?: string, phone?: string): void {
    if (!email && !phone) {
      throw new BadRequestException('Either email or phone is required.');
    }
  }

  private buildUserDocument(uid: string, dto: CreateUserDto): FirestoreUserDocument {
    const now = new Date().toISOString();
    const passwordHash = dto.password ? hashPassword(dto.password) : undefined;

    return {
      uid,
      role: dto.role,
      status: dto.status ?? (dto.role === 'customer' ? 'active' : 'pending'),
      name: dto.name,
      email: dto.email?.toLowerCase() ?? null,
      phone: dto.phone ?? null,
      authProvider: dto.phone ? 'phone' : 'email',
      profileData: {
        name: dto.name,
        language: dto.language,
        location: dto.location,
      },
      verification: {
        isVerified: dto.isVerified ?? false,
        documents:
          dto.verificationDocuments?.map((document) => ({
            type: document.type,
            url: document.url,
          })) ?? [],
      },
      adminApproval: dto.adminApproval ?? dto.role === 'customer',
      permissions: dto.permissions,
      authCredentials: passwordHash ? { passwordHash } : undefined,
      createdAt: now,
      updatedAt: now,
      lastLogin: null,
    };
  }
}

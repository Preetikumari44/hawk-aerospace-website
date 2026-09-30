import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { Query } from 'firebase-admin/firestore';

import { CacheService } from '../../common/cache/cache.service';
import { ROOT_COLLECTIONS } from '../../common/constants/collection-paths.constant';
import type { AppRole } from '../../common/constants/roles.constant';
import type { CurrentUser } from '../../common/interfaces/current-user.interface';
import type { FirestoreUserDocument } from '../../database/firestore/contracts';
import { FirebaseAdminService } from '../../firebase/firebase-admin.service';
import { WS_EVENTS } from '../../gateway/events/event.constants';
import { UsersService } from '../users/users.service';
import {
  RoleApplicationDocument,
  RoleApplicationSummary,
} from './interfaces/role-application.interface';
import { SubmitRoleApplicationDto } from './dto/submit-role-application.dto';
import {
  SubmitGuestRoleApplicationDto,
  toSubmitDto,
} from './dto/submit-guest-application.dto';
import {
  ReviewRoleApplicationDto,
  RoleApplicationQueryDto,
} from './dto/review-role-application.dto';

const ROLE_APPLICATIONS_COLLECTION = ROOT_COLLECTIONS.roleApplications;

/** Roles a self-service user can apply for from the Accounts screen. */
export const APPLICABLE_TARGET_ROLES: AppRole[] = [
  'pilot',
  'aggregator',
  'fleet_manager',
  'technician',
];

@Injectable()
export class RoleApplicationsService {
  private readonly logger = new Logger(RoleApplicationsService.name);

  constructor(
    private readonly firebaseAdminService: FirebaseAdminService,
    private readonly usersService: UsersService,
    private readonly cacheService: CacheService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Submit a role application for admin approval.
   * A user can only have ONE pending/approved application per role at a time.
   */
  async submit(dto: SubmitRoleApplicationDto, user: CurrentUser): Promise<RoleApplicationDocument> {
    const targetRole = dto.role as AppRole;
    if (!APPLICABLE_TARGET_ROLES.includes(targetRole)) {
      throw new BadRequestException(`Role '${dto.role}' cannot be applied for.`);
    }

    const db = this.firebaseAdminService.firestore();
    const userDoc = await this.usersService.getByUid(user.uid);

    if (userDoc.role === targetRole) {
      throw new BadRequestException(`You are already a ${this.roleLabel(targetRole)}.`);
    }

    const approvedRoles: AppRole[] = userDoc.approvedRoles ?? ['customer'];
    if (approvedRoles.includes(targetRole)) {
      throw new ConflictException(
        `You already have access to the ${this.roleLabel(targetRole)} role.`,
      );
    }

    // Block duplicate pending applications for the same target role.
    const existingPending = await db
      .collection(ROLE_APPLICATIONS_COLLECTION)
      .where('uid', '==', user.uid)
      .where('role', '==', targetRole)
      .where('status', '==', 'pending')
      .limit(1)
      .get();

    if (!existingPending.empty) {
      const existing = existingPending.docs[0].data() as RoleApplicationDocument;
      throw new ConflictException(
        `You already have a pending ${this.roleLabel(targetRole)} application (${
          existing.applicationId
        }). Please wait for admin review.`,
      );
    }

    const now = new Date().toISOString();
    const applicationId = db.collection(ROLE_APPLICATIONS_COLLECTION).doc().id;

    // Convert documents to plain JavaScript objects so Firestore can serialize them without class prototype errors.
    // Firebase-only policy: reject any document pointing at local disk (/files/uploads/...).
    const plainDocuments = Array.isArray(dto.documents)
      ? dto.documents.map((d: any) => {
          const downloadUrl =
            d.downloadUrl || d.url || d.uri ? String(d.downloadUrl || d.url || d.uri) : undefined;
          const mimeType =
            d.mimeType || d.contentType ? String(d.mimeType || d.contentType) : undefined;
          if (downloadUrl && downloadUrl.startsWith('/files/')) {
            throw new BadRequestException(
              'Document upload did not reach Firebase Storage (got a local /files/ URL). ' +
                'Fix Firebase Storage bucket configuration and re-upload. Local storage is disabled.',
            );
          }
          return {
            type: String(d.type || ''),
            name: d.name ? String(d.name) : undefined,
            number: d.number ? String(d.number) : undefined,
            storagePath: d.storagePath ? String(d.storagePath) : undefined,
            downloadUrl,
            fileName: d.fileName ? String(d.fileName) : undefined,
            mimeType,
            fileSize:
              typeof d.fileSize === 'number'
                ? d.fileSize
                : d.fileSize != null && !isNaN(Number(d.fileSize))
                  ? Number(d.fileSize)
                  : undefined,
            fileId: d.fileId ? String(d.fileId) : undefined,
          };
        })
      : [];

    const referralCode = (dto as { referralCode?: string }).referralCode
      ? String((dto as { referralCode?: string }).referralCode).toUpperCase().trim()
      : null;
    let referredByUid: string | null = null;
    if (referralCode) {
      try {
        const codeSnap = await db.collection(ROOT_COLLECTIONS.referralCodes).doc(referralCode).get();
        if (codeSnap.exists) {
          referredByUid = (codeSnap.data() as { ownerUid?: string }).ownerUid ?? null;
        }
      } catch {
        referredByUid = null;
      }
    }

    const application: RoleApplicationDocument = {
      applicationId,
      uid: user.uid,
      name: this.asString(dto.formData?.name) || userDoc.name || null,
      email: this.asString(dto.formData?.email) || userDoc.email || null,
      phone: this.asString(dto.formData?.phone) || userDoc.phone || null,
      referralCode,
      referredByUid,
      role: targetRole,
      roleLabel: dto.roleLabel || this.roleLabel(targetRole),
      currentRole: userDoc.role,
      formData: dto.formData ? JSON.parse(JSON.stringify(dto.formData)) : {},
      documents: plainDocuments,
      status: 'pending',
      submittedAt: now,
      updatedAt: now,
      reviewedBy: null,
      reviewedAt: null,
      remarks: null,
      rejectionReason: null,
      lastRoleApplicationId: null,
    };

    await db.collection(ROLE_APPLICATIONS_COLLECTION).doc(applicationId).set(application);

    // Sync into the respective role's incoming request collection
    try {
      await this.syncIncomingRequestForRole(application, dto.formData, user.uid);
    } catch (err) {
      this.logger.error(`Failed to sync role application into role collection: ${err}`);
    }

    this.logger.log(
      `Role application ${applicationId} submitted by ${user.uid} for role ${targetRole}`,
    );

    this.eventEmitter.emit(WS_EVENTS.ROLE_APPLICATION_SUBMITTED, {
      applicationId,
      uid: user.uid,
      name: application.name,
      role: targetRole,
      timestamp: now,
    });

    // Refer & Earn: link / create the invite record for this application.
    if (referralCode) {
      this.eventEmitter.emit('referral.applied.attach', {
        inviteeUid: user.uid,
        applicationId,
        code: referralCode,
      });
    }

    return application;
  }

  /**
   * No-login application from a Refer & Earn invite link.
   * The caller proves phone ownership with a Firebase ID token obtained from
   * the in-form OTP step (no backend session exists yet). A minimal `customer`
   * user doc is created on first submit so the later admin `review()` — which
   * grants roles via a user-doc transaction — works unchanged. On approval the
   * applicant logs in with a normal OTP and switches to the granted role.
   */
  async submitGuest(dto: SubmitGuestRoleApplicationDto): Promise<RoleApplicationDocument> {
    const targetRole = dto.role as AppRole;
    if (!APPLICABLE_TARGET_ROLES.includes(targetRole)) {
      throw new BadRequestException(`Role '${dto.role}' cannot be applied for.`);
    }

    const code = String(dto.referralCode ?? '').toUpperCase().trim();
    if (!code) {
      throw new BadRequestException('A referral code is required to apply without logging in.');
    }

    // 1. Phone ownership: verify the Firebase ID token from the in-form OTP.
    let tokenUid: string;
    let tokenPhone: string | null;
    try {
      const decoded = await this.firebaseAdminService.verifyIdToken(dto.firebaseIdToken);
      tokenUid = decoded.uid;
      tokenPhone = (decoded as { phone_number?: string }).phone_number ?? null;
    } catch {
      throw new BadRequestException('Phone verification expired. Please verify the OTP again.');
    }
    if (!tokenPhone) {
      throw new BadRequestException('This sign-in method has no verified phone number.');
    }
    const tokenDigits = tokenPhone.replace(/\D/g, '');
    const claimedDigits = String(dto.phone ?? '').replace(/\D/g, '');
    const match =
      tokenDigits === claimedDigits ||
      tokenDigits.endsWith(claimedDigits) ||
      claimedDigits.endsWith(tokenDigits);
    if (!match) {
      throw new BadRequestException('Verified phone number does not match the application phone.');
    }
    const phone = tokenDigits.length === 12 && tokenDigits.startsWith('91')
      ? `+${tokenDigits}`
      : `+${tokenDigits}`;

    // 2. The invite code must exist and allow this target role (matrix enforced).
    const db = this.firebaseAdminService.firestore();
    const codeSnap = await db.collection(ROOT_COLLECTIONS.referralCodes).doc(code).get();
    if (!codeSnap.exists || !codeSnap.data()?.isActive) {
      throw new BadRequestException('This invite link is invalid or expired.');
    }
    const codeTargets = (codeSnap.data()?.targetRoles ?? []) as string[];
    if (!codeTargets.includes(targetRole)) {
      throw new ForbiddenException(
        `This invite is for ${codeTargets.join('/')} — not for ${this.roleLabel(targetRole)}.`,
      );
    }

    // 3. One pending application per phone + role (spam / duplicate guard).
    const dupPhone = await db
      .collection(ROLE_APPLICATIONS_COLLECTION)
      .where('phone', '==', phone)
      .where('role', '==', targetRole)
      .where('status', '==', 'pending')
      .limit(1)
      .get();
    if (!dupPhone.empty) {
      throw new ConflictException(
        `This number already has a pending ${this.roleLabel(targetRole)} application. Please wait for admin review.`,
      );
    }

    // 4. Ensure a user doc exists so review() + reward hooks work unchanged.
    let userDoc: FirestoreUserDocument | null = null;
    try {
      userDoc = await this.usersService.getByUid(tokenUid);
    } catch {
      userDoc = null;
    }
    if (!userDoc) {
      const byPhone = await this.usersService.findByPhone(phone).catch(() => null);
      if (byPhone) {
        userDoc = byPhone;
        tokenUid = byPhone.uid;
      }
    }
    if (!userDoc) {
      const now = new Date().toISOString();
      const created: FirestoreUserDocument = {
        uid: tokenUid,
        role: 'customer',
        roles: ['customer'],
        primaryRole: 'customer',
        approvedRoles: ['customer'],
        status: 'pending',
        name: this.asString(dto.formData?.name),
        email: this.asString(dto.formData?.email) || null,
        phone,
        authProvider: 'phone',
        profileData: {
          name: this.asString(dto.formData?.name),
          photoUrl: null,
          language: 'en',
          timezone: 'Asia/Kolkata',
          preferences: {},
        },
        verification: {
          isVerified: false,
          emailVerified: false,
          phoneVerified: true,
          kycStatus: 'pending',
          documents: [],
        },
        adminApproval: false,
        createdAt: now,
        updatedAt: now,
        lastLogin: null,
      };
      await db.collection(ROOT_COLLECTIONS.users).doc(tokenUid).set(created);
      await this.cacheService.delete(`user:${tokenUid}`).catch(() => undefined);
      userDoc = created;
    }

    // 5. Reuse the standard pipeline (validation, role sync, referral attach,
    //    WS events). Application phone is stored normalized for dup checks.
    const submitDto = toSubmitDto(dto);
    submitDto.formData = { ...(dto.formData ?? {}), phone };
    const guestUser = {
      uid: userDoc.uid,
      role: 'customer' as AppRole,
      status: userDoc.status,
      phone: userDoc.phone ?? phone,
    } as CurrentUser;
    return this.submit(submitDto, guestUser);
  }

  /** All applications for the current user, newest first. */
  async getMyApplications(user: CurrentUser): Promise<RoleApplicationDocument[]> {
    const db = this.firebaseAdminService.firestore();
    const snapshot = await db
      .collection(ROLE_APPLICATIONS_COLLECTION)
      .where('uid', '==', user.uid)
      .orderBy('submittedAt', 'desc')
      .limit(20)
      .get();

    return snapshot.docs.map((doc) => doc.data() as RoleApplicationDocument);
  }

  /** Latest application for a specific target role (or null if never applied). */
  async getMyApplicationForRole(
    uid: string,
    role: AppRole,
  ): Promise<RoleApplicationDocument | null> {
    const db = this.firebaseAdminService.firestore();
    const snapshot = await db
      .collection(ROLE_APPLICATIONS_COLLECTION)
      .where('uid', '==', uid)
      .where('role', '==', role)
      .orderBy('submittedAt', 'desc')
      .limit(1)
      .get();

    return snapshot.empty ? null : (snapshot.docs[0].data() as RoleApplicationDocument);
  }

  /** List applications for the admin dashboard with filters + pagination. */
  async listAdmin(query: RoleApplicationQueryDto, admin: CurrentUser): Promise<{
    applications: RoleApplicationSummary[];
    total: number;
    page: number;
    limit: number;
  }> {
    const db = this.firebaseAdminService.firestore();
    let ref: Query = db.collection(ROLE_APPLICATIONS_COLLECTION);

    if (query.status) {
      ref = ref.where('status', '==', query.status);
    }
    if (query.role) {
      ref = ref.where('role', '==', this.normalizeRole(query.role));
    }

    const page = Math.max(1, parseInt(query.page ?? '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit ?? '20', 10) || 20));

    const countSnap = await ref.count().get();
    const total = countSnap.data().count;

    const snapshot = await ref
      .orderBy('submittedAt', 'desc')
      .offset((page - 1) * limit)
      .limit(limit)
      .get();

    let items = snapshot.docs.map((doc) => doc.data() as RoleApplicationDocument);

    if (query.search) {
      const term = query.search.toLowerCase();
      items = items.filter((app: RoleApplicationDocument) =>
        app.name?.toLowerCase().includes(term) ||
        app.email?.toLowerCase().includes(term) ||
        app.phone?.toLowerCase().includes(term) ||
        app.roleLabel?.toLowerCase().includes(term),
      );
    }

    const summaries: RoleApplicationSummary[] = items.map((app: RoleApplicationDocument) => ({
      applicationId: app.applicationId,
      uid: app.uid,
      name: app.name ?? null,
      email: app.email ?? null,
      phone: app.phone ?? null,
      role: app.role,
      roleLabel: app.roleLabel ?? null,
      currentRole: app.currentRole ?? null,
      status: app.status,
      submittedAt: app.submittedAt,
      reviewedAt: app.reviewedAt ?? null,
      remarks: app.status === 'rejected' ? (app.rejectionReason ?? app.remarks ?? null) : null,
      documentCount: Array.isArray(app.documents) ? app.documents.length : 0,
    }));

    this.logger.log(
      `Admin ${admin.uid} listed role applications (status=${query.status ?? 'all'}, total=${total})`,
    );

    return { applications: summaries, total, page, limit };
  }

  /** Get a single application by id. */
  async getById(applicationId: string): Promise<RoleApplicationDocument> {
    const db = this.firebaseAdminService.firestore();
    const doc = await db.collection(ROLE_APPLICATIONS_COLLECTION).doc(applicationId).get();
    if (!doc.exists) {
      throw new NotFoundException(`Role application ${applicationId} not found`);
    }
    return doc.data() as RoleApplicationDocument;
  }

  /**
   * Approve/reject a role application.
   * Approving grants the applicant the target role (roles + approvedRoles) and
   * refreshes their cached user doc so /auth/switch-role will allow the switch.
   */
  async review(
    applicationId: string,
    dto: ReviewRoleApplicationDto,
    admin: CurrentUser,
  ): Promise<RoleApplicationDocument> {
    const db = this.firebaseAdminService.firestore();
    const app = await this.getById(applicationId);

    if (app.status !== 'pending') {
      throw new BadRequestException(`Application has already been ${app.status}.`);
    }

    if (!dto.approved && !dto.rejectionReason && !dto.remarks) {
      throw new BadRequestException('A rejection reason is required when rejecting an application.');
    }

    const now = new Date().toISOString();
    const updateData: Partial<RoleApplicationDocument> = {
      status: dto.approved ? 'approved' : 'rejected',
      reviewedBy: admin.uid,
      reviewedAt: now,
      remarks: dto.remarks ?? null,
      updatedAt: now,
    };

    if (!dto.approved) {
      updateData.rejectionReason = dto.rejectionReason ?? dto.remarks ?? 'Rejected';
    }

    if (dto.approved) {
      this.logger.log(
        `Admin ${admin.uid} approved role application ${applicationId} (${app.role}) for ${app.uid}`,
      );

      // Grant the role to the user atomically with the application update.
      await db.runTransaction(async (transaction) => {
        const userRef = db.collection(ROOT_COLLECTIONS.users).doc(app.uid);
        const userSnap = await transaction.get(userRef);
        const userData = (userSnap.data() ?? {}) as FirestoreUserDocument;

        const roles = Array.isArray(userData.roles) ? [...userData.roles] : [userData.role ?? 'customer'];
        if (!roles.includes(app.role)) roles.push(app.role);

        const approvedRoles = Array.isArray(userData.approvedRoles)
          ? [...userData.approvedRoles]
          : ['customer'];
        if (!approvedRoles.includes(app.role)) approvedRoles.push(app.role);

        transaction.update(userRef, {
          roles,
          approvedRoles,
          status: 'active',
          adminApproval: true,
          updatedAt: now,
          verification: {
            ...(userData.verification ?? {}),
            isVerified: true,
            kycStatus: 'approved',
          },
        });

        transaction.update(db.collection(ROLE_APPLICATIONS_COLLECTION).doc(applicationId), updateData);
      });

      // Auto-create the role-specific document (pilots/aggregators/...) if missing.
      await this.autoCreateRoleDocument(app.uid, app.role, app);

      await this.cacheService.delete(`user:${app.uid}`);

      // Sync approved status to role request collection
      await this.syncRoleRequestReviewStatus(applicationId, app.role, true, dto.remarks);

      this.eventEmitter.emit(WS_EVENTS.ROLE_APPLICATION_UPDATED, {
        applicationId,
        uid: app.uid,
        role: app.role,
        status: 'approved',
        remarks: dto.remarks ?? null,
        timestamp: now,
      });

      // Refer & Earn (Case 1): admin approval is the reward trigger for
      // non-customer invites (pilot/FM/tech/sales-agg).
      this.eventEmitter.emit('referral.role.approved', {
        uid: app.uid,
        role: app.role,
        applicationId,
      });

      return this.getById(applicationId);
    }

    await db.collection(ROLE_APPLICATIONS_COLLECTION).doc(applicationId).update(updateData);

    // Sync rejected status to role request collection
    await this.syncRoleRequestReviewStatus(
      applicationId,
      app.role,
      false,
      updateData.rejectionReason ?? dto.remarks,
    );

    this.logger.log(
      `Admin ${admin.uid} rejected role application ${applicationId} (${app.role}) for ${app.uid}`,
    );

    this.eventEmitter.emit(WS_EVENTS.ROLE_APPLICATION_UPDATED, {
      applicationId,
      uid: app.uid,
      role: app.role,
      status: 'rejected',
      remarks: updateData.rejectionReason ?? null,
      timestamp: now,
    });

    return this.getById(applicationId);
  }

  // ─────────────────────────────────────────────────────────────
  // PRIVATE HELPERS
  // ─────────────────────────────────────────────────────────────

  private roleLabel(role: AppRole): string {
    switch (role) {
      case 'pilot':
        return 'Drone Pilot';
      case 'aggregator':
        return 'Sales Aggregator';
      case 'fleet_manager':
        return 'Fleet Manager';
      case 'technician':
        return 'Technician';
      default:
        return role;
    }
  }

  normalizeRole(role: string): AppRole {
    const normalized = role.toLowerCase();
    if (normalized === 'sales') return 'aggregator';
    if (normalized === 'fleet' || normalized === 'fm') return 'fleet_manager';
    return normalized as AppRole;
  }

  private asString(value: unknown): string {
    return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
  }

  /**
   * Creates a minimal role-specific document (mirrors AuthService so that the
   * newly approved user has a pilots/aggregators/fleet_managers/technicians doc).
   */
  private async autoCreateRoleDocument(uid: string, role: AppRole, app?: RoleApplicationDocument): Promise<void> {
    const db = this.firebaseAdminService.firestore();
    const now = new Date().toISOString();

    const roleCollectionMap: Record<string, string> = {
      pilot: 'pilots',
      technician: 'technicians',
      fleet_manager: 'fleet_managers',
      vendor: 'fleet_managers',
      aggregator: 'aggregators',
      customer: 'customers',
    };

    const collectionName = roleCollectionMap[role];
    if (!collectionName) return;

    const roleDocRef = db.collection(collectionName).doc(uid);
    const roleDoc = await roleDocRef.get();
    const existing = roleDoc.exists ? (roleDoc.data() ?? {}) as Record<string, unknown> : {};

    // Pull identity + booking-critical fields from the approved application so
    // the doc is listable (admin/pilots) and bookable (matching needs
    // serviceTypes) immediately after approval.
    const form = (app?.formData ?? {}) as Record<string, unknown>;
    const str = (v: unknown): string | undefined => {
      const s = this.asString(v).trim();
      return s ? s : undefined;
    };
    const num = (v: unknown): number | undefined => {
      if (typeof v === 'number' && !isNaN(v)) return v;
      if (typeof v === 'string' && v.trim() !== '' && !isNaN(Number(v))) return Number(v);
      return undefined;
    };
    const strList = (v: unknown): string[] | undefined => {
      if (Array.isArray(v)) {
        const list = v.map((x) => String(x).trim()).filter(Boolean);
        return list.length ? list : undefined;
      }
      if (typeof v === 'string' && v.trim()) {
        const list = v.split(',').map((x) => x.trim()).filter(Boolean);
        return list.length ? list : undefined;
      }
      return undefined;
    };
    // Backward compat: legacy applications stored `specializations` — merge
    // them (lowercased) into serviceTypes so old pilots stay matchable.
    const legacySpecs = strList((form as any).specializations) ?? [];
    const serviceTypes = [...(strList(form.serviceTypes) ?? []), ...legacySpecs.map((s) => s.toLowerCase())];
    const dedupedServiceTypes = [...new Set(serviceTypes)];

    if (!roleDoc.exists) {
      let roleSpecificData: Record<string, unknown> = {};

      switch (role) {
        case 'pilot': {
          const fullName = app?.name || str(form.name);
          const mobile = app?.phone || str(form.phone);
          const email = app?.email || str(form.email);
          const expYears = num((form as any).experienceYears);
          const expMonths = num((form as any).experienceMonths);
          const expText =
            expYears !== undefined || expMonths !== undefined
              ? `${expYears ?? 0} yrs ${expMonths ?? 0} mos`
              : (str(form.experience) ?? undefined);
          roleSpecificData = {
            uid,
            pilotId: uid,
            fullName: fullName ?? 'Pilot Applicant',
            name: fullName ?? 'Pilot Applicant',
            mobile: mobile ?? '',
            phone: mobile ?? '',
            email: email ?? '',
            address: str(form.address),
            state: str(form.state),
            district: str(form.district),
            licenseNumber: str(form.pilotLicenseNumber),
            aadhaarNumber: str(form.aadhar),
            panNumber: str(form.pan),
            experience: expText,
            experienceYears: expYears ?? null,
            experienceMonths: expMonths ?? null,
            experienceText: expText ?? null,
            resumeUrl: str((form as any).resumeUrl) ?? null,
            resumeName: str((form as any).resumeName) ?? null,
            resumeStoragePath: str((form as any).resumeStoragePath) ?? null,
            serviceTypes: dedupedServiceTypes,
            documents: app?.documents ?? [],
            managedByFleetManagerUid: null,
            assignedVendorUid: null,
            status: 'AVAILABLE',
            isAvailable: true,
            isOnline: false,
            totalMissions: 0,
            completedMissions: 0,
            cancelledMissions: 0,
            totalEarnings: 0,
            rating: 0,
            safetyScore: 100,
            averageRating: 0,
            totalFlightDistance: 0,
            onTimePercentage: 0,
            approvedBy: app?.reviewedBy ?? null,
          };
          break;
        }
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
            region: 'Asia/Kolkata',
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
    } else {
      // Backfill skeletal docs created by older approvals (missing identity /
      // booking fields) so they become listable and bookable.
      const backfill: Record<string, unknown> = { updatedAt: now };
      if (role === 'pilot' && app) {
        const form2 = (app.formData ?? {}) as Record<string, unknown>;
        const put = (k: string, v: unknown) => {
          if (v !== undefined && existing[k] === undefined) backfill[k] = v;
        };
        const fullName = app.name || str(form2.name);
        const mobile = app.phone || str(form2.phone);
        const email = app.email || str(form2.email);
        put('pilotId', uid);
        put('fullName', fullName ?? 'Pilot Applicant');
        put('name', fullName ?? 'Pilot Applicant');
        put('mobile', mobile ?? '');
        put('phone', mobile ?? '');
        put('email', email ?? '');
        put('address', str(form2.address));
        put('licenseNumber', str(form2.pilotLicenseNumber));
        put('serviceTypes', dedupedServiceTypes.length ? dedupedServiceTypes : (strList(form2.serviceTypes) ?? []));
        put('experienceYears', num((form2 as any).experienceYears));
        put('experienceMonths', num((form2 as any).experienceMonths));
        put('resumeUrl', str((form2 as any).resumeUrl));
        put('resumeName', str((form2 as any).resumeName));
        put('documents', app.documents ?? []);
        put('managedByFleetManagerUid', null);
        if (existing.status === 'available') backfill.status = 'AVAILABLE';
        else put('status', 'AVAILABLE');
      }
      await roleDocRef.set(backfill, { merge: true });
    }
  }

  /**
   * Sync incoming application to role-specific request collection so each Admin
   * section (PilotsScreen, SalesAggregatorsScreen, FleetManagementScreen, TechnicianManagementScreen)
   * receives and displays the application in its 'Incoming Requests' tab.
   */
  private async syncIncomingRequestForRole(
    application: RoleApplicationDocument,
    formData: Record<string, unknown>,
    uid: string,
  ): Promise<void> {
    const db = this.firebaseAdminService.firestore();
    const now = application.submittedAt || new Date().toISOString();

    switch (application.role) {
      case 'pilot': {
        const docs = Array.isArray(application.documents) ? application.documents : [];
        const findDocNumber = (docId: string) => {
          const doc = docs.find((d: any) => d.type === docId);
          return doc?.number ? String(doc.number) : null;
        };
        const toStrList = (v: unknown): string[] => {
          if (Array.isArray(v)) return v.map((s) => String(s).trim()).filter(Boolean);
          if (typeof v === 'string' && v) return String(v).split(',').map((s: string) => s.trim()).filter(Boolean);
          return [];
        };
        const legacySpecs = toStrList((formData as any).specializations).map((s) => s.toLowerCase());
        const mergedServiceTypes = [...new Set([...toStrList(formData.serviceTypes), ...legacySpecs])];
        const expYearsRaw = (formData as any).experienceYears;
        const expMonthsRaw = (formData as any).experienceMonths;
        const expYears = expYearsRaw !== undefined && expYearsRaw !== '' ? Number(expYearsRaw) : null;
        const expMonths = expMonthsRaw !== undefined && expMonthsRaw !== '' ? Number(expMonthsRaw) : null;
        const expText =
          expYears !== null || expMonths !== null
            ? `${expYears ?? 0} yrs ${expMonths ?? 0} mos`
            : this.asString(formData.experience) || 'N/A';
        const pilotReqData = {
          id: application.applicationId,
          requestId: application.applicationId,
          uid,
          firebaseUid: uid,
          fullName: application.name || 'Drone Pilot Applicant',
          name: application.name || 'Drone Pilot Applicant',
          mobile: application.phone || '',
          phone: application.phone || '',
          email: application.email || '',
          preferredLocation: this.asString(formData.address) || 'N/A',
          address: this.asString(formData.address) || 'N/A',
          licenseNumber: this.asString(formData.pilotLicenseNumber) || null,
          hasLicense: !!formData.pilotLicenseNumber,
          aadhaarNumber: findDocNumber('aadhaar') || this.asString(formData.aadhar) || null,
          panNumber: findDocNumber('pan') || this.asString(formData.pan) || null,
          experience: expText,
          experienceYears: expYears,
          experienceMonths: expMonths,
          experienceText: expText,
          resumeUrl: this.asString((formData as any).resumeUrl) || null,
          resumeName: this.asString((formData as any).resumeName) || null,
          resumeStoragePath: this.asString((formData as any).resumeStoragePath) || null,
          serviceTypes: mergedServiceTypes,
          flightHours: 0,
          status: 'PENDING',
          documents: application.documents,
          formData: application.formData || {},
          createdAt: now,
          updatedAt: now,
        };
        await db.collection(ROOT_COLLECTIONS.pilotRequests).doc(application.applicationId).set(pilotReqData);
        break;
      }
      case 'aggregator': {
        const saReqData = {
          id: application.applicationId,
          aggregatorUid: uid,
          businessName: this.asString(formData.businessName) || application.name || 'Sales Aggregator',
          contactPerson: application.name || 'Sales Aggregator Applicant',
          phone: application.phone || '',
          mobile: application.phone || '',
          email: application.email || '',
          address: this.asString(formData.address) || 'N/A',
          state: this.asString(formData.state) || 'N/A',
          region: this.asString(formData.region) || 'N/A',
          status: 'pending',
          documents: application.documents,
          formData: application.formData || {},
          createdAt: now,
          updatedAt: now,
        };
        await db.collection('salesAggregatorRequests').doc(application.applicationId).set(saReqData);
        break;
      }
      case 'fleet_manager': {
        const fmReqData = {
          id: application.applicationId,
          uid,
          name: application.name,
          fullName: application.name,
          phone: application.phone || '',
          mobile: application.phone || '',
          email: application.email || '',
          address: this.asString(formData.address) || 'N/A',
          region: this.asString(formData.region) || 'N/A',
          approvalStatus: 'PENDING',
          status: 'pending',
          documents: application.documents,
          formData: application.formData || {},
          createdAt: now,
          updatedAt: now,
        };
        await db.collection('fleet_managers').doc(application.applicationId).set(fmReqData);
        break;
      }
      case 'technician': {
        const techReqData = {
          id: application.applicationId,
          uid,
          name: application.name,
          fullName: application.name,
          phone: application.phone || '',
          mobile: application.phone || '',
          email: application.email || '',
          role: 'technician',
          address: this.asString(formData.address) || 'N/A',
          status: 'pending',
          approvalStatus: 'PENDING',
          adminApproval: false,
          documents: application.documents,
          formData: application.formData || {},
          verification: {
            isVerified: false,
            documents: application.documents,
          },
          createdAt: now,
          updatedAt: now,
        };
        await db.collection('technicians').doc(application.applicationId).set(techReqData);
        break;
      }
    }
  }

  /**
   * Sync review status back to role request records when an application is reviewed.
   */
  private async syncRoleRequestReviewStatus(
    applicationId: string,
    role: AppRole,
    approved: boolean,
    remarks?: string | null,
  ): Promise<void> {
    const db = this.firebaseAdminService.firestore();
    const now = new Date().toISOString();

    try {
      switch (role) {
        case 'pilot': {
          await db.collection(ROOT_COLLECTIONS.pilotRequests).doc(applicationId).set(
            {
              status: approved ? 'APPROVED' : 'REJECTED',
              rejectionReason: approved ? null : remarks || 'Rejected',
              updatedAt: now,
            },
            { merge: true },
          );
          break;
        }
        case 'aggregator': {
          await db.collection('salesAggregatorRequests').doc(applicationId).set(
            {
              status: approved ? 'approved' : 'rejected',
              rejectionReason: approved ? null : remarks || 'Rejected',
              updatedAt: now,
            },
            { merge: true },
          );
          break;
        }
        case 'fleet_manager': {
          await db.collection('fleet_managers').doc(applicationId).set(
            {
              approvalStatus: approved ? 'APPROVED' : 'REJECTED',
              status: approved ? 'active' : 'rejected',
              updatedAt: now,
            },
            { merge: true },
          );
          break;
        }
        case 'technician': {
          await db.collection('technicians').doc(applicationId).set(
            {
              approvalStatus: approved ? 'APPROVED' : 'REJECTED',
              status: approved ? 'active' : 'rejected',
              adminApproval: approved,
              updatedAt: now,
            },
            { merge: true },
          );
          break;
        }
      }
    } catch (err) {
      this.logger.error(`Error syncing role request review status: ${err}`);
    }
  }
}
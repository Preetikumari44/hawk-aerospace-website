import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { CollectionReference, Query } from 'firebase-admin/firestore';

import {
  ROOT_COLLECTIONS,
  USER_SUBCOLLECTIONS,
} from '../../common/constants/collection-paths.constant';
import { CacheService } from '../../common/cache/cache.service';
import type { CurrentUser } from '../../common/interfaces/current-user.interface';
import { collectFirestoreQueryInBatches } from '../../common/utils/firestore-cursor-pagination.util';
import type {
  FirestoreAdminActionDocument,
  FirestoreBookingDocument,
  FirestoreDroneDocument,
  FirestoreIncidentDocument,
  FirestoreServiceTicketDocument,
  FirestoreSubAdminDocument,
  FirestoreUserDocument,
} from '../../database/firestore/contracts';
import { FirebaseAdminService } from '../../firebase/firebase-admin.service';
import { UsersService } from '../users/users.service';
import { CreateSubAdminDto } from './dto/create-subadmin.dto';
import { SubAdminFilterDto } from './dto/subadmin-filter.dto';
import { UpdateSubAdminPermissionsDto } from './dto/update-subadmin-permissions.dto';
import { UpdateSubAdminScopeDto } from './dto/update-subadmin-scope.dto';
import { UpdateSubAdminDto } from './dto/update-subadmin.dto';
import { SUB_ADMIN_PERMISSION_MATRIX, normalizeSubAdminPermissions } from './subadmin-permissions';

interface ScopedUser extends FirestoreUserDocument {
  assignedRegion?: string | null;
  assignedState?: string | null;
}

interface ScopedBooking extends FirestoreBookingDocument {
  state?: string | null;
  addressState?: string | null;
}

@Injectable()
export class SubAdminService {
  private readonly logger = new Logger(SubAdminService.name);

  constructor(
    private readonly firebaseAdminService: FirebaseAdminService,
    private readonly usersService: UsersService,
    private readonly cacheService: CacheService,
  ) {}

  async create(dto: CreateSubAdminDto, user: CurrentUser): Promise<FirestoreSubAdminDocument> {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new BadRequestException('A user with this email already exists.');
    }

    const permissions = normalizeSubAdminPermissions(dto.permissions);
    const createdUser = await this.usersService.createUser({
      name: dto.name,
      role: 'subadmin',
      status: 'active',
      email: dto.email.toLowerCase(),
      phone: dto.mobile,
      password: dto.password,
      adminApproval: true,
      isVerified: true,
      permissions,
    });
    const now = new Date().toISOString();
    const subAdmin: FirestoreSubAdminDocument = {
      uid: createdUser.uid,
      name: dto.name,
      email: dto.email.toLowerCase(),
      mobile: dto.mobile,
      status: 'active',
      assignedRegion: dto.assignedRegion ?? null,
      assignedDepartment: dto.assignedDepartment ?? null,
      permissions,
      createdBy: user.uid,
      lastActive: null,
      createdAt: now,
      updatedAt: now,
    };

    await this.collection().doc(subAdmin.uid).set(subAdmin);
    return subAdmin;
  }

  async list(filter: SubAdminFilterDto) {
    const cacheKey = `subadmin-list:${JSON.stringify(filter)}`;
    const cached = await this.cacheService.get<any>(cacheKey);
    
    if (cached) {
      this.logger.log(`Cache hit for subadmin list`);
      return cached;
    }
    
    const snapshot = await this.collection().get();
    let items = snapshot.docs.map((doc) => doc.data());

    if (filter.status) {
      items = items.filter((item) => item.status === filter.status);
    }

    if (filter.assignedRegion) {
      items = items.filter((item) => item.assignedRegion === filter.assignedRegion);
    }

    if (filter.assignedDepartment) {
      items = items.filter((item) => item.assignedDepartment === filter.assignedDepartment);
    }

    if (filter.search) {
      const search = filter.search.toLowerCase();
      items = items.filter((item) =>
        [item.name, item.email, item.mobile].some((value) => value.toLowerCase().includes(search)),
      );
    }

    items = items.sort((left, right) =>
      String(right.createdAt ?? '').localeCompare(String(left.createdAt ?? '')),
    );
    const total = items.length;
    const startIndex = (filter.page - 1) * filter.limit;

    const result = {
      items: items.slice(startIndex, startIndex + filter.limit),
      meta: { page: filter.page, limit: filter.limit, total },
    };
    
    // Cache for 5 minutes
    await this.cacheService.set(cacheKey, result, 5 * 60 * 1000);
    
    return result;
  }

  async get(id: string): Promise<FirestoreSubAdminDocument> {
    const snapshot = await this.collection().doc(id).get();
    const subAdmin = snapshot.data();
    if (!snapshot.exists || !subAdmin) {
      throw new NotFoundException(`Sub-admin ${id} not found.`);
    }

    return subAdmin;
  }

  async update(id: string, dto: UpdateSubAdminDto): Promise<FirestoreSubAdminDocument> {
    const existing = await this.get(id);
    const permissions = dto.permissions
      ? normalizeSubAdminPermissions(dto.permissions)
      : existing.permissions;
    const updated: FirestoreSubAdminDocument = {
      ...existing,
      ...(dto.name ? { name: dto.name } : {}),
      ...(dto.email ? { email: dto.email.toLowerCase() } : {}),
      ...(dto.mobile ? { mobile: dto.mobile } : {}),
      ...(dto.status ? { status: dto.status } : {}),
      ...(dto.assignedRegion !== undefined ? { assignedRegion: dto.assignedRegion } : {}),
      ...(dto.assignedDepartment !== undefined
        ? { assignedDepartment: dto.assignedDepartment }
        : {}),
      permissions,
      updatedAt: new Date().toISOString(),
    };

    await this.collection().doc(id).set(updated, { merge: true });
    await this.syncUserRecord(id, updated);
    
    // Invalidate caches
    await this.cacheService.deletePattern('subadmin-list:.*');
    await this.cacheService.delete(`subadmin-managed-entities:${id}`);
    
    return updated;
  }

  async remove(id: string): Promise<{ deleted: true }> {
    const existing = await this.get(id);
    await this.collection()
      .doc(id)
      .set(
        {
          ...existing,
          status: 'inactive',
          deletedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );
    await this.usersService.updateStatus(id, {
      status: 'suspended',
      adminApproval: false,
      remarks: 'Sub-admin removed',
    });
    return { deleted: true };
  }

  async getPermissions(id: string) {
    const subAdmin = await this.get(id);
    return {
      uid: subAdmin.uid,
      permissions: normalizeSubAdminPermissions(subAdmin.permissions),
    };
  }

  async updatePermissions(id: string, dto: UpdateSubAdminPermissionsDto) {
    const subAdmin = await this.get(id);
    const permissions = normalizeSubAdminPermissions(dto.permissions);
    const updated = {
      ...subAdmin,
      permissions,
      updatedAt: new Date().toISOString(),
    };
    await this.collection().doc(id).set(updated, { merge: true });
    await this.syncUserRecord(id, updated);
    return updated;
  }

  async updateScope(id: string, dto: UpdateSubAdminScopeDto) {
    const subAdmin = await this.get(id);
    const updated: FirestoreSubAdminDocument = {
      ...subAdmin,
      assignedRegion: dto.assignedRegion ?? null,
      assignedDepartment: dto.assignedDepartment ?? null,
      updatedAt: new Date().toISOString(),
    };
    await this.collection().doc(id).set(updated, { merge: true });
    return updated;
  }

  getPermissionMatrix() {
    return Object.entries(SUB_ADMIN_PERMISSION_MATRIX).map(([key, value]) => ({
      key,
      ...value,
    }));
  }

  async getActivity(id: string): Promise<FirestoreAdminActionDocument[]> {
    await this.get(id);
    const snapshot = await this.firebaseAdminService
      .firestore()
      .collection(ROOT_COLLECTIONS.users)
      .doc(id)
      .collection(USER_SUBCOLLECTIONS.adminActions)
      .get();

    return snapshot.docs
      .map((doc) => doc.data() as FirestoreAdminActionDocument)
      .sort((left, right) => right.timestamp.localeCompare(left.timestamp));
  }

  async getManagedEntities(id: string) {
    const cacheKey = `subadmin-managed-entities:${id}`;
    const cached = await this.cacheService.get<any>(cacheKey);
    
    if (cached) {
      this.logger.log(`Cache hit for managed entities: ${id}`);
      return cached;
    }
    
    const subAdmin = await this.get(id);
    const [users, bookings, incidents, tickets, drones] = await Promise.all([
      this.getUsers(),
      this.getBookings(),
      this.getIncidents(),
      this.getTickets(),
      this.getDrones(),
    ]);
    const region = subAdmin.assignedRegion?.toLowerCase();
    const scopedUsers = region
      ? users.filter((item) => this.resolveUserRegion(item).toLowerCase() === region)
      : users;
    const scopedBookings = region
      ? bookings.filter((item) => this.resolveBookingState(item).toLowerCase() === region)
      : bookings;

    const result = {
      uid: subAdmin.uid,
      scope: {
        assignedRegion: subAdmin.assignedRegion,
        assignedDepartment: subAdmin.assignedDepartment,
      },
      managed: {
        pilots: subAdmin.permissions.manage_pilots
          ? scopedUsers.filter((item) => item.role === 'pilot').length
          : 0,
        vendors: subAdmin.permissions.manage_vendors
          ? scopedUsers.filter((item) => item.role === 'vendor').length
          : 0,
        customers: subAdmin.permissions.manage_customers
          ? scopedUsers.filter((item) => item.role === 'customer').length
          : 0,
        aggregators: subAdmin.permissions.manage_aggregators
          ? scopedUsers.filter((item) => item.role === 'aggregator').length
          : 0,
        bookings: subAdmin.permissions.manage_bookings ? scopedBookings.length : 0,
        incidents: subAdmin.permissions.manage_incidents ? incidents.length : 0,
        serviceTickets: subAdmin.permissions.manage_service_centre ? tickets.length : 0,
        fleetAssets: subAdmin.permissions.manage_fleet ? drones.length : 0,
      },
    };
    
    // Cache for 10 minutes
    await this.cacheService.set(cacheKey, result, 10 * 60 * 1000);
    
    return result;
  }

  private async syncUserRecord(id: string, subAdmin: FirestoreSubAdminDocument): Promise<void> {
    const user = await this.usersService.getByUid(id);
    await this.firebaseAdminService
      .firestore()
      .collection(ROOT_COLLECTIONS.users)
      .doc(id)
      .set(
        {
          ...user,
          name: subAdmin.name,
          email: subAdmin.email,
          phone: subAdmin.mobile,
          permissions: subAdmin.permissions,
          status: subAdmin.status === 'active' ? 'active' : 'suspended',
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );
  }

  private async getUsers(): Promise<ScopedUser[]> {
    const snapshot = await this.firebaseAdminService
      .firestore()
      .collection(ROOT_COLLECTIONS.users)
      .get();
    return snapshot.docs.map((doc) => doc.data() as ScopedUser);
  }

  private async getBookings(): Promise<ScopedBooking[]> {
    return collectFirestoreQueryInBatches(
      this.firebaseAdminService
        .firestore()
        .collection(ROOT_COLLECTIONS.bookings) as unknown as Query<ScopedBooking>,
      {
        orderBy: [{ field: 'id', direction: 'asc' }],
        getCursorValues: (booking) => [booking.id],
      },
    );
  }

  private async getIncidents(): Promise<FirestoreIncidentDocument[]> {
    const snapshot = await this.firebaseAdminService
      .firestore()
      .collection(ROOT_COLLECTIONS.incidents)
      .get();
    return snapshot.docs.map((doc) => doc.data() as FirestoreIncidentDocument);
  }

  private async getTickets(): Promise<FirestoreServiceTicketDocument[]> {
    const snapshot = await this.firebaseAdminService
      .firestore()
      .collection(ROOT_COLLECTIONS.serviceTickets)
      .get();
    return snapshot.docs.map((doc) => doc.data() as FirestoreServiceTicketDocument);
  }

  private async getDrones(): Promise<FirestoreDroneDocument[]> {
    return collectFirestoreQueryInBatches(
      this.firebaseAdminService
        .firestore()
        .collectionGroup(USER_SUBCOLLECTIONS.drones) as unknown as Query<FirestoreDroneDocument>,
      {
        orderBy: [{ field: 'id', direction: 'asc' }],
        getCursorValues: (drone) => [drone.id],
      },
    );
  }

  private resolveUserRegion(user: ScopedUser): string {
    const profileState = user.profileData.state;
    return String(
      user.assignedRegion ??
        user.assignedState ??
        (typeof profileState === 'string' ? profileState : 'unknown'),
    );
  }

  private resolveBookingState(booking: ScopedBooking): string {
    return booking.state ?? booking.addressState ?? this.extractStateFromAddress(booking.address);
  }

  private extractStateFromAddress(address: string): string {
    const parts = address
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);
    return parts.length > 1 ? parts[parts.length - 2] : 'unknown';
  }

  private collection(): CollectionReference<FirestoreSubAdminDocument> {
    const collection: CollectionReference<FirestoreSubAdminDocument> = this.firebaseAdminService
      .firestore()
      .collection(ROOT_COLLECTIONS.subadmins);
    return collection;
  }
}

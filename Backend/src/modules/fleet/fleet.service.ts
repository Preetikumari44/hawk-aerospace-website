import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { CollectionReference, DocumentReference, Query } from 'firebase-admin/firestore';

import {
  ROOT_COLLECTIONS,
  USER_SUBCOLLECTIONS,
} from '../../common/constants/collection-paths.constant';
import { CacheService } from '../../common/cache/cache.service';
import { WS_EVENTS } from '../../gateway/events/event.constants';
import type { CurrentUser } from '../../common/interfaces/current-user.interface';
import { paginateFirestoreQuery } from '../../common/utils/firestore-cursor-pagination.util';
import type {
  FirestoreDroneDocument,
  FirestoreMaintenanceLogDocument,
  FirestoreMissionDocument,
  FirestoreUserDocument,
  DroneStatus,
} from '../../database/firestore/contracts';
import { FirebaseAdminService } from '../../firebase/firebase-admin.service';
import { OtpService } from '../auth/services/otp.service';
import { AssignDroneDto } from './dto/assign-drone.dto';
import { CreateDroneDto } from './dto/create-drone.dto';
import { DroneFilterDto } from './dto/drone-filter.dto';
import { MaintenanceLogDto } from './dto/maintenance-log.dto';
import { UpdateDroneStatusDto } from './dto/update-drone-status.dto';
import { UpdateDroneDto } from './dto/update-drone.dto';

interface DroneLookup {
  drone: FirestoreDroneDocument;
  ref: DocumentReference<FirestoreDroneDocument>;
}

@Injectable()
export class FleetService {
  private readonly logger = new Logger(FleetService.name);

  constructor(
    private readonly firebaseAdminService: FirebaseAdminService,
    private readonly eventEmitter: EventEmitter2,
    private readonly cacheService: CacheService,
    private readonly otpService: OtpService,
  ) {}

  async createDrone(dto: CreateDroneDto, user: CurrentUser): Promise<FirestoreDroneDocument> {
    const ref = this.vendorDroneCollection(user.uid).doc();
    const now = new Date().toISOString();
    const drone: FirestoreDroneDocument = {
      id: ref.id,
      uid: ref.id,
      fleetManagerUid: user.uid,
      model: dto.model,
      serialNo: dto.serialNo,
      type: dto.type,
      status: 'deployable',
      specs: dto.specs ?? {},
      totalFlightHours: 0,
      lastMaintenance: null,
      nextMaintenanceDue: this.addDays(now, 15),
      createdAt: now,
      updatedAt: now,
    };

    await ref.set(drone);
    return drone;
  }

  async listDrones(filter: DroneFilterDto, user: CurrentUser) {
    let query: Query<FirestoreDroneDocument> = this.droneCollectionGroup();

    if (user.role === 'fleet_manager' || user.role === 'vendor') {
      query = query.where('fleetManagerUid', '==', user.uid);
    } else if (filter.fleetManagerUid) {
      query = query.where('fleetManagerUid', '==', filter.fleetManagerUid);
    }

    if (filter.status) {
      query = query.where('status', '==', filter.status);
    }

    if (filter.type) {
      query = query.where('type', '==', filter.type);
    }

    return paginateFirestoreQuery(query, {
      limit: filter.limit,
      cursor: filter.cursor,
      orderBy: [{ field: 'id', direction: 'asc' }],
      getCursorValues: (drone) => [drone.id],
      includeTotal: true,
    });
  }

  async getDrone(id: string, user: CurrentUser): Promise<FirestoreDroneDocument> {
    const cacheKey = `drone:${id}`;
    const cached = await this.cacheService.get<FirestoreDroneDocument>(cacheKey);
    if (cached) {
      this.logger.log(`Cache hit for drone: ${id}`);
      this.assertDroneAccess(cached, user);
      return cached;
    }

    const { drone } = await this.findDrone(id);
    this.assertDroneAccess(drone, user);
    
    // Cache for 5 minutes
    await this.cacheService.set(cacheKey, drone, 5 * 60 * 1000);
    return drone;
  }

  async updateDrone(
    id: string,
    dto: UpdateDroneDto,
    user: CurrentUser,
  ): Promise<FirestoreDroneDocument> {
    const lookup = await this.findDrone(id);
    this.assertVendorOwnsDrone(lookup.drone, user);
    const updated: FirestoreDroneDocument = {
      ...lookup.drone,
      ...dto,
      specs: dto.specs ? { ...lookup.drone.specs, ...dto.specs } : lookup.drone.specs,
      updatedAt: new Date().toISOString(),
    };

    await lookup.ref.set(updated, { merge: true });
    
    // Invalidate cache
    await this.cacheService.delete(`drone:${id}`);
    await this.cacheService.deletePattern('drones-list:.*');
    
    return updated;
  }

  async updateDroneStatus(
    id: string,
    dto: UpdateDroneStatusDto,
    user: CurrentUser,
  ): Promise<FirestoreDroneDocument> {
    const lookup = await this.findDrone(id);
    if (user.role === 'vendor') {
      this.assertVendorOwnsDrone(lookup.drone, user);
    }

    const updated = {
      ...lookup.drone,
      status: dto.status,
      updatedAt: new Date().toISOString(),
    };
    await lookup.ref.set(updated, { merge: true });
    
    // Invalidate cache
    await this.cacheService.delete(`drone:${id}`);
    await this.cacheService.deletePattern('drones-list:.*');
    
    this.eventEmitter.emit(WS_EVENTS.DRONE_STATUS_CHANGED, {
      droneId: updated.id,
      fleetManagerUid: updated.fleetManagerUid,
      status: updated.status,
      previousStatus: lookup.drone.status,
      timestamp: updated.updatedAt,
    });
    return updated;
  }

  async decommissionDrone(id: string, user?: CurrentUser): Promise<{ deleted: true }> {
    const lookup = await this.findDrone(id);
    
    // Check ownership if user is vendor
    if (user && user.role === 'vendor') {
      this.assertVendorOwnsDrone(lookup.drone, user);
    }

    // Check if drone has active missions
    const activeMissionsSnapshot = await this.firebaseAdminService
      .firestore()
      .collectionGroup('bookings')
      .where('assignedDrone', '==', id)
      .where('status', 'in', ['pending', 'confirmed', 'in_progress'])
      .limit(1)
      .get();

    if (!activeMissionsSnapshot.empty) {
      throw new BadRequestException('Cannot retire drone with active missions');
    }

    // Soft delete - mark as retired with proper status
    // Note: Using 'under_maintenance' as closest valid status for retired drones
    await lookup.ref.set(
      {
        status: 'under_maintenance' as DroneStatus,
        deletedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as any, // Use any to allow additional retirement metadata
      { merge: true },
    );

    // Invalidate cache
    await this.cacheService.delete(`drone:${id}`);
    await this.cacheService.deletePattern('drones-list:.*');

    this.eventEmitter.emit('drone.retired', {
      droneId: id,
      fleetManagerUid: lookup.drone.fleetManagerUid,
    });

    return { deleted: true };
  }

  async listAvailableDrones(user: CurrentUser) {
    return this.listDrones({ page: 1, limit: 100, status: 'deployable' }, user);
  }

  async assignDrone(
    id: string,
    dto: AssignDroneDto,
    user: CurrentUser,
  ): Promise<FirestoreDroneDocument> {
    const lookup = await this.findDrone(id);
    this.assertVendorOwnsDrone(lookup.drone, user);
    if (lookup.drone.status !== 'deployable') {
      throw new BadRequestException('Drone must be deployable before assignment.');
    }

    const updated: FirestoreDroneDocument = {
      ...lookup.drone,
      status: 'assigned',
      updatedAt: new Date().toISOString(),
    };

    await lookup.ref.set(
      {
        ...updated,
        assignedBookingId: dto.bookingId,
      },
      { merge: true },
    );
    this.eventEmitter.emit(WS_EVENTS.DRONE_ASSIGNED, {
      droneId: updated.id,
      pilotId: null,
      bookingId: dto.bookingId,
      model: updated.model,
      timestamp: updated.updatedAt,
    });
    return updated;
  }

  async logMaintenance(
    droneId: string,
    dto: MaintenanceLogDto,
    user: CurrentUser,
  ): Promise<FirestoreMaintenanceLogDocument> {
    const lookup = await this.findDrone(droneId);
    if (user.role === 'vendor') {
      this.assertVendorOwnsDrone(lookup.drone, user);
    }

    const ref = this.maintenanceCollection().doc();
    const now = new Date().toISOString();
    const document: FirestoreMaintenanceLogDocument = {
      id: ref.id,
      droneId,
      fleetManagerUid: lookup.drone.fleetManagerUid,
      technicianUid: dto.technicianUid ?? (user.role === 'technician' ? user.uid : null),
      type: dto.type,
      status: dto.status ?? 'scheduled',
      partsReplaced: dto.partsReplaced ?? null,
      diagnosisNotes: dto.diagnosisNotes ?? null,
      timeTakenHours: dto.timeTakenHours ?? null,
      evidenceMedia: dto.evidenceMedia ?? [],
      scheduledDate: dto.scheduledDate ?? now,
      completedAt: dto.status === 'completed' ? now : null,
      createdAt: now,
      updatedAt: now,
    };

    await ref.set(document);
    if (document.status === 'completed') {
      await lookup.ref.set(
        {
          status: 'deployable',
          lastMaintenance: now,
          nextMaintenanceDue: this.addDays(now, 15),
          updatedAt: now,
        },
        { merge: true },
      );
    }
    this.eventEmitter.emit(WS_EVENTS.MAINTENANCE_LOGGED, {
      droneId: document.droneId,
      fleetManagerUid: document.fleetManagerUid,
      maintenanceId: document.id,
      type: document.type,
      timestamp: now,
    });

    return document;
  }

  async listMaintenance(droneId: string, user: CurrentUser) {
    const drone = await this.getDrone(droneId, user);
    const snapshot = await this.maintenanceCollection().where('droneId', '==', drone.id).get();
    return snapshot.docs.map((doc) => doc.data());
  }

  async getMaintenanceSchedule(user: CurrentUser) {
    let query: Query<FirestoreMaintenanceLogDocument> = this.maintenanceCollection();
    if (user.role === 'vendor') {
      query = query.where('vendorUid', '==', user.uid);
    }
    const snapshot = await query.get();
    return snapshot.docs
      .map((doc) => doc.data())
      .filter((log) => log.status !== 'completed')
      .sort((left, right) => String(left.scheduledDate).localeCompare(String(right.scheduledDate)));
  }

  async getOverdueDrones(user: CurrentUser) {
    const { items } = await this.listDrones({ page: 1, limit: 500 }, user);
    const now = Date.now();
    return items.filter((drone) => {
      const dueByFlightHours = drone.totalFlightHours >= 30;
      const dueByDate = drone.nextMaintenanceDue
        ? new Date(drone.nextMaintenanceDue).getTime() <= now
        : false;
      return dueByFlightHours || dueByDate;
    });
  }

  async getDashboard(user: CurrentUser) {
    const { items } = await this.listDrones({ page: 1, limit: 500 }, user);
    return {
      total: items.length,
      active: items.filter((drone) => drone.status === 'deployable' || drone.status === 'assigned')
        .length,
      maintenance: items.filter((drone) => drone.status === 'under_maintenance').length,
      crashed: items.filter((drone) => drone.status === 'crashed').length,
    };
  }

  async getIncomingRequests() {
    const snapshot = await this.firebaseAdminService
      .firestore()
      .collection(ROOT_COLLECTIONS.users)
      .where('role', '==', 'vendor')
      .where('status', '==', 'pending')
      .get();
    return snapshot.docs.map((doc) => doc.data() as FirestoreUserDocument);
  }

  async listManagers() {
    const snapshot = await this.firebaseAdminService
      .firestore()
      .collection(ROOT_COLLECTIONS.users)
      .where('role', '==', 'vendor')
      .get();
    return snapshot.docs.map((doc) => doc.data() as FirestoreUserDocument);
  }

  async getManagerProfile(id: string) {
    const managerSnapshot = await this.firebaseAdminService
      .firestore()
      .collection(ROOT_COLLECTIONS.users)
      .doc(id)
      .get();
    if (!managerSnapshot.exists) {
      throw new NotFoundException(`Fleet manager ${id} not found.`);
    }
    const pilotsSnapshot = await this.firebaseAdminService
      .firestore()
      .collection(ROOT_COLLECTIONS.users)
      .where('role', '==', 'pilot')
      .where('profileData.assignedVendorUid', '==', id)
      .get();
    
    // Create a properly typed admin user object
    const adminUser: CurrentUser = {
      uid: 'admin',
      role: 'admin',
      status: 'active',
    };
    
    const { items: drones } = await this.listDrones(
      { page: 1, limit: 500, vendorUid: id },
      adminUser,
    );

    return {
      manager: managerSnapshot.data(),
      pilots: pilotsSnapshot.docs.map((doc) => doc.data()),
      droneCount: drones.length,
    };
  }

  private async findDrone(id: string): Promise<DroneLookup> {
    const snapshot = await this.droneCollectionGroup().where('id', '==', id).limit(1).get();
    if (snapshot.empty) {
      throw new NotFoundException(`Drone ${id} not found.`);
    }
    const doc = snapshot.docs[0];
    return {
      drone: doc.data(),
      ref: doc.ref,
    };
  }

  private assertDroneAccess(drone: FirestoreDroneDocument, user: CurrentUser): void {
    if (user.role !== 'admin' && user.role !== 'technician' && drone.fleetManagerUid !== user.uid) {
      throw new ForbiddenException('You cannot access this drone.');
    }
  }

  private assertVendorOwnsDrone(drone: FirestoreDroneDocument, user: CurrentUser): void {
    if (drone.fleetManagerUid !== user.uid) {
      throw new ForbiddenException('Fleet manager does not own this drone.');
    }
  }

  private vendorDroneCollection(uid: string): CollectionReference<FirestoreDroneDocument> {
    const collection = this.firebaseAdminService
      .firestore()
      .collection(ROOT_COLLECTIONS.users)
      .doc(uid)
      .collection(USER_SUBCOLLECTIONS.drones) as CollectionReference<FirestoreDroneDocument>;
    return collection;
  }

  private droneCollectionGroup(): Query<FirestoreDroneDocument> {
    return this.firebaseAdminService
      .firestore()
      .collectionGroup(USER_SUBCOLLECTIONS.drones) as unknown as Query<FirestoreDroneDocument>;
  }

  private maintenanceCollection(): CollectionReference<FirestoreMaintenanceLogDocument> {
    const collection = this.firebaseAdminService
      .firestore()
      .collection(ROOT_COLLECTIONS.maintenanceLogs) as CollectionReference<FirestoreMaintenanceLogDocument>;
    return collection;
  }

  private addDays(dateValue: string, days: number): string {
    const date = new Date(dateValue);
    date.setDate(date.getDate() + days);
    return date.toISOString();
  }

  // ==================== MISSION MANAGEMENT (8-STAGE) ====================

  async listMissions(filter: any, user: CurrentUser) {
    const cacheKey = `missions:${user.uid}:${filter.tab || 'all'}:${filter.page || 1}`;
    const cached = await this.cacheService.get<any>(cacheKey);
    
    if (cached) {
      this.logger.log(`Cache hit for missions list: ${user.uid}`);
      return cached;
    }

    let query = this.firebaseAdminService
      .firestore()
      .collectionGroup('bookings') as any;

    if (user.role === 'vendor' || user.role === 'fleet_manager') {
      query = query.where('fleetManagerUid', '==', user.uid);
    } else if (filter.vendorUid) {
      query = query.where('vendorUid', '==', filter.vendorUid);
    }

    // Tab-based filtering (Active, Upcoming, Completed)
    if (filter.tab === 'active') {
      query = query.where('status', 'in', ['confirmed', 'in_progress']);
    } else if (filter.tab === 'upcoming') {
      query = query.where('status', '==', 'pending');
    } else if (filter.tab === 'completed') {
      query = query.where('status', '==', 'completed');
    }

    if (filter.status) {
      query = query.where('status', '==', filter.status);
    }

    const snapshot = await query.get();
    const missions = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));

    // Enrich missions with pilot and drone names
    try {
      const pilotUids = [...new Set(missions.map((m: any) => m.assignedPilot).filter(Boolean))] as string[];
      const droneIds = [...new Set(missions.map((m: any) => m.assignedDrone).filter(Boolean))] as string[];
      const db = this.firebaseAdminService.firestore();
      if (pilotUids.length > 0) {
        const pilotDocs = await Promise.all(
          pilotUids.map(uid => db.collection('users').doc(uid).get())
        );
        const pilotMap: Record<string, any> = {};
        pilotDocs.forEach(doc => {
          if (doc.exists) pilotMap[doc.id] = doc.data();
        });
        for (const m of missions) {
          if (m.assignedPilot && pilotMap[m.assignedPilot]) {
            m.assignedPilotName = pilotMap[m.assignedPilot].name || pilotMap[m.assignedPilot].fullName || 'Assigned';
            m.assignedPilotPhone = pilotMap[m.assignedPilot].phone || '';
          }
        }
      }
      if (droneIds.length > 0) {
        const droneDocs = await Promise.all(
          droneIds.map(id =>
            this.droneCollectionGroup().where('id', '==', id).limit(1).get()
          )
        );
        const droneMap: Record<string, any> = {};
        droneDocs.forEach(snap => {
          if (!snap.empty) {
            const d = snap.docs[0].data() as any;
            droneMap[d.id || snap.docs[0].id] = d;
          }
        });
        for (const m of missions) {
          if (m.assignedDrone && droneMap[m.assignedDrone]) {
            m.assignedDroneName = droneMap[m.assignedDrone].model || 'Assigned';
          }
        }
      }
    } catch (err: any) {
      this.logger.error(`Failed to enrich missions with pilot/drone names: ${err.message}`);
    }

    const result = {
      missions,
      total: missions.length,
    };

    // Cache for 1 minute
    await this.cacheService.set(cacheKey, result, 60 * 1000);

    return result;
  }

  /**
   * Get incoming missions (unassigned bookings awaiting assignment)
   * Returns confirmed bookings that need pilot and/or drone assignment
   */
  async getIncomingMissions(user: CurrentUser) {
    const snapshot = await this.firebaseAdminService
      .firestore()
      .collection(ROOT_COLLECTIONS.bookings) // Use root collection, not collectionGroup
      .where('fleetManagerUid', '==', user.uid)
      .where('status', '==', 'confirmed') // Confirmed bookings awaiting assignment
      .orderBy('scheduledDate', 'asc')
      .get();

    const incomingMissions = snapshot.docs.map((doc) => {
      const data = doc.data() as any;
      return {
        id: doc.id,
        ...data,
        // Indicate what's missing for assignment
        needsPilotAssignment: !data.assignedPilot,
        needsDroneAssignment: !data.assignedDrone,
      };
    });

    // Filter to only show bookings that need assignment
    return incomingMissions.filter(
      (mission) => mission.needsPilotAssignment || mission.needsDroneAssignment
    );
  }

  async getMissionDetail(missionId: string, user: CurrentUser) {
    const snapshot = await this.firebaseAdminService
      .firestore()
      .collectionGroup('bookings')
      .where('id', '==', missionId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      throw new NotFoundException(`Mission ${missionId} not found`);
    }

    const missionData = snapshot.docs[0].data() as any;
    const mission = { id: snapshot.docs[0].id, ...missionData };

    // Get pilot and drone details if assigned
    const details: any = { mission };

    if (missionData.assignedPilot) {
      const pilotDoc = await this.firebaseAdminService
        .firestore()
        .collection('users')
        .doc(missionData.assignedPilot)
        .get();
      const pilot = pilotDoc.exists ? pilotDoc.data() : null;
      details.pilot = pilot;
      if (pilot) {
        mission.assignedPilotName = pilot.name || pilot.fullName || 'Assigned';
        mission.assignedPilotPhone = pilot.phone || '';
      }
    }

    if (missionData.assignedDrone) {
      const droneSnapshot = await this.droneCollectionGroup()
        .where('id', '==', missionData.assignedDrone)
        .limit(1)
        .get();
      const droneData = !droneSnapshot.empty ? droneSnapshot.docs[0].data() as any : null;
      details.drone = droneData;
      if (droneData) {
        mission.assignedDroneName = droneData.model || 'Assigned';
      }
    }

    return details;
  }

  async assignMission(missionId: string, dto: any, user: CurrentUser) {
    const { mission } = await this.getMissionDetail(missionId, user);

    if (mission.status !== 'pending') {
      throw new BadRequestException('Mission cannot be assigned in current status');
    }

    // Update booking with pilot and drone assignment
    const bookingRef = await this.findBookingRef(missionId);
    await bookingRef.update({
      assignedPilot: dto.pilotId,
      assignedDrone: dto.droneId,
      status: 'confirmed',
      stage: 2, // Stage 2: Pilot Assigned
      updatedAt: new Date().toISOString(),
    });

    // Update pilot and drone status to 'assigned'
    const now = new Date().toISOString();
    const db = this.firebaseAdminService.firestore();
    if (dto.pilotId) {
      await db.collection('users').doc(dto.pilotId).update({
        status: 'assigned', isAvailable: false, updatedAt: now,
      }).catch((err: any) => this.logger.warn(`Failed to update pilot ${dto.pilotId} status: ${err.message}`));
    }
    if (dto.droneId) {
      await db.collection('drones').doc(dto.droneId).update({
        status: 'assigned', isAvailable: false, updatedAt: now,
      }).catch((err: any) => this.logger.warn(`Failed to update drone ${dto.droneId} status: ${err.message}`));
    }

    // Create the mission record so the pilot sees the incoming request.
    if (dto.pilotId) {
      await this.upsertPilotMission(missionId, dto.pilotId, now);
    }

    // Emit events
    this.eventEmitter.emit('mission.assigned', {
      missionId,
      pilotId: dto.pilotId,
      droneId: dto.droneId,
      vendorUid: user.uid,
    });

    return { success: true, message: 'Mission assigned successfully' };
  }

  async assignPilotToMission(missionId: string, dto: any, user: CurrentUser) {
    const bookingRef = await this.findBookingRef(missionId);
    await bookingRef.update({
      assignedPilot: dto.pilotId,
      stage: 2,
      updatedAt: new Date().toISOString(),
    });

    // Update pilot status to 'assigned'
    if (dto.pilotId) {
      await this.firebaseAdminService.firestore().collection('users').doc(dto.pilotId).update({
        status: 'assigned', isAvailable: false, updatedAt: new Date().toISOString(),
      }).catch((err: any) => this.logger.warn(`Failed to update pilot ${dto.pilotId} status: ${err.message}`));
    }

    // Create the mission record so the pilot sees the incoming request.
    if (dto.pilotId) {
      await this.upsertPilotMission(missionId, dto.pilotId, new Date().toISOString());
    }

    this.eventEmitter.emit('mission.pilot_assigned', { missionId, pilotId: dto.pilotId });
    return { success: true };
  }

  async assignDroneToMission(missionId: string, dto: any, user: CurrentUser) {
    const bookingRef = await this.findBookingRef(missionId);
    await bookingRef.update({
      assignedDrone: dto.droneId,
      stage: 3,
      updatedAt: new Date().toISOString(),
    });

    // Update drone status to 'assigned'
    if (dto.droneId) {
      await this.firebaseAdminService.firestore().collection('drones').doc(dto.droneId).update({
        status: 'assigned', isAvailable: false, updatedAt: new Date().toISOString(),
      }).catch((err: any) => this.logger.warn(`Failed to update drone ${dto.droneId} status: ${err.message}`));
    }

    this.eventEmitter.emit('mission.drone_assigned', { missionId, droneId: dto.droneId });
    return { success: true };
  }

  async autoAssignMission(missionId: string, user: CurrentUser) {
    // Find the mission by ID from the root bookings collection
    const missionRef = this.firebaseAdminService.firestore().collection('bookings').doc(missionId);
    const missionSnap = await missionRef.get();

    if (!missionSnap.exists) {
      throw new NotFoundException(`Mission ${missionId} not found`);
    }

    const missionData = missionSnap.data()!;
    if (missionData.status !== 'confirmed') {
      throw new BadRequestException(`Mission ${missionId} has status "${missionData.status}", expected "confirmed"`);
    }

    const serviceType = missionData.serviceType || 'spraying';

    // Find deployable drone with matching type under this vendor
    const dronesSnapshot = await this.vendorDroneCollection(user.uid)
      .where('status', '==', 'deployable')
      .where('type', '==', serviceType)
      .limit(1)
      .get();

    // Find available pilot with matching service type under this vendor
    const pilotsSnapshot = await this.firebaseAdminService
      .firestore()
      .collection('users')
      .where('role', '==', 'pilot')
      .where('profileData.assignedVendorUid', '==', user.uid)
      .where('status', '==', 'active')
      .limit(1)
      .get();

    const drone = dronesSnapshot.docs[0];
    const pilot = pilotsSnapshot.docs[0];

    if (!drone) {
      throw new NotFoundException('No available drone with matching type found for auto-assignment');
    }
    if (!pilot) {
      throw new NotFoundException('No available pilot with matching service type found for auto-assignment');
    }

    const batch = this.firebaseAdminService.firestore().batch();

    batch.update(missionRef, {
      vendorUid: user.uid,
      assignedDroneId: drone.id,
      assignedPilotId: pilot.id,
      status: 'in_progress',
      assignedAt: new Date().toISOString(),
    });

    batch.update(drone.ref, { status: 'assigned' });
    batch.update(pilot.ref, { status: 'assigned' });

    await batch.commit();

    return {
      success: true,
      missionId,
      assignedDroneId: drone.id,
      assignedPilotId: pilot.id,
    };
  }

  async getRejectedMissions(user: CurrentUser) {
    // Bookings carry `fleetManagerUid` once claimed/assigned — query that
    // (not vendorUid) and filter cancelled/rejected in code so both newly
    // rejected and legacy cancelled bookings show up.
    const snapshot = await this.firebaseAdminService
      .firestore()
      .collectionGroup('bookings')
      .where('fleetManagerUid', '==', user.uid)
      .get();

    return snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((m: any) =>
        ['cancelled', 'rejected'].includes(String(m?.status || '').toLowerCase()),
      );
  }

  async suggestOptimalPairing(missionId: string, user: CurrentUser) {
    // Would use DronePilotMatchingService
    throw new Error('Optimal pairing suggestion not yet implemented');
  }

  // ==================== PILOT MANAGEMENT ====================

  async addPilotToFleet(dto: any, user: CurrentUser) {
    try {
      const db = this.firebaseAdminService.firestore();
      const pilotRef = db.collection('users').doc();
      const now = new Date().toISOString();
      const uid = pilotRef.id;

      // Check for existing user/pilot with the same phone number
      if (dto.mobile) {
        const existingUser = await db
          .collection(ROOT_COLLECTIONS.users)
          .where('phone', '==', dto.mobile)
          .limit(1)
          .get();
        if (!existingUser.empty) {
          throw new BadRequestException(
            `A user with phone number ${dto.mobile} already exists. Duplicate phone numbers are not allowed.`,
          );
        }
      }

      // --- users collection document ---
      const userDoc: Record<string, any> = {
        uid,
        phone: dto.mobile,
        name: dto.fullName,
        role: 'pilot',
        adminApproval: false,
        authProvider: 'phone',
        createdAt: now,
        email: dto.email || '',
        lastLogin: null,
        lastLoginIp: null,
        loginCount: 0,
        permissions: {
          'missions.accept': true,
          'missions.execute': true,
          'profile.update': true,
        },
        primaryRole: 'pilot',
        profileData: {
          assignedFleetManagerUid: user.uid,
          serviceTypes: dto.serviceTypes || [],
          specializations: dto.certifications || [],
          certifications: dto.certifications || [],
          language: 'en',
          photoUrl: null,
          preferences: {},
          timezone: 'Asia/Kolkata',
        },
        roles: ['pilot'],
        status: 'pending',
        updatedAt: now,
        verification: {
          documents: dto.documents || [],
          emailVerified: true,
          isVerified: false,
          kycStatus: 'pending',
          phoneVerified: true,
        },
      };

      // --- pilots collection document ---
      const availability = dto.availability || {
        startTime: '06:00',
        endTime: '18:00',
        mon: true, tue: true, wed: true, thu: true, fri: true, sat: true, sun: true,
      };
      const pilotDoc: Record<string, any> = {
        uid,
        pilotId: uid,
        name: dto.fullName,
        fullName: dto.fullName,
        phone: dto.mobile,
        mobile: dto.mobile,
        email: dto.email || '',
        status: 'AVAILABLE',
        managedByFleetManagerUid: user.uid,
        aadhaarNumber: dto.aadhaarNumber || '',
        address: dto.address || '',
        age: dto.age || 0,
        state: dto.state || '',
        district: dto.district || '',
        pincode: dto.pincode || '',
        assignedVendorUid: null,
        availability,
        cancelledMissions: 0,
        certifications: dto.certifications || [],
        completedMissions: 0,
        createdAt: now,
        currentBookingId: null,
        currentDroneUid: null,
        currentLocation: null,
        earnings: { pending: 0, settled: 0, total: 0 },
        isAvailable: false,
        isOnline: dto.isOnline ?? true,
        licenseExpiry: dto.license?.expiryDate || '',
        licenseIssueDate: dto.license?.issueDate || '',
        licenseNumber: dto.license?.licenseNumber || '',
        licenseType: dto.license?.licenseType || '',
        medicalCertificate: { expiry: '', number: '' },
        onTimePercentage: 0,
        panNumber: dto.panNumber || '',
        payoutMethod: {
          accountNumber: dto.bankDetails?.accountNumber || '',
          ifsc: dto.bankDetails?.ifscCode || '',
          type: 'bank',
          upiId: '',
        },
        rating: 0,
        safetyScore: 0,
        serviceTypes: dto.serviceTypes || [],
        totalFlightHours: dto.experience?.totalFlightHours || 0,
        flightHours: dto.experience?.totalFlightHours || 0,
        totalMissions: dto.experience?.totalMissions || 0,
        missions: dto.experience?.totalMissions || 0,
        updatedAt: now,
      };

      const cleanedUser = JSON.parse(JSON.stringify(userDoc));
      const cleanedPilot = JSON.parse(JSON.stringify(pilotDoc));

      // Use batch write for atomic creation in both collections
      const batch = db.batch();
      batch.set(pilotRef, cleanedUser);
      batch.set(db.collection(ROOT_COLLECTIONS.pilots).doc(uid), cleanedPilot);
      await batch.commit();

      return { success: true, pilotId: uid, data: cleanedPilot };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`addPilotToFleet failed: ${err.message}`, err.stack);
      throw error;
    }
  }

  async initiatePilotCreation(dto: any, user: CurrentUser) {
    const phone = dto.mobile;
    if (!phone) throw new BadRequestException('Pilot mobile number is required');

    const db = this.firebaseAdminService.firestore();

    // Check for existing user/pilot with the same phone number
    const existingUser = await db
      .collection(ROOT_COLLECTIONS.users)
      .where('phone', '==', phone)
      .limit(1)
      .get();
    if (!existingUser.empty) {
      throw new BadRequestException(
        `A user with phone number ${phone} already exists. Duplicate phone numbers are not allowed.`,
      );
    }

    // Store pending pilot data in cache
    const pendingKey = `pilot:pending:${phone}`;
    const pendingData = { ...dto, initiatedBy: user.uid, initiatedAt: new Date().toISOString() };
    await this.cacheService.set(pendingKey, JSON.stringify(pendingData), 10 * 60 * 1000); // 10 min expiry

    // Generate and store OTP
    const otpCode = this.otpService.generateOtp();
    await this.otpService.storeOtp(phone, otpCode);

    // In production: send OTP via SMS/NotificationService
    this.logger.log(`[DEV] OTP for pilot creation (${phone}): ${otpCode}`);

    return {
      success: true,
      message: `OTP sent to ${phone}`,
      phone,
      // In development mode, return the OTP for testing
      devOtp: process.env.NODE_ENV !== 'production' ? otpCode : undefined,
    };
  }

  async completePilotCreation(dto: { phone: string; otp: string }, user: CurrentUser) {
    const { phone, otp } = dto;
    if (!phone || !otp) throw new BadRequestException('Phone and OTP are required');

    // Verify OTP
    const verification = await this.otpService.verifyOtp(phone, otp);
    if (!verification.valid) throw new BadRequestException('Invalid or expired OTP');

    // Retrieve pending pilot data
    const pendingKey = `pilot:pending:${phone}`;
    const pendingRaw = await this.cacheService.get<string>(pendingKey);
    if (!pendingRaw) throw new BadRequestException('No pending pilot creation found. Please start again.');

    const pendingData = typeof pendingRaw === 'string' ? JSON.parse(pendingRaw) : pendingRaw;

    // Create the pilot in both collections
    const db = this.firebaseAdminService.firestore();

    // Safety check: ensure no duplicate phone
    const existingUser = await db
      .collection(ROOT_COLLECTIONS.users)
      .where('phone', '==', phone)
      .limit(1)
      .get();
    if (!existingUser.empty) {
      throw new BadRequestException(
        `A user with phone number ${phone} already exists. Duplicate phone numbers are not allowed.`,
      );
    }

    const pilotRef = db.collection('users').doc();
    const now = new Date().toISOString();
    const uid = pilotRef.id;

    // --- users collection document ---
    const userDoc: Record<string, any> = {
      uid,
      phone,
      name: pendingData.fullName,
      role: 'pilot',
      adminApproval: false,
      authProvider: 'phone',
      createdAt: now,
      email: pendingData.email || '',
      lastLogin: null,
      lastLoginIp: null,
      loginCount: 0,
      permissions: {
        'missions.accept': true,
        'missions.execute': true,
        'profile.update': true,
      },
      primaryRole: 'pilot',
      profileData: {
        assignedFleetManagerUid: user.uid,
        serviceTypes: pendingData.serviceTypes || [],
        specializations: pendingData.certifications || [],
        certifications: pendingData.certifications || [],
        language: 'en',
        photoUrl: null,
        preferences: {},
        timezone: 'Asia/Kolkata',
      },
      roles: ['pilot'],
      status: 'pending',
      updatedAt: now,
      verification: {
        documents: pendingData.documents || [],
        emailVerified: true,
        isVerified: false,
        kycStatus: 'pending',
        phoneVerified: true,
      },
    };

    // --- pilots collection document ---
    const availability = pendingData.availability || {
      startTime: '06:00',
      endTime: '18:00',
      mon: true, tue: true, wed: true, thu: true, fri: true, sat: true, sun: true,
    };
    const pilotDoc: Record<string, any> = {
      uid,
      pilotId: uid,
      name: pendingData.fullName,
      fullName: pendingData.fullName,
      phone,
      mobile: phone,
      email: pendingData.email || '',
      status: 'AVAILABLE',
      managedByFleetManagerUid: user.uid,
      aadhaarNumber: pendingData.aadhaarNumber || '',
      address: pendingData.address || '',
      age: pendingData.age || 0,
      state: pendingData.state || '',
      district: pendingData.district || '',
      pincode: pendingData.pincode || '',
      assignedVendorUid: null,
      availability,
      cancelledMissions: 0,
      certifications: pendingData.certifications || [],
      completedMissions: 0,
      createdAt: now,
      currentBookingId: null,
      currentDroneUid: null,
      currentLocation: null,
      earnings: { pending: 0, settled: 0, total: 0 },
      isAvailable: false,
      isOnline: pendingData.isOnline ?? true,
      licenseExpiry: pendingData.license?.expiryDate || '',
      licenseIssueDate: pendingData.license?.issueDate || '',
      licenseNumber: pendingData.license?.licenseNumber || '',
      licenseType: pendingData.license?.licenseType || '',
      medicalCertificate: { expiry: '', number: '' },
      onTimePercentage: 0,
      panNumber: pendingData.panNumber || '',
      payoutMethod: {
        accountNumber: pendingData.bankDetails?.accountNumber || '',
        ifsc: pendingData.bankDetails?.ifscCode || '',
        type: 'bank',
        upiId: '',
      },
      rating: 0,
      safetyScore: 0,
      serviceTypes: pendingData.serviceTypes || [],
      totalFlightHours: pendingData.experience?.totalFlightHours || 0,
      flightHours: pendingData.experience?.totalFlightHours || 0,
      totalMissions: pendingData.experience?.totalMissions || 0,
      missions: pendingData.experience?.totalMissions || 0,
      updatedAt: now,
    };

    const cleanedUser = JSON.parse(JSON.stringify(userDoc));
    const cleanedPilot = JSON.parse(JSON.stringify(pilotDoc));

    // Use batch write for atomic creation in both collections
    const batch = db.batch();
    batch.set(pilotRef, cleanedUser);
    batch.set(db.collection(ROOT_COLLECTIONS.pilots).doc(uid), cleanedPilot);
    await batch.commit();

    // Clean up pending data
    await this.cacheService.delete(pendingKey);

    return { success: true, pilotId: uid, data: cleanedPilot };
  }

  async listFleetPilots(filter: any, user: CurrentUser) {
    const db = this.firebaseAdminService.firestore();
    const targetUid = filter.vendorUid || user.uid;

    // Query from the 'pilots' collection — legacy scalar first, then the
    // multi-team array (pilots can belong to up to 3 FMs).
    let query = db.collection(ROOT_COLLECTIONS.pilots) as any;

    if (user.role === 'vendor' || user.role === 'fleet_manager') {
      query = query.where('managedByFleetManagerUid', '==', targetUid);
    } else if (filter.vendorUid) {
      query = query.where('managedByFleetManagerUid', '==', filter.vendorUid);
    }

    if (filter.status) {
      query = query.where('status', '==', filter.status);
    }

    const pilotsSnapshot = await query.get();
    const pilots = pilotsSnapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
    const pilotIds = new Set(pilots.map((p: any) => p.uid || p.id));

    // Multi-team array members whose primary scalar points elsewhere.
    try {
      let arrayQuery = db.collection(ROOT_COLLECTIONS.pilots).where('fleetManagerUids', 'array-contains', targetUid) as any;
      if (filter.status) {
        arrayQuery = arrayQuery.where('status', '==', filter.status);
      }
      const arraySnap = await arrayQuery.get();
      for (const doc of arraySnap.docs) {
        const p: any = { id: doc.id, ...doc.data() };
        if (!pilotIds.has(p.uid || p.id)) {
          pilotIds.add(p.uid || p.id);
          pilots.push(p);
        }
      }
    } catch {
      this.logger.warn('Failed to fetch array-team pilots');
    }

    // Also fetch pilots from the 'users' collection (auto-assigned pilots
    // may exist in users but not in the pilots root collection)
    try {
      const userSnapshot = await db
        .collection(ROOT_COLLECTIONS.users)
        .where('role', '==', 'pilot')
        .get();

      for (const doc of userSnapshot.docs) {
        const p = doc.data() as any;
        if (pilotIds.has(doc.id)) continue;

        const profileData = p.profileData || {};
        const assignedFleetMgr = profileData.assignedFleetManagerUid;
        const assignedVendor = profileData.assignedVendorUid;
        const arrayFms: string[] = Array.isArray(profileData.fleetManagerUids)
          ? profileData.fleetManagerUids
          : [];

        if (assignedFleetMgr === targetUid || assignedVendor === targetUid || arrayFms.includes(targetUid)) {
          if (!filter.status || p.status === filter.status) {
            pilots.push({ id: doc.id, ...p, _source: 'users' });
          }
        }
      }
    } catch {
      this.logger.warn('Failed to fetch pilots from users collection');
    }

    return pilots;
  }

  async getPilotDetail(pilotId: string, user: CurrentUser) {
    const db = this.firebaseAdminService.firestore();

    let pilotDoc = await db.collection(ROOT_COLLECTIONS.users).doc(pilotId).get();

    // Fallback to pilots collection if not in users
    if (!pilotDoc.exists) {
      pilotDoc = await db.collection(ROOT_COLLECTIONS.pilots).doc(pilotId).get();
    }

    if (!pilotDoc.exists) {
      throw new NotFoundException(`Pilot ${pilotId} not found`);
    }

    const pilot = pilotDoc.data();

    // Get pilot's mission history
    const missionsSnapshot = await this.firebaseAdminService
      .firestore()
      .collectionGroup('bookings')
      .where('assignedPilot', '==', pilotId)
      .get();

    const missions = missionsSnapshot.docs.map((doc) => doc.data());

    return {
      pilot,
      stats: {
        totalMissions: missions.length,
        completedMissions: missions.filter((m: any) => m.status === 'completed').length,
        activeMissions: missions.filter((m: any) => m.status === 'in_progress').length,
      },
      missions: missions.slice(0, 10), // Recent 10
    };
  }

  async updatePilotInFleet(pilotId: string, dto: any, user: CurrentUser) {
    const db = this.firebaseAdminService.firestore();
    const now = new Date().toISOString();
    const updateData = { ...dto, updatedAt: now };

    await Promise.all([
      db.collection(ROOT_COLLECTIONS.users).doc(pilotId).update(updateData).catch(() => {}),
      db.collection(ROOT_COLLECTIONS.pilots).doc(pilotId).update(updateData).catch(() => {}),
    ]);

    return { success: true };
  }

  async updatePilotStatus(pilotId: string, status: string, user: CurrentUser) {
    const db = this.firebaseAdminService.firestore();
    const now = new Date().toISOString();

    await Promise.all([
      db.collection(ROOT_COLLECTIONS.users).doc(pilotId).update({ status, updatedAt: now }).catch(() => {}),
      db.collection(ROOT_COLLECTIONS.pilots).doc(pilotId).update({ status, updatedAt: now }).catch(() => {}),
    ]);

    return { success: true };
  }

  async removePilotFromFleet(pilotId: string, user: CurrentUser) {
    // Check for active missions
    const activeMissions = await this.firebaseAdminService
      .firestore()
      .collectionGroup('bookings')
      .where('assignedPilot', '==', pilotId)
      .where('status', 'in', ['pending', 'confirmed', 'in_progress'])
      .limit(1)
      .get();

    if (!activeMissions.empty) {
      throw new BadRequestException('Cannot remove pilot with active missions');
    }

    // Soft delete - set status to inactive in both collections
    const db = this.firebaseAdminService.firestore();
    const now = new Date().toISOString();

    await Promise.all([
      db.collection(ROOT_COLLECTIONS.users).doc(pilotId).update({
        status: 'inactive',
        'profileData.assignedVendorUid': null,
        updatedAt: now,
      }).catch(() => {}),
      db.collection(ROOT_COLLECTIONS.pilots).doc(pilotId).update({
        status: 'inactive',
        'profileData.assignedVendorUid': null,
        updatedAt: now,
      }).catch(() => {}),
    ]);

    return { success: true };
  }

  // ==================== DRONE HEALTH MONITORING ====================

  async getDroneHealth(droneId: string, user: CurrentUser) {
    const { drone } = await this.findDrone(droneId);
    this.assertDroneAccess(drone, user);

    // Calculate health score based on multiple factors
    const healthData = {
      droneId,
      status: drone.status,
      totalFlightHours: drone.totalFlightHours,
      lastMaintenance: drone.lastMaintenance,
      nextMaintenanceDue: drone.nextMaintenanceDue,
      healthScore: this.calculateHealthScore(drone),
      issues: this.identifyIssues(drone),
      recommendations: this.generateRecommendations(drone),
    };

    return healthData;
  }

  async getHealthAlerts(user: CurrentUser) {
    const { items: drones } = await this.listDrones({ page: 1, limit: 500 }, user);
    
    const alerts = drones
      .map((drone) => ({
        drone,
        healthScore: this.calculateHealthScore(drone),
        issues: this.identifyIssues(drone),
      }))
      .filter((alert) => alert.healthScore < 70 || alert.issues.length > 0);

    return {
      critical: alerts.filter((a) => a.healthScore < 50),
      warning: alerts.filter((a) => a.healthScore >= 50 && a.healthScore < 70),
      total: alerts.length,
    };
  }

  async triggerMaintenance(droneId: string, dto: any, user: CurrentUser) {
    const { drone, ref } = await this.findDrone(droneId);
    this.assertVendorOwnsDrone(drone, user);

    // Create maintenance ticket
    const ticketRef = this.maintenanceCollection().doc();
    const now = new Date().toISOString();

    const ticket: any = {
      id: ticketRef.id,
      droneId,
      vendorUid: user.uid,
      priority: dto.priority,
      reason: dto.reason,
      notes: dto.notes,
      status: 'scheduled',
      createdAt: now,
      updatedAt: now,
    };

    await ticketRef.set(ticket);

    // Update drone status
    await ref.update({
      status: 'under_maintenance',
      updatedAt: now,
    });

    this.eventEmitter.emit('maintenance.triggered', { droneId, ticketId: ticketRef.id });

    return { success: true, ticketId: ticketRef.id };
  }

  async getDroneFlightHistory(droneId: string, user: CurrentUser) {
    const { drone } = await this.findDrone(droneId);
    this.assertDroneAccess(drone, user);

    // Get all missions for this drone
    const missionsSnapshot = await this.firebaseAdminService
      .firestore()
      .collectionGroup('bookings')
      .where('assignedDrone', '==', droneId)
      .where('status', '==', 'completed')
      .get();

    const flights = missionsSnapshot.docs.map((doc) => doc.data());

    return {
      droneId,
      totalFlights: flights.length,
      totalHours: drone.totalFlightHours,
      flights: flights.sort((a: any, b: any) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    };
  }

  // ==================== MAINTENANCE TICKETS ====================

  async createMaintenanceTicket(dto: any, user: CurrentUser) {
    const ticketRef = this.maintenanceCollection().doc();
    const now = new Date().toISOString();

    const ticket = {
      id: ticketRef.id,
      ...dto,
      vendorUid: user.uid,
      status: 'open',
      stage: 'REPORTED',
      createdAt: now,
      updatedAt: now,
    };

    await ticketRef.set(ticket);

    // Update drone status if priority is urgent
    if (dto.priority === 'URGENT' || dto.priority === 'CRITICAL') {
      const { ref } = await this.findDrone(dto.droneId);
      await ref.update({
        status: 'under_maintenance',
        updatedAt: now,
      });
    }

    return { success: true, ticketId: ticketRef.id, ticket };
  }

  async listMaintenanceTickets(filter: any, user: CurrentUser) {
    let query = this.maintenanceCollection() as any;

    if (user.role === 'vendor') {
      query = query.where('vendorUid', '==', user.uid);
    } else if (user.role === 'technician') {
      query = query.where('technicianId', '==', user.uid);
    }

    if (filter.status) {
      query = query.where('status', '==', filter.status);
    }

    if (filter.priority) {
      query = query.where('priority', '==', filter.priority);
    }

    const snapshot = await query.get();
    return snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
  }

  async getMaintenanceTicketDetail(ticketId: string, user: CurrentUser) {
    const ticketDoc = await this.maintenanceCollection().doc(ticketId).get();

    if (!ticketDoc.exists) {
      throw new NotFoundException(`Maintenance ticket ${ticketId} not found`);
    }

    const ticket = ticketDoc.data();

    if (!ticket) {
      throw new NotFoundException(`Maintenance ticket ${ticketId} data not found`);
    }

    // Get drone details
    const { drone } = await this.findDrone(ticket.droneId);

    return {
      ticket,
      drone,
    };
  }

  async updateMaintenanceStage(ticketId: string, dto: any, user: CurrentUser) {
    const ticketRef = this.maintenanceCollection().doc(ticketId);
    await ticketRef.update({
      stage: dto.stage,
      notes: dto.notes,
      photos: dto.photos,
      updatedAt: new Date().toISOString(),
    });

    this.eventEmitter.emit('maintenance.stage_updated', { ticketId, stage: dto.stage });

    return { success: true };
  }

  async submitAdditionalCharges(ticketId: string, dto: any, user: CurrentUser) {
    const ticketRef = this.maintenanceCollection().doc(ticketId);
    const ticketDoc = await ticketRef.get();

    if (!ticketDoc.exists) {
      throw new NotFoundException(`Ticket ${ticketId} not found`);
    }

    const ticketData = ticketDoc.data() as any;
    const existingCharges = ticketData?.additionalCharges || [];

    await ticketRef.update({
      additionalCharges: [...existingCharges, ...dto.charges],
      updatedAt: new Date().toISOString(),
    });

    this.eventEmitter.emit('maintenance.additional_charges_submitted', { ticketId });

    return { success: true };
  }

  async approveAdditionalCharge(ticketId: string, chargeId: string, dto: any, user: CurrentUser) {
    const ticketRef = this.maintenanceCollection().doc(ticketId);
    const ticketDoc = await ticketRef.get();

    if (!ticketDoc.exists) {
      throw new NotFoundException(`Ticket ${ticketId} not found`);
    }

    const ticketData = ticketDoc.data() as any;
    const charges = ticketData?.additionalCharges || [];
    const chargeIndex = charges.findIndex((c: any) => c.id === chargeId);

    if (chargeIndex === -1) {
      throw new NotFoundException(`Charge ${chargeId} not found`);
    }

    charges[chargeIndex] = {
      ...charges[chargeIndex],
      status: dto.decision,
      approvedAmount: dto.approvedAmount,
      comments: dto.comments,
      approvedAt: new Date().toISOString(),
    };

    await ticketRef.update({
      additionalCharges: charges,
      updatedAt: new Date().toISOString(),
    });

    return { success: true };
  }

  async assignTechnicianToTicket(ticketId: string, dto: any, user: CurrentUser) {
    const ticketRef = this.maintenanceCollection().doc(ticketId);
    await ticketRef.update({
      technicianId: dto.technicianUid,
      status: 'assigned',
      updatedAt: new Date().toISOString(),
    });

    this.eventEmitter.emit('maintenance.technician_assigned', {
      ticketId,
      technicianId: dto.technicianUid,
    });

    return { success: true };
  }

  // ==================== RESOURCES ====================

  async getAllResources(user: CurrentUser) {
    const { items: drones } = await this.listDrones({ page: 1, limit: 500 }, user);
    const pilots = await this.listFleetPilots({ page: 1, limit: 500 }, user);

    return {
      drones,
      pilots,
      summary: {
        totalDrones: drones.length,
        availableDrones: drones.filter((d) => d.status === 'deployable').length,
        totalPilots: pilots.length,
        availablePilots: pilots.filter((p: any) => p.status === 'active').length,
      },
    };
  }

  async addResource(dto: any, user: CurrentUser) {
    const db = this.firebaseAdminService.firestore();
    const resourceRef = db
      .collection(ROOT_COLLECTIONS.users)
      .doc(user.uid)
      .collection('resources')
      .doc();

    const resource = {
      resourceId: resourceRef.id,
      vendorUid: user.uid,
      type: dto.type, // 'battery', 'accessory', 'spare_part', 'tool'
      name: dto.name,
      category: dto.category,
      quantity: dto.quantity || 1,
      condition: dto.condition || 'new', // 'new', 'good', 'fair', 'poor'
      status: dto.status || 'available', // 'available', 'in_use', 'maintenance', 'retired'
      purchaseDate: dto.purchaseDate,
      purchasePrice: dto.purchasePrice,
      warranty: dto.warranty,
      specifications: dto.specifications || {},
      assignedTo: null, // droneId or null
      notes: dto.notes || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await resourceRef.set(resource);

    this.logger.log(`Resource ${resource.resourceId} added by vendor ${user.uid}`);

    return {
      message: 'Resource added successfully',
      resource,
    };
  }

  // ==================== ANALYTICS ====================

  async getFleetAnalytics(query: any, user: CurrentUser) {
    const { items: drones } = await this.listDrones({ page: 1, limit: 500 }, user);
    const pilots = await this.listFleetPilots({ page: 1, limit: 500 }, user);
    const { missions } = await this.listMissions({ page: 1, limit: 1000 }, user);

    return {
      period: query.period || 'month',
      drones: {
        total: drones.length,
        byStatus: this.groupByStatus(drones),
        averageFlightHours: this.calculateAverage(drones, 'totalFlightHours'),
      },
      pilots: {
        total: pilots.length,
        byStatus: this.groupByStatus(pilots),
      },
      missions: {
        total: missions.length,
        byStatus: this.groupByStatus(missions),
        completionRate: this.calculateCompletionRate(missions),
      },
    };
  }

  async getDroneUtilization(query: any, user: CurrentUser) {
    const { items: drones } = await this.listDrones({ page: 1, limit: 500 }, user);

    const utilization = drones.map((drone) => ({
      droneId: drone.id,
      model: drone.model,
      totalFlightHours: drone.totalFlightHours,
      utilizationRate: this.calculateUtilizationRate(drone),
      status: drone.status,
    }));

    return {
      period: query.period || 'month',
      drones: utilization,
      averageUtilization: this.calculateAverage(utilization, 'utilizationRate'),
    };
  }

  async getPilotPerformance(query: any, user: CurrentUser) {
    const pilots = await this.listFleetPilots({ page: 1, limit: 500 }, user);

    const performance = await Promise.all(
      pilots.map(async (pilot: any) => {
        const missionsSnapshot = await this.firebaseAdminService
          .firestore()
          .collectionGroup('bookings')
          .where('assignedPilot', '==', pilot.id)
          .get();

        const missions = missionsSnapshot.docs.map((doc) => doc.data());

        return {
          pilotId: pilot.id,
          name: pilot.name,
          totalMissions: missions.length,
          completedMissions: missions.filter((m: any) => m.status === 'completed').length,
          rating: pilot.profileData?.stats?.averageRating || 0,
          onTimeRate: this.calculateOnTimeRate(missions),
        };
      })
    );

    return {
      period: query.period || 'month',
      pilots: performance,
    };
  }

  // ==================== COMMISSION ====================

  async getCommission(user: CurrentUser) {
    const db = this.firebaseAdminService.firestore();

    const [userDoc, fmDoc1, fmDoc2] = await Promise.all([
      db.collection(ROOT_COLLECTIONS.users).doc(user.uid).get(),
      db.collection('fleet_managers').doc(user.uid).get(),
      db.collection(ROOT_COLLECTIONS.fleetManagers).doc(user.uid).get(),
    ]);

    const userData = userDoc.exists ? (userDoc.data() as any) || {} : {};
    const profileData = userData.profileData || {};
    const fmData = (fmDoc1.exists ? (fmDoc1.data() as any) : {}) || (fmDoc2.exists ? (fmDoc2.data() as any) : {}) || {};

    const totalRevenue = fmData.totalRevenue ?? userData.totalRevenue ?? profileData.totalRevenue ?? 0;
    const completedBookings = fmData.completedBookings ?? userData.completedBookings ?? profileData.completedBookings ?? 0;
    const activeBookings = fmData.activeBookings ?? userData.activeBookings ?? profileData.activeBookings ?? 0;

    const stats = {
      totalRevenue,
      completedBookings,
      activeBookings,
      assignedDrones: fmData.assignedDrones ?? userData.assignedDrones ?? profileData.assignedDrones ?? 0,
      assignedPilots: fmData.assignedPilots ?? userData.assignedPilots ?? profileData.assignedPilots ?? 0,
      coverageRadius: fmData.coverageRadius ?? userData.coverageRadius ?? profileData.coverageRadius ?? 0,
      rating: fmData.rating ?? userData.rating ?? profileData.rating ?? 0,
      region: fmData.region ?? userData.region ?? profileData.region ?? '',
    };

    return {
      ...stats,
      createdAt: userData.createdAt || null,
      commission: Math.round(totalRevenue * 0.15 * 100) / 100,
    };
  }

  /**
   * Get pending commission for vendor
   * Commission from completed missions awaiting settlement
   */
  async getPendingCommission(user: CurrentUser) {
    const db = this.firebaseAdminService.firestore();
    
    // Get completed missions without settlements
    const missionsSnapshot = await db
      .collection(ROOT_COLLECTIONS.bookings)
      .where('fleetManagerUid', '==', user.uid)
      .where('status', '==', 'completed')
      .get();

    const pendingMissions = [];
    let totalPending = 0;

    for (const doc of missionsSnapshot.docs) {
      const mission = doc.data() as any;
      
      // Check if already settled
      const settlementSnapshot = await db
        .collection('settlements')
        .where('bookingId', '==', mission.id)
        .where('recipientId', '==', user.uid)
        .where('status', '==', 'settled')
        .get();

      if (settlementSnapshot.empty) {
        // Calculate commission (simplified - would use actual pricing rules)
        const missionRevenue = mission.finalPrice || mission.priceEstimation || 0;
        const commissionRate = 0.70; // 70% to vendor (example rate)
        const commission = Math.round(missionRevenue * commissionRate * 100) / 100;

        totalPending += commission;
        pendingMissions.push({
          bookingId: mission.id,
          completedAt: mission.completedAt || mission.updatedAt,
          revenue: missionRevenue,
          commission,
          serviceType: mission.serviceType,
        });
      }
    }

    return {
      pending: Math.round(totalPending * 100) / 100,
      missions: pendingMissions,
      count: pendingMissions.length,
    };
  }

  /**
   * Get commission settlement history for vendor
   */
  async getCommissionHistory(user: CurrentUser) {
    const db = this.firebaseAdminService.firestore();
    
    const settlementsSnapshot = await db
      .collection('settlements')
      .where('recipientId', '==', user.uid)
      .where('recipientRole', '==', 'vendor')
      .where('status', '==', 'settled')
      .orderBy('settledAt', 'desc')
      .limit(50)
      .get();

    const history = settlementsSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        settlementId: doc.id,
        bookingId: data.bookingId,
        amount: data.amount,
        settledAt: data.settledAt,
        paymentMethod: data.paymentMethod,
        transactionId: data.transactionId,
        period: data.period, // e.g., "2024-01-W1"
      };
    });

    const totalSettled = history.reduce((sum, settlement) => sum + settlement.amount, 0);

    return {
      history,
      totalSettled: Math.round(totalSettled * 100) / 100,
      count: history.length,
    };
  }

  // ==================== HELPER METHODS ====================

  private calculateHealthScore(drone: any): number {
    let score = 100;

    // Deduct points based on flight hours
    const hoursRemaining = 100 - (drone.totalFlightHours || 0);
    if (hoursRemaining < 20) score -= 30;
    else if (hoursRemaining < 50) score -= 15;

    // Deduct points if maintenance is overdue
    if (drone.nextMaintenanceDue && new Date(drone.nextMaintenanceDue) < new Date()) {
      score -= 40;
    }

    return Math.max(0, score);
  }

  private identifyIssues(drone: any): string[] {
    const issues: string[] = [];

    if (drone.totalFlightHours >= 100) {
      issues.push('Flight hours exceeded maintenance interval');
    }

    if (drone.nextMaintenanceDue && new Date(drone.nextMaintenanceDue) < new Date()) {
      issues.push('Maintenance overdue');
    }

    if (drone.status === 'under_maintenance') {
      issues.push('Currently under maintenance');
    }

    return issues;
  }

  private generateRecommendations(drone: any): string[] {
    const recommendations: string[] = [];

    if (drone.totalFlightHours >= 90) {
      recommendations.push('Schedule maintenance soon');
    }

    if (!drone.lastMaintenance) {
      recommendations.push('No maintenance history found - schedule inspection');
    }

    return recommendations;
  }

  private groupByStatus(items: any[]): any {
    return items.reduce((acc, item) => {
      const status = item.status || 'unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
  }

  private calculateAverage(items: any[], field: string): number {
    if (items.length === 0) return 0;
    const sum = items.reduce((acc, item) => acc + (item[field] || 0), 0);
    return Math.round((sum / items.length) * 10) / 10;
  }

  private calculateCompletionRate(missions: any[]): number {
    if (missions.length === 0) return 0;
    const completed = missions.filter((m) => m.status === 'completed').length;
    return Math.round((completed / missions.length) * 100);
  }

  private calculateUtilizationRate(drone: any): number {
    // Simplified: hours / max hours * 100
    const maxHours = 100;
    return Math.round((drone.totalFlightHours / maxHours) * 100);
  }

  /**
   * Calculate on-time delivery rate from mission data
   * Compares actual completion time vs scheduled time
   */
  private calculateOnTimeRate(missions: any[]): number {
    if (missions.length === 0) return 0;

    const completedMissions = missions.filter((m) => m.status === 'completed' && m.scheduledDate && m.completedAt);
    
    if (completedMissions.length === 0) return 100; // No data means perfect record

    let onTimeCount = 0;
    
    for (const mission of completedMissions) {
      const scheduled = new Date(mission.scheduledDate);
      const completed = new Date(mission.completedAt);
      
      // Consider on-time if completed within 2 hours of scheduled time
      const toleranceMs = 2 * 60 * 60 * 1000; // 2 hours
      const scheduledEnd = new Date(scheduled.getTime() + toleranceMs);
      
      if (completed <= scheduledEnd) {
        onTimeCount++;
      }
    }

    return Math.round((onTimeCount / completedMissions.length) * 100);
  }

  private async findBookingRef(bookingId: string) {
    const snapshot = await this.firebaseAdminService
      .firestore()
      .collectionGroup('bookings')
      .where('id', '==', bookingId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      throw new NotFoundException(`Booking ${bookingId} not found`);
    }

    return snapshot.docs[0].ref;
  }

  /**
   * Create (or update) the mission record at missions/{bookingId} so the
   * assigned pilot sees the booking in their incoming requests (the pilot app
   * lists missions from the `missions` collection with status 'pending').
   */
  private async upsertPilotMission(
    bookingId: string,
    pilotUid: string,
    now: string,
  ): Promise<void> {
    const db = this.firebaseAdminService.firestore();
    const missionRef = db.collection(ROOT_COLLECTIONS.missions).doc(bookingId);
    const existing = await missionRef.get().catch(() => null);

    if (existing?.exists) {
      const data = existing.data() as FirestoreMissionDocument | undefined;
      const advancedStatuses = ['accepted', 'en_route', 'at_location', 'preflight', 'started', 'completed'];
      if (data && advancedStatuses.includes(data.status)) {
        await missionRef.update({ pilotUid, updatedAt: now }).catch(() => {});
        return;
      }
      await missionRef.set(
        {
          ...(data || {}),
          requestId: bookingId,
          bookingId,
          pilotUid,
          status: 'pending',
          updatedAt: now,
        },
        { merge: true },
      );
      return;
    }

    const mission: FirestoreMissionDocument = {
      requestId: bookingId,
      bookingId,
      pilotUid,
      status: 'pending',
      startTime: null,
      endTime: null,
      geoTrack: [],
      reportSummary: {},
      createdAt: now,
      updatedAt: now,
    };
    await missionRef.set(mission, { merge: true });
  }

  // ==================== REFUNDS ====================

  async getRefunds(user: CurrentUser) {
    // Get all refunded bookings for this vendor
    const refundsSnapshot = await this.firebaseAdminService
      .firestore()
      .collectionGroup('bookings')
      .where('vendorUid', '==', user.uid)
      .where('paymentStatus', '==', 'refunded')
      .get();

    const refunds = refundsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return {
      refunds,
      totalRefunds: refunds.length,
      totalAmount: refunds.reduce((sum: number, r: any) => sum + (r.finalPrice || 0), 0),
    };
  }

  // ==================== PROFILE & SETTINGS ====================

  /**
   * Fleet manager duty toggle — mirrors pilot availability.
   * Off-duty (isOnline=false) FMs are excluded from incoming requests
   * and auto-assignment (see fleet-manager matching + request services).
   */
  async updateAvailability(dto: { isOnline: boolean }, user: CurrentUser) {
    const db = this.firebaseAdminService.firestore();
    const now = new Date().toISOString();
    const userRef = db.collection(ROOT_COLLECTIONS.users).doc(user.uid);
    const existing = await userRef.get();
    if (!existing.exists) {
      throw new NotFoundException('Fleet manager profile not found');
    }
    const data = (existing.data() || {}) as any;

    await userRef.set(
      {
        profileData: {
          ...(data.profileData || {}),
          isOnline: dto.isOnline,
          lastAvailabilityChange: now,
        },
        updatedAt: now,
      },
      { merge: true },
    );

    await this.cacheService.delete(`user:${user.uid}`);
    await this.cacheService.deletePattern('vendor-.*');

    this.eventEmitter.emit(WS_EVENTS.FLEET_MANAGER_AVAILABILITY_CHANGED, {
      fleetManagerUid: user.uid,
      isOnline: dto.isOnline,
      timestamp: now,
    });

    this.logger.log(`Fleet manager availability updated: ${user.uid} - ${dto.isOnline ? 'ONLINE' : 'OFFLINE'}`);

    return { isOnline: dto.isOnline };
  }

  async getFleetProfile(user: CurrentUser) {
    const db = this.firebaseAdminService.firestore();
    const [userDoc, fmDoc1, fmDoc2] = await Promise.all([
      db.collection(ROOT_COLLECTIONS.users).doc(user.uid).get(),
      db.collection('fleet_managers').doc(user.uid).get(),
      db.collection(ROOT_COLLECTIONS.fleetManagers).doc(user.uid).get(),
    ]);

    if (!userDoc.exists) {
      throw new NotFoundException('Fleet manager profile not found');
    }

    const profile = userDoc.data() as FirestoreUserDocument;
    const fmData = (fmDoc1.exists ? (fmDoc1.data() as any) : {}) || (fmDoc2.exists ? (fmDoc2.data() as any) : {}) || {};

    // Get fleet statistics
    const { items: drones } = await this.listDrones({ page: 1, limit: 500 }, user);
    const pilots = await this.listFleetPilots({ page: 1, limit: 500 }, user);
    const { missions } = await this.listMissions({ page: 1, limit: 1000 }, user);

    return {
      profile,
      stats: {
        totalRevenue: fmData.totalRevenue ?? 0,
        totalDrones: drones.length,
        totalPilots: pilots.length,
        totalMissions: missions.length,
        completedMissions: missions.filter((m: any) => m.status === 'completed').length,
        activeMissions: missions.filter((m: any) => 
          ['pending', 'confirmed', 'in_progress'].includes(m.status)
        ).length,
      },
    };
  }

  async updateFleetProfile(dto: any, user: CurrentUser) {
    const userRef = this.firebaseAdminService
      .firestore()
      .collection(ROOT_COLLECTIONS.users)
      .doc(user.uid);

    await userRef.update({
      name: dto.name || undefined,
      email: dto.email || undefined,
      phone: dto.phone || undefined,
      'profileData.businessName': dto.businessName || undefined,
      'profileData.gstNumber': dto.gstNumber || undefined,
      'profileData.address': dto.address || undefined,
      'profileData.state': dto.state || undefined,
      'profileData.district': dto.district || undefined,
      'profileData.pincode': dto.pincode || undefined,
      'profileData.bankDetails': dto.bankDetails || undefined,
      updatedAt: new Date().toISOString(),
    });

    // Invalidate cache
    await this.cacheService.delete(`user:${user.uid}`);
    await this.cacheService.deletePattern('vendor-.*');

    return { success: true, message: 'Profile updated successfully' };
  }

  // ==================== COMPLAINTS ====================

  async getComplaints(user: CurrentUser) {
    const complaintsSnapshot = await this.firebaseAdminService
      .firestore()
      .collection('complaints')
      .where('userId', '==', user.uid)
      .where('userRole', '==', 'vendor')
      .get();

    const complaints = complaintsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return {
      complaints,
      total: complaints.length,
      byStatus: {
        open: complaints.filter((c: any) => c.status === 'OPEN').length,
        inProgress: complaints.filter((c: any) => c.status === 'IN_PROGRESS').length,
        resolved: complaints.filter((c: any) => c.status === 'RESOLVED').length,
        closed: complaints.filter((c: any) => c.status === 'CLOSED').length,
      },
    };
  }

  async createComplaint(dto: any, user: CurrentUser) {
    const complaintRef = this.firebaseAdminService
      .firestore()
      .collection('complaints')
      .doc();

    const now = new Date().toISOString();
    const complaint = {
      id: complaintRef.id,
      complaintId: complaintRef.id,
      userId: user.uid,
      userRole: 'vendor',
      relatedEntityType: dto.relatedEntityType || 'GENERAL',
      relatedEntityId: dto.relatedEntityId || null,
      type: dto.type || 'OTHER',
      title: dto.title,
      description: dto.description,
      attachments: dto.attachments || [],
      status: 'OPEN',
      priority: dto.priority || 'MEDIUM',
      assignedTo: null,
      resolution: null,
      resolvedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    await complaintRef.set(complaint);

    this.eventEmitter.emit('complaint.created', {
      complaintId: complaintRef.id,
      userId: user.uid,
      type: complaint.type,
    });

    return {
      success: true,
      complaintId: complaintRef.id,
      complaint,
    };
  }

  // ==================== NOTIFICATION SETTINGS ====================

  async updateNotificationSettings(dto: any, user: CurrentUser) {
    const userRef = this.firebaseAdminService
      .firestore()
      .collection(ROOT_COLLECTIONS.users)
      .doc(user.uid);

    await userRef.update({
      'profileData.notificationSettings': {
        push: dto.push !== undefined ? dto.push : true,
        email: dto.email !== undefined ? dto.email : true,
        sms: dto.sms !== undefined ? dto.sms : true,
        bookingUpdates: dto.bookingUpdates !== undefined ? dto.bookingUpdates : true,
        maintenanceAlerts: dto.maintenanceAlerts !== undefined ? dto.maintenanceAlerts : true,
        pilotUpdates: dto.pilotUpdates !== undefined ? dto.pilotUpdates : true,
        paymentUpdates: dto.paymentUpdates !== undefined ? dto.paymentUpdates : true,
      },
      updatedAt: new Date().toISOString(),
    });

    // Invalidate cache
    await this.cacheService.delete(`user:${user.uid}`);

    return {
      success: true,
      message: 'Notification settings updated successfully',
    };
  }

  // ==================== ACCOUNT DELETION ====================

  async deleteAccount(user: CurrentUser) {
    // Check for active missions
    const activeMissionsSnapshot = await this.firebaseAdminService
      .firestore()
      .collectionGroup('bookings')
      .where('vendorUid', '==', user.uid)
      .where('status', 'in', ['pending', 'confirmed', 'in_progress'])
      .limit(1)
      .get();

    if (!activeMissionsSnapshot.empty) {
      throw new BadRequestException(
        'Cannot delete account with active missions. Please complete or cancel all active missions first.'
      );
    }

    // Check for pending settlements
    const { pending } = await this.getPendingCommission(user);
    if (pending > 0) {
      throw new BadRequestException(
        'Cannot delete account with pending settlements. Please wait for all payments to be processed.'
      );
    }

    // Mark account for deletion (soft delete)
    const userRef = this.firebaseAdminService
      .firestore()
      .collection(ROOT_COLLECTIONS.users)
      .doc(user.uid);

    await userRef.update({
      status: 'deleted',
      deletedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Deactivate all pilots
    const pilotsSnapshot = await this.firebaseAdminService
      .firestore()
      .collection(ROOT_COLLECTIONS.pilots)
      .where('profileData.assignedFleetManagerUid', '==', user.uid)
      .get();

    const batch = this.firebaseAdminService.firestore().batch();
    const now = new Date().toISOString();

    for (const doc of pilotsSnapshot.docs) {
      // Update pilots collection
      batch.update(doc.ref, {
        'profileData.assignedVendorUid': null,
        status: 'inactive',
        updatedAt: now,
      });
      // Also update users collection
      const userRef = this.firebaseAdminService.firestore()
        .collection(ROOT_COLLECTIONS.users)
        .doc(doc.id);
      batch.update(userRef, {
        'profileData.assignedVendorUid': null,
        status: 'inactive',
        updatedAt: now,
      });
    }
    await batch.commit();

    // Retire all drones
    const { items: drones } = await this.listDrones({ page: 1, limit: 500 }, user);
    const droneBatch = this.firebaseAdminService.firestore().batch();
    for (const drone of drones) {
      const { ref } = await this.findDrone(drone.id);
      droneBatch.update(ref, {
        status: 'retired',
        updatedAt: new Date().toISOString(),
      });
    }
    await droneBatch.commit();

    this.eventEmitter.emit('account.deleted', {
      userId: user.uid,
      role: 'vendor',
    });

    return {
      success: true,
      message: 'Account deletion request processed. Your account will be permanently deleted in 30 days.',
    };
  }

  // ==================== DRONE MAINTENANCE HISTORY ====================

  async getDroneMaintenanceHistory(droneId: string, user: CurrentUser) {
    const { drone } = await this.findDrone(droneId);
    
    // Check access
    if (user.role === 'vendor') {
      this.assertVendorOwnsDrone(drone, user);
    } else if (user.role !== 'admin' && user.role !== 'technician') {
      throw new ForbiddenException('You do not have access to this drone');
    }

    // Get all maintenance logs for this drone
    const maintenanceSnapshot = await this.maintenanceCollection()
      .where('droneId', '==', droneId)
      .get();

    const maintenanceLogs = maintenanceSnapshot.docs
      .map((doc) => ({ uid: doc.id, ...doc.data() })) // Changed 'id' to 'uid' to avoid duplication
      .sort((a: any, b: any) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

    return {
      droneId,
      drone: {
        id: drone.id,
        model: drone.model,
        status: drone.status,
        totalFlightHours: drone.totalFlightHours,
        lastMaintenance: drone.lastMaintenance,
      },
      maintenanceHistory: maintenanceLogs,
      totalMaintenances: maintenanceLogs.length,
      summary: {
        scheduled: maintenanceLogs.filter((m: any) => m.status === 'scheduled').length,
        inProgress: maintenanceLogs.filter((m: any) => m.status === 'in_progress').length,
        completed: maintenanceLogs.filter((m: any) => m.status === 'completed').length,
      },
    };
  }

}

import { Injectable, NotFoundException } from '@nestjs/common';
import { FirebaseAdminService } from '../../firebase/firebase-admin.service';
import { ROOT_COLLECTIONS, USER_SUBCOLLECTIONS } from '../../common/constants/collection-paths.constant';
import type { CurrentUser } from '../../common/interfaces/current-user.interface';

@Injectable()
export class PilotAdminService {
  constructor(private readonly firebaseAdminService: FirebaseAdminService) {}

  /**
   * Get all pilots with optional filters and pagination
   */
  async getAllPilots(filters: {
    status?: string;
    state?: string;
    district?: string;
    vendorUid?: string;
    minRating?: number;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const db = this.firebaseAdminService.firestore();
    
    // Pagination defaults
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;
    
    let query: any = db.collection(ROOT_COLLECTIONS.pilots);

    // Apply filters
    if (filters.status) {
      query = query.where('status', '==', filters.status);
    }
    if (filters.state) {
      query = query.where('state', '==', filters.state);
    }
    if (filters.district) {
      query = query.where('district', '==', filters.district);
    }
    if (filters.vendorUid) {
      query = query.where('managedByFleetManagerUid', '==', filters.vendorUid);
    }
    if (filters.minRating) {
      query = query.where('rating', '>=', filters.minRating);
    }

    // Get total count for pagination
    const countSnapshot = await query.count().get();
    const totalCount = countSnapshot.data().count;
    
    // Apply pagination
    query = query.orderBy('createdAt', 'desc').limit(limit).offset(offset);
    
    const snapshot = await query.get();
    let pilots = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Client-side search filter (if needed)
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      pilots = pilots.filter(
        (pilot: any) =>
          pilot.fullName?.toLowerCase().includes(searchLower) ||
          pilot.name?.toLowerCase().includes(searchLower) ||
          pilot.id?.toLowerCase().includes(searchLower) || // UID search (use pilot.id not doc.id)
          pilot.email?.toLowerCase().includes(searchLower) ||
          pilot.mobile?.includes(searchLower) ||
          pilot.phone?.includes(searchLower),
      );
    }

    return {
      data: pilots,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNext: page < Math.ceil(totalCount / limit),
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Get pilot by ID (UID in hybrid model)
   */
  async getPilotById(pilotUid: string) {
    const db = this.firebaseAdminService.firestore();
    const pilotDoc = await db
      .collection(ROOT_COLLECTIONS.pilots)
      .doc(pilotUid)
      .get();

    if (!pilotDoc.exists) {
      throw new NotFoundException(`Pilot with UID ${pilotUid} not found`);
    }

    return {
      uid: pilotDoc.id,
      ...pilotDoc.data(),
    };
  }

  /**
   * Update pilot information
   */
  async updatePilot(pilotUid: string, updateData: any, user: CurrentUser) {
    const db = this.firebaseAdminService.firestore();
    const docRef = db.collection(ROOT_COLLECTIONS.pilots).doc(pilotUid);
    
    const pilotDoc = await docRef.get();
    if (!pilotDoc.exists) {
      throw new NotFoundException(`Pilot with UID ${pilotUid} not found`);
    }

    await docRef.update({
      ...updateData,
      updatedAt: new Date().toISOString(),
      updatedBy: user.uid,
    });

    const updated = await docRef.get();
    return {
      uid: updated.id,
      ...updated.data(),
    };
  }

  /**
   * Update pilot status
   */
  async updatePilotStatus(pilotUid: string, status: string, user: CurrentUser) {
    return this.updatePilot(pilotUid, { status }, user);
  }

  /**
   * Remove/suspend pilot
   */
  async removePilot(pilotUid: string, user: CurrentUser) {
    return this.updatePilot(pilotUid, { status: 'SUSPENDED' }, user);
  }

  /**
   * Get pilot statistics
   */
  async getPilotStats(pilotUid: string) {
    const db = this.firebaseAdminService.firestore();
    
    // Get pilot data
    const pilot: any = await this.getPilotById(pilotUid);
    
    // Get bookings for stats (hybrid model uses pilotUid)
    const bookingsSnapshot = await db
      .collection('bookings')
      .where('pilotUid', '==', pilotUid)
      .get();

    const bookings = bookingsSnapshot.docs.map((doc: any) => doc.data());
    
    const totalBookings = bookings.length;
    const completedBookings = bookings.filter(
      (b: any) => b.bookingStatus === 'COMPLETED',
    ).length;
    const activeBookings = bookings.filter((b: any) =>
      ['CONFIRMED', 'IN_PROGRESS'].includes(b.bookingStatus),
    ).length;
    const cancelledBookings = bookings.filter(
      (b: any) => b.bookingStatus === 'CANCELLED',
    ).length;

    const totalEarnings = bookings
      .filter((b: any) => b.bookingStatus === 'COMPLETED')
      .reduce((sum: number, b: any) => sum + (b.price?.total || 0), 0);

    const completionRate =
      totalBookings > 0 ? (completedBookings / totalBookings) * 100 : 0;

    return {
      totalBookings,
      completedBookings,
      activeBookings,
      cancelledBookings,
      totalEarnings,
      averageRating: pilot.rating || 0,
      completionRate,
      onTimeRate: pilot.onTimePercentage || 0,
      totalFlightHours: pilot.flightHours || 0,
      totalFlightDistance: pilot.totalFlightDistance || 0,
    };
  }

  /**
   * Get pilot bookings
   */
  async getPilotBookings(
    pilotUid: string,
    filters: { status?: string; limit?: number },
  ) {
    const db = this.firebaseAdminService.firestore();
    let query: any = db.collection('bookings').where('pilotUid', '==', pilotUid);

    if (filters.status) {
      query = query.where('status', '==', filters.status);
    }

    query = query.orderBy('scheduledDate', 'desc');

    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    const snapshot = await query.get();
    return snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    }));
  }

  /**
   * Get pilot support tickets
   */
  async getPilotSupportTickets(pilotUid: string) {
    const db = this.firebaseAdminService.firestore();
    
    // Get tickets where pilotUid matches (hybrid model)
    const ticketsSnapshot = await db
      .collection(ROOT_COLLECTIONS.supportTickets)
      .where('pilotUid', '==', pilotUid)
      .orderBy('createdAt', 'desc')
      .get();

    return ticketsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
  }

  /**
   * Get pilot's maintenance tickets (via assigned drone)
   */
  async getPilotMaintenanceTickets(pilotUid: string) {
    const db = this.firebaseAdminService.firestore();
    
    // Get pilot to find current drone
    const pilot: any = await this.getPilotById(pilotUid);
    
    // Get all bookings for this pilot to find all drones they've used
    const bookingsSnapshot = await db
      .collection('bookings')
      .where('pilotUid', '==', pilotUid)
      .get();

    const droneIds = new Set<string>();
    
    // Add current drone if exists
    if (pilot.currentDroneId) {
      droneIds.add(pilot.currentDroneId);
    }
    
    // Add drones from bookings
    bookingsSnapshot.docs.forEach(doc => {
      const droneId = doc.data().droneId;
      if (droneId) {
        droneIds.add(droneId);
      }
    });

    if (droneIds.size === 0) {
      return [];
    }

    // Get maintenance tickets for these drones
    const tickets = [];
    const droneIdArray = Array.from(droneIds);
    
    for (let i = 0; i < droneIdArray.length; i += 10) {
      const chunk = droneIdArray.slice(i, i + 10);
      const ticketsSnapshot = await db
        .collection(ROOT_COLLECTIONS.maintenanceTickets)
        .where('droneId', 'in', chunk)
        .orderBy('createdAt', 'desc')
        .get();
      
      tickets.push(...ticketsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })));
    }

    return tickets;
  }

  /**
   * Get pilot's fleet manager
   */
  async getPilotFleetManager(pilotUid: string) {
    const pilot: any = await this.getPilotById(pilotUid);
    
    if (!pilot.managedByFleetManagerUid) {
      return null;
    }

    const db = this.firebaseAdminService.firestore();
    const fmDoc = await db
      .collection(ROOT_COLLECTIONS.fleetManagers)
      .doc(pilot.managedByFleetManagerUid)
      .get();

    if (!fmDoc.exists) {
      return null;
    }

    return {
      uid: fmDoc.id,
      ...fmDoc.data(),
    };
  }

  /**
   * Get pilot earnings
   */
  async getPilotEarnings(pilotUid: string, startDate?: string, endDate?: string) {
    const db = this.firebaseAdminService.firestore();
    let query: any = db
      .collection('bookings')
      .where('pilotUid', '==', pilotUid)
      .where('status', '==', 'completed');

    if (startDate) {
      query = query.where('completedAt', '>=', startDate);
    }
    if (endDate) {
      query = query.where('completedAt', '<=', endDate);
    }

    const snapshot = await query.get();
    const bookings = snapshot.docs.map((doc: any) => doc.data());

    const total = bookings.reduce(
      (sum: number, b: any) => sum + (b.price?.total || 0),
      0,
    );

    const breakdown = bookings.map((b: any) => ({
      bookingId: b.bookingId,
      bookingNumber: b.bookingNumber,
      completedAt: b.completedAt,
      amount: b.price?.total || 0,
      serviceType: b.serviceType,
    }));

    return { total, breakdown };
  }

  // ==================== PILOT REQUESTS ====================

  /**
   * Get all pilot requests
   */
  async getAllPilotRequests(status?: string) {
    const db = this.firebaseAdminService.firestore();
    let query: any = db.collection(ROOT_COLLECTIONS.pilotRequests);

    if (status) {
      query = query.where('status', '==', status);
    }

    query = query.orderBy('createdAt', 'desc');

    const snapshot = await query.get();
    return snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    }));
  }

  /**
   * Get pilot request by ID
   */
  async getPilotRequestById(requestId: string) {
    const db = this.firebaseAdminService.firestore();
    const snapshot = await db
      .collection(ROOT_COLLECTIONS.pilotRequests)
      .where('requestId', '==', requestId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      throw new NotFoundException(`Pilot request with ID ${requestId} not found`);
    }

    return {
      id: snapshot.docs[0].id,
      ...snapshot.docs[0].data(),
    };
  }

  /**
   * Approve pilot request
   */
  async approvePilotRequest(
    requestId: string,
    assignedFleetManagerUid: string,
    user: CurrentUser,
  ) {
    const db = this.firebaseAdminService.firestore();
    const request: any = await this.getPilotRequestById(requestId);

    // Create new pilot document using Firebase Auth UID
    // In real implementation, this should be the UID from Firebase Auth after account creation
    const newPilotUid = request.firebaseUid || request.uid;
    
    if (!newPilotUid) {
      throw new Error('Firebase Auth UID not found in pilot request');
    }

    const newPilot = {
      uid: newPilotUid,
      fullName: request.fullName,
      name: request.fullName,
      mobile: request.mobile,
      phone: request.mobile,
      email: request.email,
      age: request.age,
      experience: request.experience,
      flightHours: request.flightHours,
      licenseNumber: request.licenseNumber,
      aadhaarNumber: request.aadhaarNumber,
      managedByFleetManagerUid: assignedFleetManagerUid || null,
      status: 'AVAILABLE',
      rating: 0,
      totalMissions: 0,
      completedMissions: 0,
      totalFlightDistance: 0,
      onTimePercentage: 0,
      safetyScore: 100,
      averageRating: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      approvedBy: user.uid,
    };

    await db.collection(ROOT_COLLECTIONS.pilots).doc(newPilotUid).set(newPilot);

    // Update request status
    const requestSnapshot = await db
      .collection(ROOT_COLLECTIONS.pilotRequests)
      .where('requestId', '==', requestId)
      .limit(1)
      .get();

    // Prepare update data, excluding undefined values
    const updateData: any = {
      status: 'APPROVED',
      approvedAt: new Date().toISOString(),
      approvedBy: user.uid,
      updatedAt: new Date().toISOString(),
    };

    // Only add managedByFleetManagerUid if it's defined
    if (assignedFleetManagerUid !== undefined) {
      updateData.managedByFleetManagerUid = assignedFleetManagerUid;
    }

    await requestSnapshot.docs[0].ref.update(updateData);

    return {
      pilot: newPilot,
      request: await this.getPilotRequestById(requestId),
    };
  }

  /**
   * Reject pilot request
   */
  async rejectPilotRequest(
    requestId: string,
    rejectionReason: string,
    user: CurrentUser,
  ) {
    const db = this.firebaseAdminService.firestore();
    const requestSnapshot = await db
      .collection(ROOT_COLLECTIONS.pilotRequests)
      .where('requestId', '==', requestId)
      .limit(1)
      .get();

    if (requestSnapshot.empty) {
      throw new NotFoundException(`Pilot request with ID ${requestId} not found`);
    }

    await requestSnapshot.docs[0].ref.update({
      status: 'REJECTED',
      rejectedAt: new Date().toISOString(),
      rejectedBy: user.uid,
      rejectionReason,
      updatedAt: new Date().toISOString(),
    });

    return this.getPilotRequestById(requestId);
  }

  // ==================== DASHBOARD QUERIES ====================

  /**
   * Get active pilots today
   */
  async getActivePilotsToday() {
    const db = this.firebaseAdminService.firestore();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const snapshot = await db
      .collection(ROOT_COLLECTIONS.pilots)
      .where('status', 'in', ['ON_MISSION', 'AVAILABLE'])
      .where('lastActiveAt', '>=', today.toISOString())
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
  }

  /**
   * Get pilots with expiring licenses
   */
  async getExpiringLicenses(days: number = 30) {
    const db = this.firebaseAdminService.firestore();
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + days);

    const snapshot = await db
      .collection(ROOT_COLLECTIONS.pilots)
      .where('licenseExpiry', '>=', today.toISOString())
      .where('licenseExpiry', '<=', futureDate.toISOString())
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
  }

  /**
   * Get top performing pilots
   */
  async getTopPerformers(period: 'week' | 'month' | 'year', limit: number = 10) {
    const db = this.firebaseAdminService.firestore();
    
    // Get pilots with minimum missions threshold
    const pilotsSnapshot = await db
      .collection(ROOT_COLLECTIONS.pilots)
      .where('completedMissions', '>', 10)
      .orderBy('completedMissions', 'desc')
      .orderBy('rating', 'desc')
      .limit(limit)
      .get();

    return pilotsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
  }
}

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { FirebaseAdminService } from '../../../firebase/firebase-admin.service';
import { ROOT_COLLECTIONS, USER_SUBCOLLECTIONS } from '../../../common/constants/collection-paths.constant';
import type { FleetManagerFilterDto } from './dto/fleet-manager-filter.dto';
import type { FleetManagerStatsDto } from './dto/fleet-manager-stats.dto';

@Injectable()
export class FleetManagerService {
  constructor(private readonly firebaseAdminService: FirebaseAdminService) {}

  /**
   * Get paginated list of fleet managers with filters
   */
  async listFleetManagers(filter: FleetManagerFilterDto) {
    const db = this.firebaseAdminService.firestore();
    let query = db.collection(ROOT_COLLECTIONS.users).where('role', '==', 'fleet_manager');

    // Apply filters
    if (filter.status) {
      query = query.where('status', '==', filter.status) as any;
    }

    if (filter.approvalStatus) {
      const isApproved = filter.approvalStatus.toUpperCase() === 'APPROVED';
      query = query.where('adminApproval', '==', isApproved) as any;
    }

    if (filter.state) {
      query = query.where('profileData.state', '==', filter.state) as any;
    }

    if (filter.region) {
      query = query.where('profileData.region', '==', filter.region) as any;
    }

    // Pagination
    const page = filter.page || 1;
    const limit = filter.limit || 20;
    const offset = (page - 1) * limit;

    const snapshot = await query.get();
    const allDocs = snapshot.docs.map((doc) => doc.data());

    // Sort by createdAt descending
    allDocs.sort((a: any, b: any) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    });

    const paginatedDocs = allDocs.slice(offset, offset + limit);

    return {
      data: paginatedDocs,
      pagination: {
        page,
        limit,
        total: allDocs.length,
        totalPages: Math.ceil(allDocs.length / limit),
      },
    };
  }

  /**
   * Get detailed profile of a specific fleet manager
   */
  async getFleetManagerProfile(fleetManagerUid: string) {
    const db = this.firebaseAdminService.firestore();

    const userDoc = await db
      .collection(ROOT_COLLECTIONS.users)
      .doc(fleetManagerUid)
      .get();

    if (!userDoc.exists || userDoc.data()?.role !== 'fleet_manager') {
      throw new NotFoundException(`Fleet manager ${fleetManagerUid} not found`);
    }

    const fleetManager = userDoc.data();

    return {
      fleetManager,
    };
  }

  /**
   * Get statistics for a fleet manager
   */
  async getFleetManagerStats(fleetManagerUid: string, query: FleetManagerStatsDto) {
    const db = this.firebaseAdminService.firestore();

    // Verify fleet manager exists
    await this.getFleetManagerProfile(fleetManagerUid);

    // Calculate date range based on period
    const now = new Date();
    let startDate: Date;

    switch (query.period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1); // Default to month
    }

    // Get bookings for the period
    const bookingsSnapshot = await db
      .collection(ROOT_COLLECTIONS.bookings)
      .where('fleetManagerUid', '==', fleetManagerUid)
      .where('createdAt', '>=', startDate.toISOString())
      .get();

    const bookings = bookingsSnapshot.docs.map((doc) => doc.data());

    // Calculate stats
    const completed = bookings.filter((b: any) => b.bookingStatus === 'COMPLETED');
    const active = bookings.filter((b: any) =>
      ['CONFIRMED', 'IN_PROGRESS'].includes(b.bookingStatus),
    );
    const cancelled = bookings.filter((b: any) => b.bookingStatus === 'CANCELLED');

    const totalRevenue = completed.reduce((sum: number, b: any) => sum + (b.price?.total || 0), 0);

    return {
      period: query.period || 'month',
      startDate: startDate.toISOString(),
      endDate: now.toISOString(),
      bookings: {
        total: bookings.length,
        completed: completed.length,
        active: active.length,
        cancelled: cancelled.length,
      },
      revenue: {
        total: totalRevenue,
        average: completed.length > 0 ? totalRevenue / completed.length : 0,
      },
    };
  }

  /**
   * Get all pilots assigned to a fleet manager
   */
  async getAssignedPilots(
    fleetManagerUid: string,
    query: { page?: number; limit?: number; status?: string },
  ) {
    const db = this.firebaseAdminService.firestore();

    // Verify fleet manager exists
    await this.getFleetManagerProfile(fleetManagerUid);

    let pilotsQuery = db
      .collection(ROOT_COLLECTIONS.users)
      .where('role', '==', 'pilot')
      .where('profileData.assignedFleetManagerUid', '==', fleetManagerUid);

    if (query.status) {
      pilotsQuery = pilotsQuery.where('status', '==', query.status) as any;
    }

    const snapshot = await pilotsQuery.get();
    const allPilots = snapshot.docs.map((doc) => doc.data());

    // Pagination
    const page = query.page || 1;
    const limit = query.limit || 20;
    const offset = (page - 1) * limit;

    const paginatedPilots = allPilots.slice(offset, offset + limit);

    return {
      data: paginatedPilots,
      pagination: {
        page,
        limit,
        total: allPilots.length,
        totalPages: Math.ceil(allPilots.length / limit),
      },
    };
  }

  /**
   * Get all drones assigned to a fleet manager
   */
  async getAssignedDrones(
    fleetManagerUid: string,
    query: { page?: number; limit?: number; status?: string },
  ) {
    const db = this.firebaseAdminService.firestore();

    // Verify fleet manager exists
    await this.getFleetManagerProfile(fleetManagerUid);

    let dronesQuery = db
      .collectionGroup(USER_SUBCOLLECTIONS.drones)
      .where('managedByFleetManagerUid', '==', fleetManagerUid);

    if (query.status) {
      dronesQuery = dronesQuery.where('status', '==', query.status) as any;
    }

    const snapshot = await dronesQuery.get();
    const allDrones = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    // Pagination
    const page = query.page || 1;
    const limit = query.limit || 20;
    const offset = (page - 1) * limit;

    const paginatedDrones = allDrones.slice(offset, offset + limit);

    return {
      data: paginatedDrones,
      pagination: {
        page,
        limit,
        total: allDrones.length,
        totalPages: Math.ceil(allDrones.length / limit),
      },
    };
  }

  /**
   * Get all bookings for a fleet manager
   */
  async getFleetManagerBookings(
    fleetManagerUid: string,
    query: {
      page?: number;
      limit?: number;
      status?: string;
      startDate?: string;
      endDate?: string;
    },
  ) {
    const db = this.firebaseAdminService.firestore();

    // Verify fleet manager exists
    await this.getFleetManagerProfile(fleetManagerUid);

    let bookingsQuery = db.collection(ROOT_COLLECTIONS.bookings).where('fleetManagerUid', '==', fleetManagerUid);

    if (query.status) {
      bookingsQuery = bookingsQuery.where('status', '==', query.status) as any;
    }

    if (query.startDate) {
      bookingsQuery = bookingsQuery.where('createdAt', '>=', query.startDate) as any;
    }

    if (query.endDate) {
      bookingsQuery = bookingsQuery.where('createdAt', '<=', query.endDate) as any;
    }

    const snapshot = await bookingsQuery.get();
    const allBookings = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    // Sort by scheduledStart descending
    allBookings.sort((a: any, b: any) => {
      const dateA = new Date(a.scheduledStart || a.createdAt || 0).getTime();
      const dateB = new Date(b.scheduledStart || b.createdAt || 0).getTime();
      return dateB - dateA;
    });

    // Pagination
    const page = query.page || 1;
    const limit = query.limit || 20;
    const offset = (page - 1) * limit;

    const paginatedBookings = allBookings.slice(offset, offset + limit);

    return {
      data: paginatedBookings,
      pagination: {
        page,
        limit,
        total: allBookings.length,
        totalPages: Math.ceil(allBookings.length / limit),
      },
    };
  }

  /**
   * Get all maintenance tickets for fleet manager's drones
   */
  async getMaintenanceTickets(
    fleetManagerUid: string,
    query: {
      page?: number;
      limit?: number;
      status?: string;
      priority?: string;
    },
  ) {
    const db = this.firebaseAdminService.firestore();

    // Verify fleet manager exists
    await this.getFleetManagerProfile(fleetManagerUid);

    let ticketsQuery = db
      .collection(ROOT_COLLECTIONS.maintenanceTickets)
      .where('fleetManagerUid', '==', fleetManagerUid);

    if (query.status) {
      ticketsQuery = ticketsQuery.where('status', '==', query.status) as any;
    }

    if (query.priority) {
      ticketsQuery = ticketsQuery.where('priority', '==', query.priority) as any;
    }

    const snapshot = await ticketsQuery.get();
    const allTickets = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    // Sort by createdAt descending
    allTickets.sort((a: any, b: any) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    });

    // Pagination
    const page = query.page || 1;
    const limit = query.limit || 20;
    const offset = (page - 1) * limit;

    const paginatedTickets = allTickets.slice(offset, offset + limit);

    return {
      data: paginatedTickets,
      pagination: {
        page,
        limit,
        total: allTickets.length,
        totalPages: Math.ceil(allTickets.length / limit),
      },
    };
  }

  /**
   * Get all support tickets related to fleet manager's bookings
   */
  async getSupportTickets(
    fleetManagerUid: string,
    query: {
      page?: number;
      limit?: number;
      status?: string;
      priority?: string;
    },
  ) {
    const db = this.firebaseAdminService.firestore();

    // Verify fleet manager exists
    await this.getFleetManagerProfile(fleetManagerUid);

    // First, get all booking IDs for this fleet manager
    const bookingsSnapshot = await db
      .collection(ROOT_COLLECTIONS.bookings)
      .where('vendorUid', '==', fleetManagerUid)
      .get();

    const bookingIds = bookingsSnapshot.docs.map((doc) => doc.data().bookingId);

    if (bookingIds.length === 0) {
      return {
        data: [],
        pagination: {
          page: query.page || 1,
          limit: query.limit || 20,
          total: 0,
          totalPages: 0,
        },
      };
    }

    // Firestore 'in' query has a limit of 10 values, so we need to batch
    const allTickets: any[] = [];
    for (let i = 0; i < bookingIds.length; i += 10) {
      const chunk = bookingIds.slice(i, i + 10);
      let ticketsQuery = db.collection(ROOT_COLLECTIONS.supportTickets).where('bookingId', 'in', chunk);

      const snapshot = await ticketsQuery.get();
      allTickets.push(...snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    }

    // Apply additional filters
    let filteredTickets = allTickets;

    if (query.status) {
      filteredTickets = filteredTickets.filter((t: any) => t.status === query.status);
    }

    if (query.priority) {
      filteredTickets = filteredTickets.filter((t: any) => t.priority === query.priority);
    }

    // Sort by createdAt descending
    filteredTickets.sort((a: any, b: any) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    });

    // Pagination
    const page = query.page || 1;
    const limit = query.limit || 20;
    const offset = (page - 1) * limit;

    const paginatedTickets = filteredTickets.slice(offset, offset + limit);

    return {
      data: paginatedTickets,
      pagination: {
        page,
        limit,
        total: filteredTickets.length,
        totalPages: Math.ceil(filteredTickets.length / limit),
      },
    };
  }

  /**
   * Get comprehensive dashboard data for fleet manager
   */
  async getFleetManagerDashboard(fleetManagerUid: string) {
    const db = this.firebaseAdminService.firestore();

    // Get fleet manager profile
    const { fleetManager } = await this.getFleetManagerProfile(fleetManagerUid);

    // Get pilots count by status
    const pilotsSnapshot = await db
      .collection(ROOT_COLLECTIONS.users)
      .where('role', '==', 'pilot')
      .where('profileData.managedByFleetManagerUid', '==', fleetManagerUid)
      .get();

    const pilots = pilotsSnapshot.docs.map((doc) => doc.data());
    const pilotsByStatus = {
      AVAILABLE: pilots.filter((p: any) => p.status === 'AVAILABLE').length,
      ON_MISSION: pilots.filter((p: any) => p.status === 'ON_MISSION').length,
      ON_BREAK: pilots.filter((p: any) => p.status === 'ON_BREAK').length,
      OFFLINE: pilots.filter((p: any) => p.status === 'OFFLINE').length,
    };

    // Get drones count by status
    const dronesSnapshot = await db
      .collectionGroup(USER_SUBCOLLECTIONS.drones)
      .where('managedByFleetManagerUid', '==', fleetManagerUid)
      .get();

    const drones = dronesSnapshot.docs.map((doc) => doc.data());
    const dronesByStatus = {
      AVAILABLE: drones.filter((d: any) => d.status === 'AVAILABLE').length,
      IN_USE: drones.filter((d: any) => d.status === 'IN_USE').length,
      MAINTENANCE: drones.filter((d: any) => d.status === 'MAINTENANCE').length,
      OUT_OF_SERVICE: drones.filter((d: any) => d.status === 'OUT_OF_SERVICE').length,
    };

    // Get bookings count by status
    const bookingsSnapshot = await db
      .collection(ROOT_COLLECTIONS.bookings)
      .where('fleetManagerUid', '==', fleetManagerUid)
      .get();

    const bookings = bookingsSnapshot.docs.map((doc) => doc.data());
    const bookingsByStatus = {
      PENDING: bookings.filter((b: any) => b.bookingStatus === 'PENDING').length,
      CONFIRMED: bookings.filter((b: any) => b.bookingStatus === 'CONFIRMED').length,
      IN_PROGRESS: bookings.filter((b: any) => b.bookingStatus === 'IN_PROGRESS').length,
      COMPLETED: bookings.filter((b: any) => b.bookingStatus === 'COMPLETED').length,
      CANCELLED: bookings.filter((b: any) => b.bookingStatus === 'CANCELLED').length,
    };

    // Calculate revenue
    const completedBookings = bookings.filter((b: any) => b.bookingStatus === 'COMPLETED');
    const totalRevenue = completedBookings.reduce(
      (sum: number, b: any) => sum + (b.price?.total || 0),
      0,
    );

    // Get maintenance tickets
    const maintenanceSnapshot = await db
      .collection(ROOT_COLLECTIONS.maintenanceTickets)
      .where('fleetManagerUid', '==', fleetManagerUid)
      .get();

    const maintenanceTickets = maintenanceSnapshot.docs.map((doc) => doc.data());
    const maintenanceByStatus = {
      OPEN: maintenanceTickets.filter((t: any) => t.status === 'OPEN').length,
      IN_PROGRESS: maintenanceTickets.filter((t: any) => t.status === 'IN_PROGRESS').length,
      COMPLETED: maintenanceTickets.filter((t: any) => t.status === 'COMPLETED').length,
    };

    const maintenanceByPriority = {
      URGENT: maintenanceTickets.filter((t: any) => t.priority === 'URGENT').length,
      HIGH: maintenanceTickets.filter((t: any) => t.priority === 'HIGH').length,
      NORMAL: maintenanceTickets.filter((t: any) => t.priority === 'NORMAL').length,
      LOW: maintenanceTickets.filter((t: any) => t.priority === 'LOW').length,
    };

    // Get support tickets (need to fetch via bookings)
    const bookingIds = bookings.map((b: any) => b.bookingId);
    const allSupportTickets: any[] = [];

    if (bookingIds.length > 0) {
      for (let i = 0; i < bookingIds.length; i += 10) {
        const chunk = bookingIds.slice(i, i + 10);
        const supportSnapshot = await db.collection(ROOT_COLLECTIONS.supportTickets).where('bookingId', 'in', chunk).get();
        allSupportTickets.push(...supportSnapshot.docs.map((doc) => doc.data()));
      }
    }

    const supportByStatus = {
      PENDING: allSupportTickets.filter((t: any) => t.status === 'PENDING').length,
      IN_PROGRESS: allSupportTickets.filter((t: any) => t.status === 'IN_PROGRESS').length,
      RESOLVED: allSupportTickets.filter((t: any) => t.status === 'RESOLVED').length,
      CLOSED: allSupportTickets.filter((t: any) => t.status === 'CLOSED').length,
    };

    // Calculate average customer satisfaction
    const ratingsArray = allSupportTickets
      .filter((t: any) => t.customerSatisfactionRating)
      .map((t: any) => t.customerSatisfactionRating);

    const averageRating =
      ratingsArray.length > 0
        ? ratingsArray.reduce((sum: number, r: number) => sum + r, 0) / ratingsArray.length
        : 0;

    return {
      fleetManager,
      summary: {
        totalPilots: pilots.length,
        totalDrones: drones.length,
        totalBookings: bookings.length,
        completedBookings: completedBookings.length,
        totalRevenue,
        averageCustomerRating: averageRating,
      },
      pilots: {
        total: pilots.length,
        byStatus: pilotsByStatus,
      },
      drones: {
        total: drones.length,
        byStatus: dronesByStatus,
      },
      bookings: {
        total: bookings.length,
        byStatus: bookingsByStatus,
      },
      maintenance: {
        total: maintenanceTickets.length,
        byStatus: maintenanceByStatus,
        byPriority: maintenanceByPriority,
      },
      support: {
        total: allSupportTickets.length,
        byStatus: supportByStatus,
        averageRating,
      },
    };
  }

  /**
   * Remove/Delete a fleet manager
   */
  async removeFleetManager(fleetManagerUid: string): Promise<void> {
    const db = this.firebaseAdminService.firestore();

    // Verify fleet manager exists
    const { fleetManager } = await this.getFleetManagerProfile(fleetManagerUid);

    // Check if they have active assignments
    const pilotsSnapshot = await db
      .collection(ROOT_COLLECTIONS.users)
      .where('role', '==', 'pilot')
      .where('profileData.managedByFleetManagerUid', '==', fleetManagerUid)
      .limit(1)
      .get();

    if (!pilotsSnapshot.empty) {
      throw new BadRequestException(
        'Cannot remove fleet manager with assigned pilots. Please reassign pilots first.'
      );
    }

    const dronesSnapshot = await db
      .collectionGroup(USER_SUBCOLLECTIONS.drones)
      .where('managedByFleetManagerUid', '==', fleetManagerUid)
      .limit(1)
      .get();

    if (!dronesSnapshot.empty) {
      throw new BadRequestException(
        'Cannot remove fleet manager with assigned drones. Please reassign drones first.'
      );
    }

    // Check for active bookings
    const activeBookingsSnapshot = await db
      .collection(ROOT_COLLECTIONS.bookings)
      .where('fleetManagerUid', '==', fleetManagerUid)
      .where('status', 'in', ['pending', 'confirmed', 'in_progress'])
      .limit(1)
      .get();

    if (!activeBookingsSnapshot.empty) {
      throw new BadRequestException(
        'Cannot remove fleet manager with active bookings. Please complete or cancel active bookings first.'
      );
    }

    // Delete the fleet manager user document
    await db
      .collection(ROOT_COLLECTIONS.users)
      .doc(fleetManagerUid)
      .delete();
  }

  /**
   * Approve a pending fleet manager request
   */
  async approveFleetManager(fleetManagerUid: string): Promise<void> {
    const db = this.firebaseAdminService.firestore();

    // Verify fleet manager exists
    const { fleetManager } = await this.getFleetManagerProfile(fleetManagerUid);

    if ((fleetManager as any).adminApproval !== false) {
      throw new BadRequestException('Only pending fleet managers can be approved');
    }

    // Update approval status
    await db
      .collection(ROOT_COLLECTIONS.users)
      .doc(fleetManagerUid)
      .update({
        adminApproval: true,
        status: 'active',
        updatedAt: new Date().toISOString(),
      });
  }

  /**
   * Reject a pending fleet manager request
   */
  async rejectFleetManager(fleetManagerUid: string, reason?: string): Promise<void> {
    const db = this.firebaseAdminService.firestore();

    // Verify fleet manager exists
    const { fleetManager } = await this.getFleetManagerProfile(fleetManagerUid);

    if ((fleetManager as any).adminApproval !== false) {
      throw new BadRequestException('Only pending fleet managers can be rejected');
    }

    // Update approval status
    const updateData: any = {
      adminApproval: false,
      status: 'inactive',
      updatedAt: new Date().toISOString(),
    };

    if (reason) {
      updateData['profileData.rejectionReason'] = reason;
    }

    await db
      .collection(ROOT_COLLECTIONS.users)
      .doc(fleetManagerUid)
      .update(updateData);
  }

  /**
   * Remove/Unassign a drone from a fleet manager
   */
  async removeDroneFromFleetManager(fleetManagerId: string, droneId: string): Promise<void> {
    const db = this.firebaseAdminService.firestore();

    // Verify fleet manager exists
    await this.getFleetManagerProfile(fleetManagerId);

    // Find the drone
    const dronesSnapshot = await db
      .collectionGroup(USER_SUBCOLLECTIONS.drones)
      .where('droneId', '==', droneId)
      .where('assignedFleetManagerId', '==', fleetManagerId)
      .limit(1)
      .get();

    if (dronesSnapshot.empty) {
      throw new NotFoundException(`Drone ${droneId} not found or not assigned to this fleet manager`);
    }

    const droneDoc = dronesSnapshot.docs[0];
    const droneData = droneDoc.data();

    // Check if drone is in use
    if (droneData.status === 'IN_USE' || droneData.currentBookingId) {
      throw new BadRequestException(
        'Cannot remove drone that is currently in use. Please complete the active booking first.'
      );
    }

    // Remove assignment
    await droneDoc.ref.update({
      assignedFleetManagerId: null,
      updatedAt: new Date().toISOString(),
    });
  }
}

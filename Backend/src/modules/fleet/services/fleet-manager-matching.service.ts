import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { FirebaseAdminService } from '../../../firebase/firebase-admin.service';
import { ROOT_COLLECTIONS, USER_SUBCOLLECTIONS } from '../../../common/constants/collection-paths.constant';
import type { FirestoreUserDocument, FirestoreBookingDocument } from '../../../database/firestore/contracts';

export interface FleetManagerScore {
  fleetManagerUid: string;
  score: number;
  distance: number;
  availableCapacity: number;
  rating: number;
  completionRate: number;
  details: {
    name: string;
    status: string;
    totalPilots: number;
    availablePilots: number;
    totalDrones: number;
    availableDrones: number;
    activeBookings: number;
    location?: { lat: number; lng: number };
  };
}

export interface FleetManagerMatchResult {
  fleetManagerUid: string;
  score: number;
  reason: string;
  fleetManager: FleetManagerScore;
}

@Injectable()
export class FleetManagerMatchingService {
  private readonly logger = new Logger(FleetManagerMatchingService.name);
  private readonly MAX_DISTANCE_KM = 150; // Maximum service radius
  private readonly MAX_ACTIVE_BOOKINGS = 50; // Workload threshold

  constructor(private readonly firebaseAdminService: FirebaseAdminService) {}

  /**
   * Find optimal fleet manager for a booking
   * Based on: distance, available pilots, available drones, current workload, rating
   */
  async findOptimalFleetManager(
    bookingId: string,
    location: { lat: number; lng: number },
    serviceType: string,
    scheduledDate: string
  ): Promise<FleetManagerMatchResult> {
    this.logger.log(`Finding optimal fleet manager for booking ${bookingId}`);

    // Step 1: Get all active fleet managers that can handle this service type
    const fleetManagers = await this.getActiveFleetManagers(serviceType);
    if (fleetManagers.length === 0) {
      throw new NotFoundException('No active fleet managers found with required service type capabilities');
    }

    // Step 2: Score each fleet manager
    const fleetManagerScores = await this.scoreFleetManagers(
      fleetManagers,
      location,
      serviceType,
      scheduledDate
    );

    if (fleetManagerScores.length === 0) {
      throw new NotFoundException('No eligible fleet managers found for this booking');
    }

    // Step 3: Find best match
    const bestMatch = fleetManagerScores[0]; // Already sorted by score

    this.logger.log(
      `Best fleet manager found: ${bestMatch.fleetManagerUid}, Score: ${bestMatch.score}`
    );

    return {
      fleetManagerUid: bestMatch.fleetManagerUid,
      score: bestMatch.score,
      reason: `Best fleet manager match: ${bestMatch.details.name} - ${bestMatch.details.availablePilots} pilots available, ${bestMatch.details.availableDrones} drones available, ${bestMatch.distance.toFixed(1)}km away`,
      fleetManager: bestMatch,
    };
  }

  /**
   * Get top N fleet manager candidates for booking request
   */
  async findTopFleetManagers(
    bookingId: string,
    location: { lat: number; lng: number },
    serviceType: string,
    scheduledDate: string,
    topN: number = 3
  ): Promise<FleetManagerScore[]> {
    const fleetManagers = await this.getActiveFleetManagers(serviceType);
    
    if (fleetManagers.length === 0) {
      return [];
    }

    const scores = await this.scoreFleetManagers(
      fleetManagers,
      location,
      serviceType,
      scheduledDate
    );

    return scores.slice(0, topN);
  }

  /**
   * Get all active and approved fleet managers
   * FILTERS:
   * - Active status and admin approved
   * - Has valid business registration
   * - Has operational area defined
   * - Not suspended or in maintenance
   * - Has required service type experience
   * - Has drones for the service type
   * - Has pilots with required service types
   */
  private async getActiveFleetManagers(serviceType?: string): Promise<any[]> {
    const snapshot = await this.firebaseAdminService
      .firestore()
      .collection(ROOT_COLLECTIONS.users)
      .where('role', '==', 'fleet_manager')
      .where('status', '==', 'active')
      .where('adminApproval', '==', true)
      .get();

    const fleetManagers = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((fm: any) => {
        // Additional validation checks
        const profileData = fm.profileData || {};

        // Off-duty FMs never receive incoming requests / auto-assign
        if (profileData.isOnline === false) {
          return false;
        }
        
        // Must have valid business registration
        if (!profileData.businessRegistration || !profileData.businessRegistration.isVerified) {
          return false;
        }

        // Must have operational area defined
        if (!profileData.serviceArea || !profileData.serviceArea.center) {
          return false;
        }

        // Must not be suspended or in maintenance mode
        if (profileData.operationalStatus === 'suspended' || profileData.operationalStatus === 'maintenance') {
          return false;
        }

        return true;
      });

    // If service type filtering is required, validate fleet manager has:
    // 1. Service type experience
    // 2. Drones for the service type
    // 3. Pilots with required service types
    if (serviceType && fleetManagers.length > 0) {
      const validatedFleetManagers: any[] = [];

      for (const fm of fleetManagers) {
        const isValid = await this.validateFleetManagerForServiceType(fm.id, serviceType);
        if (isValid) {
          validatedFleetManagers.push(fm);
        } else {
          this.logger.debug(
            `Fleet manager ${fm.id} filtered out: does not have required service type capabilities`
          );
        }
      }

      return validatedFleetManagers;
    }

    return fleetManagers;
  }

  /**
   * Validate that fleet manager can handle the requested service type
   * Checks:
   * 1. Fleet manager has service type in their profile
   * 2. Fleet manager has at least one drone that can perform the service
   * 3. Fleet manager has at least one pilot with matching service type
   */
  private async validateFleetManagerForServiceType(
    fleetManagerUid: string,
    serviceType: string
  ): Promise<boolean> {
    const db = this.firebaseAdminService.firestore();

    // Get fleet manager profile
    const fmDoc = await db.collection(ROOT_COLLECTIONS.users).doc(fleetManagerUid).get();
    if (!fmDoc.exists) {
      return false;
    }

    const fm = fmDoc.data() as any;
    const profileData = fm.profileData || {};

    // Check 1: Fleet manager has service type experience
    const fmServiceTypes = profileData.serviceTypes || [];
    if (!fmServiceTypes.includes(serviceType)) {
      this.logger.debug(
        `Fleet manager ${fleetManagerUid} does not have service type '${serviceType}' (has: ${fmServiceTypes.join(', ')})`
      );
      return false;
    }

    // Check 2: Fleet manager has drones for this service type
    const dronesSnapshot = await db
      .collectionGroup(USER_SUBCOLLECTIONS.drones)
      .where('assignedFleetManagerUid', '==', fleetManagerUid)
      .where('status', '==', 'deployable')
      .get();

    const hasSuitableDrone = dronesSnapshot.docs.some((doc) => {
      const drone = doc.data();
      return drone.type === serviceType || drone.type === 'multi_purpose';
    });

    if (!hasSuitableDrone) {
      this.logger.debug(
        `Fleet manager ${fleetManagerUid} has no drones for service type '${serviceType}'`
      );
      return false;
    }

    // Check 3: Fleet manager has pilots with matching service type
    const pilotsSnapshot = await db
      .collection(ROOT_COLLECTIONS.users)
      .where('role', '==', 'pilot')
      .where('status', '==', 'active')
      .where('adminApproval', '==', true)
      .get();

    // Filter pilots by fleet manager assignment (support both field names for backward compatibility)
    const fmPilots = pilotsSnapshot.docs.filter((doc) => {
      const pilot = doc.data() as any;
      const profileData = pilot.profileData || {};
      return (
        profileData.assignedFleetManagerUid === fleetManagerUid ||
        profileData.assignedVendorUid === fleetManagerUid
      );
    });

    const hasSuitablePilot = fmPilots.some((doc) => {
      const pilot = doc.data() as any;
      const profileData = pilot.profileData || {};
      const serviceTypes = profileData.serviceTypes || [];
      return serviceTypes.includes(serviceType);
    });

    if (!hasSuitablePilot) {
      this.logger.debug(
        `Fleet manager ${fleetManagerUid} has no pilots with '${serviceType}' service type`
      );
      return false;
    }

    this.logger.debug(
      `Fleet manager ${fleetManagerUid} validated for service type '${serviceType}': ${hasSuitableDrone ? '✓' : '✗'} drones, ${hasSuitablePilot ? '✓' : '✗'} pilots`
    );

    return true;
  }

  /**
   * Score fleet managers based on multiple factors
   * Returns scores from 0-100
   */
  private async scoreFleetManagers(
    fleetManagers: any[],
    location: { lat: number; lng: number },
    serviceType: string,
    scheduledDate: string
  ): Promise<FleetManagerScore[]> {
    const scores: FleetManagerScore[] = [];

    for (const fm of fleetManagers) {
      const profileData = fm.profileData || {};
      const serviceArea = profileData.serviceArea || {};
      const stats = profileData.stats || {};

      // Duty toggle: skip off-duty fleet managers entirely.
      if (profileData.isOnline === false) {
        this.logger.debug(`Fleet manager ${fm.id} off-duty: skipped`);
        continue;
      }

      // 1. DISTANCE SCORE (35% weight) - Proximity to booking location
      const fmLocation = serviceArea.center || profileData.location;
      if (!fmLocation) {
        continue; // Skip if no location available
      }

      const distance = this.calculateDistance(
        location.lat,
        location.lng,
        fmLocation.lat,
        fmLocation.lng
      );

      // Skip if beyond service radius
      if (distance > this.MAX_DISTANCE_KM) {
        this.logger.debug(`Fleet manager ${fm.id} too far: ${distance}km`);
        continue;
      }

      const distanceScore = Math.max(0, 100 - (distance / this.MAX_DISTANCE_KM) * 100);

      // 2. CAPACITY SCORE (30% weight) - Available pilots and drones
      const capacityData = await this.getFleetManagerCapacity(fm.id, serviceType, scheduledDate);
      
      // Skip if no available resources
      if (capacityData.availablePilots === 0 || capacityData.availableDrones === 0) {
        this.logger.debug(
          `Fleet manager ${fm.id} has no available resources: ${capacityData.availablePilots} pilots, ${capacityData.availableDrones} drones`
        );
        continue;
      }

      // Capacity score based on available resources
      const pilotCapacityScore = Math.min(capacityData.availablePilots / 10, 1) * 50;
      const droneCapacityScore = Math.min(capacityData.availableDrones / 10, 1) * 50;
      const capacityScore = pilotCapacityScore + droneCapacityScore;

      // 3. WORKLOAD SCORE (20% weight) - Current active bookings
      const activeBookings = stats.activeBookings || 0;
      const workloadScore = Math.max(0, 100 - (activeBookings / this.MAX_ACTIVE_BOOKINGS) * 100);

      // 4. RATING SCORE (10% weight) - Customer ratings
      const averageRating = stats.averageRating || 3.5;
      const ratingScore = (averageRating / 5) * 100;

      // 5. COMPLETION RATE SCORE (5% weight) - Mission success rate
      const completedBookings = stats.completedBookings || 0;
      const totalBookings = stats.totalBookings || 1;
      const completionRate = completedBookings / totalBookings;
      const completionScore = completionRate * 100;

      // Calculate weighted total score
      const totalScore =
        distanceScore * 0.35 +
        capacityScore * 0.30 +
        workloadScore * 0.20 +
        ratingScore * 0.10 +
        completionScore * 0.05;

      scores.push({
        fleetManagerUid: fm.id,
        score: Math.round(totalScore * 10) / 10,
        distance: Math.round(distance * 10) / 10,
        availableCapacity: capacityData.availablePilots + capacityData.availableDrones,
        rating: averageRating,
        completionRate,
        details: {
          name: fm.name || 'Unknown',
          status: fm.status,
          totalPilots: capacityData.totalPilots,
          availablePilots: capacityData.availablePilots,
          totalDrones: capacityData.totalDrones,
          availableDrones: capacityData.availableDrones,
          activeBookings,
          location: fmLocation,
        },
      });
    }

    // Sort by score descending
    return scores.sort((a, b) => b.score - a.score);
  }

  /**
   * Get fleet manager's current capacity (available pilots and drones)
   */
  private async getFleetManagerCapacity(
    fleetManagerUid: string,
    serviceType: string,
    scheduledDate: string
  ): Promise<{
    totalPilots: number;
    availablePilots: number;
    totalDrones: number;
    availableDrones: number;
  }> {
    const db = this.firebaseAdminService.firestore();

    // Count total pilots under this fleet manager
    const totalPilotsSnapshot = await db
      .collection(ROOT_COLLECTIONS.users)
      .where('role', '==', 'pilot')
      .where('profileData.fleetManagerUid', '==', fleetManagerUid)
      .where('status', '==', 'active')
      .where('adminApproval', '==', true)
      .get();

    // Count available pilots (online, not on mission, has required service type)
    let availablePilots = 0;
    for (const pilotDoc of totalPilotsSnapshot.docs) {
      const pilot = pilotDoc.data() as any;
      const profileData = pilot.profileData || {};
      
      // Must be online
      if (!profileData.isOnline) continue;
      
      // Must not have current mission
      if (profileData.currentMissionId) continue;
      
      // Must have required service type
      const serviceTypes = profileData.serviceTypes || [];
      if (!serviceTypes.includes(serviceType)) continue;
      
      // Must have valid license
      const licenseExpiry = profileData.licenseExpiry;
      if (licenseExpiry && new Date(licenseExpiry) < new Date(scheduledDate)) continue;
      
      availablePilots++;
    }

    // Count total drones under this fleet manager
    const totalDronesSnapshot = await db
      .collectionGroup(USER_SUBCOLLECTIONS.drones)
      .where('fleetManagerUid', '==', fleetManagerUid)
      .get();

    // Count available drones (deployable, can handle service type)
    let availableDrones = 0;
    for (const droneDoc of totalDronesSnapshot.docs) {
      const drone = droneDoc.data() as any;
      
      // Must be deployable
      if (drone.status !== 'deployable') continue;
      
      // Must be able to handle service type
      if (drone.type !== serviceType && drone.type !== 'multi_purpose') continue;
      
      // Must not need maintenance
      if (drone.totalFlightHours >= 100) continue;
      
      // Must have valid insurance
      const insuranceExpiry = drone.insuranceExpiry;
      if (insuranceExpiry && new Date(insuranceExpiry) < new Date()) continue;
      
      availableDrones++;
    }

    return {
      totalPilots: totalPilotsSnapshot.size,
      availablePilots,
      totalDrones: totalDronesSnapshot.size,
      availableDrones,
    };
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   */
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Check if fleet manager can handle the booking
   */
  async canHandleBooking(
    fleetManagerUid: string,
    serviceType: string,
    scheduledDate: string
  ): Promise<{ canHandle: boolean; reason?: string }> {
    const capacity = await this.getFleetManagerCapacity(fleetManagerUid, serviceType, scheduledDate);

    if (capacity.availablePilots === 0) {
      return {
        canHandle: false,
        reason: 'No available pilots with required service type',
      };
    }

    if (capacity.availableDrones === 0) {
      return {
        canHandle: false,
        reason: 'No available drones for this service type',
      };
    }

    return { canHandle: true };
  }
}

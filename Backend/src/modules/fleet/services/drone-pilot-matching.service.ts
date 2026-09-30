import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { FirebaseAdminService } from '../../../firebase/firebase-admin.service';
import { ROOT_COLLECTIONS, USER_SUBCOLLECTIONS } from '../../../common/constants/collection-paths.constant';
import type { FirestoreDroneDocument } from '../../../database/firestore/contracts';

export interface PilotScore {
  pilotUid: string;
  score: number;
  distance: number;
  rating: number;
  completionRate: number;
  experience: number;
  details: {
    name: string;
    status: string;
    serviceTypes: string[];
    currentLocation?: { lat: number; lng: number };
  };
}

export interface DroneScore {
  droneId: string;
  score: number;
  suitability: number;
  condition: number;
  availability: number;
  details: {
    model: string;
    type: string;
    status: string;
    totalFlightHours: number;
  };
}

export interface MatchResult {
  pilotUid: string;
  droneId: string;
  score: number;
  reason: string;
  pilot: PilotScore;
  drone: DroneScore;
}

@Injectable()
export class DronePilotMatchingService {
  private readonly logger = new Logger(DronePilotMatchingService.name);
  private readonly MAX_HOURS_BEFORE_MAINTENANCE = 100;
  private readonly MAX_TRAVEL_DISTANCE_KM = 100;

  constructor(private readonly firebaseAdminService: FirebaseAdminService) {}

  /**
   * Find optimal drone-pilot pairing for a mission
   * ⭐ ENFORCES HIERARCHY: Only pilots and drones from the specified fleet manager
   * Based on: distance, rating, completion rate, experience, drone suitability
   */
  async findOptimalPairing(
    missionId: string,
    serviceType: string,
    location: { lat: number; lng: number },
    fleetManagerUid: string,  // ⭐ REQUIRED - enforce fleet manager hierarchy
    preferredDate: string
  ): Promise<MatchResult> {
    this.logger.log(`Finding optimal pairing for mission ${missionId} from fleet manager ${fleetManagerUid}`);

    // Step 1: Get available pilots from this fleet manager
    const pilots = await this.getAvailablePilots(fleetManagerUid, serviceType, preferredDate);
    if (pilots.length === 0) {
      throw new NotFoundException(`No available pilots found for this mission from fleet manager ${fleetManagerUid}`);
    }

    // Step 2: Get available drones from this fleet manager
    const drones = await this.getAvailableDrones(fleetManagerUid, serviceType);
    if (drones.length === 0) {
      throw new NotFoundException(`No available drones found for this mission from fleet manager ${fleetManagerUid}`);
    }

    // Step 3: Score pilots
    const pilotScores = await this.scorePilots(pilots, location, serviceType);

    // Step 4: Score drones
    const droneScores = await this.scoreDrones(drones, serviceType);

    // Step 5: Find best combination
    const bestMatch = await this.findBestCombination(pilotScores, droneScores);

    this.logger.log(
      `Best match found: Pilot ${bestMatch.pilotUid}, Drone ${bestMatch.droneId}, Score: ${bestMatch.score} (Fleet Manager: ${fleetManagerUid})`
    );

    return bestMatch;
  }

  /**
   * Get pilots that match criteria and are available
   * ⭐ ENFORCES HIERARCHY: Only pilots from the specified fleet manager
   * Implements filtering logic from implementation plan
   */
  private async getAvailablePilots(
    fleetManagerUid: string,  // ⭐ REQUIRED - pilots can ONLY be from this fleet manager
    serviceType: string,
    preferredDate: string
  ): Promise<any[]> {
    this.logger.log(`Querying pilots for fleet manager: ${fleetManagerUid}`);

    const snapshot = await this.firebaseAdminService
      .firestore()
      .collection(ROOT_COLLECTIONS.users)
      .where('role', '==', 'pilot')
      .where('status', '==', 'active') // Changed from 'active' to match AVAILABLE status
      .get();

    // ⭐ Filter pilots by fleet manager assignment (support both field names for backward compatibility)
    const eligiblePilots = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((pilot: any) => {
        // Check assignedFleetManagerUid (primary field) or fallback to assignedVendorUid
        const profileData = pilot.profileData || {};
        const assignedFleetMgr = profileData.assignedFleetManagerUid;
        const assignedVendor = profileData.assignedVendorUid;
        
        return assignedFleetMgr === fleetManagerUid || assignedVendor === fleetManagerUid;
      })
      .filter((pilot: any) => {
        const profileData = pilot.profileData || {};

        // 1. Check if pilot has required service type
        const serviceTypes = profileData.serviceTypes || [];
        if (!serviceTypes.includes(serviceType)) {
          return false;
        }

        // 2. Check if license is valid and not expired for mission date
        const licenseExpiry = profileData.license?.expiryDate || profileData.licenseExpiry;
        if (licenseExpiry && new Date(licenseExpiry) < new Date(preferredDate)) {
          return false;
        }

        // 3. Check pilot approval status
        if (!pilot.adminApproval || profileData.applicationStatus === 'REJECTED') {
          return false;
        }

        // 4. Check if pilot has no schedule conflict
        // In production, would query bookings collection for conflicts at preferredDate
        // For now, check if pilot has current mission assigned
        if (profileData.currentMissionId) {
          return false;
        }

        return true;
      });

    this.logger.log(
      `Found ${eligiblePilots.length} pilots assigned to fleet manager ${fleetManagerUid} (${snapshot.size} total pilots checked)`
    );

    return eligiblePilots;
  }

  /**
   * Get drones that match criteria and are available
   * ⭐ ENFORCES HIERARCHY: Only drones from the specified fleet manager
   * Implements filtering logic from implementation plan
   */
  private async getAvailableDrones(
    fleetManagerUid: string,  // ⭐ REQUIRED - drones can ONLY be from this fleet manager
    serviceType: string,
    preferredDate?: string
  ): Promise<any[]> {
    this.logger.log(`Querying drones for fleet manager: ${fleetManagerUid}`);

    const snapshot = await this.firebaseAdminService
      .firestore()
      .collectionGroup(USER_SUBCOLLECTIONS.drones)
      .where('status', '==', 'deployable')
      .get();

    // ⭐ Filter drones by fleet manager assignment (support both field names for backward compatibility)
    const eligibleDrones = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((drone: any) => {
        // Use fleetManagerUid (primary field from contract) or assignedFleetManagerUid/vendorUid as fallback
        const droneOwner = drone.fleetManagerUid || drone.assignedFleetManagerUid;
        const droneVendor = drone.vendorUid;
        
        return droneOwner === fleetManagerUid || droneVendor === fleetManagerUid;
      })
      .filter((drone: any) => {
        // 1. Check if drone can handle this service type
        if (drone.type !== serviceType && drone.type !== 'multi_purpose') {
          return false;
        }

        // 2. Check if drone needs maintenance (totalFlightHours < MAX)
        if (drone.totalFlightHours >= this.MAX_HOURS_BEFORE_MAINTENANCE) {
          return false;
        }

        // 3. Check if insurance is valid
        const insuranceExpiry = drone.insuranceExpiry;
        if (insuranceExpiry && new Date(insuranceExpiry) < new Date()) {
          return false;
        }

        // 4. Check if registration is valid
        const registrationExpiry = drone.registrationExpiry;
        if (registrationExpiry && new Date(registrationExpiry) < new Date()) {
          return false;
        }

        // 5. Check if drone is not scheduled for same time (simplified check)
        // In production, would query bookings for this drone at preferredDate
        if (preferredDate && drone.currentBookingId) {
          return false;
        }

        return true;
      });

    this.logger.log(
      `Found ${eligibleDrones.length} drones assigned to fleet manager ${fleetManagerUid} (${snapshot.size} total drones checked)`
    );

    return eligibleDrones;
  }

  /**
   * Score pilots based on multiple factors
   * Returns scores from 0-100
   */
  private async scorePilots(
    pilots: any[],
    location: { lat: number; lng: number },
    serviceType: string
  ): Promise<PilotScore[]> {
    return pilots.map((pilot) => {
      const stats = pilot.profileData?.stats || {};

      // Distance score (40% weight) - closer is better
      const pilotLocation = pilot.profileData?.currentLocation || pilot.profileData?.location;
      const distance = pilotLocation
        ? this.calculateDistance(
            location.lat,
            location.lng,
            pilotLocation.lat,
            pilotLocation.lng
          )
        : 999;
      const distanceScore = Math.max(0, 100 - (distance / this.MAX_TRAVEL_DISTANCE_KM) * 100);

      // Rating score (25% weight)
      const rating = stats.averageRating || 0;
      const ratingScore = (rating / 5) * 100;

      // Completion rate score (20% weight)
      const totalMissions = stats.totalMissions || 0;
      const completedMissions = stats.completedMissions || 0;
      const completionRate = totalMissions > 0 ? completedMissions / totalMissions : 0;
      const completionScore = completionRate * 100;

      // Experience score (15% weight)
      const experience = stats.totalFlightHours || 0;
      const experienceScore = Math.min(100, (experience / 1000) * 100);

      // Calculate weighted total
      const score =
        distanceScore * 0.4 +
        ratingScore * 0.25 +
        completionScore * 0.2 +
        experienceScore * 0.15;

      return {
        pilotUid: pilot.id,
        score: Math.round(score * 10) / 10,
        distance: Math.round(distance * 10) / 10,
        rating,
        completionRate,
        experience,
        details: {
          name: pilot.name,
          status: pilot.status,
          serviceTypes: pilot.profileData?.serviceTypes || [],
          currentLocation: pilotLocation,
        },
      };
    });
  }

  /**
   * Score drones based on suitability and condition
   */
  private async scoreDrones(drones: any[], serviceType: string): Promise<DroneScore[]> {
    return drones.map((drone) => {
      // Type match score (40% weight)
      const typeMatch = drone.type === serviceType ? 100 : drone.type === 'multi_purpose' ? 80 : 0;

      // Condition score (35% weight) - based on flight hours and maintenance
      const hoursRemaining =
        this.MAX_HOURS_BEFORE_MAINTENANCE - (drone.totalFlightHours || 0);
      const conditionScore = Math.max(0, (hoursRemaining / this.MAX_HOURS_BEFORE_MAINTENANCE) * 100);

      // Availability score (25% weight) - fresher drones score higher
      const daysSinceLastFlight = drone.lastFlightDate
        ? (Date.now() - new Date(drone.lastFlightDate).getTime()) / (1000 * 60 * 60 * 24)
        : 999;
      const availabilityScore = Math.min(100, 100 - daysSinceLastFlight);

      const score = typeMatch * 0.4 + conditionScore * 0.35 + availabilityScore * 0.25;

      return {
        droneId: drone.id,
        score: Math.round(score * 10) / 10,
        suitability: typeMatch,
        condition: Math.round(conditionScore),
        availability: Math.round(availabilityScore),
        details: {
          model: drone.model,
          type: drone.type,
          status: drone.status,
          totalFlightHours: drone.totalFlightHours || 0,
        },
      };
    });
  }

  /**
   * Find the best pilot-drone combination
   * Considers:
   * 1. Minimize total travel distance (pilot to drone location + drone to mission)
   * 2. Prefer pilot-drone familiarity (past missions together)
   * 3. Balance workload across pilots
   */
  private async findBestCombination(
    pilotScores: PilotScore[],
    droneScores: DroneScore[]
  ): Promise<MatchResult> {
    // Sort pilots and drones by score
    const sortedPilots = pilotScores.sort((a, b) => b.score - a.score);
    const sortedDrones = droneScores.sort((a, b) => b.score - a.score);

    // TODO: In production, check past missions for pilot-drone familiarity
    // Would query: bookings.where('pilotUid', '==', pilotUid).where('droneId', '==', droneId)
    // Award bonus points (e.g., +10) for pilots who have flown specific drones before

    // TODO: In production, balance workload
    // Would check: pilot.profileData.stats.activeMissions
    // Prefer pilots with fewer active missions

    // For now, use greedy approach: pair best pilot with best drone
    const bestPilot = sortedPilots[0];
    const bestDrone = sortedDrones[0];

    const combinedScore = (bestPilot.score + bestDrone.score) / 2;

    // TODO: Calculate actual travel distances:
    // 1. Pilot current location to drone location
    // 2. Drone location to mission location
    // Total travel distance = distance1 + distance2
    // Prefer combinations that minimize total travel

    return {
      pilotUid: bestPilot.pilotUid,
      droneId: bestDrone.droneId,
      score: Math.round(combinedScore * 10) / 10,
      reason: `Best pilot (score: ${bestPilot.score}) paired with best drone (score: ${bestDrone.score}). Distance: ${bestPilot.distance}km from mission.`,
      pilot: bestPilot,
      drone: bestDrone,
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
   * Suggest alternative pairings if primary choice is unavailable
   * ⭐ ENFORCES HIERARCHY: Only pilots and drones from the specified fleet manager
   */
  async suggestAlternatives(
    missionId: string,
    serviceType: string,
    location: { lat: number; lng: number },
    fleetManagerUid: string,  // ⭐ REQUIRED - enforce fleet manager hierarchy
    preferredDate: string,
    topN: number = 3
  ): Promise<MatchResult[]> {
    const pilots = await this.getAvailablePilots(fleetManagerUid, serviceType, preferredDate);
    const drones = await this.getAvailableDrones(fleetManagerUid, serviceType);

    if (pilots.length === 0 || drones.length === 0) {
      return [];
    }

    const pilotScores = await this.scorePilots(pilots, location, serviceType);
    const droneScores = await this.scoreDrones(drones, serviceType);

    // Generate all possible combinations and sort by combined score
    const combinations: MatchResult[] = [];
    for (const pilot of pilotScores) {
      for (const drone of droneScores) {
        const combinedScore = (pilot.score + drone.score) / 2;
        combinations.push({
          pilotUid: pilot.pilotUid,
          droneId: drone.droneId,
          score: Math.round(combinedScore * 10) / 10,
          reason: `Pilot score: ${pilot.score}, Drone score: ${drone.score}`,
          pilot,
          drone,
        });
      }
    }

    // Return top N combinations
    return combinations.sort((a, b) => b.score - a.score).slice(0, topN);
  }
}

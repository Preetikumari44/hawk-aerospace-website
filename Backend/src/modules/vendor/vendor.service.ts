import { Injectable, Logger } from '@nestjs/common';

import { ROOT_COLLECTIONS } from '../../common/constants/collection-paths.constant';
import { CacheService } from '../../common/cache/cache.service';
import type { CurrentUser } from '../../common/interfaces/current-user.interface';
import type { FirestoreUserDocument } from '../../database/firestore/contracts';
import { FirebaseAdminService } from '../../firebase/firebase-admin.service';
import { BookingService } from '../booking/booking.service';
import { BookingFilterDto } from '../booking/dto/booking-filter.dto';
import { UsersService } from '../users/users.service';
import { VendorAssignPilotDto } from './dto/assign-pilot.dto';
import { VendorOnboardDto } from './dto/vendor-onboard.dto';
import type { VendorDashboard } from './interfaces/vendor.interface';

@Injectable()
export class VendorService {
  private readonly logger = new Logger(VendorService.name);

  constructor(
    private readonly firebaseAdminService: FirebaseAdminService,
    private readonly bookingService: BookingService,
    private readonly usersService: UsersService,
    private readonly cacheService: CacheService,
  ) {}

  async onboardVendor(dto: VendorOnboardDto, user: CurrentUser): Promise<FirestoreUserDocument> {
    const existing = await this.usersService.getByUid(user.uid);
    const updated: FirestoreUserDocument = {
      ...existing,
      role: 'vendor',
      status: 'pending',
      adminApproval: false,
      profileData: {
        ...existing.profileData,
        businessName: dto.businessName,
        gstNumber: dto.gstNumber,
        serviceRegions: dto.serviceRegions ?? [],
      },
      verification: {
        isVerified: false,
        documents: dto.documents,
      },
      updatedAt: new Date().toISOString(),
    };

    await this.firebaseAdminService
      .firestore()
      .collection(ROOT_COLLECTIONS.users)
      .doc(user.uid)
      .set(updated, { merge: true });

    return updated;
  }

  async getDashboard(user: CurrentUser): Promise<VendorDashboard> {
    const cacheKey = `vendor-dashboard:${user.uid}`;
    const cached = await this.cacheService.get<VendorDashboard>(cacheKey);
    
    if (cached) {
      this.logger.log(`Cache hit for vendor dashboard: ${user.uid}`);
      return cached;
    }
    
    const { items: bookings } = await this.bookingService.listBookings(
      { page: 1, limit: 100 },
      user,
    );

    const result: VendorDashboard = {
      totalBookings: bookings.length,
      pendingBookings: bookings.filter((booking) => booking.status === 'pending').length,
      completedBookings: bookings.filter((booking) => booking.status === 'completed').length,
      revenue: bookings.reduce((sum, booking) => sum + (booking.finalPrice ?? 0), 0),
    };
    
    // Cache for 3 minutes
    await this.cacheService.set(cacheKey, result, 3 * 60 * 1000);
    
    return result;
  }

  getIncomingBookings(filter: BookingFilterDto) {
    return this.bookingService.listIncomingVendorBookings(filter);
  }

  assignPilot(dto: VendorAssignPilotDto, user: CurrentUser) {
    return this.bookingService.assignBooking(
      dto.bookingId,
      {
        pilotUid: dto.pilotUid,
        droneId: dto.droneId,
      },
      user.uid,
    );
  }

  async listPilots(user: CurrentUser) {
    const cacheKey = `vendor-pilots:${user.uid}`;
    const cached = await this.cacheService.get<FirestoreUserDocument[]>(cacheKey);
    
    if (cached) {
      this.logger.log(`Cache hit for vendor pilots: ${user.uid}`);
      return cached;
    }
    
    const snapshot = await this.firebaseAdminService
      .firestore()
      .collection(ROOT_COLLECTIONS.users)
      .where('role', '==', 'pilot')
      .where('profileData.fleetManagerUid', '==', user.uid)
      .get();

    const result = snapshot.docs.map((doc) => doc.data() as FirestoreUserDocument);
    
    // Cache for 5 minutes
    await this.cacheService.set(cacheKey, result, 5 * 60 * 1000);
    
    return result;
  }

  createPilotInvite(user: CurrentUser) {
    return {
      fleetManagerUid: user.uid,
      inviteCode: Buffer.from(`${user.uid}:${Date.now()}`).toString('base64url'),
      expiresIn: '7d',
    };
  }

  async approvePilot(pilotUid: string, approved: boolean) {
    const result = await this.usersService.updateStatus(pilotUid, {
      status: approved ? 'active' : 'rejected',
      isVerified: approved,
      adminApproval: approved,
    });
    
    // Invalidate vendor pilots cache
    await this.cacheService.deletePattern('vendor-pilots:.*');
    
    return result;
  }

  async getRevenue(user: CurrentUser) {
    const cacheKey = `vendor-revenue:${user.uid}`;
    const cached = await this.cacheService.get<any>(cacheKey);
    
    if (cached) {
      this.logger.log(`Cache hit for vendor revenue: ${user.uid}`);
      return cached;
    }
    
    const dashboard = await this.getDashboard(user);
    const result = {
      fleetManagerUid: user.uid,
      revenue: dashboard.revenue,
      completedBookings: dashboard.completedBookings,
      averagePerBooking:
        dashboard.completedBookings === 0 ? 0 : dashboard.revenue / dashboard.completedBookings,
    };
    
    // Cache for 5 minutes
    await this.cacheService.set(cacheKey, result, 5 * 60 * 1000);
    
    return result;
  }

  /**
   * Discover available service providers (vendors/pilots) near a location
   * Matches location coordinates to active providers within service radius
   */
  async discoverProviders(
    lat: number,
    lng: number,
    serviceType?: string,
    radiusKm: number = 50
  ) {
    const cacheKey = `provider-discovery:${lat}:${lng}:${serviceType || 'all'}:${radiusKm}`;
    const cached = await this.cacheService.get<any>(cacheKey);
    
    if (cached) {
      this.logger.log(`Cache hit for provider discovery: ${lat},${lng}`);
      return cached;
    }

    // Get all active vendors
    const vendorsSnapshot = await this.firebaseAdminService
      .firestore()
      .collection(ROOT_COLLECTIONS.users)
      .where('role', '==', 'vendor')
      .where('status', '==', 'active')
      .where('adminApproval', '==', true)
      .get();

    const vendors = vendorsSnapshot.docs.map((doc) => doc.data() as FirestoreUserDocument);

    // Filter vendors by location proximity using Haversine formula
    const nearbyVendors = vendors
      .map((vendor) => {
        const vendorLat = vendor.profileData?.location?.lat;
        const vendorLng = vendor.profileData?.location?.lng;

        if (!vendorLat || !vendorLng) {
          return null;
        }

        const distance = this.calculateDistance(lat, lng, vendorLat, vendorLng);

        if (distance > radiusKm) {
          return null;
        }

        return {
          fleetManagerUid: vendor.uid,
          name: vendor.name,
          businessName: vendor.profileData?.businessName,
          location: vendor.profileData?.location,
          serviceRegions: vendor.profileData?.serviceRegions || [],
          distance: Math.round(distance * 10) / 10, // Round to 1 decimal
          verified: vendor.verification?.isVerified || false,
          rating: vendor.profileData?.rating || null,
        };
      })
      .filter((v) => v !== null)
      .sort((a, b) => a.distance - b.distance); // Sort by distance

    const result = {
      location: { lat, lng },
      radiusKm,
      serviceType: serviceType || 'all',
      providersFound: nearbyVendors.length,
      providers: nearbyVendors,
    };

    // Cache for 10 minutes
    await this.cacheService.set(cacheKey, result, 10 * 60 * 1000);

    return result;
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   * Returns distance in kilometers
   */
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in kilometers
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
}

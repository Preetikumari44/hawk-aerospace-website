import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { ROOT_COLLECTIONS } from '../../common/constants/collection-paths.constant';
import type { CurrentUser } from '../../common/interfaces/current-user.interface';
import type { FirestoreUserDocument } from '../../database/firestore/contracts';
import { FirebaseAdminService } from '../../firebase/firebase-admin.service';
import { UsersService } from '../users/users.service';
import {
  CreateSARequestDto,
  UpdateSARequestDto,
  SARequestFilterDto,
  SARequestStatus,
} from './dto/sa-request.dto';
import { SAFilterDto } from './dto/sa-filter.dto';
import {
  SAResponseDto,
  SARequestResponseDto,
  PaginatedSAResponseDto,
  PaginatedSARequestResponseDto,
  SACustomerDto,
} from './dto/sa-response.dto';

export interface SARequest {
  id: string;
  aggregatorUid: string;
  businessName: string;
  contactPerson: string;
  phone: string;
  email?: string;
  state?: string;
  region?: string;
  status: SARequestStatus;
  documents: Array<{ type: string; url: string; name?: string }>;
  notes?: string;
  rejectionReason?: string;
  approvedBy?: string;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class SAManagementService {
  constructor(
    private readonly firebaseAdminService: FirebaseAdminService,
    private readonly usersService: UsersService,
  ) {}

  /**
   * Get list of current (approved) Sales Aggregators with pagination and search
   * Fetches from salesAggregators collection where approvalStatus is 'APPROVED'
   */
  async getCurrentSAList(filter: SAFilterDto): Promise<PaginatedSAResponseDto> {
    const db = this.firebaseAdminService.firestore();
    const { search, status, state, region, page = 1, limit = 10 } = filter;

    console.log('📋 [getCurrentSAList] Fetching approved sales aggregators');
    
    // Fetch approved sales aggregators from salesAggregators collection
    let query = db.collection('salesAggregators').where('approvalStatus', '==', 'APPROVED');
    
    const snapshot = await query.get();
    let aggregators = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as any);

    console.log('📊 [getCurrentSAList] Found approved aggregators:', aggregators.length);

    // Apply state filter
    if (state) {
      aggregators = aggregators.filter((agg) => agg.state === state);
    }

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      aggregators = aggregators.filter(
        (agg) =>
          agg.fullName?.toLowerCase().includes(searchLower) ||
          agg.mobile?.includes(search) ||
          agg.email?.toLowerCase().includes(searchLower),
      );
    }

    // Apply region filter
    if (region) {
      aggregators = aggregators.filter((agg) => agg.assignedRegion === region);
    }

    // Calculate pagination
    const total = aggregators.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedAggregators = aggregators.slice(startIndex, endIndex);

    // Map to response format
    const enrichedAggregators = paginatedAggregators.map((agg) => ({
      uid: agg.uid,
      name: agg.fullName,
      phone: agg.mobile,
      email: agg.email,
      status: agg.status?.toLowerCase() || 'active',
      businessName: agg.fullName, // or create a separate field
      regions: agg.assignedRegion ? [agg.assignedRegion] : [],
      state: agg.state,
      documents: [], // Add if available in your schema
      isVerified: agg.approvalStatus === 'APPROVED',
      totalCustomers: agg.totalCustomers || 0,
      totalBookings: agg.totalBookings || 0,
      totalRevenue: agg.revenueGenerated || 0,
      commissionEarned: agg.commissionEarned || 0,
      createdAt: agg.createdAt,
      updatedAt: agg.updatedAt,
    }));

    const items = enrichedAggregators.map((agg) =>
      plainToInstance(SAResponseDto, agg, { excludeExtraneousValues: true }),
    );

    return {
      items,
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Get detailed information about a specific Sales Aggregator
   * Fetches from users collection by UID (hybrid model)
   */
  async getSADetails(aggregatorUid: string): Promise<SAResponseDto> {
    console.log('🔍 [getSADetails] Fetching sales aggregator:', aggregatorUid);
    const db = this.firebaseAdminService.firestore();
    
    // Fetch from users collection using UID
    const userDoc = await db
      .collection(ROOT_COLLECTIONS.users)
      .doc(aggregatorUid)
      .get();

    if (!userDoc.exists) {
      console.error('❌ [getSADetails] Sales Aggregator not found:', aggregatorUid);
      throw new NotFoundException(`Sales Aggregator with UID ${aggregatorUid} not found`);
    }

    const aggregator = userDoc.data() as FirestoreUserDocument;
    
    console.log('📋 [getSADetails] Found sales aggregator:', {
      uid: aggregator.uid,
      name: aggregator.name,
      status: aggregator.status,
      role: aggregator.role,
    });

    // Get customers created by this SA
    console.log('👥 [getSADetails] Fetching customers');
    const customers = await this.getAggregatorCustomers(aggregatorUid);
    console.log('👥 [getSADetails] Found customers:', customers.length);
    
    console.log('📊 [getSADetails] Fetching bookings stats');
    const bookingStats = await this.getAggregatorBookingStats(aggregatorUid);
    console.log('📊 [getSADetails] Booking stats:', bookingStats);

    const enrichedData = {
      uid: aggregator.uid,
      name: aggregator.name,
      phone: aggregator.phone,
      email: aggregator.email,
      status: aggregator.status?.toLowerCase() || 'active',
      businessName: aggregator.profileData?.businessName || aggregator.name,
      regions: aggregator.profileData?.regions || [],
      state: aggregator.profileData?.state,
      documents: aggregator.verification?.documents || [],
      isVerified: aggregator.verification?.isVerified || false,
      totalCustomers: customers.length,
      totalBookings: bookingStats.totalBookings,
      totalRevenue: bookingStats.totalRevenue,
      commissionEarned: bookingStats.commissionEarned,
      createdAt: aggregator.createdAt,
      updatedAt: aggregator.updatedAt,
      customers: customers.map((c: FirestoreUserDocument) => ({
        uid: c.uid,
        name: c.name,
        phone: c.phone,
        email: c.email,
        status: c.status?.toLowerCase() || 'active',
        state: c.profileData?.state,
        region: c.profileData?.region,
        occupation: c.profileData?.occupation,
        totalBookings: 0, // TODO: Calculate from bookings
        totalRevenue: 0, // TODO: Calculate from bookings
        createdAt: c.createdAt,
      })),
    };

    console.log('✅ [getSADetails] Returning enriched data');
    return plainToInstance(SAResponseDto, enrichedData, { excludeExtraneousValues: true });
  }

  /**
   * Update status of a Sales Aggregator
   */
  async updateStatus(aggregatorUid: string, status: string): Promise<SAResponseDto> {
    console.log(`📝 [updateStatus] Updating status of SA ${aggregatorUid} to ${status}`);
    const db = this.firebaseAdminService.firestore();
    
    const userDoc = await db
      .collection(ROOT_COLLECTIONS.users)
      .doc(aggregatorUid)
      .get();

    if (!userDoc.exists) {
      throw new NotFoundException(`Sales Aggregator with UID ${aggregatorUid} not found`);
    }

    const lowerStatus = status.toLowerCase();
    
    await userDoc.ref.update({
      status: lowerStatus,
      updatedAt: new Date().toISOString(),
    });

    console.log(`✅ [updateStatus] Status updated successfully`);
    return this.getSADetails(aggregatorUid);
  }

  /**
   * Get customers for a Sales Aggregator with pagination
   */
  async getSACustomers(
    aggregatorUid: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ items: SACustomerDto[]; total: number; page: number; limit: number; totalPages: number }> {
    console.log('👥 [getSACustomers] Fetching customers for SA:', aggregatorUid);
    const db = this.firebaseAdminService.firestore();
    
    // Get all customers for this SA from users collection
    const snapshot = await db
      .collection(ROOT_COLLECTIONS.users)
      .where('profileData.managedByAggregatorUid', '==', aggregatorUid)
      .where('role', '==', 'customer')
      .orderBy('createdAt', 'desc')
      .get();

    const allCustomers = snapshot.docs.map((doc) => doc.data() as FirestoreUserDocument);
    const total = allCustomers.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedCustomers = allCustomers.slice(startIndex, endIndex);

    const items = paginatedCustomers.map((c) =>
      plainToInstance(
        SACustomerDto,
        {
          uid: c.uid,
          name: c.name,
          phone: c.phone,
          email: c.email,
          status: c.status?.toLowerCase() || 'active',
          state: c.profileData?.state,
          region: c.profileData?.region,
          occupation: c.profileData?.occupation,
          totalBookings: 0, // TODO: Calculate from bookings
          totalRevenue: 0, // TODO: Calculate from bookings
          createdAt: c.createdAt,
        },
        { excludeExtraneousValues: true },
      ),
    );

    console.log('✅ [getSACustomers] Returning', items.length, 'customers out of', total);

    return {
      items,
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Get bookings for a Sales Aggregator with pagination
   */
  async getSABookings(
    aggregatorUid: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ items: any[]; total: number; page: number; limit: number; totalPages: number }> {
    console.log('📦 [getSABookings] Fetching bookings for SA:', aggregatorUid);
    const db = this.firebaseAdminService.firestore();
    
    // Get bookings from delegatedBookings collection
    const bookingsSnapshot = await db
      .collection(ROOT_COLLECTIONS.delegatedBookings)
      .where('aggregatorUid', '==', aggregatorUid)
      .orderBy('createdAt', 'desc')
      .get();
    
    console.log('📋 [getSABookings] Found', bookingsSnapshot.size, 'delegated bookings');
    
    const allBookings = bookingsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    
    const total = allBookings.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedBookings = allBookings.slice(startIndex, endIndex);
    
    console.log('✂️ [getSABookings] Pagination:', { page, limit, startIndex, endIndex, slicedCount: paginatedBookings.length });

    // Map to response format
    const items = paginatedBookings.map((booking: any) => ({
      bookingId: booking.bookingId || booking.id,
      bookingNumber: booking.bookingNumber,
      customerUid: booking.customerName,
      aggregatorUid: booking.aggregatorUid,
      serviceType: booking.serviceType,
      cropType: booking.cropType,
      area: booking.area,
      preferredDate: booking.preferredDate,
      location: booking.location,
      bookingStatus: booking.status,
      createdAt: booking.createdAt,
    }));

    console.log('✅ [getSABookings] Returning', items.length, 'bookings out of', total);

    return {
      items,
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Get list of SA requests with pagination and filtering
   * Fetches from salesAggregatorRequests collection
   */
  async getSARequestList(filter: SARequestFilterDto): Promise<PaginatedSARequestResponseDto> {
    const db = this.firebaseAdminService.firestore();
    const { status, search, page = 1, limit = 10 } = filter;

    console.log('📋 [getSARequestList] Fetching SA requests with filter:', filter);

    // Fetch from salesAggregatorRequests collection
    let query = db.collection('salesAggregatorRequests').orderBy('createdAt', 'desc');

    // Apply status filter
    if (status) {
      query = query.where('status', '==', status.toUpperCase()) as FirebaseFirestore.Query<FirebaseFirestore.DocumentData>;
    }

    const snapshot = await query.get();
    let requests = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as any);
    
    console.log('📊 [getSARequestList] Found requests:', requests.length);

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      requests = requests.filter(
        (req) =>
          req.fullName?.toLowerCase().includes(searchLower) ||
          req.mobile?.includes(search) ||
          req.email?.toLowerCase().includes(searchLower),
      );
    }

    // Calculate pagination
    const total = requests.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedRequests = requests.slice(startIndex, endIndex);

    // Map to response format
    const items = paginatedRequests.map((req) => ({
      id: req.requestId || req.id,
      aggregatorUid: req.requestId, // Use requestId as temporary UID
      businessName: req.fullName,
      contactPerson: req.fullName,
      phone: req.mobile,
      email: req.email,
      state: req.state,
      region: req.preferredRegion,
      status: req.status?.toLowerCase() || 'pending',
      documents: [],
      notes: req.experience,
      rejectionReason: req.rejectionReason,
      approvedBy: req.approvedBy,
      createdAt: req.createdAt,
      updatedAt: req.updatedAt,
    }));

    return {
      items: items.map((item) =>
        plainToInstance(SARequestResponseDto, item, { excludeExtraneousValues: true }),
      ),
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Create a new SA request
   * Creates in salesAggregatorRequests collection
   */
  async createSARequest(dto: CreateSARequestDto): Promise<SARequestResponseDto> {
    const db = this.firebaseAdminService.firestore();

    const request: any = {
      requestId: `SAR${Date.now()}`, // Generate requestId
      fullName: dto.contactPerson,
      mobile: dto.phone,
      email: dto.email,
      preferredRegion: dto.region,
      state: dto.state,
      district: dto.region,
      experience: dto.notes || '',
      expectedCustomers: 0,
      panNumber: '',
      aadhaarNumber: '',
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const docRef = await db.collection('salesAggregatorRequests').add(request);
    const createdRequest = { id: docRef.id, ...request };

    return plainToInstance(SARequestResponseDto, {
      id: createdRequest.requestId,
      aggregatorUid: createdRequest.requestId,
      businessName: createdRequest.fullName,
      contactPerson: createdRequest.fullName,
      phone: createdRequest.mobile,
      email: createdRequest.email,
      state: createdRequest.state,
      region: createdRequest.preferredRegion,
      status: createdRequest.status?.toLowerCase(),
      documents: [],
      notes: createdRequest.experience,
      createdAt: createdRequest.createdAt,
      updatedAt: createdRequest.updatedAt,
    }, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Get SA request details
   * Fetches from salesAggregatorRequests collection
   */
  async getSARequestDetails(requestId: string): Promise<SARequestResponseDto> {
    const db = this.firebaseAdminService.firestore();
    
    // Try to find by requestId field
    const snapshot = await db
      .collection('salesAggregatorRequests')
      .where('requestId', '==', requestId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      throw new NotFoundException(`SA Request with ID ${requestId} not found`);
    }

    const doc = snapshot.docs[0];
    const request = { id: doc.id, ...doc.data() } as any;

    return plainToInstance(SARequestResponseDto, {
      id: request.requestId,
      aggregatorUid: request.requestId,
      businessName: request.fullName,
      contactPerson: request.fullName,
      phone: request.mobile,
      email: request.email,
      state: request.state,
      region: request.preferredRegion,
      status: request.status?.toLowerCase(),
      documents: [],
      notes: request.experience,
      rejectionReason: request.rejectionReason,
      approvedBy: request.approvedBy,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
    }, { excludeExtraneousValues: true });
  }

  /**
   * Accept an SA request - creates user in users collection with aggregator role
   */
  async acceptSARequest(
    requestId: string,
    user: CurrentUser,
  ): Promise<{ request: SARequestResponseDto; aggregator: SAResponseDto }> {
    console.log('🚀 [acceptSARequest] Starting - Request ID:', requestId);
    const db = this.firebaseAdminService.firestore();
    
    // Find the request by requestId field
    const snapshot = await db
      .collection('salesAggregatorRequests')
      .where('requestId', '==', requestId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      console.error('❌ [acceptSARequest] Request not found:', requestId);
      throw new NotFoundException(`SA Request with ID ${requestId} not found`);
    }

    const requestDoc = snapshot.docs[0];
    const request = requestDoc.data() as any;
    console.log('📋 [acceptSARequest] Request data:', request);

    if (request.status?.toUpperCase() !== 'PENDING') {
      console.error('❌ [acceptSARequest] Invalid status:', request.status);
      throw new BadRequestException(
        `Cannot accept request with status: ${request.status}. Only pending requests can be accepted.`,
      );
    }

    // Update the request status to APPROVED
    console.log('📝 [acceptSARequest] Updating request status to APPROVED');
    await requestDoc.ref.update({
      status: 'APPROVED',
      approvedBy: user.uid,
      approvedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Create user in users collection using UsersService
    console.log('📝 [acceptSARequest] Creating aggregator user');
    const aggregatorUser = await this.usersService.createUser({
      name: request.fullName,
      role: 'aggregator',
      status: 'active',
      phone: request.mobile,
      email: request.email,
      adminApproval: true,
      isVerified: true,
    });

    // Update with aggregator-specific profile data
    const aggregatorUid = aggregatorUser.uid;
    await db
      .collection(ROOT_COLLECTIONS.users)
      .doc(aggregatorUid)
      .update({
        profileData: {
          businessName: request.fullName,
          regions: request.preferredRegion ? [request.preferredRegion] : [],
          state: request.state,
          commissionRate: 5,
        },
        verification: {
          isVerified: true,
          documents: [],
        },
        updatedAt: new Date().toISOString(),
      });

    console.log('✅ [acceptSARequest] Successfully created aggregator user with UID:', aggregatorUid);

    // Fetch the updated request
    const updatedRequest = { ...request, status: 'APPROVED', approvedBy: user.uid };
    
    // Return response
    try {
      const aggregator = await this.getSADetails(aggregatorUid);
      console.log('✅ [acceptSARequest] Successfully fetched aggregator details');
      
      return {
        request: plainToInstance(SARequestResponseDto, {
          id: updatedRequest.requestId,
          aggregatorUid: aggregatorUid,
          businessName: updatedRequest.fullName,
          contactPerson: updatedRequest.fullName,
          phone: updatedRequest.mobile,
          email: updatedRequest.email,
          state: updatedRequest.state,
          region: updatedRequest.preferredRegion,
          status: 'approved',
          documents: [],
          notes: updatedRequest.experience,
          approvedBy: user.uid,
          createdAt: updatedRequest.createdAt,
          updatedAt: new Date().toISOString(),
        }, {
          excludeExtraneousValues: true,
        }),
        aggregator,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ [acceptSARequest] Error fetching aggregator details:', errorMessage);
      throw error;
    }
  }

  /**
   * Reject an SA request
   */
  async rejectSARequest(
    requestId: string,
    dto: UpdateSARequestDto,
    user: CurrentUser,
  ): Promise<SARequestResponseDto> {
    const db = this.firebaseAdminService.firestore();
    
    // Find the request by requestId field
    const snapshot = await db
      .collection('salesAggregatorRequests')
      .where('requestId', '==', requestId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      throw new NotFoundException(`SA Request with ID ${requestId} not found`);
    }

    const requestDoc = snapshot.docs[0];
    const request = requestDoc.data() as any;

    if (request.status?.toUpperCase() !== 'PENDING') {
      throw new BadRequestException(
        `Cannot reject request with status: ${request.status}. Only pending requests can be rejected.`,
      );
    }

    // Update the request status
    await requestDoc.ref.update({
      status: 'REJECTED',
      rejectionReason: dto.rejectionReason,
      rejectedBy: user.uid,
      rejectedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const updatedRequest = {
      ...request,
      status: 'REJECTED',
      rejectionReason: dto.rejectionReason,
      rejectedBy: user.uid,
    };

    return plainToInstance(SARequestResponseDto, {
      id: updatedRequest.requestId,
      aggregatorUid: updatedRequest.requestId,
      businessName: updatedRequest.fullName,
      contactPerson: updatedRequest.fullName,
      phone: updatedRequest.mobile,
      email: updatedRequest.email,
      state: updatedRequest.state,
      region: updatedRequest.preferredRegion,
      status: 'rejected',
      documents: [],
      notes: updatedRequest.experience,
      rejectionReason: dto.rejectionReason,
      approvedBy: user.uid,
      createdAt: updatedRequest.createdAt,
      updatedAt: new Date().toISOString(),
    }, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Get customers managed by an aggregator
   */
  private async getAggregatorCustomers(aggregatorUid: string): Promise<FirestoreUserDocument[]> {
    const db = this.firebaseAdminService.firestore();
    const snapshot = await db
      .collection(ROOT_COLLECTIONS.users)
      .where('profileData.managedByAggregatorUid', '==', aggregatorUid)
      .where('role', '==', 'customer')
      .get();

    return snapshot.docs.map((doc) => doc.data() as FirestoreUserDocument);
  }

  /**
   * Get booking statistics for an aggregator
   */
  private async getAggregatorBookingStats(aggregatorUid: string): Promise<{
    totalBookings: number;
    totalRevenue: number;
    commissionEarned: number;
  }> {
    const db = this.firebaseAdminService.firestore();

    // Get bookings created by this aggregator
    const bookingsSnapshot = await db
      .collection(ROOT_COLLECTIONS.delegatedBookings)
      .where('aggregatorUid', '==', aggregatorUid)
      .get();

    let totalRevenue = 0;
    const COMMISSION_RATE = 0.05;

    for (const doc of bookingsSnapshot.docs) {
      const delegatedBooking = doc.data();
      // Get the actual booking to fetch the final price
      const bookingDoc = await db.collection(ROOT_COLLECTIONS.bookings).doc(delegatedBooking.bookingId).get();

      if (bookingDoc.exists) {
        const booking = bookingDoc.data();
        if (booking?.status === 'completed' && booking?.finalPrice) {
          totalRevenue += booking.finalPrice;
        }
      }
    }

    return {
      totalBookings: bookingsSnapshot.size,
      totalRevenue,
      commissionEarned: Math.round(totalRevenue * COMMISSION_RATE * 100) / 100,
    };
  }
}

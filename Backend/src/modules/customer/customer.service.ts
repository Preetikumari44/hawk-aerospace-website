import { 
  Injectable, 
  NotFoundException, 
  ForbiddenException, 
  BadRequestException, 
  InternalServerErrorException,
  Logger 
} from '@nestjs/common';
import type { CollectionReference } from 'firebase-admin/firestore';
import { plainToInstance } from 'class-transformer';
import { FirebaseAdminService } from '../../firebase/firebase-admin.service';
import { UsersService } from '../users/users.service';
import { CacheService } from '../../common/cache/cache.service';
import type { CurrentUser } from '../../common/interfaces/current-user.interface';
import type { FirestoreUserDocument } from '../../database/firestore/contracts';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CustomerFilterDto } from './dto/customer-filter.dto';
import { CustomerResponseDto } from './dto/customer-response.dto';
import { MapsService } from '../maps/maps.service';
import { VendorService } from '../vendor/vendor.service';
import { PricingService } from '../pricing/pricing.service';
import { WeatherService } from '../flight-conditions/weather.service';
import type { FlyingRestrictionCheckDto, FlyingRestrictionResult } from './dto/flying-restriction-check.dto';
import type { WeatherCheckDto } from './dto/weather-check.dto';
import type { ServiceDiscoveryDto } from './dto/service-discovery.dto';
import type { EstimatePriceDto } from '../pricing/dto/estimate-price.dto';

// Collection names
const COLLECTIONS = {
  customers: 'customers',
  bookings: 'bookings',
  users: 'users',
} as const;

@Injectable()
export class CustomerService {
  private readonly logger = new Logger(CustomerService.name);
  
  constructor(
    private readonly firebaseAdminService: FirebaseAdminService,
    private readonly usersService: UsersService,
    private readonly cacheService: CacheService,
    private readonly mapsService: MapsService,
    private readonly vendorService: VendorService,
    private readonly pricingService: PricingService,
    private readonly weatherService: WeatherService,
  ) {}

  async create(dto: CreateCustomerDto, user: CurrentUser): Promise<FirestoreUserDocument> {
    // Validate phone or email is provided
    if (!dto.phone && !dto.email) {
      throw new BadRequestException('Customer phone or email is required.');
    }

    // Check for existing user by phone or email
    if (dto.phone) {
      const existingByPhone = await this.usersService.findByPhone(dto.phone);
      if (existingByPhone) {
        throw new BadRequestException(`A user with phone ${dto.phone} already exists.`);
      }
    }

    if (dto.email) {
      const existingByEmail = await this.usersService.findByEmail(dto.email);
      if (existingByEmail) {
        throw new BadRequestException(`A user with email ${dto.email} already exists.`);
      }
    }

    // Create the customer
    const customer = await this.usersService.createUser({
      name: dto.name,
      role: 'customer',
      status: 'active',
      phone: dto.phone,
      email: dto.email,
      language: dto.language,
      adminApproval: true,
      isVerified: true,
      location: dto.profileData?.location,
    });

    // Update with additional profile data
    const updated: FirestoreUserDocument = {
      ...customer,
      profileData: {
        ...customer.profileData,
        occupation: dto.profileData?.occupation || 'Farmer',
        region: dto.profileData?.region,
        state: dto.profileData?.state,
        location: dto.profileData?.location,
        managedByAggregatorId: user.role === 'aggregator' ? user.uid : undefined,
      },
      updatedAt: new Date().toISOString(),
    };

    await this.firebaseAdminService
      .firestore()
      .collection(COLLECTIONS.customers)
      .doc(customer.uid)
      .set(updated, { merge: true });

    return updated;
  }

  async findAll(filter: CustomerFilterDto, user: CurrentUser): Promise<CustomerResponseDto[]> {
    const page = filter.page || 1;
    const limit = filter.limit || 20;
    
    // Generate cache key based on filters
    const cacheKey = this.generateCacheKey('customers-list', { ...filter, userRole: user.role, userId: user.uid });
    
    // Try to get from cache first
    const cached = await this.cacheService.get<CustomerResponseDto[]>(cacheKey);
    if (cached) {
      this.logger.log(`Cache hit for customers list: ${cacheKey}`);
      return cached;
    }

    try {
      // Query customers collection (no role filter needed as this collection only has customers)
      let query = this.firebaseAdminService
        .firestore()
        .collection(COLLECTIONS.customers) as any;

      // Apply role-based filtering (hybrid model uses managedByAggregatorUid)
      if (user.role === 'aggregator') {
        query = query.where('managedByAggregatorUid', '==', user.uid);
      }

      // Apply filters  
      if (filter.status) {
        // Map status values (seed data uses ACTIVE/INACTIVE)
        const statusMap: any = {
          active: 'ACTIVE',
          inactive: 'INACTIVE',
          pending: 'PENDING',
          blocked: 'BLOCKED',
        };
        const mappedStatus = statusMap[filter.status] || filter.status.toUpperCase();
        query = query.where('status', '==', mappedStatus);
      }

      if (filter.state) {
        query = query.where('state', '==', filter.state);
      }

      if (filter.region) {
        query = query.where('district', '==', filter.region);
      }

      if (filter.occupation) {
        query = query.where('occupation', '==', filter.occupation);
      }

      // Bounded read: with no substring search we page server-side via count() +
      // offset/limit, so reads scale with page size, not collection size. Substring
      // search can't run in Firestore, so that path still scans the filtered set.
      const offset = (page - 1) * limit;
      const hasSearch = !!filter.search;

      const mapCustomer = (doc: any) => {
        const data = doc.data();
        // Map hybrid model fields to expected format
        return {
          uid: doc.id, // Document ID is the UID in hybrid model
          customerId: data.customerId, // Legacy field if exists
          name: data.name || data.fullName,
          email: data.email,
          phone: data.phone || data.mobile,
          role: 'customer',
          status: data.status?.toLowerCase() || 'active',
          profileData: {
            displayName: data.name || data.fullName,
            firstName: data.name?.split(' ')[0],
            lastName: data.name?.split(' ').slice(1).join(' '),
            occupation: data.occupation,
            region: data.district,
            state: data.state,
            location: data.geoLocation || data.location,
            managedByAggregatorId: data.managedByAggregatorUid, // Updated field name
          },
          verification: {
            isVerified: data.verification?.isVerified || false,
            documents: data.verification?.documents || [],
          },
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          totalBookings: data.totalBookings || 0,
          totalRevenue: data.lifetimeRevenue || 0,
        };
      };

      let total: number;
      let pageDocs: any[];

      if (hasSearch) {
        const search = filter.search!.toLowerCase();
        const snapshot = await query.get();
        this.logger.log(`Firestore read (search scan): ${snapshot.docs.length} documents for customers list`);
        const matched = snapshot.docs.filter((doc: any) => {
          const data = doc.data();
          const name = (data.name || data.fullName || '').toLowerCase();
          return (
            name.includes(search) ||
            doc.id?.toLowerCase().includes(search) || // UID search
            data.customerId?.toLowerCase().includes(search) || // Legacy ID if exists
            data.email?.toLowerCase().includes(search) ||
            (data.phone || data.mobile || '').includes(filter.search!)
          );
        });
        total = matched.length;
        pageDocs = matched.slice(offset, offset + limit);
      } else {
        const [countSnap, pageSnap] = await Promise.all([
          query.count().get(),
          query.offset(offset).limit(limit).get(),
        ]);
        total = countSnap.data().count;
        this.logger.log(`Firestore read (paged): ${pageSnap.docs.length} documents at offset ${offset} for customers list`);
        pageDocs = pageSnap.docs;
      }

      const totalPages = Math.ceil(total / limit);
      const paginatedCustomers = pageDocs.map(mapCustomer);

      const serializableCustomers = paginatedCustomers.map((customer: any) =>
        this.serializeFirestoreValue(customer),
      );

      // Transform to DTO to sanitize response - map each element individually
      const dtoCustomers = serializableCustomers.map((customer: any) => 
        plainToInstance(CustomerResponseDto, customer, {
          excludeExtraneousValues: true,
        })
      );

      // Cache the result for 3 minutes to reduce reads
      await this.cacheService.set(cacheKey, dtoCustomers, 3 * 60 * 1000);
      
      return dtoCustomers;
    } catch (error) {
      this.logger.error('Error fetching customers:', error);
      throw error;
    }
  }

  /**
   * Auto-create a minimal customer profile for new users on first access
   */
  private async autoCreateCustomerProfile(uid: string, user: CurrentUser): Promise<CustomerResponseDto> {
    this.logger.log(`Creating minimal customer profile for: ${uid}`);
    
    const minimalCustomer = {
      uid,
      customerType: 'direct',
      managedByAggregatorUid: null,
      occupation: null,
      totalLandHolding: 0,
      landUnit: 'acres',
      state: null,
      district: null,
      taluka: null,
      village: null,
      address: null,
      pincode: null,
      geoLocation: null,
      totalBookings: 0,
      completedBookings: 0,
      cancelledBookings: 0,
      activeBookings: 0,
      lifetimeRevenue: 0,
      averageRating: 0,
      notificationSettings: {
        push: true,
        sms: true,
        email: true,
        whatsapp: false,
      },
    };

    try {
      await this.firebaseAdminService
        .firestore()
        .collection(COLLECTIONS.customers)
        .doc(uid)
        .set(minimalCustomer);

      this.logger.log(`✅ Customer profile created for: ${uid}`);

      // Return the newly created profile
      return await this.findById(uid, user);
    } catch (error) {
      this.logger.error(`Failed to auto-create customer profile for ${uid}:`, error);
      throw new InternalServerErrorException('Failed to create customer profile');
    }
  }

  async findById(uid: string, user: CurrentUser): Promise<CustomerResponseDto> {
    // Check cache first
    const cacheKey = `customer:${uid}`;
    const cached = await this.cacheService.get<CustomerResponseDto>(cacheKey);
    if (cached) {
      this.logger.log(`Cache hit for customer: ${uid}`);
      return cached;
    }

    try {
      // In hybrid model, document ID IS the UID
      const customerDoc = await this.firebaseAdminService
        .firestore()
        .collection(COLLECTIONS.customers)
        .doc(uid)
        .get();
        
      this.logger.log(`Firestore read: 1 document for customer ${uid}`);

      if (!customerDoc.exists) {
        // Auto-create customer profile for new users
        if (user.role === 'customer' && user.uid === uid) {
          this.logger.log(`Auto-creating customer profile for new user: ${uid}`);
          return await this.autoCreateCustomerProfile(uid, user);
        }
        throw new NotFoundException('Customer not found');
      }

      const customerData = customerDoc.data();
      if (!customerData) {
        throw new NotFoundException('Customer data not found');
      }

    // Map hybrid model fields to expected format
    const customer: any = {
      uid: customerDoc.id, // Document ID is the UID
      customerId: customerData.customerId, // Legacy field if exists
      name: customerData.name || customerData.fullName,
      email: customerData.email,
      phone: customerData.phone || customerData.mobile,
      role: 'customer',
      status: customerData.status?.toLowerCase() || 'active',
      profileData: {
        displayName: customerData.name || customerData.fullName,
        firstName: customerData.name?.split(' ')[0],
        lastName: customerData.name?.split(' ').slice(1).join(' '),
        occupation: customerData.occupation,
        region: customerData.district,
        state: customerData.state,
        location: customerData.geoLocation || customerData.location,
        managedByAggregatorId: customerData.managedByAggregatorUid, // Updated field name
      },
      verification: {
        isVerified: customerData.verification?.isVerified || false,
        documents: customerData.verification?.documents || [],
      },
      createdAt: customerData.createdAt,
      updatedAt: customerData.updatedAt,
      totalBookings: customerData.totalBookings || 0,
      totalRevenue: customerData.lifetimeRevenue || 0,
    };

    if (user.role === 'aggregator' && customer.profileData?.managedByAggregatorId !== user.uid) {
      throw new ForbiddenException('Access denied to this customer');
    }

    if (user.role === 'customer' && customer.uid !== uid) {
      throw new ForbiddenException('Access denied');
    }

      const serializableCustomer = this.serializeFirestoreValue(customer);

      // Transform to DTO to sanitize response
      const result = plainToInstance(CustomerResponseDto, serializableCustomer, {
        excludeExtraneousValues: true,
      });

      // Cache for 5 minutes
      await this.cacheService.set(cacheKey, result, 5 * 60 * 1000);

      return result;
    } catch (error) {
      this.logger.error(`Error fetching customer ${uid}:`, error);
      throw error;
    }
  }

  async update(uid: string, dto: UpdateCustomerDto, user: CurrentUser): Promise<CustomerResponseDto> {
    const customer = await this.getCustomerDocument(uid, user);

    // Prepare updates for users collection (identity fields)
    const userUpdates: any = {};
    if (dto.name) userUpdates.name = dto.name;
    if (dto.email) userUpdates.email = dto.email;
    if (dto.phone) userUpdates.phone = dto.phone;

    // Prepare updates for customers collection (customer-specific fields)
    const customerUpdates: any = {
      updatedAt: new Date().toISOString(),
    };

    // Map fields to customer collection
    if (dto.profileData) {
      if (dto.profileData.occupation) customerUpdates.occupation = dto.profileData.occupation;
      if (dto.profileData.state) customerUpdates.state = dto.profileData.state;
      if (dto.profileData.district) customerUpdates.district = dto.profileData.district;
      if (dto.profileData.taluka) customerUpdates.taluka = dto.profileData.taluka;
      if (dto.profileData.village) customerUpdates.village = dto.profileData.village;
      if (dto.profileData.address) customerUpdates.address = dto.profileData.address;
      if (dto.profileData.pincode) customerUpdates.pincode = dto.profileData.pincode;
      
      // Convert LocationDto to plain object for Firestore
      if (dto.profileData.location) {
        customerUpdates.geoLocation = {
          lat: dto.profileData.location.lat,
          lng: dto.profileData.location.lng,
          ...(dto.profileData.location.address && { address: dto.profileData.location.address }),
        };
      }
      
      if (dto.profileData.totalLandHolding !== undefined) customerUpdates.totalLandHolding = dto.profileData.totalLandHolding;
      if (dto.profileData.landUnit) customerUpdates.landUnit = dto.profileData.landUnit;
    }

    // Update users collection if there are identity changes
    if (Object.keys(userUpdates).length > 0) {
      userUpdates.updatedAt = new Date().toISOString();
      await this.usersService.updateOwnProfile(uid, {
        name: dto.name,
        email: dto.email,
        language: dto.profileData?.language,
        location: dto.profileData?.location,
      });
    }

    // Update customers collection
    await this.firebaseAdminService
      .firestore()
      .collection(COLLECTIONS.customers)
      .doc(uid)
      .update(customerUpdates);

    // Invalidate cache for this customer and list queries
    await this.cacheService.delete(`customer:${uid}`);
    await this.cacheService.deletePattern('customers-list:.*');

    // Return updated customer
    return await this.findById(uid, user);
  }

  async banCustomer(uid: string, banned: boolean, user: CurrentUser): Promise<any> {
    // Get customer document from customers collection
    const customerDoc = await this.firebaseAdminService
      .firestore()
      .collection(COLLECTIONS.customers)
      .doc(uid)
      .get();

    if (!customerDoc.exists) {
      throw new NotFoundException('Customer not found');
    }

    const customerData = customerDoc.data();
    if (!customerData) {
      throw new NotFoundException('Customer data not found');
    }

    // Check authorization
    if (user.role === 'aggregator' && customerData.managedByAggregatorUid !== user.uid) {
      throw new ForbiddenException('Access denied to this customer');
    }

    // Use uppercase status to match seed data format
    const updatedData = {
      status: banned ? 'BLOCKED' : 'ACTIVE',
      updatedAt: new Date().toISOString(),
    };

    await this.firebaseAdminService
      .firestore()
      .collection(COLLECTIONS.customers)
      .doc(uid)
      .update(updatedData);

    // Invalidate cache
    await this.cacheService.delete(`customer:${uid}`);
    await this.cacheService.deletePattern('customers-list:.*');

    return { ...customerData, ...updatedData, uid: customerDoc.id };
  }

  async getBookings(uid: string, user: CurrentUser, page: number = 1, limit: number = 10) {
    // Verify customer exists
    const customerDoc = await this.firebaseAdminService
      .firestore()
      .collection(COLLECTIONS.customers)
      .doc(uid)
      .get();
      
    if (!customerDoc.exists) {
      throw new NotFoundException('Customer not found');
    }
    
    const customerData = customerDoc.data();
    
    // AUTHORIZATION CHECK - Prevent IDOR
    if (user.role === 'customer' && user.uid !== uid) {
      throw new ForbiddenException('You can only view your own bookings');
    }
    
    if (user.role === 'aggregator' && customerData?.managedByAggregatorUid !== user.uid) {
      throw new ForbiddenException('You can only view bookings of customers you manage');
    }
    
    // Admins and super_admins can view all - no additional check needed
    
    // In hybrid model, uid IS the Firebase Auth UID
    const customerUid = uid;
    
    // Query bookings from bookings collection where customerUid matches
    const bookingsQuery = this.firebaseAdminService
      .firestore()
      .collection('bookings')
      .where('customerUid', '==', customerUid)
      .orderBy('scheduledDate', 'desc')
      .orderBy('id', 'desc');

    // Get total count
    const totalSnapshot = await bookingsQuery.get();
    const total = totalSnapshot.size;
    
    // Apply pagination
    const offset = (page - 1) * limit;
    const paginatedSnapshot = await bookingsQuery.limit(limit).offset(offset).get();
    const bookings = paginatedSnapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));

    return {
      data: bookings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    };
  }

  async getFarms(uid: string, user: CurrentUser, page: number = 1, limit: number = 10) {
    // Verify customer exists
    const customerDoc = await this.firebaseAdminService
      .firestore()
      .collection(COLLECTIONS.customers)
      .doc(uid)
      .get();
      
    if (!customerDoc.exists) {
      throw new NotFoundException('Customer not found');
    }
    
    const customerData = customerDoc.data();
    
    // AUTHORIZATION CHECK - Prevent IDOR
    if (user.role === 'customer' && user.uid !== uid) {
      throw new ForbiddenException('You can only view your own farms');
    }
    
    if (user.role === 'aggregator' && customerData?.managedByAggregatorUid !== user.uid) {
      throw new ForbiddenException('You can only view farms of customers you manage');
    }
    
    // Admins and super_admins can view all - no additional check needed
    
    // Check if farms are stored as subcollection or root collection
    // First try subcollection (as per import script structure)
    const subCollectionQuery = this.firebaseAdminService
      .firestore()
      .collection(COLLECTIONS.customers)
      .doc(uid)
      .collection('farms')
      .orderBy('createdAt', 'desc');
    
    const subCollectionSnapshot = await subCollectionQuery.get();
    
    // If subcollection has data, use it
    if (!subCollectionSnapshot.empty) {
      const offset = (page - 1) * limit;
      const total = subCollectionSnapshot.size;
      
      const paginatedSnapshot = await subCollectionQuery.limit(limit).offset(offset).get();
      const farms = paginatedSnapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
      
      return {
        data: farms,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1,
        },
      };
    }
    
    // Otherwise try root collection with customerUid filter (hybrid model uses customerUid)
    let query = this.firebaseAdminService
      .firestore()
      .collection('farms')
      .where('customerUid', '==', uid)
      .orderBy('createdAt', 'desc');

    const offset = (page - 1) * limit;
    const totalSnapshot = await query.get();
    const total = totalSnapshot.size;
    
    const paginatedSnapshot = await query.limit(limit).offset(offset).get();
    const farms = paginatedSnapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));

    return {
      data: farms,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    };
  }

  async getSupportTickets(uid: string, user: CurrentUser, page: number = 1, limit: number = 10) {
    // Verify customer exists
    const customerDoc = await this.firebaseAdminService
      .firestore()
      .collection(COLLECTIONS.customers)
      .doc(uid)
      .get();
      
    if (!customerDoc.exists) {
      throw new NotFoundException('Customer not found');
    }
    
    const customerData = customerDoc.data();
    
    if (!customerData) {
      throw new NotFoundException('Customer data not found');
    }
    
    // ✅ SECURITY FIX: IDOR Protection - Authorization check
    if (user.role === 'customer' && user.uid !== uid) {
      throw new ForbiddenException('You can only view your own support tickets');
    }
    
    if (user.role === 'aggregator' && customerData.managedByAggregatorUid !== user.uid) {
      throw new ForbiddenException('You can only view support tickets of customers you manage');
    }
    
    // Get support tickets from the supportTickets collection where customerUid matches (hybrid model)
    let query = this.firebaseAdminService
      .firestore()
      .collection('supportTickets')
      .where('customerUid', '==', uid)
      .orderBy('createdAt', 'desc');

    // Calculate pagination
    const offset = (page - 1) * limit;
    
    // Get total count
    const totalSnapshot = await query.get();
    const total = totalSnapshot.size;
    
    // Apply pagination
    const paginatedSnapshot = await query.limit(limit).offset(offset).get();
    const tickets = paginatedSnapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));

    return {
      data: tickets,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    };
  }

  async delete(uid: string, user: CurrentUser): Promise<void> {
    await this.getCustomerDocument(uid, user); // Verify access

    await this.firebaseAdminService
      .firestore()
      .collection(COLLECTIONS.customers)
      .doc(uid)
      .delete();

    // Invalidate cache
    await this.cacheService.delete(`customer:${uid}`);
    await this.cacheService.deletePattern('customers-list:.*');
  }

  async getStats(user: CurrentUser) {
    // Check cache first
    const cacheKey = `stats:${user.role}:${user.uid}`;
    const cached = await this.cacheService.get<any>(cacheKey);
    if (cached) {
      this.logger.log(`Cache hit for stats: ${cacheKey}`);
      return cached;
    }

    try {
      let query = this.firebaseAdminService
        .firestore()
        .collection(COLLECTIONS.customers) as any;

      // Apply role-based filtering
      if (user.role === 'aggregator') {
        query = query.where('managedByAggregatorUid', '==', user.uid);
      }

      const snapshot = await query.get();
      this.logger.log(`Firestore read: ${snapshot.docs.length} documents for stats`);
      
      const customers = snapshot.docs.map((doc: any) => doc.data());

    const totalCustomers = customers.length;
    
    // Calculate active customers (status = 'ACTIVE' in seed data)
    const activeCustomers = customers.filter((c: any) => 
      c.status === 'ACTIVE' || c.status?.toLowerCase() === 'active'
    ).length;

    // Calculate total revenue and bookings from aggregated data in customer records
    let totalRevenue = 0;
    let totalBookings = 0;

    customers.forEach((customer: any) => {
      totalRevenue += customer.lifetimeRevenue || 0;
      totalBookings += customer.totalBookings || 0;
    });

      const result = {
        totalCustomers,
        activeCustomers,
        totalRevenue,
        totalBookings,
      };

      // Cache stats for 5 minutes
      await this.cacheService.set(cacheKey, result, 5 * 60 * 1000);

      return result;
    } catch (error) {
      this.logger.error('Error fetching stats:', error);
      throw error;
    }
  }

  /**
   * Generate cache key based on filter parameters
   */
  private generateCacheKey(prefix: string, params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&');
    return `${prefix}:${sortedParams}`;
  }

  private serializeFirestoreValue(value: unknown): unknown {
    if (value === null || value === undefined) {
      return value;
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    if (this.isFirestoreTimestamp(value)) {
      return value.toDate().toISOString();
    }

    if (this.isFirestoreGeoPoint(value)) {
      return {
        lat: value.latitude,
        lng: value.longitude,
      };
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.serializeFirestoreValue(item));
    }

    if (typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([key, fieldValue]) => [
          key,
          this.serializeFirestoreValue(fieldValue),
        ]),
      );
    }

    return value;
  }

  private isFirestoreTimestamp(value: unknown): value is { toDate: () => Date } {
    const candidate = value as { constructor?: { name?: string }; toDate?: unknown };
    return candidate.constructor?.name === 'Timestamp' && typeof candidate.toDate === 'function';
  }

  private isFirestoreGeoPoint(value: unknown): value is { latitude: number; longitude: number } {
    const candidate = value as {
      constructor?: { name?: string };
      latitude?: unknown;
      longitude?: unknown;
    };

    return (
      candidate.constructor?.name === 'GeoPoint' &&
      typeof candidate.latitude === 'number' &&
      typeof candidate.longitude === 'number'
    );
  }

  private async getCustomerDocument(uid: string, user: CurrentUser): Promise<FirestoreUserDocument> {
    const customerDoc = await this.usersCollection().doc(uid).get();
    const customerData = customerDoc.data();

    if (!customerDoc.exists || !customerData) {
      throw new NotFoundException('Customer not found');
    }

    const customer: FirestoreUserDocument = {
      ...customerData,
      uid: customerData.uid ?? customerDoc.id,
    };

    if (customer.role !== 'customer') {
      throw new NotFoundException('User is not a customer');
    }

    if (user.role === 'aggregator' && customer.profileData?.managedByAggregatorId !== user.uid) {
      throw new ForbiddenException('Access denied to this customer');
    }

    if (user.role === 'customer' && user.uid !== uid) {
      throw new ForbiddenException('Access denied');
    }

    return customer;
  }

  private usersCollection(): CollectionReference<FirestoreUserDocument> {
    return this.firebaseAdminService
      .firestore()
      .collection('users') as CollectionReference<FirestoreUserDocument>;
  }

  private async getCustomerBookingStats(customerUid: string): Promise<{ totalBookings: number; totalRevenue: number }> {
    // Get bookings from the bookings collection where customerUid matches (hybrid model)
    const bookingsSnapshot = await this.firebaseAdminService
      .firestore()
      .collection(COLLECTIONS.bookings)
      .where('customerUid', '==', customerUid)
      .get();

    const bookings = bookingsSnapshot.docs.map((doc: any) => doc.data());
    const totalBookings = bookings.length;
    
    // Calculate total revenue from completed bookings
    const totalRevenue = bookings.reduce((sum: number, booking: any) => {
      // Use price.total from the booking
      const amount = booking.price?.total || booking.priceEstimation || 0;
      return sum + amount;
    }, 0);

    return { totalBookings, totalRevenue };
  }

  /**
   * Get cache statistics for monitoring
   */
  async getCacheStats() {
    return await this.cacheService.getStats();
  }

  /**
   * Get available filter options (states, regions, occupations) for dropdown filters
   */
  async getFilterOptions(user: CurrentUser): Promise<{ states: string[], regions: string[], occupations: string[], regionsByState: Record<string, string[]> }> {
    // Check cache first
    const cacheKey = `filter-options:${user.role}:${user.uid}`;
    const cached = await this.cacheService.get<{ states: string[], regions: string[], occupations: string[], regionsByState: Record<string, string[]> }>(cacheKey);
    if (cached) {
      this.logger.log(`Cache hit for filter options: ${cacheKey}`);
      return cached;
    }

    try {
      let query = this.firebaseAdminService
        .firestore()
        .collection(COLLECTIONS.customers) as any;

      // Apply role-based filtering
      if (user.role === 'aggregator') {
        query = query.where('managedByAggregatorUid', '==', user.uid);
      }

      const snapshot = await query.get();
      this.logger.log(`Firestore read: ${snapshot.docs.length} documents for filter options`);
      
      const statesSet = new Set<string>();
      const regionsSet = new Set<string>();
      const occupationsSet = new Set<string>();
      const regionsByState: Record<string, Set<string>> = {};

      snapshot.docs.forEach((doc: any) => {
        const data = doc.data();
        
        // Collect unique states
        if (data.state) {
          statesSet.add(data.state);
        }
        
        // Collect unique regions (districts in seed data)
        if (data.district) {
          regionsSet.add(data.district);
          
          // Group regions by state
          if (data.state && data.district) {
            if (!regionsByState[data.state]) {
              regionsByState[data.state] = new Set<string>();
            }
            regionsByState[data.state].add(data.district);
          }
        }
        
        // Collect unique occupations
        if (data.occupation) {
          occupationsSet.add(data.occupation);
        }
      });

      // Convert Sets to sorted arrays
      const regionsByStateArray: Record<string, string[]> = {};
      Object.keys(regionsByState).forEach(state => {
        regionsByStateArray[state] = Array.from(regionsByState[state]).sort();
      });

      const result = {
        states: Array.from(statesSet).sort(),
        regions: Array.from(regionsSet).sort(),
        occupations: Array.from(occupationsSet).sort(),
        regionsByState: regionsByStateArray,
      };

      // Cache filter options for 1 hour (they don't change frequently)
      await this.cacheService.set(cacheKey, result, 60 * 60 * 1000);

      return result;
    } catch (error) {
      this.logger.error('Error fetching filter options:', error);
      throw error;
    }
  }

  /**
   * Create a new farm location for a customer (self-service)
   */
  async createFarm(uid: string, farmData: any, user: CurrentUser) {
    // AUTHORIZATION CHECK
    if (user.role === 'customer' && user.uid !== uid) {
      throw new ForbiddenException('You can only create farms for your own account');
    }

    if (user.role === 'aggregator') {
      const customerDoc = await this.firebaseAdminService
        .firestore()
        .collection(COLLECTIONS.customers)
        .doc(uid)
        .get();
      if (!customerDoc.exists) {
        throw new NotFoundException(`Customer ${uid} not found`);
      }
      const customerData = customerDoc.data();
      if (customerData?.managedByAggregatorUid !== user.uid) {
        throw new ForbiddenException('You can only create farms for customers you manage');
      }
    }

    const now = new Date().toISOString();
    const farmRef = this.firebaseAdminService
      .firestore()
      .collection(COLLECTIONS.customers)
      .doc(uid)
      .collection('farms')
      .doc();

    const farm = {
      id: farmRef.id,
      customerUid: uid, // Hybrid model uses customerUid
      ...farmData,
      createdAt: now,
      updatedAt: now,
      createdBy: user.uid,
    };

    await farmRef.set(farm);
    
    this.logger.log(`Farm ${farmRef.id} created for customer ${uid}`);
    return farm;
  }

  /**
   * Update an existing farm location
   */
  async updateFarm(uid: string, farmId: string, farmData: any, user: CurrentUser) {
    // AUTHORIZATION CHECK
    if (user.role === 'customer' && user.uid !== uid) {
      throw new ForbiddenException('You can only update your own farms');
    }

    if (user.role === 'aggregator') {
      const customerDoc = await this.firebaseAdminService
        .firestore()
        .collection(COLLECTIONS.customers)
        .doc(uid)
        .get();
      if (!customerDoc.exists) {
        throw new NotFoundException(`Customer ${uid} not found`);
      }
      const customerData = customerDoc.data();
      if (customerData?.managedByAggregatorUid !== user.uid) {
        throw new ForbiddenException('You can only update farms for customers you manage');
      }
    }

    const farmRef = this.firebaseAdminService
      .firestore()
      .collection(COLLECTIONS.customers)
      .doc(uid)
      .collection('farms')
      .doc(farmId);

    const farmDoc = await farmRef.get();
    if (!farmDoc.exists) {
      throw new NotFoundException(`Farm ${farmId} not found`);
    }

    const updated = {
      ...farmDoc.data(),
      ...farmData,
      updatedAt: new Date().toISOString(),
      updatedBy: user.uid,
    };

    await farmRef.set(updated, { merge: true });
    
    this.logger.log(`Farm ${farmId} updated for customer ${uid}`);
    return updated;
  }

  /**
   * Delete a farm location (soft delete)
   */
  async deleteFarm(uid: string, farmId: string, user: CurrentUser) {
    // AUTHORIZATION CHECK
    if (user.role === 'customer' && user.uid !== uid) {
      throw new ForbiddenException('You can only delete your own farms');
    }

    if (user.role === 'aggregator') {
      const customerDoc = await this.firebaseAdminService
        .firestore()
        .collection(COLLECTIONS.customers)
        .doc(uid)
        .get();
      if (!customerDoc.exists) {
        throw new NotFoundException(`Customer ${uid} not found`);
      }
      const customerData = customerDoc.data();
      if (customerData?.managedByAggregatorUid !== user.uid) {
        throw new ForbiddenException('You can only delete farms for customers you manage');
      }
    }

    const farmRef = this.firebaseAdminService
      .firestore()
      .collection(COLLECTIONS.customers)
      .doc(uid)
      .collection('farms')
      .doc(farmId);

    const farmDoc = await farmRef.get();
    if (!farmDoc.exists) {
      throw new NotFoundException(`Farm ${farmId} not found`);
    }

    // Soft delete
    await farmRef.set(
      {
        deletedAt: new Date().toISOString(),
        deletedBy: user.uid,
        status: 'deleted',
      },
      { merge: true }
    );
    
    this.logger.log(`Farm ${farmId} deleted for customer ${uid}`);
    return { success: true, message: 'Farm deleted successfully' };
  }

  /**
   * Update notification settings for a customer
   */
  async updateNotificationSettings(uid: string, settings: any, user: CurrentUser) {
    // AUTHORIZATION CHECK - only the customer themselves can update their notification settings
    if (user.role === 'customer' && user.uid !== uid) {
      throw new ForbiddenException('You can only update your own notification settings');
    }

    // Admins can update on behalf of customer
    if (user.role !== 'admin' && user.role !== 'super_admin' && user.uid !== uid) {
      throw new ForbiddenException('Access denied');
    }

    const customerDoc = await this.firebaseAdminService
      .firestore()
      .collection(COLLECTIONS.customers)
      .doc(uid)
      .get();

    if (!customerDoc.exists) {
      throw new NotFoundException(`Customer ${uid} not found`);
    }

    const currentData = customerDoc.data();
    const currentSettings = currentData?.notificationSettings || {};

    const updatedSettings = {
      ...currentSettings,
      ...settings,
      updatedAt: new Date().toISOString(),
    };

    await this.firebaseAdminService
      .firestore()
      .collection(COLLECTIONS.customers)
      .doc(uid)
      .set(
        {
          notificationSettings: updatedSettings,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

    // Invalidate cache
    await this.cacheService.delete(`customer:${uid}`);
    await this.cacheService.deletePattern('customers-list:.*');

    this.logger.log(`Notification settings updated for customer ${uid}`);
    
    return {
      success: true,
      notificationSettings: updatedSettings,
    };
  }

  /**
   * Get in-app notifications for a customer
   */
  async getNotifications(uid: string, user: CurrentUser, page: number = 1, limit: number = 20) {
    // AUTHORIZATION CHECK
    if (user.role === 'customer' && user.uid !== uid) {
      throw new ForbiddenException('You can only view your own notifications');
    }

    if (user.role === 'aggregator') {
      const customerDoc = await this.firebaseAdminService
        .firestore()
        .collection(COLLECTIONS.customers)
        .doc(uid)
        .get();
      if (!customerDoc.exists) {
        throw new NotFoundException(`Customer ${uid} not found`);
      }
      const customerData = customerDoc.data();
      if (customerData?.managedByAggregatorUid !== user.uid) {
        throw new ForbiddenException('Access denied');
      }
    }

    // Get notifications from users/{uid}/notifications subcollection
    const notificationsQuery = this.firebaseAdminService
      .firestore()
      .collection('users')
      .doc(uid)
      .collection('notifications')
      .orderBy('timestamp', 'desc');

    const offset = (page - 1) * limit;
    const totalSnapshot = await notificationsQuery.get();
    const total = totalSnapshot.size;

    const paginatedSnapshot = await notificationsQuery.limit(limit).offset(offset).get();
    const notifications = paginatedSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return {
      data: notifications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
      unreadCount: notifications.filter((n: any) => !n.read).length,
    };
  }

  /**
   * Mark notification as read
   */
  async markNotificationRead(uid: string, notificationId: string, user: CurrentUser) {
    // AUTHORIZATION CHECK
    if (user.role === 'customer' && user.uid !== uid) {
      throw new ForbiddenException('You can only update your own notifications');
    }

    await this.firebaseAdminService
      .firestore()
      .collection('users')
      .doc(uid)
      .collection('notifications')
      .doc(notificationId)
      .update({
        read: true,
        readAt: new Date().toISOString(),
      });

    return { success: true };
  }

  /**
   * Mark all notifications as read for a customer
   */
  async markAllNotificationsRead(uid: string, user: CurrentUser) {
    // AUTHORIZATION CHECK
    if (user.role === 'customer' && user.uid !== uid) {
      throw new ForbiddenException('You can only update your own notifications');
    }

    // Get all unread notifications
    const notificationsSnapshot = await this.firebaseAdminService
      .firestore()
      .collection('users')
      .doc(uid)
      .collection('notifications')
      .where('read', '==', false)
      .get();

    if (notificationsSnapshot.empty) {
      return {
        success: true,
        message: 'No unread notifications to mark',
        updatedCount: 0,
      };
    }

    // Batch update all unread notifications
    const batch = this.firebaseAdminService.firestore().batch();
    const readAt = new Date().toISOString();

    notificationsSnapshot.docs.forEach((doc) => {
      batch.update(doc.ref, {
        read: true,
        readAt,
      });
    });

    await batch.commit();

    this.logger.log(`Marked ${notificationsSnapshot.size} notifications as read for customer ${uid}`);

    return {
      success: true,
      message: `Marked ${notificationsSnapshot.size} notifications as read`,
      updatedCount: notificationsSnapshot.size,
    };
  }

  /**
   * Get booking history grouped by month
   */
  async getBookingHistory(uid: string, user: CurrentUser, year?: number) {
    // AUTHORIZATION CHECK
    if (user.role === 'customer' && user.uid !== uid) {
      throw new ForbiddenException('You can only view your own booking history');
    }

    const customerDoc = await this.firebaseAdminService
      .firestore()
      .collection(COLLECTIONS.customers)
      .doc(uid)
      .get();

    if (!customerDoc.exists) {
      throw new NotFoundException('Customer not found');
    }

    const customerData = customerDoc.data();
    if (user.role === 'aggregator' && customerData?.managedByAggregatorUid !== user.uid) {
      throw new ForbiddenException('Access denied');
    }

    // In hybrid model, uid IS the Firebase Auth UID
    const firebaseUid = uid;

    // Build query for bookings
    let query = this.firebaseAdminService
      .firestore()
      .collection('bookings')
      .where('customerUid', '==', firebaseUid);

    // Filter by year if provided
    if (year) {
      query = query
        .where('scheduledDate', '>=', `${year}-01-01`)
        .where('scheduledDate', '<=', `${year}-12-31T23:59:59`);
    }

    const bookingsSnapshot = await query.orderBy('scheduledDate', 'desc').get();
    const bookings = bookingsSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Group bookings by month
    const groupedByMonth: Record<string, any[]> = {};
    const monthStats: Record<string, any> = {};

    bookings.forEach((booking: any) => {
      const date = new Date(booking.scheduledDate);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });

      if (!groupedByMonth[monthKey]) {
        groupedByMonth[monthKey] = [];
        monthStats[monthKey] = {
          month: monthName,
          monthKey,
          totalBookings: 0,
          completed: 0,
          cancelled: 0,
          totalAmount: 0,
        };
      }

      groupedByMonth[monthKey].push(booking);
      monthStats[monthKey].totalBookings++;

      if (booking.status === 'completed') {
        monthStats[monthKey].completed++;
        monthStats[monthKey].totalAmount += booking.finalPrice || booking.priceEstimation || 0;
      }

      if (booking.status === 'cancelled') {
        monthStats[monthKey].cancelled++;
      }
    });

    // Convert to array and sort by month desc
    const history = Object.entries(groupedByMonth)
      .map(([monthKey, monthBookings]) => ({
        ...monthStats[monthKey],
        bookings: monthBookings,
      }))
      .sort((a, b) => b.monthKey.localeCompare(a.monthKey));

    // Calculate overall stats
    const totalStats = {
      totalBookings: bookings.length,
      completed: bookings.filter((b: any) => b.status === 'completed').length,
      cancelled: bookings.filter((b: any) => b.status === 'cancelled').length,
      totalSpent: bookings.reduce((sum: number, b: any) => {
        if (b.status === 'completed') {
          return sum + (b.finalPrice || b.priceEstimation || 0);
        }
        return sum;
      }, 0),
    };

    return {
      year: year || new Date().getFullYear(),
      totalStats,
      history,
    };
  }

  /**
   * Request account deletion (soft delete / deactivation)
   */
  async requestDeletion(uid: string, reason: string, user: CurrentUser) {
    // AUTHORIZATION CHECK - only the customer themselves can request deletion
    if (user.role === 'customer' && user.uid !== uid) {
      throw new ForbiddenException('You can only delete your own account');
    }

    const customerDoc = await this.firebaseAdminService
      .firestore()
      .collection(COLLECTIONS.customers)
      .doc(uid)
      .get();

    if (!customerDoc.exists) {
      throw new NotFoundException(`Customer ${uid} not found`);
    }

    // Check for active bookings
    const activeBookingsQuery = await this.firebaseAdminService
      .firestore()
      .collection('bookings')
      .where('customerUid', '==', uid)
      .where('status', 'in', ['pending', 'confirmed', 'in_progress'])
      .get();

    if (!activeBookingsQuery.empty) {
      throw new BadRequestException(
        'Cannot delete account with active bookings. Please cancel or complete all bookings first.'
      );
    }

    // Create deletion request for admin review
    await this.firebaseAdminService
      .firestore()
      .collection('account_deletion_requests')
      .add({
        userId: uid,
        userRole: 'customer',
        reason: reason || 'Not specified',
        status: 'pending', // pending → approved → completed
        requestedAt: new Date().toISOString(),
        requestedBy: user.uid,
      });

    // Mark account as pending deletion
    await this.firebaseAdminService
      .firestore()
      .collection(COLLECTIONS.customers)
      .doc(uid)
      .update({
        status: 'PENDING_DELETION',
        deletionRequested: true,
        deletionRequestedAt: new Date().toISOString(),
        deletionReason: reason || 'Not specified',
        updatedAt: new Date().toISOString(),
      });

    // Invalidate cache
    await this.cacheService.delete(`customer:${uid}`);
    await this.cacheService.deletePattern('customers-list:.*');

    this.logger.log(`Account deletion requested for customer ${uid}`);

    return {
      success: true,
      message: 'Account deletion request submitted. An admin will review your request shortly.',
      status: 'pending_review',
    };
  }

  /**
   * Get notification settings for a customer
   */
  async getNotificationSettings(uid: string, user: CurrentUser) {
    // AUTHORIZATION CHECK
    if (user.role === 'customer' && user.uid !== uid) {
      throw new ForbiddenException('You can only view your own notification settings');
    }

    if (user.role === 'aggregator') {
      const customerDoc = await this.firebaseAdminService
        .firestore()
        .collection(COLLECTIONS.customers)
        .doc(uid)
        .get();
      if (!customerDoc.exists) {
        throw new NotFoundException(`Customer ${uid} not found`);
      }
      const customerData = customerDoc.data();
      if (customerData?.managedByAggregatorUid !== user.uid) {
        throw new ForbiddenException('Access denied');
      }
    }

    const customerDoc = await this.firebaseAdminService
      .firestore()
      .collection(COLLECTIONS.customers)
      .doc(uid)
      .get();

    if (!customerDoc.exists) {
      throw new NotFoundException(`Customer ${uid} not found`);
    }

    const customerData = customerDoc.data();
    const notificationSettings = customerData?.notificationSettings || {
      emailNotifications: true,
      smsNotifications: true,
      pushNotifications: true,
      bookingUpdates: true,
      promotionalMessages: false,
      weatherAlerts: true,
      priceAlerts: true,
      missionUpdates: true,
    };

    return {
      success: true,
      notificationSettings,
    };
  }

  /**
   * Check flying restrictions for a location (airspace compliance)
   * RED/YELLOW/GREEN zone classification with caching (15 minutes)
   */
  async checkFlyingRestrictions(dto: FlyingRestrictionCheckDto): Promise<FlyingRestrictionResult> {
    const cacheKey = `flying-restriction:v5:${dto.latitude}:${dto.longitude}`;
    const cached = await this.cacheService.get<FlyingRestrictionResult>(cacheKey);

    if (cached) {
      this.logger.log(`Cache hit for flying restriction check: ${cacheKey}`);
      return cached;
    }

    const result = await this.mapsService.checkFlyingRestrictions(
      dto.latitude,
      dto.longitude,
      dto.serviceType,
    );

    const formattedResult: FlyingRestrictionResult = {
      ...result,
      cachedAt: new Date().toISOString(),
    };

    // Cache for 15 minutes (airspace restrictions don't change frequently)
    await this.cacheService.set(cacheKey, formattedResult, 15 * 60 * 1000);

    return formattedResult;
  }

  /**
   * Check weather conditions for drone operations
   * Uses real Open-Meteo weather data (free, no API key required)
   * GREEN/YELLOW/RED status with caching (15 minutes)
   */
  async checkWeatherConditions(dto: WeatherCheckDto): Promise<any> {
    const cacheKey = `weather-check:${dto.latitude}:${dto.longitude}:${dto.targetDate || 'now'}`;
    const cached = await this.cacheService.get<any>(cacheKey);

    if (cached) {
      this.logger.log(`Cache hit for weather check: ${cacheKey}`);
      return cached;
    }

    const result = await this.weatherService.checkWeather(
      { lat: dto.latitude, lng: dto.longitude },
      dto.targetDate,
    );

    const formattedResult = {
      status: result.status.toLowerCase(),
      summary: result.summary,
      temperature: result.metrics.temperatureC,
      windSpeed: result.metrics.windSpeedKmh,
      humidity: 0,
      rainProbability: result.metrics.precipitationProbability,
      precipitation: result.metrics.precipitationMm,
      forecast: result.summary,
      checkedAt: result.checkedAt,
      provider: result.provider,
      forecastFor: result.forecastFor,
      location: result.location,
      reasons: result.reasons,
    };

    await this.cacheService.set(cacheKey, formattedResult, 15 * 60 * 1000);

    return formattedResult;
  }

  /**
   * Discover available service providers near a location
   * Exposes VendorService.discoverProviders with caching (10 minutes)
   */
  async discoverServices(dto: ServiceDiscoveryDto) {
    return await this.vendorService.discoverProviders(
      dto.latitude,
      dto.longitude,
      dto.serviceType,
      dto.radiusKm,
    );
  }

  /**
   * Find the nearest available pilots for a customer booking location.
   * Customer-safe subset only (no PII, coarse coordinates) — the pilot is
   * still assigned by the Fleet Manager after admin approval; this powers
   * the optional "nearest pilots" preview in the booking flow.
   * Scoring mirrors drone-pilot-matching weights: distance 40 / rating 25 /
   * completion 20 / experience 15. Cached for 5 minutes.
   */
  async findNearbyPilots(params: {
    latitude: number;
    longitude: number;
    serviceType?: string;
    radiusKm?: number;
    limit?: number;
  }) {
    const { latitude, longitude } = params;
    if (
      !this.mapsService.validateCoordinates(latitude, longitude)
    ) {
      throw new BadRequestException('Valid latitude and longitude are required.');
    }
    const radiusKm = Math.min(Math.max(params.radiusKm || 50, 1), 200);
    const limit = Math.min(Math.max(params.limit || 3, 1), 10);
    const serviceType = params.serviceType?.trim() || undefined;

    const cacheKey = `nearby-pilots:${latitude}:${longitude}:${serviceType || 'all'}:${radiusKm}:${limit}`;
    const cached = await this.cacheService.get<any>(cacheKey);
    if (cached) {
      this.logger.log(`Cache hit for nearby pilots: ${latitude},${longitude}`);
      return cached;
    }

    const pilotsSnapshot = await this.firebaseAdminService
      .firestore()
      .collection(COLLECTIONS.users)
      .where('role', '==', 'pilot')
      .where('status', '==', 'active')
      .where('adminApproval', '==', true)
      .get();

    const pilots = pilotsSnapshot.docs.map((doc) => doc.data() as FirestoreUserDocument);

    const MAX_TRAVEL_DISTANCE_KM = 100;

    const scored = pilots
      .map((pilot) => {
        const profile = (pilot.profileData || {}) as Record<string, any>;
        const base =
          (profile.currentLocation as { lat?: number; lng?: number } | undefined) ??
          (profile.location as { lat?: number; lng?: number } | undefined);
        if (!base || typeof base.lat !== 'number' || typeof base.lng !== 'number') {
          return null;
        }

        // Service-type compatibility (multi_purpose wildcard; unlisted = open).
        const serviceTypes: string[] = Array.isArray(profile.serviceTypes)
          ? profile.serviceTypes
          : Array.isArray((pilot as any).serviceTypes)
            ? (pilot as any).serviceTypes
            : [];
        const qualified =
          !serviceType ||
          serviceTypes.length === 0 ||
          serviceTypes.includes(serviceType) ||
          serviceTypes.includes('multi_purpose');
        if (!qualified) {
          return null;
        }

        // Skip pilots currently on a mission or explicitly offline.
        if (profile.currentMissionId || profile.currentBookingId) {
          return null;
        }
        if (profile.isOnline === false) {
          return null;
        }

        const distanceKm = this.mapsService.calculateHaversineDistance(
          latitude,
          longitude,
          base.lat,
          base.lng,
        );
        if (distanceKm > radiusKm) {
          return null;
        }

        const distanceScore = Math.max(0, 100 - (distanceKm / MAX_TRAVEL_DISTANCE_KM) * 100);
        const rating =
          typeof profile.rating === 'number'
            ? profile.rating
            : typeof profile.stats?.averageRating === 'number'
              ? profile.stats.averageRating
              : typeof (pilot as any).rating === 'number'
                ? (pilot as any).rating
                : 0;
        const ratingScore = (Math.min(Math.max(rating, 0), 5) / 5) * 100;
        const completed = Number(profile.stats?.completedMissions ?? 0);
        const total = Number(profile.stats?.totalMissions ?? 0);
        const completionScore = total > 0 ? (completed / total) * 100 : 50;
        const flightHours = Number(
          profile.stats?.totalFlightHours ?? profile.totalFlightHours ?? 0,
        );
        const experienceScore = Math.min(100, (flightHours / 1000) * 100);

        const score =
          distanceScore * 0.4 + ratingScore * 0.25 + completionScore * 0.2 + experienceScore * 0.15;

        return {
          pilotUid: pilot.uid,
          name: pilot.name || 'Hawk Pilot',
          distanceKm: Math.round(distanceKm * 10) / 10,
          rating: Math.round(rating * 10) / 10 || null,
          qualified: true,
          score: Math.round(score * 10) / 10,
          recommendation:
            score >= 80 ? 'highly_recommended' : score >= 60 ? 'recommended' : 'suitable',
          // Coarse coordinates only — exact pilot GPS stays internal.
          latitude: Math.round(base.lat * 1000) / 1000,
          longitude: Math.round(base.lng * 1000) / 1000,
        };
      })
      .filter((p) => p !== null)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    const result = {
      location: { lat: latitude, lng: longitude },
      radiusKm,
      serviceType: serviceType || 'all',
      pilotsFound: scored.length,
      pilots: scored,
    };

    await this.cacheService.set(cacheKey, result, 5 * 60 * 1000);

    return result;
  }

  /**
   * Get price estimation for a service
   * Exposes PricingService.estimatePrice for customer use
   */
  async estimateServicePrice(dto: EstimatePriceDto) {
    return await this.pricingService.estimatePrice(dto);
  }
}

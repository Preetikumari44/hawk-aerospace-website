import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { FirebaseAdminService } from '../../firebase/firebase-admin.service';
import type { CurrentUser } from '../../common/interfaces/current-user.interface';
import type { FirestoreFarmDocument } from '../../database/firestore/contracts';
import { WS_EVENTS } from '../../gateway/events/event.constants';
import { CreateFarmDto } from './dto/create-farm.dto';
import { UpdateFarmDto } from './dto/update-farm.dto';
import { FarmFilterDto } from './dto/farm-filter.dto';

@Injectable()
export class FarmService {
  private readonly logger = new Logger(FarmService.name);

  constructor(
    private readonly firebaseAdminService: FirebaseAdminService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Create a new farm for a customer
   * Farm storage: users/{customerUid}/farms/{farmDocId}
   */
  async create(dto: CreateFarmDto, user: CurrentUser, targetCustomerUid?: string): Promise<FirestoreFarmDocument> {
    // Determine customer UID
    // Customers create for themselves, admins/aggregators can create for others
    let customerUid: string;
    
    if (targetCustomerUid) {
      // Only admins and aggregators can create farms for other users
      if (!['admin', 'super_admin', 'subadmin', 'aggregator'].includes(user.role)) {
        throw new ForbiddenException('Only admins and aggregators can create farms for other customers');
      }
      customerUid = targetCustomerUid;
    } else {
      // Creating for self
      if (user.role !== 'customer') {
        throw new BadRequestException('Must specify customerUid when creating farm as non-customer');
      }
      customerUid = user.uid;
    }

    // Generate farm ID with timestamp for uniqueness
    const timestamp = Date.now();
    const farmId = `FARM${String(timestamp).slice(-9)}`;  // Last 9 digits
    
    const farmRef = this.firebaseAdminService
      .firestore()
      .collection('users')
      .doc(customerUid)
      .collection('farms')
      .doc();

    const now = new Date().toISOString();

    // Convert DTOs to plain objects
    const farm: FirestoreFarmDocument = {
      farmId,
      customerUid,
      farmName: dto.farmName,
      gpsCenter: {
        lat: dto.gpsCenter.lat,
        lng: dto.gpsCenter.lng,
      },
      gpsBoundary: dto.gpsBoundary.map(point => ({
        lat: point.lat,
        lng: point.lng,
      })),
      address: dto.address,
      village: dto.village ?? null,
      taluka: dto.taluka ?? null,
      district: dto.district ?? null,
      state: dto.state ?? null,
      pincode: dto.pincode ?? null,
      area: {
        value: dto.area.value,
        unit: dto.area.unit,
      },
      crop: dto.crop ?? null,
      season: dto.season ?? null,
      plantingDate: dto.plantingDate ?? null,
      expectedHarvestDate: dto.expectedHarvestDate ?? null,
      soilType: dto.soilType ?? null,
      soilHealth: dto.soilHealth ?? null,
      irrigationType: dto.irrigationType ?? null,
      waterSource: dto.waterSource ?? null,
      isActive: dto.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    };

    await farmRef.set(farm);

    // Emit WebSocket event
    this.eventEmitter.emit(WS_EVENTS.FARM_CREATED, {
      farmId: farm.farmId,
      customerUid: farm.customerUid,
      farmName: farm.farmName,
      area: farm.area,
      location: farm.gpsCenter,
      createdBy: user.uid,
      timestamp: now,
    });

    this.logger.log(`Farm ${farmId} created for customer ${customerUid} by ${user.uid}`);

    return farm;
  }

  /**
   * List all farms for a customer with optional filtering
   */
  async findAll(filter: FarmFilterDto, user: CurrentUser): Promise<{
    data: FirestoreFarmDocument[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    // Determine which customer's farms to query
    let customerUid: string;
    
    if (filter.customerUid) {
      // Querying specific customer
      if (user.role === 'customer' && user.uid !== filter.customerUid) {
        throw new ForbiddenException('Cannot access farms of other customers');
      }
      customerUid = filter.customerUid;
    } else {
      // No customerUid specified
      if (user.role === 'customer') {
        // Customers can only see their own farms
        customerUid = user.uid;
      } else {
        throw new BadRequestException('customerUid parameter is required for non-customer roles');
      }
    }

    // Build query
    let query = this.firebaseAdminService
      .firestore()
      .collection('users')
      .doc(customerUid)
      .collection('farms') as any;

    // Apply filters
    if (filter.isActive !== undefined) {
      query = query.where('isActive', '==', filter.isActive);
    }

    if (filter.state) {
      query = query.where('state', '==', filter.state);
    }

    if (filter.district) {
      query = query.where('district', '==', filter.district);
    }

    if (filter.crop) {
      query = query.where('crop', '==', filter.crop);
    }

    if (filter.season) {
      query = query.where('season', '==', filter.season);
    }

    // Get all matching documents
    const snapshot = await query.orderBy('createdAt', 'desc').get();
    const allFarms = snapshot.docs.map((doc: any) => doc.data() as FirestoreFarmDocument);

    // Apply pagination
    const page = filter.page || 1;
    const limit = filter.limit || 20;
    const offset = (page - 1) * limit;
    
    const paginatedFarms = allFarms.slice(offset, offset + limit);
    const total = allFarms.length;
    const totalPages = Math.ceil(total / limit);

    return {
      data: paginatedFarms,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  /**
   * Get a specific farm by farmId
   */
  async findOne(farmId: string, user: CurrentUser, customerUid?: string): Promise<FirestoreFarmDocument> {
    // Determine customer UID
    let targetCustomerUid: string;
    
    if (customerUid) {
      if (user.role === 'customer' && user.uid !== customerUid) {
        throw new ForbiddenException('Cannot access farms of other customers');
      }
      targetCustomerUid = customerUid;
    } else {
      if (user.role !== 'customer') {
        throw new BadRequestException('customerUid parameter is required for non-customer roles');
      }
      targetCustomerUid = user.uid;
    }

    // Query by farmId
    const snapshot = await this.firebaseAdminService
      .firestore()
      .collection('users')
      .doc(targetCustomerUid)
      .collection('farms')
      .where('farmId', '==', farmId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      throw new NotFoundException(`Farm ${farmId} not found`);
    }

    return snapshot.docs[0].data() as FirestoreFarmDocument;
  }

  /**
   * Update a farm
   */
  async update(
    farmId: string,
    dto: UpdateFarmDto,
    user: CurrentUser,
    customerUid?: string,
  ): Promise<FirestoreFarmDocument> {
    // Determine customer UID
    let targetCustomerUid: string;
    
    if (customerUid) {
      if (user.role === 'customer' && user.uid !== customerUid) {
        throw new ForbiddenException('Cannot update farms of other customers');
      }
      targetCustomerUid = customerUid;
    } else {
      if (user.role !== 'customer') {
        throw new BadRequestException('customerUid parameter is required for non-customer roles');
      }
      targetCustomerUid = user.uid;
    }

    // Find the farm document
    const snapshot = await this.firebaseAdminService
      .firestore()
      .collection('users')
      .doc(targetCustomerUid)
      .collection('farms')
      .where('farmId', '==', farmId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      throw new NotFoundException(`Farm ${farmId} not found`);
    }

    const docRef = snapshot.docs[0].ref;
    const existing = snapshot.docs[0].data() as FirestoreFarmDocument;

    // Build update object (convert DTOs to plain objects)
    const updates: Partial<FirestoreFarmDocument> = {
      updatedAt: new Date().toISOString(),
    };

    if (dto.farmName) updates.farmName = dto.farmName;
    if (dto.gpsCenter) updates.gpsCenter = { lat: dto.gpsCenter.lat, lng: dto.gpsCenter.lng };
    if (dto.gpsBoundary) {
      updates.gpsBoundary = dto.gpsBoundary.map(p => ({ lat: p.lat, lng: p.lng }));
    }
    if (dto.address) updates.address = dto.address;
    if (dto.village !== undefined) updates.village = dto.village ?? null;
    if (dto.taluka !== undefined) updates.taluka = dto.taluka ?? null;
    if (dto.district !== undefined) updates.district = dto.district ?? null;
    if (dto.state !== undefined) updates.state = dto.state ?? null;
    if (dto.pincode !== undefined) updates.pincode = dto.pincode ?? null;
    if (dto.area) updates.area = { value: dto.area.value, unit: dto.area.unit };
    if (dto.crop !== undefined) updates.crop = dto.crop ?? null;
    if (dto.season !== undefined) updates.season = dto.season ?? null;
    if (dto.plantingDate !== undefined) updates.plantingDate = dto.plantingDate ?? null;
    if (dto.expectedHarvestDate !== undefined) updates.expectedHarvestDate = dto.expectedHarvestDate ?? null;
    if (dto.soilType !== undefined) updates.soilType = dto.soilType ?? null;
    if (dto.soilHealth !== undefined) updates.soilHealth = dto.soilHealth ?? null;
    if (dto.irrigationType !== undefined) updates.irrigationType = dto.irrigationType ?? null;
    if (dto.waterSource !== undefined) updates.waterSource = dto.waterSource ?? null;
    if (dto.isActive !== undefined) updates.isActive = dto.isActive;

    await docRef.update(updates);

    // Emit event
    this.eventEmitter.emit(WS_EVENTS.FARM_UPDATED, {
      farmId,
      customerUid: targetCustomerUid,
      updatedFields: Object.keys(updates),
      updatedBy: user.uid,
      timestamp: updates.updatedAt,
    });

    this.logger.log(`Farm ${farmId} updated by ${user.uid}`);

    return { ...existing, ...updates } as FirestoreFarmDocument;
  }

  /**
   * Delete (deactivate) a farm
   * Soft delete by setting isActive = false
   */
  async remove(farmId: string, user: CurrentUser, customerUid?: string): Promise<void> {
    // Determine customer UID
    let targetCustomerUid: string;
    
    if (customerUid) {
      if (user.role === 'customer' && user.uid !== customerUid) {
        throw new ForbiddenException('Cannot delete farms of other customers');
      }
      targetCustomerUid = customerUid;
    } else {
      if (user.role !== 'customer') {
        throw new BadRequestException('customerUid parameter is required for non-customer roles');
      }
      targetCustomerUid = user.uid;
    }

    // Check if farm is linked to any active bookings
    const bookingsSnapshot = await this.firebaseAdminService
      .firestore()
      .collection('users')
      .doc(targetCustomerUid)
      .collection('bookings')
      .where('farmId', '==', farmId)
      .where('status', 'in', ['pending', 'confirmed', 'in_progress'])
      .limit(1)
      .get();

    if (!bookingsSnapshot.empty) {
      throw new BadRequestException(
        'Cannot delete farm with active bookings. Please cancel or complete all bookings first.'
      );
    }

    // Find the farm document
    const snapshot = await this.firebaseAdminService
      .firestore()
      .collection('users')
      .doc(targetCustomerUid)
      .collection('farms')
      .where('farmId', '==', farmId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      throw new NotFoundException(`Farm ${farmId} not found`);
    }

    const now = new Date().toISOString();

    // Soft delete
    await snapshot.docs[0].ref.update({
      isActive: false,
      updatedAt: now,
    });

    // Emit event
    this.eventEmitter.emit(WS_EVENTS.FARM_DELETED, {
      farmId,
      customerUid: targetCustomerUid,
      deletedBy: user.uid,
      timestamp: now,
    });

    this.logger.log(`Farm ${farmId} deactivated by ${user.uid}`);
  }

  /**
   * Get farm statistics for a customer
   */
  async getStats(customerUid: string, user: CurrentUser): Promise<{
    totalFarms: number;
    activeFarms: number;
    totalArea: number;
    areaUnit: string;
    cropDistribution: Record<string, number>;
  }> {
    // Authorization
    if (user.role === 'customer' && user.uid !== customerUid) {
      throw new ForbiddenException('Cannot access statistics of other customers');
    }

    const snapshot = await this.firebaseAdminService
      .firestore()
      .collection('users')
      .doc(customerUid)
      .collection('farms')
      .get();

    const farms = snapshot.docs.map(doc => doc.data() as FirestoreFarmDocument);

    const activeFarms = farms.filter(f => f.isActive);
    
    // Calculate total area (assuming all in same unit for simplicity)
    const totalArea = activeFarms.reduce((sum, farm) => sum + farm.area.value, 0);
    const areaUnit = activeFarms[0]?.area.unit || 'acres';

    // Crop distribution
    const cropDistribution: Record<string, number> = {};
    activeFarms.forEach(farm => {
      if (farm.crop) {
        cropDistribution[farm.crop] = (cropDistribution[farm.crop] || 0) + 1;
      }
    });

    return {
      totalFarms: farms.length,
      activeFarms: activeFarms.length,
      totalArea: Math.round(totalArea * 100) / 100,
      areaUnit,
      cropDistribution,
    };
  }
}

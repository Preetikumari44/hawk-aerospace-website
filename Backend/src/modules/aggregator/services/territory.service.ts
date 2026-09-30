import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { FirebaseAdminService } from '../../../firebase/firebase-admin.service';
import { ROOT_COLLECTIONS } from '../../../common/constants/collection-paths.constant';
import { AssignTerritoryDto, CheckTerritoryDto, TerritoryFilterDto } from '../dto/territory.dto';
import { CacheService } from '../../../common/cache/cache.service';

export interface Territory {
  id: string;
  aggregatorUid: string;
  aggregatorName: string;
  states: string[];
  districts: string[];
  boundary?: {
    type: 'Polygon' | 'Circle';
    coordinates?: number[][];
    center?: { lat: number; lng: number };
    radius?: number;
  };
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class TerritoryService {
  private readonly logger = new Logger(TerritoryService.name);

  constructor(
    private readonly firebaseAdminService: FirebaseAdminService,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * Assign territory to aggregator
   */
  async assignTerritory(dto: AssignTerritoryDto): Promise<Territory> {
    this.logger.log(`Assigning territory to aggregator: ${dto.aggregatorUid}`);
    
    const db = this.firebaseAdminService.firestore();

    // Verify aggregator exists
    const aggregatorDoc = await db
      .collection(ROOT_COLLECTIONS.users)
      .doc(dto.aggregatorUid)
      .get();

    if (!aggregatorDoc.exists) {
      throw new NotFoundException(`Aggregator ${dto.aggregatorUid} not found`);
    }

    const aggregatorData = aggregatorDoc.data();

    // Check for overlapping territories
    await this.checkTerritoryOverlap(dto.states, dto.districts, dto.aggregatorUid);

    const territory: Territory = {
      id: `territory-${Date.now()}`,
      aggregatorUid: dto.aggregatorUid,
      aggregatorName: aggregatorData?.name || 'Unknown',
      states: dto.states,
      districts: dto.districts,
      boundary: dto.boundary,
      notes: dto.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.collection('territories').doc(territory.id).set(territory);

    // Clear cache
    await this.cacheService.delete(`territory:aggregator:${dto.aggregatorUid}`);

    this.logger.log(`Territory assigned successfully: ${territory.id}`);
    return territory;
  }

  /**
   * Get territories by filter
   */
  async getTerritories(filter: TerritoryFilterDto): Promise<Territory[]> {
    const db = this.firebaseAdminService.firestore();
    let query = db.collection('territories');

    if (filter.aggregatorUid) {
      query = query.where('aggregatorUid', '==', filter.aggregatorUid) as any;
    }

    if (filter.state) {
      query = query.where('states', 'array-contains', filter.state) as any;
    }

    if (filter.district) {
      query = query.where('districts', 'array-contains', filter.district) as any;
    }

    const snapshot = await query.get();
    return snapshot.docs.map((doc) => doc.data() as Territory);
  }

  /**
   * Find aggregators for a location (territory-based routing)
   */
  async findAggregatorsForLocation(dto: CheckTerritoryDto): Promise<{
    eligible: Array<{ aggregatorUid: string; aggregatorName: string; matchType: string }>;
    reason: string;
  }> {
    const cacheKey = `territory:location:${dto.lat}:${dto.lng}:${dto.state}:${dto.district}`;
    const cached = await this.cacheService.get<any>(cacheKey);
    if (cached) {
      return cached;
    }

    const db = this.firebaseAdminService.firestore();
    const territories = await db.collection('territories').get();
    
    const eligible: Array<{ aggregatorUid: string; aggregatorName: string; matchType: string }> = [];

    for (const doc of territories.docs) {
      const territory = doc.data() as Territory;
      
      // Check state match
      if (dto.state && territory.states.includes(dto.state)) {
        // Check district match
        if (dto.district && territory.districts.includes(dto.district)) {
          eligible.push({
            aggregatorUid: territory.aggregatorUid,
            aggregatorName: territory.aggregatorName,
            matchType: 'exact',
          });
        } else if (!dto.district) {
          eligible.push({
            aggregatorUid: territory.aggregatorUid,
            aggregatorName: territory.aggregatorName,
            matchType: 'state',
          });
        }
      }

      // Check geographic boundary if defined
      if (territory.boundary) {
        const isInBoundary = this.isPointInBoundary(
          dto.lat,
          dto.lng,
          territory.boundary,
        );

        if (isInBoundary) {
          eligible.push({
            aggregatorUid: territory.aggregatorUid,
            aggregatorName: territory.aggregatorName,
            matchType: 'geographic',
          });
        }
      }
    }

    // Remove duplicates
    const unique = eligible.filter(
      (item, index, self) =>
        index === self.findIndex((t) => t.aggregatorUid === item.aggregatorUid),
    );

    const result = {
      eligible: unique,
      reason: unique.length > 0 ? 'Territory match found' : 'No territory coverage for this location',
    };

    // Cache for 5 minutes
    await this.cacheService.set(cacheKey, result, 5 * 60 * 1000);

    return result;
  }

  /**
   * Update territory
   */
  async updateTerritory(territoryId: string, dto: Partial<AssignTerritoryDto>): Promise<Territory> {
    const db = this.firebaseAdminService.firestore();
    const territoryDoc = await db.collection('territories').doc(territoryId).get();

    if (!territoryDoc.exists) {
      throw new NotFoundException(`Territory ${territoryId} not found`);
    }

    const currentTerritory = territoryDoc.data() as Territory;

    // Check for overlapping territories if states/districts changed
    if (dto.states || dto.districts) {
      await this.checkTerritoryOverlap(
        dto.states || currentTerritory.states,
        dto.districts || currentTerritory.districts,
        currentTerritory.aggregatorUid,
        territoryId,
      );
    }

    const updated: Territory = {
      ...currentTerritory,
      ...(dto.states && { states: dto.states }),
      ...(dto.districts && { districts: dto.districts }),
      ...(dto.boundary && { boundary: dto.boundary }),
      ...(dto.notes && { notes: dto.notes }),
      updatedAt: new Date().toISOString(),
    };

    await db.collection('territories').doc(territoryId).set(updated, { merge: true });

    // Clear cache
    await this.cacheService.delete(`territory:aggregator:${currentTerritory.aggregatorUid}`);

    return updated;
  }

  /**
   * Delete territory
   */
  async deleteTerritory(territoryId: string): Promise<void> {
    const db = this.firebaseAdminService.firestore();
    const territoryDoc = await db.collection('territories').doc(territoryId).get();

    if (!territoryDoc.exists) {
      throw new NotFoundException(`Territory ${territoryId} not found`);
    }

    const territory = territoryDoc.data() as Territory;
    await db.collection('territories').doc(territoryId).delete();

    // Clear cache
    await this.cacheService.delete(`territory:aggregator:${territory.aggregatorUid}`);

    this.logger.log(`Territory deleted: ${territoryId}`);
  }

  /**
   * Check for overlapping territories
   */
  private async checkTerritoryOverlap(
    states: string[],
    districts: string[],
    aggregatorUid: string,
    excludeTerritoryId?: string,
  ): Promise<void> {
    const db = this.firebaseAdminService.firestore();
    
    for (const state of states) {
      const overlappingQuery = await db
        .collection('territories')
        .where('states', 'array-contains', state)
        .get();

      for (const doc of overlappingQuery.docs) {
        const existingTerritory = doc.data() as Territory;
        
        // Skip if this is the territory being updated
        if (excludeTerritoryId && existingTerritory.id === excludeTerritoryId) {
          continue;
        }

        // Skip if same aggregator (allow multiple territories for same aggregator)
        if (existingTerritory.aggregatorUid === aggregatorUid) {
          continue;
        }

        // Check district overlap
        const districtOverlap = districts.some((d) =>
          existingTerritory.districts.includes(d),
        );

        if (districtOverlap) {
          throw new BadRequestException(
            `Territory overlap detected: ${state} - ${districts.join(', ')} is already assigned to another aggregator`,
          );
        }
      }
    }
  }

  /**
   * Check if a point is within a geographic boundary
   */
  private isPointInBoundary(
    lat: number,
    lng: number,
    boundary: Territory['boundary'],
  ): boolean {
    if (!boundary) return false;

    if (boundary.type === 'Circle' && boundary.center && boundary.radius) {
      return this.isPointInCircle(lat, lng, boundary.center, boundary.radius);
    }

    if (boundary.type === 'Polygon' && boundary.coordinates) {
      return this.isPointInPolygon(lat, lng, boundary.coordinates);
    }

    return false;
  }

  /**
   * Check if point is within circle (Haversine distance)
   */
  private isPointInCircle(
    lat: number,
    lng: number,
    center: { lat: number; lng: number },
    radiusKm: number,
  ): boolean {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRadians(lat - center.lat);
    const dLng = this.toRadians(lng - center.lng);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(center.lat)) *
        Math.cos(this.toRadians(lat)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return distance <= radiusKm;
  }

  /**
   * Check if point is within polygon (Ray-casting algorithm)
   */
  private isPointInPolygon(lat: number, lng: number, coordinates: number[][]): boolean {
    let inside = false;

    for (let i = 0, j = coordinates.length - 1; i < coordinates.length; j = i++) {
      const xi = coordinates[i][1]; // lng
      const yi = coordinates[i][0]; // lat
      const xj = coordinates[j][1];
      const yj = coordinates[j][0];

      const intersect =
        yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;

      if (intersect) inside = !inside;
    }

    return inside;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}

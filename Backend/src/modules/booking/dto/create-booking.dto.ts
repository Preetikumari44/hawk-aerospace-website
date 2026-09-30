import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

import {
  DRONE_TIERS,
  AREA_UNITS,
  type AreaUnit,
  type DroneTier,
} from '../../pricing/data/crop-rates';
import {
  BOOKING_SERVICE_TYPES,
  type DroneServiceType,
  type SprayingSubType,
  type SeedingSubType,
  type MonitoringSubType,
  type MappingSubType,
  type MappingInfrastructure,
  type SurveillanceSubType,
  type SurveillanceInfrastructure,
  type VideographySubType,
  type DeliverySubType,
  type DeliveryPackageSize,
} from '../../../database/firestore/contracts';

class LocationDto {
  @Type(() => Number)
  @IsNumber()
  lat!: number;

  @Type(() => Number)
  @IsNumber()
  lng!: number;
}

export class DetailedAddressDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  addressLine1?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  addressLine2?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  pincode?: string;
}

class DimensionsDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  length!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  width!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  height!: number;
}

/**
 * Per-service field bag. All fields optional here; per-service requirements are
 * enforced in BookingService.assertServiceDetails based on serviceType.
 */
export class ServiceDetailsDto {
  // ─── Common Fields ───────────────────────────────────────────────────────
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  specialInstructions?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  unit?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  quantity?: number;

  // ─── Spraying Service ────────────────────────────────────────────────────
  @IsOptional()
  @IsIn([
    'fertilizer_spraying',
    'pesticide_spraying',
    'insecticide_spraying',
    'herbicide_spraying',
    'fungicide_spraying',
    'growth_regulator_spraying',
    'micronutrient_spraying',
    'organic_spraying',
    'precision_spraying',
    'other',
  ])
  sprayingSubType?: SprayingSubType;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  chemicalName?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  chemicalQuantity?: number;

  @IsOptional()
  @IsIn(['liters', 'kg'])
  chemicalUnit?: 'liters' | 'kg';

  @IsOptional()
  @IsString()
  @MaxLength(200)
  targetPest?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  applicationRate?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  sprayHeight?: number;

  // ─── Seeding Service ─────────────────────────────────────────────────────
  @IsOptional()
  @IsIn([
    'rice_seeding',
    'wheat_seeding',
    'corn_seeding',
    'pulses_seeding',
    'vegetable_seeding',
    'cover_crop_seeding',
    'grass_seeding',
    'reforestation_seeding',
    'other',
  ])
  seedingSubType?: SeedingSubType;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  seedType?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  seedQuantity?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  seedingRate?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  seedingDepth?: number;

  // ─── Monitoring Service ──────────────────────────────────────────────────
  @IsOptional()
  @IsIn([
    'crop_health_monitoring',
    'pest_detection',
    'disease_detection',
    'weed_detection',
    'irrigation_monitoring',
    'growth_stage_monitoring',
    'yield_estimation',
    'soil_analysis',
    'thermal_imaging',
    'multispectral_analysis',
    'ndvi_analysis',
    'other',
  ])
  monitoringSubType?: MonitoringSubType;

  @IsOptional()
  @IsIn(['one_time', 'weekly', 'bi_weekly', 'monthly', 'custom'])
  monitoringFrequency?: 'one_time' | 'weekly' | 'bi_weekly' | 'monthly' | 'custom';

  @IsOptional()
  @IsString({ each: true })
  analysisType?: string[];

  @IsOptional()
  @IsIn(['pdf', 'excel', 'gis', 'all'])
  reportFormat?: 'pdf' | 'excel' | 'gis' | 'all';

  // ─── Mapping Service ─────────────────────────────────────────────────────
  @IsOptional()
  @IsString()
  @MaxLength(120)
  mappingType?: string; // Legacy field

  @IsOptional()
  @IsIn([
    'topographic_mapping',
    'orthomosaic_mapping',
    '3d_modeling',
    'agricultural_mapping',
    'construction_site_mapping',
    'forest_vegetation_mapping',
    'flood_plain_mapping',
    'infrastructure_mapping',
    'mining_quarry_surveys',
    'basic_aerial_mapping',
    'advanced_mapping',
    'other',
  ])
  mappingSubType?: MappingSubType;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  mappingInfrastructure?: MappingInfrastructure;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  resolution?: number;

  @IsOptional()
  @IsIn(['geotiff', 'kml', 'shp', 'all'])
  outputFormat?: 'geotiff' | 'kml' | 'shp' | 'all';

  @IsOptional()
  @IsString()
  @MaxLength(50)
  coordinateSystem?: string;

  // ─── Surveillance Service ────────────────────────────────────────────────
  @IsOptional()
  @IsString()
  @MaxLength(120)
  surveillanceType?: string; // Legacy field

  @IsOptional()
  @IsIn([
    'perimeter_border_surveillance',
    'event_monitoring',
    'traffic_road_monitoring',
    'wildlife_environmental_monitoring',
    'disaster_emergency_response',
    'pipeline_powerline_inspection',
    'construction_site_security',
    'anti_poaching_surveillance',
    'mining_site_inspection',
    'traffic_management_monitoring',
    'road_highway_inspection',
    'other',
  ])
  surveillanceSubType?: SurveillanceSubType;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  surveillanceInfrastructure?: SurveillanceInfrastructure;

  @IsOptional()
  @IsIn(['day', 'night', '24_hours'])
  surveillanceShift?: 'day' | 'night' | '24_hours';

  @IsOptional()
  @IsIn(['rgb', 'thermal', 'both'])
  cameraType?: 'rgb' | 'thermal' | 'both';

  @IsOptional()
  @Type(() => Boolean)
  recordingRequired?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  liveStreamRequired?: boolean;

  // ─── Videography Service ─────────────────────────────────────────────────
  @IsOptional()
  @IsString()
  @MaxLength(120)
  videographyType?: string; // Legacy field

  @IsOptional()
  @IsIn([
    'event_photography',
    'real_estate_photography',
    'property_360_tour',
    'wedding_event_coverage',
    'commercial_advertisement',
    'documentary_filming',
    'sports_event_coverage',
    'construction_progress_documentation',
    'tourism_promotional',
    'inspection_documentation',
    'cinematic_production',
    'aerial_time_lapse',
    'other',
  ])
  videographySubType?: VideographySubType;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  eventType?: string;

  @IsOptional()
  @IsString({ each: true })
  shotType?: string[];

  @IsOptional()
  @IsIn(['1080p', '4k', '8k'])
  videoResolution?: '1080p' | '4k' | '8k';

  @IsOptional()
  @IsIn([24, 30, 60, 120])
  frameRate?: 24 | 30 | 60 | 120;

  @IsOptional()
  @Type(() => Boolean)
  editingRequired?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  rawFootageRequired?: boolean;

  // ─── Duration (Surveillance / Videography) ───────────────────────────────
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  durationMinutes?: number;

  // ─── Delivery Service ────────────────────────────────────────────────────
  @IsOptional()
  @IsIn([
    'documents_envelopes',
    'small_parcel',
    'medium_parcel',
    'large_parcel',
    'heavy_cargo',
    'fragile_breakable',
    'perishable_food',
    'medical_supplies',
    'electronics',
    'clothing_apparel',
    'gifts_collectibles',
    'industrial_parts',
    'hazardous_materials',
    'other',
  ])
  deliverySubType?: DeliverySubType;

  @IsOptional()
  @IsIn(['small_parcel', 'medium_parcel', 'large_parcel', 'heavy_cargo'])
  packageSize?: DeliveryPackageSize;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  weightKg?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => DimensionsDto)
  dimensions?: DimensionsDto;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  contents?: string;

  @IsOptional()
  @Type(() => Boolean)
  isFragile?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  requiresColdChain?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  requiresSignature?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  insuranceRequired?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  estimatedValue?: number;
}

export class CreateBookingDto {
  @IsOptional()
  @IsString()
  customerUid?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  farmId?: string;

  @IsString()
  @MaxLength(500)
  address!: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => DetailedAddressDto)
  detailedAddress?: DetailedAddressDto;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  areaValue!: number;

  @IsIn(AREA_UNITS)
  areaUnit!: AreaUnit;

  @IsString()
  cropType!: string;

  @IsIn(BOOKING_SERVICE_TYPES as readonly string[])
  serviceType!: DroneServiceType;

  @IsOptional()
  @ValidateNested()
  @Type(() => ServiceDetailsDto)
  serviceDetails?: ServiceDetailsDto;

  @ValidateNested()
  @Type(() => LocationDto)
  location!: LocationDto;

  /** Delivery only: destination/drop-off location. */
  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  dropoffLocation?: LocationDto;

  @IsOptional()
  @IsString()
  couponCode?: string;

  @IsOptional()
  @IsIn(DRONE_TIERS)
  droneTier?: DroneTier;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  distanceKm?: number;

  @IsDateString()
  scheduledDate!: string;

  @IsOptional()
  @IsIn(['morning', 'afternoon', 'evening'])
  preferredTimeSlot?: 'morning' | 'afternoon' | 'evening';
}

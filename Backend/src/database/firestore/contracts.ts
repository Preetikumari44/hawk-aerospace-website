import type { AppRole, UserStatus } from '../../common/constants/roles.constant';
import type { FirestoreDocumentBase } from '../../common/interfaces/firestore-doc.interface';

export type PaymentMethod = 'cash' | 'upi' | 'wallet';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';
export type BookingStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
export type AdminApprovalStatus = 'pending' | 'approved' | 'rejected';
export type DroneServiceType =
  | 'spraying'
  | 'seeding'
  | 'monitoring'
  | 'mapping'
  | 'surveillance'
  | 'videography'
  | 'delivery';

/** All bookable service types (Figma taxonomy). Source of truth for DTO validation. */
export const BOOKING_SERVICE_TYPES: readonly DroneServiceType[] = [
  'spraying',
  'seeding',
  'monitoring',
  'mapping',
  'surveillance',
  'videography',
  'delivery',
] as const;

/** Physical dimensions of a delivery payload (centimetres). */
export interface PayloadDimensions {
  length: number;
  width: number;
  height: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-SERVICE TYPE DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────

/** Spraying sub-service types */
export type SprayingSubType =
  | 'fertilizer_spraying'
  | 'pesticide_spraying'
  | 'insecticide_spraying'
  | 'herbicide_spraying'
  | 'fungicide_spraying'
  | 'growth_regulator_spraying'
  | 'micronutrient_spraying'
  | 'organic_spraying'
  | 'precision_spraying'
  | 'other';

/** Seeding sub-service types */
export type SeedingSubType =
  | 'rice_seeding'
  | 'wheat_seeding'
  | 'corn_seeding'
  | 'pulses_seeding'
  | 'vegetable_seeding'
  | 'cover_crop_seeding'
  | 'grass_seeding'
  | 'reforestation_seeding'
  | 'other';

/** Monitoring sub-service types */
export type MonitoringSubType =
  | 'crop_health_monitoring'
  | 'pest_detection'
  | 'disease_detection'
  | 'weed_detection'
  | 'irrigation_monitoring'
  | 'growth_stage_monitoring'
  | 'yield_estimation'
  | 'soil_analysis'
  | 'thermal_imaging'
  | 'multispectral_analysis'
  | 'ndvi_analysis'
  | 'other';

/** Mapping sub-service types */
export type MappingSubType =
  | 'topographic_mapping'
  | 'orthomosaic_mapping'
  | '3d_modeling'
  | 'agricultural_mapping'
  | 'construction_site_mapping'
  | 'forest_vegetation_mapping'
  | 'flood_plain_mapping'
  | 'infrastructure_mapping'
  | 'mining_quarry_surveys'
  | 'basic_aerial_mapping'
  | 'advanced_mapping'
  | 'other';

/** Infrastructure types for mapping */
export type MappingInfrastructure =
  | 'urban_residential_area'
  | 'agricultural_land'
  | 'forest'
  | 'construction_site'
  | 'mining_quarry_site'
  | 'water_body'
  | 'highway_road_network'
  | 'railway_corridor'
  | 'hill_mountain_terrain'
  | 'industrial_zone'
  | 'solar_farm'
  | 'wind_farm'
  | 'airport'
  | 'historical_monument'
  | 'bridge'
  | 'dam'
  | 'warehouse'
  | 'other';

/** Surveillance sub-service types */
export type SurveillanceSubType =
  | 'perimeter_border_surveillance'
  | 'event_monitoring'
  | 'traffic_road_monitoring'
  | 'wildlife_environmental_monitoring'
  | 'disaster_emergency_response'
  | 'pipeline_powerline_inspection'
  | 'construction_site_security'
  | 'anti_poaching_surveillance'
  | 'mining_site_inspection'
  | 'traffic_management_monitoring'
  | 'road_highway_inspection'
  | 'other';

/** Infrastructure types for surveillance */
export type SurveillanceInfrastructure =
  | 'residential_colony'
  | 'commercial_complex'
  | 'industrial_plant'
  | 'warehouse_logistics_hub'
  | 'border_perimeter_wall'
  | 'oil_gas_pipeline'
  | 'power_transmission_lines'
  | 'port_harbour'
  | 'airport_perimeter'
  | 'military_base'
  | 'government_facility'
  | 'data_center'
  | 'event_venue'
  | 'stadium'
  | 'highway'
  | 'toll_plaza'
  | 'forest'
  | 'wildlife_reserve'
  | 'construction_site'
  | 'other';

/** Videography sub-service types */
export type VideographySubType =
  | 'event_photography'
  | 'real_estate_photography'
  | 'property_360_tour'
  | 'wedding_event_coverage'
  | 'commercial_advertisement'
  | 'documentary_filming'
  | 'sports_event_coverage'
  | 'construction_progress_documentation'
  | 'tourism_promotional'
  | 'inspection_documentation'
  | 'cinematic_production'
  | 'aerial_time_lapse'
  | 'other';

/** Delivery sub-service types (package categories) */
export type DeliverySubType =
  | 'documents_envelopes'
  | 'small_parcel'
  | 'medium_parcel'
  | 'large_parcel'
  | 'heavy_cargo'
  | 'fragile_breakable'
  | 'perishable_food'
  | 'medical_supplies'
  | 'electronics'
  | 'clothing_apparel'
  | 'gifts_collectibles'
  | 'industrial_parts'
  | 'hazardous_materials'
  | 'other';

/** Delivery package size categories */
export type DeliveryPackageSize =
  | 'small_parcel'    // 30×25×10 cm, up to 2.5 kg
  | 'medium_parcel'   // 45×35×20 cm, up to 15 kg
  | 'large_parcel'    // 80×60×50 cm, up to 50 kg
  | 'heavy_cargo';    // 150×100×80 cm, up to 200 kg

/**
 * Per-service field bag. Every field is optional at the type level; which ones are
 * required is enforced per `serviceType` at the service layer (see
 * BookingService.assertServiceDetails). One flexible shape instead of a separate
 * schema per service.
 */
export interface BookingServiceDetails {
  // ─── Common Fields ───────────────────────────────────────────────────────
  specialInstructions?: string;
  /** Canonical pricing unit per the service price list (e.g. per_acre, per_hour, per_visit, per_km, per_30min). */
  unit?: string;
  /** Quantity in the above unit (area in acres for per-acre services, hours/km/visits otherwise). */
  quantity?: number;
  
  // ─── Spraying Service ────────────────────────────────────────────────────
  sprayingSubType?: SprayingSubType;
  chemicalName?: string;              // Name of chemical/fertilizer being sprayed
  chemicalQuantity?: number;          // Quantity in liters or kg
  chemicalUnit?: 'liters' | 'kg';
  targetPest?: string;                // Target pest/disease (for pesticide/insecticide)
  applicationRate?: number;           // ml or gm per acre
  sprayHeight?: number;               // Spraying height in meters
  
  // ─── Seeding Service ─────────────────────────────────────────────────────
  seedingSubType?: SeedingSubType;
  seedType?: string;                  // Type/variety of seed
  seedQuantity?: number;              // Quantity in kg
  seedingRate?: number;               // Seeds per square meter
  seedingDepth?: number;              // Depth in cm
  
  // ─── Monitoring Service ──────────────────────────────────────────────────
  monitoringSubType?: MonitoringSubType;
  monitoringFrequency?: 'one_time' | 'weekly' | 'bi_weekly' | 'monthly' | 'custom';
  analysisType?: string[];            // e.g., ['ndvi', 'thermal', 'rgb']
  reportFormat?: 'pdf' | 'excel' | 'gis' | 'all';
  
  // ─── Mapping Service ─────────────────────────────────────────────────────
  mappingType?: string;               // Legacy field (kept for backward compatibility)
  mappingSubType?: MappingSubType;
  mappingInfrastructure?: MappingInfrastructure;
  resolution?: number;                // cm per pixel
  outputFormat?: 'geotiff' | 'kml' | 'shp' | 'all';
  coordinateSystem?: string;          // e.g., 'WGS84', 'UTM'
  
  // ─── Surveillance Service ────────────────────────────────────────────────
  surveillanceType?: string;          // Legacy field (kept for backward compatibility)
  surveillanceSubType?: SurveillanceSubType;
  surveillanceInfrastructure?: SurveillanceInfrastructure;
  surveillanceShift?: 'day' | 'night' | '24_hours';
  cameraType?: 'rgb' | 'thermal' | 'both';
  recordingRequired?: boolean;
  liveStreamRequired?: boolean;
  
  // ─── Videography Service ─────────────────────────────────────────────────
  videographyType?: string;           // Legacy field (kept for backward compatibility)
  videographySubType?: VideographySubType;
  eventType?: string;                 // Event type (e.g. Event Photography, 360° Property Tour)
  shotType?: string[];                // e.g., ['aerial_pan', 'orbit', 'flythrough']
  videoResolution?: '1080p' | '4k' | '8k';
  frameRate?: 24 | 30 | 60 | 120;
  editingRequired?: boolean;
  rawFootageRequired?: boolean;
  
  // ─── Duration (Surveillance / Videography) ───────────────────────────────
  durationMinutes?: number;
  
  // ─── Delivery Service ────────────────────────────────────────────────────
  deliverySubType?: DeliverySubType;
  packageSize?: DeliveryPackageSize;
  weightKg?: number;
  dimensions?: PayloadDimensions;
  contents?: string;
  isFragile?: boolean;
  requiresColdChain?: boolean;        // For perishable items
  requiresSignature?: boolean;
  insuranceRequired?: boolean;
  estimatedValue?: number;            // For insurance purposes
}
export type DroneStatus = 'deployable' | 'assigned' | 'under_maintenance' | 'crashed';
export type MaintenanceType =
  | 'battery_replacement'
  | 'firmware_update'
  | 'propeller'
  | 'motor'
  | 'calibration'
  | 'full_service';
export type MaintenanceStatus = 'scheduled' | 'in_progress' | 'completed';
export type AdminActionStatus = 'pending' | 'in_review' | 'approved' | 'rejected';
export type CouponStatus = 'active' | 'inactive' | 'expired';
export type MissionStatus = 'pending' | 'completed' | 'cancelled';
export type PilotMissionStatus =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'en_route'        // Pilot is navigating to location
  | 'at_location'     // Pilot has arrived at the site
  | 'preflight'       // Pre-flight checks being performed
  | 'started'         // Mission/spray operation in progress
  | 'completed'
  | 'cancelled';
export type TicketPriority = 'low' | 'medium' | 'high' | 'critical';
export type TicketStatus = 'open' | 'assigned' | 'in_progress' | 'resolved' | 'closed';
export type IncidentType =
  | 'drone_malfunction'
  | 'pilot_emergency'
  | 'crash'
  | 'chemical_spill'
  | 'customer_complaint';
export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';
export type IncidentStatus = 'reported' | 'investigating' | 'resolved' | 'escalated' | 'closed';
export type SubAdminStatus = 'active' | 'inactive' | 'suspended';
export type RevenuePeriod = 'daily' | 'weekly' | 'monthly';
export type RewardFulfillmentStatus = 'shipped' | 'canceled' | 'delivered';
export type DelegatedBookingStatus = 'created' | 'pending_approval' | 'confirmed' | 'completed' | 'cancelled';

export interface GeoPointValue {
  lat: number;
  lng: number;
}

export interface AreaValue {
  unit: string;
  value: number;
}

export interface VerificationDocument {
  type: string;
  url: string;
  uploadedAt?: string;
}

export interface VerificationState {
  isVerified: boolean;
  emailVerified?: boolean; // Email verification status (matching seed data)
  phoneVerified?: boolean; // Phone verification status (matching seed data)
  kycStatus?: 'pending' | 'approved' | 'rejected'; // KYC status (matching seed data)
  documents: VerificationDocument[];
  remarks?: string;
}

export interface UserProfileData {
  name?: string;
  language?: string;
  location?: GeoPointValue;
  photoUrl?: string | null;
  timezone?: string; // Timezone (matching seed data)
  preferences?: Record<string, any>; // User preferences (matching seed data)
  assignedFleetManagerUid?: string;
  assignedVendorUid?: string;
  address?: string;
  state?: string;
  district?: string;
  pincode?: string;
  [key: string]: unknown;
}

export interface UserAuthCredentials {
  passwordHash?: string;
  resetToken?: string | null;
  resetTokenExpiry?: string | null;
  lastPasswordChange?: string | null;
}

export interface PermissionMap {
  [permission: string]: boolean;
}

export interface FirestoreUserDocument extends FirestoreDocumentBase {
  uid: string;
  role: AppRole;
  roles?: AppRole[]; // Array of roles (new seed data format)
  primaryRole?: AppRole; // Primary role (new seed data format)
  /** Roles that were explicitly approved by an admin. Roles absent here can NOT be
   *  switched to via /auth/switch-role. Always includes 'customer'. */
  approvedRoles?: AppRole[];
  status: UserStatus;
  name: string;
  email?: string | null;
  phone?: string | null;
  authProvider: 'phone' | 'email';
  profileData: UserProfileData;
  verification: VerificationState;
  adminApproval: boolean;
  permissions?: PermissionMap;
  authCredentials?: UserAuthCredentials;
  lastLogin?: string | Date | null;
  lastLoginIp?: string | null; // Last login IP (matching seed data)
  loginCount?: number; // Login count (matching seed data)
}

export interface FirestoreFarmDocument extends FirestoreDocumentBase {
  farmId: string;
  customerUid: string;
  farmName: string;
  gpsCenter: GeoPointValue;
  gpsBoundary: GeoPointValue[];
  address: string;
  village?: string | null;
  taluka?: string | null;
  district?: string | null;
  state?: string | null;
  pincode?: string | null;
  area: AreaValue;
  crop?: string | null;
  season?: 'Kharif' | 'Rabi' | 'Zaid' | null;
  plantingDate?: string | null;
  expectedHarvestDate?: string | null;
  soilType?: string | null;
  soilHealth?: 'Poor' | 'Fair' | 'Good' | 'Excellent' | null;
  irrigationType?: 'Rain Fed' | 'Well' | 'Tube Well' | 'Drip' | 'Sprinkler' | null;
  waterSource?: 'Rainwater' | 'Borewell' | 'Canal' | 'River' | 'Pond' | null;
  isActive: boolean;
}

/** Detailed price breakdown structure */
export interface PriceBreakdown {
  baseAmount: number;
  travelCharges: number;
  additionalCharges: number;
  discount: number;
  couponDiscount: number;
  taxAmount: number;
  totalAmount: number;
}

/** Airspace restriction check result */
export interface FlyingRestriction {
  status: 'green' | 'yellow' | 'red';
  zone: string;
  restrictions: string[];
}

/** Weather condition check result */
export interface WeatherCheck {
  status: 'green' | 'yellow' | 'red';
  temperature: number;
  humidity: number;
  windSpeed: number;
  forecast: string;
}

/** Farm snapshot - immutable copy of farm state at booking time */
export interface FarmSnapshot {
  farmId: string;
  farmName: string;
  gpsCenter: GeoPointValue;
  gpsBoundary: GeoPointValue[];
  address: string;
  village?: string | null;
  taluka?: string | null;
  district?: string | null;
  state?: string | null;
  pincode?: string | null;
  area: AreaValue;
  crop?: string | null;
  season?: 'Kharif' | 'Rabi' | 'Zaid' | null;
  plantingDate?: string | null;
  expectedHarvestDate?: string | null;
  soilType?: string | null;
  soilHealth?: 'Poor' | 'Fair' | 'Good' | 'Excellent' | null;
  irrigationType?: 'Rain Fed' | 'Well' | 'Tube Well' | 'Drip' | 'Sprinkler' | null;
  waterSource?: 'Rainwater' | 'Borewell' | 'Canal' | 'River' | 'Pond' | null;
}

export interface DetailedAddress {
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

export interface FirestoreBookingDocument extends FirestoreDocumentBase {
  id: string;
  bookingNumber?: string; // Human-readable sequential ID like "0001" (also used as doc id)
  customerUid: string;
  createdBy: string;
  aggregatorUid?: string | null;
  fleetManagerUid?: string | null;
  assignedPilot?: string | null;
  assignedDrone?: string | null;
  assignedPilotName?: string | null;
  
  // Farm reference and snapshot
  farmId?: string | null;
  farmSnapshot?: FarmSnapshot | null; // Immutable farm state at booking time
  
  address: string;
  detailedAddress?: DetailedAddress | null;
  billingAddress?: DetailedAddress | null;
  area: AreaValue;
  cropType: string;
  serviceType: DroneServiceType;
  /** Per-service fields (crop instructions, mapping/surveillance type, delivery payload…). */
  serviceDetails?: BookingServiceDetails | null;
  droneTier?: 'basic' | 'standard' | 'premium';
  /** Primary site. For delivery this is the pickup/source location. */
  location: GeoPointValue;
  /** Delivery only: destination/drop-off location. Null for single-location services. */
  dropoffLocation?: GeoPointValue | null;
  
  // Scheduling fields
  scheduledDate: string;
  scheduledStartTime?: string | null;
  scheduledEndTime?: string | null;
  preferredTimeSlot?: 'morning' | 'afternoon' | 'evening' | null;
  
  // Pricing fields
  couponCode?: string | null;
  couponDiscount?: number | null;
  originalPrice?: number | null;
  priceEstimation?: number | null;
  priceBreakdown?: PriceBreakdown | null; // Detailed breakdown
  finalPrice?: number | null;
  paymentMethod?: PaymentMethod | null;
  paymentStatus?: PaymentStatus | null;
  paymentId?: string | null;
  invoiceId?: string | null;
  /** True when the customer chose to pay by cash and is awaiting pilot confirmation. */
  cashPending?: boolean | null;
  cashConfirmedAt?: string | null;
  cashConfirmedBy?: string | null;
  
  // Status tracking
  status: BookingStatus;
  /** Admin approval sub-status: pending (awaiting approval), approved, rejected */
  adminApprovalStatus?: AdminApprovalStatus;
  /** Auto-assign flag - if true, system auto-assigns FM on admin approval */
  autoAssign?: boolean;
  /** 7-stage UI tracker (1-7). Persisted for efficient queries. */
  stage?: number;
  
  // Flight condition checks (cached)
  flyingRestriction?: FlyingRestriction | null;
  weatherCheck?: WeatherCheck | null;
  
  // Mission link
  missionId?: string | null;

  // ── Drone handover verification ──
  /** 4-char code generated on drone assignment; pilot enters it before starting. */
  handoverIssueCode?: string | null;
  handoverIssueVerified?: boolean | null;
  handoverIssueVerifiedAt?: string | null;
  /** 4-char code generated when the pilot ends the service; FM enters it to complete. */
  handoverReturnCode?: string | null;
  handoverReturnRequestedAt?: string | null;
  handoverReturnVerified?: boolean | null;
  handoverReturnVerifiedAt?: string | null;
  
  // Timestamps
  confirmedAt?: string | null;
  actualStartTime?: string | null;
  actualEndTime?: string | null;
  actualDuration?: number | null; // Duration in minutes
  completedAt?: string | null;
  
  // Completion data
  completionNotes?: string | null;
  customerRating?: number | null;
  customerFeedback?: string | null;
  /** UID of the user who submitted the rating (customer or sales aggregator). */
  ratedBy?: string | null;
  /** Role of the user who submitted the rating. */
  ratedByRole?: string | null;
  
  // Cancellation data
  cancellationReason?: string | null;
  cancelledBy?: string | null;
  cancelledAt?: string | null;
  refundAmount?: number | null;
}

export interface TransactionLineItem {
  paymentId: string;
  bookingId: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
}

export interface FirestoreTransactionDocument extends FirestoreDocumentBase {
  id: string;
  userId: string;
  transactions: TransactionLineItem[];
}

export interface NotificationMessage {
  message: string;
  timestamp: string;
  read?: boolean;
}

export interface FirestoreNotificationDocument extends FirestoreDocumentBase {
  id: string;
  uid: string;
  messages: NotificationMessage[];
}

export interface FirestoreInvoiceDocument extends FirestoreDocumentBase {
  id: string;
  invoiceId: string;
  bookingId: string;
  customerUid: string;
  amount: number;
  discount: number;
  finalAmount: number;
  paymentMode: PaymentMethod;
  paymentStatus: PaymentStatus;
  downloadUrl?: string | null;
  generatedAt: string;
}

export interface DroneSpecs {
  payloadKg?: number;
  flightTimeMin?: number;
  batteryCapacity?: number;
}

export interface FirestoreDroneDocument extends FirestoreDocumentBase {
  id: string;
  uid: string;
  fleetManagerUid: string;
  assignedBookingId?: string | null;
  model: string;
  serialNo: string;
  type: DroneServiceType;
  status: DroneStatus;
  specs: DroneSpecs;
  totalFlightHours: number;
  lastMaintenance?: string | null;
  nextMaintenanceDue?: string | null;
}

export interface FirestoreMaintenanceLogDocument extends FirestoreDocumentBase {
  id: string;
  droneId: string;
  fleetManagerUid: string;
  technicianUid?: string | null;
  type: MaintenanceType;
  status: MaintenanceStatus;
  partsReplaced?: string | null;
  diagnosisNotes?: string | null;
  timeTakenHours?: number | null;
  evidenceMedia: string[];
  scheduledDate?: string | null;
  completedAt?: string | null;
}

export interface FirestoreAdminActionDocument extends FirestoreDocumentBase {
  id: string;
  actionType: string;
  adminId: string;
  targetId: string;
  status: AdminActionStatus;
  remarks?: string | null;
  timestamp: string;
}

export interface FirestoreCouponDocument extends FirestoreDocumentBase {
  id: string;
  code: string;
  createdBy: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  applicableRoles: string[];
  validFrom?: string | null;
  validUntil: string;
  minOrderAmount?: number | null;
  maxDiscountAmount?: number | null;
  usageLimit?: number | null;
  usedCount: number;
  description?: string | null;
  status: CouponStatus;
}

export interface GeoTrackPoint {
  lat: number;
  lng: number;
  timestamp: string;
}

export interface MissionPreFlightCheckItem {
  name: string;
  passed: boolean;
  remarks?: string;
}

export interface MissionPreFlightCheck {
  checks: MissionPreFlightCheckItem[] | Record<string, boolean> | string[];
  completedAt: string;
  allPassed: boolean;
}

export interface FirestoreMissionDocument extends FirestoreDocumentBase {
  requestId: string;
  pilotUid: string;
  bookingId: string;
  status: PilotMissionStatus;
  startTime?: string | null;
  endTime?: string | null;
  geoTrack?: GeoTrackPoint[];
  reportSummary?: Record<string, unknown>;
  // Multi-stage mission tracking (en-route → arrived → pre-flight → started → complete)
  arrivalTime?: string | null;
  preFlightCheck?: MissionPreFlightCheck | null;
  completedAt?: string | null;
  // ── Drone handover verification (mirrors booking; return code is pilot-visible) ──
  handoverIssueVerified?: boolean | null;
  handoverIssueVerifiedAt?: string | null;
  handoverReturnCode?: string | null;
  handoverReturnRequestedAt?: string | null;
  cancellationReason?: string | null;
  cancelledBy?: string | null;
  cancelledAt?: string | null;
}

export interface FirestorePricingLockDocument extends FirestoreDocumentBase {
  pricingId: string;
  pilotUid: string;
  bookingId: string;
  lockedAmount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  invoiceUrl?: string | null;
}

export interface ServiceDetails {
  diagnosis?: string;
  parts?: string[];
  time?: number;
}

export interface FirestoreServiceTicketDocument extends FirestoreDocumentBase {
  ticketId: string;
  droneId: string;
  pilotUid: string;
  fleetManagerUid?: string | null;
  technicianUid?: string | null;
  category: string;
  description: string;
  priority: TicketPriority;
  missionId?: string | null;
  location?: string | null;
  dateTime?: string | null;
  fleetManagerName?: string | null;
  mediaUrls: string[];
  status: TicketStatus;
  serviceDetails?: ServiceDetails;
  scheduledDate?: string | null;
  slaDeadline?: string | null;
  resolvedAt?: string | null;
}

export interface FirestorePaymentDocument extends FirestoreDocumentBase {
  id: string;
  bookingId: string;
  pilotUid: string;
  customerUid: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  invoiceId?: string | null;
  referenceId?: string | null;
  confirmedAt?: string | null;
}

/**
 * Local record of a Razorpay order created by the app. Used to bind an online
 * payment to the booking/marketplace orders it pays for and to verify that the
 * paid amount matches the payable amount before anything is marked as paid.
 */
export interface FirestoreRazorpayOrderDocument extends FirestoreDocumentBase {
  id: string;
  razorpayOrderId: string;
  /** Payable amount in paise (₹1 = 100). */
  amount: number;
  currency: string;
  status: 'created' | 'paid';
  ownerUid: string;
  bookingId?: string | null;
  orderIds?: string[];
  razorpayPaymentId?: string | null;
}

export interface FirestoreRewardRedemptionDocument extends FirestoreDocumentBase {
  id: string;
  pilotUid: string;
  points: number;
  itemRedeemed: string;
  status: RewardFulfillmentStatus;
  date: string;
}

export interface FirestoreIncidentDocument extends FirestoreDocumentBase {
  incidentId: string;
  type: IncidentType;
  severity: IncidentSeverity;
  reportedBy: string;
  bookingId?: string | null;
  droneId?: string | null;
  pilotUid?: string | null;
  description: string;
  location: GeoPointValue;
  mediaUrls: string[];
  status: IncidentStatus;
  resolutionNotes?: string | null;
  escalatedTo?: string | null;
  reportedAt: string;
  resolvedAt?: string | null;
}

export interface FirestoreSubAdminDocument extends FirestoreDocumentBase {
  uid: string;
  name: string;
  email: string;
  mobile: string;
  status: SubAdminStatus;
  assignedRegion?: string | null;
  assignedDepartment?: string | null;
  permissions: PermissionMap;
  createdBy: string;
  lastActive?: string | null;
}

export interface FirestoreRevenueSnapshotDocument extends FirestoreDocumentBase {
  id: string;
  period: RevenuePeriod;
  periodDate: string;
  totalRevenue: number;
  totalBookings: number;
  avgRevenuePerBooking: number;
  totalCommission: number;
  byCrop: Record<string, number>;
  byState: Record<string, number>;
  byFleetManager: Record<string, number>;
  generatedAt: string;
}

export interface FirestoreBookingHistoryDocument extends FirestoreDocumentBase {
  id: string;
  bookingId: string;
  customerUid: string;
  pilotUid?: string | null;
  fleetManagerUid?: string | null;
  aggregatorUid?: string | null;
  cropType?: string | null;
  serviceType?: DroneServiceType | null;
  amount?: number | null;
  status: string;
  updatedBy: string;
  remarks?: string | null;
  timestamp: string;
}

export interface FirestoreRewardPointsDocument extends FirestoreDocumentBase {
  id: string;
  pilotUid: string;
  rewardPoints: number;
  itemRedeemed?: string | null;
  status: RewardFulfillmentStatus;
  date: string;
}

export interface FirestoreDelegatedBookingDocument extends FirestoreDocumentBase {
  bookingId: string;
  aggregatorUid: string;
  customerUid: string;
  customerName: string;
  location: GeoPointValue;
  area: number;
  cropType: string;
  preferredDate: string;
  serviceType: DroneServiceType;
  status: DelegatedBookingStatus;
}

export interface FirestoreCollectionContract {
  name: string;
  path: string;
  purpose: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// REFUND, PAYOUT & WITHDRAWAL INTERFACES
// ─────────────────────────────────────────────────────────────────────────────

export type RefundStatus = 'pending' | 'approved' | 'rejected' | 'processing' | 'completed' | 'failed';
export type WithdrawalStatus = 'pending' | 'approved' | 'processing' | 'completed' | 'failed' | 'rejected' | 'cancelled';
export type PayoutMethodType = 'bank' | 'upi';
export type VerificationStatus = 'pending' | 'verified' | 'failed';

export interface FirestoreBookingRefundDocument extends FirestoreDocumentBase {
  id: string;
  bookingId: string;
  customerUid: string;
  pilotUid?: string | null;
  fleetManagerUid?: string | null;
  originalAmount: number;
  refundAmount: number;
  refundPercentage: number;
  refundReason: string;
  cancellationReason: string;
  status: RefundStatus;
  paymentMethod?: PaymentMethod | null;
  razorpayPaymentId?: string | null;
  razorpayRefundId?: string | null;
  adminNotes?: string | null;
  processedAt?: string | null;
  completedAt?: string | null;
  requestedAt: string;
  requestedBy: string;
  approvedBy?: string | null;
}

export interface FirestorePayoutMethodDocument extends FirestoreDocumentBase {
  id: string;
  userId: string;
  type: PayoutMethodType;
  accountNumber?: string;
  ifscCode?: string;
  accountHolderName?: string;
  bankName?: string;
  upiId?: string;
  verificationStatus: VerificationStatus;
  verificationMethod: 'penny_drop' | 'vpa_lookup' | 'manual';
  verifiedAt?: string | null;
  verificationAttempts?: number;
  razorpayContactId?: string | null;
  razorpayFundAccountId?: string | null;
  isDefault?: boolean;
  isActive: boolean;
}

export interface FirestoreWithdrawalDocument extends FirestoreDocumentBase {
  id: string;
  userId: string;
  userRole: 'pilot' | 'fleet_manager' | 'aggregator' | 'customer' | 'technician' | 'vendor';
  payoutMethodId: string;
  amount: number;
  status: WithdrawalStatus;
  razorpayPayoutId?: string | null;
  utrNumber?: string | null;
  failureReason?: string | null;
  adminNotes?: string | null;
  requestedAt: string;
  approvedAt?: string | null;
  processedAt?: string | null;
  completedAt?: string | null;
  approvedBy?: string | null;
}

export interface FirestoreUserEarningsDocument extends FirestoreDocumentBase {
  userId: string;
  totalEarnings: number;
  pendingEarnings: number;
  withdrawnEarnings: number;
  lastServiceDate?: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// REFER & EARN INTERFACES
// ─────────────────────────────────────────────────────────────────────────────

export type ReferralStatus =
  | 'invited'
  | 'signed_up'
  | 'applied'
  | 'approved'
  | 'first_booking_done'
  | 'rewarded'
  | 'expired'
  | 'fraud_flagged'
  | 'voided';

export interface FirestoreReferralCodeDocument extends FirestoreDocumentBase {
  id: string;
  code: string;
  ownerUid: string;
  ownerRole: string;
  ownerName?: string | null;
  targetRoles: string[];
  link: string;
  isActive: boolean;
  expiresAt: string;
}

export interface FirestoreReferralDocument extends FirestoreDocumentBase {
  id: string;
  code: string;
  inviterUid: string;
  inviterRole: string;
  inviteePhone?: string | null;
  inviteeUid?: string | null;
  targetRole: string;
  channel: 'whatsapp' | 'share' | 'link' | 'sms';
  status: ReferralStatus;
  roleApplicationId?: string | null;
  bookingId?: string | null;
  rewardAmount?: number | null;
  rewardCouponCode?: string | null;
  rewardAvailableAfter?: string | null;
  failureReason?: string | null;
}

export interface FirestoreReferralRuleDocument extends FirestoreDocumentBase {
  id: string;
  inviterRole: string;
  inviteeRole: string;
  trigger: 'role_approved' | 'first_paid_booking';
  walletAmount: number;
  couponAmount: number;
  maxPerUserPerMonth: number;
  codeExpiryDays: number;
  isActive: boolean;
}

export type WalletTxType =
  | 'referral_credit'
  | 'referral_hold'
  | 'referral_reversal'
  | 'withdrawal_debit'
  | 'withdrawal_reversal';

export interface FirestoreWalletTxDocument extends FirestoreDocumentBase {
  id: string;
  uid: string;
  type: WalletTxType;
  amount: number;
  balanceAfter: number;
  refId?: string | null;
  note?: string | null;
}

export const FIRESTORE_COLLECTION_CONTRACTS: FirestoreCollectionContract[] = [
  {
    name: 'users',
    path: '/users',
    purpose: 'Single source of truth for all user roles and their shared profile fields.',
  },
  {
    name: 'booking',
    path: '/users/{uid}/booking',
    purpose: 'Primary booking records nested under the owning user profile.',
  },
  {
    name: 'transactions',
    path: '/users/{uid}/transactions',
    purpose: 'User-scoped payment events and settlement entries.',
  },
  {
    name: 'notifications',
    path: '/users/{uid}/notifications',
    purpose: 'In-app notification center payloads.',
  },
  {
    name: 'invoice',
    path: '/users/{uid}/invoice',
    purpose: 'Billing and invoice artifacts linked to bookings.',
  },
  {
    name: 'drones',
    path: '/users/{uid}/drones',
    purpose: 'Vendor-owned drone fleet records.',
  },
  {
    name: 'admin_actions',
    path: '/users/{uid}/admin_actions',
    purpose: 'Append-only governance and audit trail events.',
  },
  {
    name: 'coupons',
    path: '/coupons',
    purpose: 'Platform-wide coupon definitions and eligibility rules.',
  },
  {
    name: 'missions',
    path: '/missions',
    purpose: 'Pilot mission execution summaries linked to bookings.',
  },
  {
    name: 'pricing_locks',
    path: '/pricing_locks',
    purpose: 'Final pilot-confirmed pricing snapshots before payment.',
  },
  {
    name: 'payments',
    path: '/payments',
    purpose: 'Payment initiation and confirmation records for bookings.',
  },
  {
    name: 'service_tickets',
    path: '/service_tickets',
    purpose: 'Technician and support workflow records.',
  },
  {
    name: 'maintenance_logs',
    path: '/maintenance_logs',
    purpose: 'Drone maintenance schedule and completion records.',
  },
  {
    name: 'incidents',
    path: '/incidents',
    purpose: 'Operational incident reports and their resolution lifecycle.',
  },
  {
    name: 'subadmins',
    path: '/subadmins',
    purpose: 'Scoped sub-admin identity and permission records.',
  },
  {
    name: 'revenue_snapshots',
    path: '/revenue_snapshots',
    purpose: 'Pre-aggregated analytics materializations.',
  },
  {
    name: 'admin_settings',
    path: '/admin_settings',
    purpose: 'Platform-wide admin dashboard preferences and feature flags.',
  },
  {
    name: 'booking_history',
    path: '/booking_history',
    purpose: 'Booking status timeline entries.',
  },
  {
    name: 'reward_points',
    path: '/reward_points',
    purpose: 'Pilot rewards earning and redemption records.',
  },
  {
    name: 'reward_redemptions',
    path: '/reward_redemptions',
    purpose: 'Pilot reward store redemption requests.',
  },
  {
    name: 'delegated_bookings',
    path: '/delegated_bookings',
    purpose: 'Aggregator-originated bookings created for managed customers.',
  },
];

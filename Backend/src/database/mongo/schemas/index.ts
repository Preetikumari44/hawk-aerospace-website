import { Schema } from 'mongoose';

import { APP_ROLES, USER_STATUSES } from '../../../common/constants/roles.constant';
import type { AppRole, UserStatus } from '../../../common/constants/roles.constant';

export interface HistoryEntry<T = unknown> {
  value: T;
  updatedAt: string;
}

export interface HistoryField<T = unknown> {
  current: T;
  history: HistoryEntry<T>[];
}

const historyEntrySchema = new Schema(
  {
    value: { type: Schema.Types.Mixed, required: true },
    updatedAt: { type: String, required: true },
  },
  { _id: false },
);

function buildHistoryFieldSchema(currentType: unknown, required = true): Schema {
  return new Schema(
    {
      current: { type: currentType, required },
      history: { type: [historyEntrySchema], default: [] },
    },
    { _id: false },
  );
}

const geoPointSchema = new Schema(
  {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
  { _id: false },
);

const areaSchema = new Schema(
  {
    unit: { type: String, required: true },
    value: { type: Number, required: true },
  },
  { _id: false },
);

const verificationDocumentSchema = new Schema(
  {
    type: { type: String, required: true },
    url: { type: String, required: true },
    uploadedAt: { type: String, default: null },
  },
  { _id: false },
);

const transactionLineItemSchema = new Schema(
  {
    paymentId: { type: String, required: true },
    bookingId: { type: String, required: true },
    amount: { type: Number, required: true },
    method: { type: String, enum: ['cash', 'upi', 'wallet'], required: true },
    status: { type: String, enum: ['pending', 'paid', 'failed', 'refunded'], required: true },
  },
  { _id: false },
);

const notificationMessageSchema = new Schema(
  {
    message: { type: String, required: true },
    timestamp: { type: String, required: true },
    read: { type: Boolean, default: false },
  },
  { _id: false },
);

const droneSpecsSchema = new Schema(
  {
    payloadKg: { type: Number, default: null },
    flightTimeMin: { type: Number, default: null },
    batteryCapacity: { type: Number, default: null },
  },
  { _id: false },
);

const geoTrackPointSchema = new Schema(
  {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    timestamp: { type: String, required: true },
  },
  { _id: false },
);

const serviceDetailsSchema = new Schema(
  {
    diagnosis: { type: String, default: null },
    parts: { type: [String], default: [] },
    time: { type: Number, default: null },
  },
  { _id: false },
);

const permissionMapSchema = new Schema({}, { _id: false, strict: false });

export const MongoUserSchema = new Schema(
  {
    uid: { type: String, required: true, unique: true, index: true },
    role: { type: String, enum: APP_ROLES, required: true },
    status: { type: String, enum: USER_STATUSES, required: true },
    name: buildHistoryFieldSchema(String),
    email: buildHistoryFieldSchema(String, false),
    phone: buildHistoryFieldSchema(String, false),
    verified: { type: Boolean, required: true, default: false },
    adminApproval: { type: Boolean, required: true, default: false },
    documents: { type: [verificationDocumentSchema], default: [] },
    location: {
      type: buildHistoryFieldSchema(geoPointSchema, false),
      default: undefined,
    },
    permissions: { type: permissionMapSchema, default: undefined },
    createdAt: { type: String, required: true },
    updatedAt: { type: String, required: true },
  },
  { collection: 'users' },
);

export const MongoBookingSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    customerUid: { type: String, required: true, index: true },
    createdBy: { type: String, required: true, index: true },
    aggregatorId: { type: String, default: null, index: true },
    vendorId: { type: String, default: null, index: true },
    assignedPilot: { type: String, default: null },
    assignedDrone: { type: String, default: null },
    address: buildHistoryFieldSchema(String),
    detailedAddress: buildHistoryFieldSchema(Schema.Types.Mixed, false),
    billingAddress: buildHistoryFieldSchema(Schema.Types.Mixed, false),
    area: buildHistoryFieldSchema(areaSchema),
    cropType: buildHistoryFieldSchema(String),
    serviceType: buildHistoryFieldSchema(String),
    droneTier: buildHistoryFieldSchema(String, false),
    location: buildHistoryFieldSchema(geoPointSchema),
    couponCode: buildHistoryFieldSchema(String, false),
    priceEstimation: buildHistoryFieldSchema(Number, false),
    finalPrice: buildHistoryFieldSchema(Number, false),
    paymentMethod: buildHistoryFieldSchema(String, false),
    paymentStatus: buildHistoryFieldSchema(String, false),
    status: buildHistoryFieldSchema(String),
    scheduledDate: buildHistoryFieldSchema(String),
    createdAt: { type: String, required: true },
    updatedAt: { type: String, required: true },
  },
  { collection: 'booking' },
);

export const MongoTransactionSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    transactions: { type: [transactionLineItemSchema], default: [] },
    createdAt: { type: String, required: true },
    updatedAt: { type: String, required: true },
  },
  { collection: 'transactions' },
);

export const MongoNotificationSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    messages: { type: [notificationMessageSchema], default: [] },
    createdAt: { type: String, required: true },
    updatedAt: { type: String, required: true },
  },
  { collection: 'notifications' },
);

export const MongoInvoiceSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    invoiceId: { type: String, required: true, index: true },
    bookingId: { type: String, required: true, index: true },
    customerId: { type: String, required: true, index: true },
    amount: { type: Number, required: true },
    discount: { type: Number, required: true, default: 0 },
    finalAmount: { type: Number, required: true },
    paymentMode: { type: String, enum: ['cash', 'upi', 'wallet'], required: true },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      required: true,
    },
    downloadUrl: { type: String, default: null },
    generatedAt: { type: String, required: true },
    createdAt: { type: String, required: true },
    updatedAt: { type: String, required: true },
  },
  { collection: 'invoice' },
);

export const MongoPaymentSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    bookingId: { type: String, required: true, index: true },
    pilotId: { type: String, required: true, index: true },
    customerId: { type: String, required: true, index: true },
    amount: { type: Number, required: true },
    method: { type: String, enum: ['cash', 'upi', 'wallet'], required: true },
    status: { type: String, enum: ['pending', 'paid', 'failed', 'refunded'], required: true },
    invoiceId: { type: String, default: null },
    referenceId: { type: String, default: null },
    confirmedAt: { type: String, default: null },
    createdAt: { type: String, required: true },
    updatedAt: { type: String, required: true },
  },
  { collection: 'payments' },
);

export const MongoDroneSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    uid: { type: String, required: true, index: true },
    vendorId: { type: String, required: true, index: true },
    assignedBookingId: { type: String, default: null, index: true },
    model: buildHistoryFieldSchema(String),
    serialNo: { type: String, required: true },
    type: buildHistoryFieldSchema(String),
    status: buildHistoryFieldSchema(String),
    specs: buildHistoryFieldSchema(droneSpecsSchema),
    totalFlightHours: buildHistoryFieldSchema(Number),
    lastMaintenance: buildHistoryFieldSchema(String, false),
    nextMaintenanceDue: buildHistoryFieldSchema(String, false),
    createdAt: { type: String, required: true },
    updatedAt: { type: String, required: true },
  },
  { collection: 'drones' },
);

export const MongoMaintenanceLogSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    droneId: { type: String, required: true, index: true },
    vendorId: { type: String, required: true, index: true },
    technicianId: { type: String, default: null, index: true },
    type: { type: String, required: true },
    status: { type: String, enum: ['scheduled', 'in_progress', 'completed'], required: true },
    partsReplaced: { type: String, default: null },
    diagnosisNotes: { type: String, default: null },
    timeTakenHours: { type: Number, default: null },
    evidenceMedia: { type: [String], default: [] },
    scheduledDate: { type: String, default: null },
    completedAt: { type: String, default: null },
    createdAt: { type: String, required: true },
    updatedAt: { type: String, required: true },
  },
  { collection: 'maintenance_logs' },
);

export const MongoAdminActionSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    actionType: { type: String, required: true },
    adminId: { type: String, required: true, index: true },
    targetId: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ['pending', 'in_review', 'approved', 'rejected'],
      required: true,
    },
    remarks: { type: String, default: null },
    timestamp: { type: String, required: true },
    createdAt: { type: String, required: true },
    updatedAt: { type: String, required: true },
  },
  { collection: 'admin_actions' },
);

export const MongoCouponSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    code: { type: String, required: true, index: true },
    createdBy: { type: String, required: true, index: true },
    discountType: { type: String, enum: ['percentage', 'fixed'], required: true },
    discountValue: { type: Number, required: true },
    applicableRoles: { type: [String], default: [] },
    validFrom: { type: String, default: null },
    validUntil: { type: String, required: true },
    minOrderAmount: { type: Number, default: null },
    maxDiscountAmount: { type: Number, default: null },
    usageLimit: { type: Number, default: null },
    usedCount: { type: Number, default: 0 },
    description: { type: String, default: null },
    status: { type: String, enum: ['active', 'inactive', 'expired'], required: true },
    createdAt: { type: String, required: true },
    updatedAt: { type: String, required: true },
  },
  { collection: 'coupons' },
);

export const MongoMissionSchema = new Schema(
  {
    requestId: { type: String, required: true, unique: true, index: true },
    pilotId: { type: String, required: true, index: true },
    bookingId: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: [
        'pending',
        'accepted',
        'rejected',
        'en_route',
        'at_location',
        'preflight',
        'started',
        'completed',
        'cancelled',
      ],
      required: true,
    },
    startTime: { type: String, default: null },
    endTime: { type: String, default: null },
    geoTrack: { type: [geoTrackPointSchema], default: [] },
    reportSummary: { type: Schema.Types.Mixed, default: undefined },
    createdAt: { type: String, required: true },
    updatedAt: { type: String, required: true },
  },
  { collection: 'missions' },
);

export const MongoPricingLockSchema = new Schema(
  {
    pricingId: { type: String, required: true, unique: true, index: true },
    pilotId: { type: String, required: true, index: true },
    bookingId: { type: String, required: true, index: true },
    lockedAmount: { type: Number, required: true },
    paymentMethod: { type: String, enum: ['cash', 'upi', 'wallet'], required: true },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      required: true,
    },
    invoiceUrl: { type: String, default: null },
    createdAt: { type: String, required: true },
    updatedAt: { type: String, required: true },
  },
  { collection: 'pricing_locks' },
);

export const MongoServiceTicketSchema = new Schema(
  {
    ticketId: { type: String, required: true, unique: true, index: true },
    droneId: { type: String, required: true, index: true },
    pilotId: { type: String, required: true, index: true },
    vendorId: { type: String, default: null, index: true },
    technicianId: { type: String, default: null, index: true },
    category: { type: String, required: true },
    description: { type: String, required: true },
    priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], required: true },
    mediaUrls: { type: [String], default: [] },
    status: {
      type: String,
      enum: ['open', 'assigned', 'in_progress', 'resolved', 'closed'],
      required: true,
    },
    serviceDetails: { type: serviceDetailsSchema, default: undefined },
    scheduledDate: { type: String, default: null },
    slaDeadline: { type: String, default: null },
    resolvedAt: { type: String, default: null },
    createdAt: { type: String, required: true },
    updatedAt: { type: String, required: true },
  },
  { collection: 'service_tickets' },
);

export const MongoIncidentSchema = new Schema(
  {
    incidentId: { type: String, required: true, unique: true, index: true },
    type: {
      type: String,
      enum: [
        'drone_malfunction',
        'pilot_emergency',
        'crash',
        'chemical_spill',
        'customer_complaint',
      ],
      required: true,
    },
    severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], required: true },
    reportedBy: { type: String, required: true, index: true },
    bookingId: { type: String, default: null, index: true },
    droneId: { type: String, default: null, index: true },
    pilotId: { type: String, default: null, index: true },
    description: { type: String, required: true },
    location: { type: geoPointSchema, required: true },
    mediaUrls: { type: [String], default: [] },
    status: {
      type: String,
      enum: ['reported', 'investigating', 'resolved', 'escalated', 'closed'],
      required: true,
    },
    resolutionNotes: { type: String, default: null },
    escalatedTo: { type: String, default: null },
    reportedAt: { type: String, required: true },
    resolvedAt: { type: String, default: null },
    createdAt: { type: String, required: true },
    updatedAt: { type: String, required: true },
  },
  { collection: 'incidents' },
);

export const MongoSubAdminSchema = new Schema(
  {
    uid: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    email: { type: String, required: true, index: true },
    mobile: { type: String, required: true },
    status: { type: String, enum: ['active', 'inactive', 'suspended'], required: true },
    assignedRegion: { type: String, default: null },
    assignedDepartment: { type: String, default: null },
    permissions: { type: permissionMapSchema, required: true, default: {} },
    createdBy: { type: String, required: true, index: true },
    lastActive: { type: String, default: null },
    createdAt: { type: String, required: true },
    updatedAt: { type: String, required: true },
  },
  { collection: 'subadmins' },
);

export const MongoRevenueSnapshotSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    period: { type: String, enum: ['daily', 'weekly', 'monthly'], required: true },
    periodDate: { type: String, required: true },
    totalRevenue: { type: Number, required: true },
    totalBookings: { type: Number, required: true },
    avgRevenuePerBooking: { type: Number, required: true },
    totalCommission: { type: Number, required: true },
    byCrop: { type: Map, of: Number, default: {} },
    byState: { type: Map, of: Number, default: {} },
    byVendor: { type: Map, of: Number, default: {} },
    generatedAt: { type: String, required: true },
    createdAt: { type: String, required: true },
    updatedAt: { type: String, required: true },
  },
  { collection: 'revenue_snapshots' },
);

export const MongoBookingHistorySchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    bookingId: { type: String, required: true, index: true },
    status: { type: String, required: true },
    updatedBy: { type: String, required: true, index: true },
    remarks: { type: String, default: null },
    timestamp: { type: String, required: true },
    createdAt: { type: String, required: true },
    updatedAt: { type: String, required: true },
  },
  { collection: 'booking_history' },
);

export const MongoRewardPointsSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    pilotId: { type: String, required: true, index: true },
    rewardPoints: { type: Number, required: true },
    itemRedeemed: { type: String, default: null },
    status: { type: String, enum: ['shipped', 'canceled', 'delivered'], required: true },
    date: { type: String, required: true },
    createdAt: { type: String, required: true },
    updatedAt: { type: String, required: true },
  },
  { collection: 'reward_points' },
);

export const MongoRewardRedemptionSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    pilotId: { type: String, required: true, index: true },
    points: { type: Number, required: true },
    itemRedeemed: { type: String, required: true },
    status: { type: String, enum: ['shipped', 'canceled', 'delivered'], required: true },
    date: { type: String, required: true },
    createdAt: { type: String, required: true },
    updatedAt: { type: String, required: true },
  },
  { collection: 'reward_redemptions' },
);

export const MongoDelegatedBookingSchema = new Schema(
  {
    bookingId: { type: String, required: true, unique: true, index: true },
    aggregatorId: { type: String, required: true, index: true },
    customerName: { type: String, required: true },
    location: { type: geoPointSchema, required: true },
    area: { type: Number, required: true },
    cropType: { type: String, required: true },
    preferredDate: { type: String, required: true },
    serviceType: { type: String, enum: ['spraying', 'seeding', 'monitoring'], required: true },
    status: {
      type: String,
      enum: ['created', 'pending_approval', 'confirmed', 'completed'],
      required: true,
    },
    createdAt: { type: String, required: true },
    updatedAt: { type: String, required: true },
  },
  { collection: 'delegated_bookings' },
);

export interface MongoSchemaDefinition {
  name: string;
  collection: string;
  schema: Schema;
}

export const MONGO_SCHEMA_DEFINITIONS: MongoSchemaDefinition[] = [
  { name: 'MongoUser', collection: 'users', schema: MongoUserSchema },
  { name: 'MongoBooking', collection: 'booking', schema: MongoBookingSchema },
  { name: 'MongoTransaction', collection: 'transactions', schema: MongoTransactionSchema },
  { name: 'MongoNotification', collection: 'notifications', schema: MongoNotificationSchema },
  { name: 'MongoInvoice', collection: 'invoice', schema: MongoInvoiceSchema },
  { name: 'MongoPayment', collection: 'payments', schema: MongoPaymentSchema },
  { name: 'MongoDrone', collection: 'drones', schema: MongoDroneSchema },
  {
    name: 'MongoMaintenanceLog',
    collection: 'maintenance_logs',
    schema: MongoMaintenanceLogSchema,
  },
  { name: 'MongoAdminAction', collection: 'admin_actions', schema: MongoAdminActionSchema },
  { name: 'MongoCoupon', collection: 'coupons', schema: MongoCouponSchema },
  { name: 'MongoMission', collection: 'missions', schema: MongoMissionSchema },
  { name: 'MongoPricingLock', collection: 'pricing_locks', schema: MongoPricingLockSchema },
  { name: 'MongoServiceTicket', collection: 'service_tickets', schema: MongoServiceTicketSchema },
  { name: 'MongoIncident', collection: 'incidents', schema: MongoIncidentSchema },
  { name: 'MongoSubAdmin', collection: 'subadmins', schema: MongoSubAdminSchema },
  {
    name: 'MongoRevenueSnapshot',
    collection: 'revenue_snapshots',
    schema: MongoRevenueSnapshotSchema,
  },
  { name: 'MongoBookingHistory', collection: 'booking_history', schema: MongoBookingHistorySchema },
  { name: 'MongoRewardPoints', collection: 'reward_points', schema: MongoRewardPointsSchema },
  {
    name: 'MongoRewardRedemption',
    collection: 'reward_redemptions',
    schema: MongoRewardRedemptionSchema,
  },
  {
    name: 'MongoDelegatedBooking',
    collection: 'delegated_bookings',
    schema: MongoDelegatedBookingSchema,
  },
];

export interface MongoUserMirror {
  uid: string;
  role: AppRole;
  status: UserStatus;
  name: HistoryField<string>;
  email?: HistoryField<string>;
  phone?: HistoryField<string>;
}

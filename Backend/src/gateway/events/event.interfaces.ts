import type { AppRole } from '../../common/constants/roles.constant';
import type {
  BookingStatus,
  DroneStatus,
  IncidentSeverity,
  IncidentStatus,
  IncidentType,
  PaymentMethod,
  TicketPriority,
  TicketStatus,
} from '../../database/firestore/contracts';

// ── Base ────────────────────────────────────────────────────

export interface WsBasePayload {
  timestamp: string;
}

// ── Booking ─────────────────────────────────────────────────

export interface BookingCreatedPayload extends WsBasePayload {
  bookingId: string;
  customerUid: string;
  area: number;
  cropType: string;
  serviceType: string;
  location: { lat: number; lng: number };
}

export interface BookingAssignedPayload extends WsBasePayload {
  bookingId: string;
  customerUid: string;
  vendorUid: string;
  pilotUid: string;
  pilotName?: string;
  droneId?: string;
}

export interface BookingStatusPayload extends WsBasePayload {
  bookingId: string;
  customerUid: string;
  vendorUid?: string;
  pilotId?: string;
  status: BookingStatus;
  previousStatus: BookingStatus;
}

export interface BookingCancelledPayload extends WsBasePayload {
  bookingId: string;
  customerUid: string;
  vendorUid?: string;
  pilotId?: string;
  reason?: string;
}

// ── Mission ─────────────────────────────────────────────────

export interface MissionAcceptedPayload extends WsBasePayload {
  bookingId: string;
  pilotUid: string;
  pilotName: string;
  customerUid: string;
}

export interface MissionRejectedPayload extends WsBasePayload {
  bookingId: string;
  pilotUid: string;
  customerUid: string;
  reason?: string;
}

export interface MissionStartedPayload extends WsBasePayload {
  bookingId: string;
  pilotUid: string;
  customerUid: string;
  vendorUid?: string;
  fleetManagerUid?: string;
}

export interface MissionLocationPayload extends WsBasePayload {
  bookingId: string;
  pilotUid: string;
  lat: number;
  lng: number;
}

export interface MissionCompletedPayload extends WsBasePayload {
  bookingId: string;
  pilotUid: string;
  customerUid: string;
  vendorUid?: string;
  fleetManagerUid?: string;
  summary?: Record<string, unknown>;
}

export interface PilotLocationUpdatedPayload extends WsBasePayload {
  pilotUid: string;
  location: { lat: number; lng: number };
}

export interface PilotAvailabilityChangedPayload extends WsBasePayload {
  pilotUid: string;
  isOnline: boolean;
}

// ── Pricing ─────────────────────────────────────────────────

export interface PriceLockedPayload extends WsBasePayload {
  bookingId: string;
  pilotUid: string;
  customerUid: string;
  lockedAmount: number;
  paymentMethod: PaymentMethod;
}

// ── Payment ─────────────────────────────────────────────────

export interface PaymentConfirmedPayload extends WsBasePayload {
  bookingId: string;
  paymentId: string;
  customerUid: string;
  pilotUid: string;
  amount: number;
  method: PaymentMethod;
  invoiceUrl?: string;
}

export interface PaymentFailedPayload extends WsBasePayload {
  bookingId: string;
  customerUid: string;
  reason: string;
}

// ── Fleet / Drone ───────────────────────────────────────────

export interface DroneStatusPayload extends WsBasePayload {
  droneId: string;
  vendorUid: string;
  status: DroneStatus;
  previousStatus: DroneStatus;
}

export interface DroneAssignedPayload extends WsBasePayload {
  droneId: string;
  pilotUid: string;
  bookingId: string;
  model: string;
}

export interface MaintenanceOverduePayload extends WsBasePayload {
  droneId: string;
  vendorUid: string;
  totalFlightHours: number;
  lastMaintenanceDate?: string;
}

export interface MaintenanceLoggedPayload extends WsBasePayload {
  droneId: string;
  vendorUid: string;
  maintenanceId: string;
  type: string;
}

// ── Service Centre ──────────────────────────────────────────

export interface TicketCreatedPayload extends WsBasePayload {
  ticketId: string;
  droneId: string;
  pilotUid: string;
  priority: TicketPriority;
  category: string;
}

export interface TicketAssignedPayload extends WsBasePayload {
  ticketId: string;
  technicianId: string;
  droneId: string;
}

export interface TicketStatusPayload extends WsBasePayload {
  ticketId: string;
  pilotUid: string;
  status: TicketStatus;
  previousStatus: TicketStatus;
}

export interface SlaBreachPayload extends WsBasePayload {
  ticketId: string;
  deadline: string;
  priority: TicketPriority;
}

// ── Incident ────────────────────────────────────────────────

export interface IncidentReportedPayload extends WsBasePayload {
  incidentId: string;
  type: IncidentType;
  severity: IncidentSeverity;
  reportedBy: string;
  location: { lat: number; lng: number };
}

export interface IncidentEscalatedPayload extends WsBasePayload {
  incidentId: string;
  escalatedTo: string;
  severity: IncidentSeverity;
}

export interface IncidentResolvedPayload extends WsBasePayload {
  incidentId: string;
  status: IncidentStatus;
  resolutionNotes?: string;
}

// ── Revenue ─────────────────────────────────────────────────

export interface RevenueSnapshotPayload extends WsBasePayload {
  totalRevenue: number;
  totalBookings: number;
  todayRevenue: number;
  todayBookings: number;
}

// ── Admin ───────────────────────────────────────────────────

export interface AdminActionPayload extends WsBasePayload {
  actionType: string;
  adminId: string;
  targetId: string;
  status: string;
}

// ── Notification ────────────────────────────────────────────

export interface NotificationPayload extends WsBasePayload {
  uid: string;
  title: string;
  message: string;
}

export interface NotificationBroadcastPayload extends WsBasePayload {
  role?: AppRole;
  title: string;
  message: string;
}

// ── Role Applications ───────────────────────────────────────

export interface RoleApplicationSubmittedPayload extends WsBasePayload {
  applicationId: string;
  uid: string;
  name?: string;
  role: AppRole;
}

export interface RoleApplicationUpdatedPayload extends WsBasePayload {
  applicationId: string;
  uid: string;         // applicant
  role: AppRole;       // target role
  status: 'approved' | 'rejected';
  remarks?: string | null;
}

export interface RoleApprovedPayload extends WsBasePayload {
  applicationId: string;
  uid: string;
  role: AppRole;
}

// ── Team (FM ↔ Pilot) ─────────────────────────────────────────

export interface TeamInviteCreatedPayload extends WsBasePayload {
  inviteId: string;
  pilotUid: string;
  fmUid: string;
  fmName?: string | null;
}

export interface TeamRequestCreatedPayload extends WsBasePayload {
  inviteId: string;
  pilotUid: string;
  pilotName?: string | null;
  fmUid: string;
}

export interface TeamUpdatedPayload extends WsBasePayload {
  inviteId: string;
  pilotUid: string;
  fmUid: string;
  status: 'accepted' | 'rejected' | 'cancelled';
}

// ── Aggregator ──────────────────────────────────────────────

export interface DelegatedBookingStatusPayload extends WsBasePayload {
  bookingId: string;
  aggregatorUid: string;
  status: string;
}



// ── Complaint ───────────────────────────────────────────────

export interface ComplaintStatusChangedPayload extends WsBasePayload {
  complaintId: string;
  complainantUid: string;
  status: string;
  previousStatus: string;
  notes?: string;
}

// ── Settlement ──────────────────────────────────────────────

export interface SettlementProcessedPayload extends WsBasePayload {
  settlementId: string;
  recipientUid: string;
  amount: number;
  type: 'refund' | 'compensation' | 'adjustment';
  reference?: string;
}

// ── Admin Approval ──────────────────────────────────────────

export interface AdminApprovalPayload extends WsBasePayload {
  bookingId: string;
  customerUid: string;
  adminUid: string;
  aggregatorUid?: string | null;
  fleetManagerUid?: string | null;
  status: string;
  reason?: string;
}

export interface AdminAssignmentChangedPayload extends WsBasePayload {
  bookingId: string;
  customerUid: string;
  adminUid: string;
  previousFleetManagerUid?: string | null;
  previousPilotUid?: string | null;
  previousDroneId?: string | null;
  newFleetManagerUid?: string | null;
  newPilotUid?: string | null;
  newDroneId?: string | null;
}

// ── Chat ────────────────────────────────────────────────────

export interface ChatMessageSentPayload extends WsBasePayload {
  conversationId: string;
  messageId: string;
  senderUid: string;
  senderRole: string;
  text: string;
  messageType: string;
}

export interface ChatMessageReadPayload extends WsBasePayload {
  conversationId: string;
  readBy: string;
}

export interface ChatConversationCreatedPayload extends WsBasePayload {
  conversationId: string;
  participants: string[];
  type: string;
  bookingId?: string;
}

export interface ChatCallInitiatedPayload extends WsBasePayload {
  conversationId: string;
  initiatedBy: string;
  targetUid: string;
}

export interface ChatTypingPayload extends WsBasePayload {
  conversationId: string;
  uid: string;
  isTyping: boolean;
}

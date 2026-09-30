/**
 * Server-side EventEmitter2 event names.
 * Services emit these → HawkGateway listens → pushes to Socket.IO rooms.
 */
export const WS_EVENTS = {
  // ── Booking Lifecycle ─────────────────────────────────────
  BOOKING_CREATED: 'booking.created',
  BOOKING_ASSIGNED_TO_FLEET_MANAGER: 'booking.assignedToFleetManager',
  BOOKING_FLEET_MANAGER_ACCEPTED: 'booking.fleetManagerAccepted',
  BOOKING_FLEET_MANAGER_REJECTED: 'booking.fleetManagerRejected',
  BOOKING_PILOT_ASSIGNED: 'booking.pilotAssigned',
  BOOKING_ASSIGNED: 'booking.assigned',
  BOOKING_CONFIRMED: 'booking.confirmed',
  BOOKING_SCHEDULED: 'booking.scheduled',
  BOOKING_STATUS_CHANGED: 'booking.status.changed',
  BOOKING_CANCELLED: 'booking.cancelled',
  BOOKING_COMPLETED: 'booking.completed',
  BOOKING_RATED: 'booking.rated',
  BOOKING_TIME_SLOT_UPDATED: 'booking.timeSlotUpdated',

  // ── Mission Lifecycle ─────────────────────────────────────
  MISSION_CREATED: 'mission.created',
  MISSION_PILOT_EN_ROUTE: 'mission.pilotEnRoute',
  MISSION_PILOT_ARRIVED: 'mission.pilotArrived',
  MISSION_PREFLIGHT_STARTED: 'mission.preflightStarted',
  MISSION_PREFLIGHT_COMPLETED: 'mission.preflightCompleted',
  MISSION_STARTED: 'mission.started',
  MISSION_IN_PROGRESS: 'mission.inProgress',
  MISSION_GPS_UPDATE: 'mission.gpsUpdate',
  MISSION_PROGRESS_UPDATE: 'mission.progressUpdate',
  MISSION_PAUSED: 'mission.paused',
  MISSION_RESUMED: 'mission.resumed',
  MISSION_COMPLETED: 'mission.completed',
  MISSION_CANCELLED: 'mission.cancelled',
  MISSION_EMERGENCY: 'mission.emergency',
  
  // Legacy mission events (backward compatibility)
  MISSION_ACCEPTED: 'mission.accepted',
  MISSION_REJECTED: 'mission.rejected',
  MISSION_LOCATION: 'mission.location',

  // ── Payment Lifecycle ─────────────────────────────────────
  PAYMENT_PRICE_LOCKED: 'payment.priceLocked',
  PAYMENT_PENDING: 'payment.pending',
  PAYMENT_INITIATED: 'payment.initiated',
  PAYMENT_CONFIRMED: 'payment.confirmed',
  PAYMENT_FAILED: 'payment.failed',
  PAYMENT_REFUNDED: 'payment.refunded',
  
  // Legacy payment events
  PRICE_LOCKED: 'price.locked',

  // ── Pilot / Fleet ─────────────────────────────────────────
  PILOT_AVAILABILITY_CHANGED: 'pilot.availability.changed',
  PILOT_LOCATION_UPDATED: 'pilot.location.updated',
  FLEET_MANAGER_AVAILABILITY_CHANGED: 'fleetManager.availability.changed',

  // ── Fleet / Drone ─────────────────────────────────────────
  DRONE_STATUS_CHANGED: 'drone.status.changed',
  DRONE_ASSIGNED: 'drone.assigned',
  MAINTENANCE_OVERDUE: 'maintenance.overdue',
  MAINTENANCE_LOGGED: 'maintenance.logged',
  
  // ── Fleet Manager Events ──────────────────────────────────
  FLEET_MANAGER_REQUEST_RECEIVED: 'fleetManager.requestReceived',
  FLEET_MANAGER_REQUEST_SENT: 'fleetManager.request.sent',
  FLEET_MANAGER_REQUEST_ACCEPTED: 'fleetManager.request.accepted',
  FLEET_MANAGER_REQUEST_REJECTED: 'fleetManager.request.rejected',
  FLEET_MANAGER_REQUEST_TIMEOUT: 'fleetManager.request.timeout',
  FLEET_MANAGER_REQUEST_CANCELLED: 'fleetManager.request.cancelled',
  BOOKING_FLEET_MANAGER_ASSIGNED: 'booking.fleetManager.assigned',
  BOOKING_ALL_FLEET_MANAGERS_REJECTED: 'booking.allFleetManagers.rejected',
  FLEET_MANAGER_PILOT_SEARCH_STARTED: 'fleetManager.pilotSearchStarted',
  FLEET_MANAGER_PILOT_FOUND: 'fleetManager.pilotFound',
  FLEET_MANAGER_DRONE_ASSIGNED: 'fleetManager.droneAssigned',
  FLEET_MANAGER_ASSIGNMENT_COMPLETE: 'fleetManager.assignmentComplete',

  // ── Service Centre ────────────────────────────────────────
  TICKET_CREATED: 'ticket.created',
  TICKET_ASSIGNED: 'ticket.assigned',
  TICKET_STATUS_CHANGED: 'ticket.status.changed',
  SLA_BREACH: 'sla.breach',

  // ── Incident ──────────────────────────────────────────────
  INCIDENT_REPORTED: 'incident.reported',
  INCIDENT_ESCALATED: 'incident.escalated',
  INCIDENT_RESOLVED: 'incident.resolved',

  // ── Revenue ───────────────────────────────────────────────
  REVENUE_SNAPSHOT: 'revenue.snapshot',

  // ── SubAdmin / Admin ──────────────────────────────────────
  ADMIN_ACTION: 'admin.action',

  // ── Notification ──────────────────────────────────────────
  NOTIFICATION_NEW: 'notification.new',
  NOTIFICATION_BROADCAST: 'notification.broadcast',

  // ── Role Applications ─────────────────────────────────────
  ROLE_APPLICATION_SUBMITTED: 'roleApplication.submitted',
  ROLE_APPLICATION_UPDATED: 'roleApplication.updated',

  // ── Team (FM ↔ Pilot) ───────────────────────────────────────
  TEAM_INVITE_CREATED: 'team.invite.created',
  TEAM_REQUEST_CREATED: 'team.request.created',
  TEAM_UPDATED: 'team.updated',

  // ── Aggregator ────────────────────────────────────────────
  DELEGATED_BOOKING_STATUS: 'delegated.booking.status',
  ACCOUNT_DELETION_REQUESTED: 'account.deletion.requested',

  // ── Complaint ─────────────────────────────────────────────
  COMPLAINT_STATUS_CHANGED: 'complaint.status.changed',

  // ── Settlement ────────────────────────────────────────────
  SETTLEMENT_PROCESSED: 'settlement.processed',

  // ── Farm ──────────────────────────────────────────────────
  FARM_CREATED: 'farm.created',
  FARM_UPDATED: 'farm.updated',
  FARM_DELETED: 'farm.deleted',

  // ── Admin Approval ───────────────────────────────────────
  BOOKING_ADMIN_APPROVED: 'booking.admin.approved',
  BOOKING_ADMIN_REJECTED: 'booking.admin.rejected',
  BOOKING_ADMIN_ASSIGNMENT_CHANGED: 'booking.admin.assignmentChanged',

  // ── Chat ─────────────────────────────────────────────────
  CHAT_MESSAGE_SENT: 'chat.message.sent',
  CHAT_MESSAGE_READ: 'chat.message.read',
  CHAT_CONVERSATION_CREATED: 'chat.conversation.created',
  CHAT_CALL_INITIATED: 'chat.call.initiated',
  CHAT_TYPING: 'chat.typing',
} as const;

/**
 * Client-facing Socket.IO event names (what the mobile app listens to).
 */
export const CLIENT_EVENTS = {
  // ── Booking Lifecycle ─────────────────────────────────────
  BOOKING_CREATED: 'booking:created',
  BOOKING_ASSIGNED_TO_FLEET_MANAGER: 'booking:assignedToFleetManager',
  BOOKING_FLEET_MANAGER_ACCEPTED: 'booking:fleetManagerAccepted',
  BOOKING_FLEET_MANAGER_REJECTED: 'booking:fleetManagerRejected',
  BOOKING_PILOT_ASSIGNED: 'booking:pilotAssigned',
  BOOKING_ASSIGNED: 'booking:assigned',
  BOOKING_CONFIRMED: 'booking:confirmed',
  BOOKING_SCHEDULED: 'booking:scheduled',
  BOOKING_STATUS: 'booking:status',
  BOOKING_CANCELLED: 'booking:cancelled',
  BOOKING_COMPLETED: 'booking:completed',
  BOOKING_RATED: 'booking:rated',
  BOOKING_TIME_SLOT_UPDATED: 'booking:timeSlotUpdated',

  // ── Mission Lifecycle ─────────────────────────────────────
  MISSION_CREATED: 'mission:created',
  MISSION_PILOT_EN_ROUTE: 'mission:pilotEnRoute',
  MISSION_PILOT_ARRIVED: 'mission:pilotArrived',
  MISSION_PREFLIGHT_STARTED: 'mission:preflightStarted',
  MISSION_PREFLIGHT_COMPLETED: 'mission:preflightCompleted',
  MISSION_STARTED: 'mission:started',
  MISSION_IN_PROGRESS: 'mission:inProgress',
  MISSION_GPS_UPDATE: 'mission:gpsUpdate',
  MISSION_PROGRESS_UPDATE: 'mission:progressUpdate',
  MISSION_PAUSED: 'mission:paused',
  MISSION_RESUMED: 'mission:resumed',
  MISSION_COMPLETED: 'mission:completed',
  MISSION_CANCELLED: 'mission:cancelled',
  MISSION_EMERGENCY: 'mission:emergency',
  
  // Legacy mission events
  MISSION_ACCEPTED: 'mission:accepted',
  MISSION_REJECTED: 'mission:rejected',
  MISSION_LOCATION: 'mission:location',

  // ── Payment Lifecycle ─────────────────────────────────────
  PAYMENT_PRICE_LOCKED: 'payment:priceLocked',
  PAYMENT_PENDING: 'payment:pending',
  PAYMENT_INITIATED: 'payment:initiated',
  PAYMENT_CONFIRMED: 'payment:confirmed',
  PAYMENT_FAILED: 'payment:failed',
  PAYMENT_REFUNDED: 'payment:refunded',
  
  // Legacy
  PRICE_LOCKED: 'price:locked',

  // ── Pilot / Fleet ─────────────────────────────────────────
  PILOT_AVAILABILITY_CHANGED: 'pilot:availability',
  PILOT_LOCATION_UPDATED: 'pilot:location',
  FLEET_MANAGER_AVAILABILITY_CHANGED: 'fleetManager:availability',

  // ── Fleet / Drone ─────────────────────────────────────────
  DRONE_STATUS: 'drone:status',
  DRONE_ASSIGNED: 'drone:assigned',
  MAINTENANCE_OVERDUE: 'maintenance:overdue',
  MAINTENANCE_LOGGED: 'maintenance:logged',
  
  // ── Fleet Manager ─────────────────────────────────────────
  FLEET_MANAGER_REQUEST_RECEIVED: 'fleetManager:requestReceived',
  FLEET_MANAGER_REQUEST_SENT: 'fleetManager:request:sent',
  FLEET_MANAGER_REQUEST_ACCEPTED: 'fleetManager:request:accepted',
  FLEET_MANAGER_REQUEST_REJECTED: 'fleetManager:request:rejected',
  FLEET_MANAGER_REQUEST_TIMEOUT: 'fleetManager:request:timeout',
  FLEET_MANAGER_REQUEST_CANCELLED: 'fleetManager:request:cancelled',
  BOOKING_FLEET_MANAGER_ASSIGNED: 'booking:fleetManager:assigned',
  BOOKING_ALL_FLEET_MANAGERS_REJECTED: 'booking:allFleetManagers:rejected',
  FLEET_MANAGER_PILOT_SEARCH_STARTED: 'fleetManager:pilotSearchStarted',
  FLEET_MANAGER_PILOT_FOUND: 'fleetManager:pilotFound',
  FLEET_MANAGER_DRONE_ASSIGNED: 'fleetManager:droneAssigned',
  FLEET_MANAGER_ASSIGNMENT_COMPLETE: 'fleetManager:assignmentComplete',

  // ── Service Centre ────────────────────────────────────────
  TICKET_CREATED: 'ticket:created',
  TICKET_ASSIGNED: 'ticket:assigned',
  TICKET_STATUS: 'ticket:status',
  SLA_BREACH: 'sla:breach',

  // ── Incident ──────────────────────────────────────────────
  INCIDENT_REPORTED: 'incident:reported',
  INCIDENT_ESCALATED: 'incident:escalated',
  INCIDENT_RESOLVED: 'incident:resolved',

  // ── Revenue / Admin ───────────────────────────────────────
  REVENUE_SNAPSHOT: 'revenue:snapshot',
  ADMIN_ACTION: 'admin:action',

  // ── Notification ──────────────────────────────────────────
  NOTIFICATION: 'notification:new',
  NOTIFICATION_BROADCAST: 'notification:broadcast',

  // ── Role Applications ─────────────────────────────────────
  ROLE_APPLICATION_SUBMITTED: 'role-application:submitted',
  ROLE_APPLICATION_UPDATED: 'role-application:updated',

  // ── Team (FM ↔ Pilot) ───────────────────────────────────────
  TEAM_INVITE_RECEIVED: 'team:inviteReceived',
  TEAM_REQUEST_RECEIVED: 'team:requestReceived',
  TEAM_UPDATED: 'team:updated',

  // ── Aggregator ────────────────────────────────────────────
  DELEGATED_BOOKING_STATUS: 'delegated:status',

  // ── Complaint / Settlement ────────────────────────────────
  COMPLAINT_STATUS_CHANGED: 'complaint:status',
  SETTLEMENT_PROCESSED: 'settlement:processed',

  // ── Farm ──────────────────────────────────────────────────
  FARM_CREATED: 'farm:created',
  FARM_UPDATED: 'farm:updated',
  FARM_DELETED: 'farm:deleted',

  // ── Admin Approval ───────────────────────────────────────
  BOOKING_ADMIN_APPROVED: 'booking:admin-approved',
  BOOKING_ADMIN_REJECTED: 'booking:admin-rejected',
  BOOKING_ADMIN_ASSIGNMENT_CHANGED: 'booking:admin-assignment-changed',

  // ── Chat ─────────────────────────────────────────────────
  CHAT_MESSAGE_SENT: 'chat:message:sent',
  CHAT_MESSAGE_READ: 'chat:message:read',
  CHAT_CONVERSATION_CREATED: 'chat:conversation:created',
  CHAT_CALL_INITIATED: 'chat:call:initiated',
  CHAT_TYPING: 'chat:typing',
} as const;

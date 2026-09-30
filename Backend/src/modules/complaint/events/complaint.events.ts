/**
 * Complaint-related events for the event emitter
 */
export const COMPLAINT_EVENTS = {
  CREATED: 'complaint.created',
  STATUS_UPDATED: 'complaint.status_updated',
  ASSIGNED: 'complaint.assigned',
  SLA_BREACH: 'complaint.sla_breach',
  ESCALATED: 'complaint.escalated',
} as const;

export interface ComplaintCreatedEvent {
  complaintId: string;
  userId: string;
  userRole: string;
  type: string;
  priority: string;
  slaDeadline: string;
}

export interface ComplaintStatusUpdatedEvent {
  complaintId: string;
  oldStatus: string;
  newStatus: string;
  updatedBy: string;
}

export interface ComplaintAssignedEvent {
  complaintId: string;
  assignedTo: string;
  assignedBy: string;
}

export interface ComplaintSlaBreachEvent {
  complaintId: string;
  userId: string;
  priority: string;
  hoursOverdue: number;
}

/**
 * 7-stage booking lifecycle tracker (Figma-driven).
 * Mapped from the flat status states to provide UI granularity.
 * 
 * Status drives the write model (pending→confirmed→in_progress→completed);
 * stage drives the read/display model (1–7 for customer tracking).
 */

export enum BookingStage {
  /** 1. Submitted / Confirming */
  SUBMITTED = 1,
  /** 2. Pilot Assigned */
  PILOT_ASSIGNED = 2,
  /** 3. Pilot En Route */
  EN_ROUTE = 3,
  /** 4. Mission Active */
  MISSION_ACTIVE = 4,
  /** 5. Mission Complete, Media Pending */
  MISSION_COMPLETE = 5,
  /** 6. Payment Pending */
  PAYMENT_PENDING = 6,
  /** 7. Completed */
  COMPLETED = 7,
}

/**
 * Derive booking stage from status + related fields.
 * This maps the 5-state machine to a 7-stage UI tracker.
 */
export function deriveBookingStage(booking: {
  status: string;
  assignedPilot?: string | null;
  paymentStatus?: string | null;
  finalPrice?: number | null;
}): BookingStage {
  const status = booking.status.toLowerCase();

  // Cancelled stays as-is (no stage progression)
  if (status === 'cancelled') {
    return BookingStage.SUBMITTED; // or handle separately
  }

  // Completed = stage 7
  if (status === 'completed') {
    return BookingStage.COMPLETED;
  }

  // In progress flow
  if (status === 'in_progress') {
    // If payment is processed but booking is still in_progress, we're at payment pending
    if (booking.finalPrice && booking.paymentStatus === 'pending') {
      return BookingStage.PAYMENT_PENDING;
    }
    // If mission is underway
    return BookingStage.MISSION_ACTIVE;
  }

  // Confirmed flow
  if (status === 'confirmed') {
    if (booking.assignedPilot) {
      // Pilot assigned, assume en route until mission starts
      return BookingStage.EN_ROUTE;
    }
    return BookingStage.PILOT_ASSIGNED;
  }

  // Pending = stage 1
  return BookingStage.SUBMITTED;
}

/**
 * Get human-readable stage description
 */
export function getStageDescription(stage: BookingStage): string {
  switch (stage) {
    case BookingStage.SUBMITTED:
      return 'Booking submitted and awaiting confirmation';
    case BookingStage.PILOT_ASSIGNED:
      return 'Pilot has been assigned to your booking';
    case BookingStage.EN_ROUTE:
      return 'Pilot is en route to the location';
    case BookingStage.MISSION_ACTIVE:
      return 'Mission is currently in progress';
    case BookingStage.MISSION_COMPLETE:
      return 'Mission completed, processing media and data';
    case BookingStage.PAYMENT_PENDING:
      return 'Awaiting payment confirmation';
    case BookingStage.COMPLETED:
      return 'Booking completed successfully';
    default:
      return 'Processing...';
  }
}

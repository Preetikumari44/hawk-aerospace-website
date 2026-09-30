/**
 * Booking lifecycle helpers — single source of truth for:
 *  1. Active vs Upcoming classification (active ONLY on the service day).
 *  2. Automatic expiry / cancellation detection (with refund via backend cancel API).
 *
 * Service date resolution order: scheduledDate -> date -> preferredDate ->
 * scheduledStartTime -> preferredTimeSlot (date-only strings also supported).
 */

const ACTIVE_STATUSES = ['pending', 'confirmed', 'in_progress', 'pilot_assigned', 'assigned'];
const TERMINAL_STATUSES = ['cancelled', 'completed'];

export const getBookingServiceDateRaw = (booking) => {
  if (!booking || typeof booking !== 'object') return null;
  return (
    booking.scheduledDate ||
    booking.date ||
    booking.preferredDate ||
    booking.scheduledStartTime ||
    booking.serviceDate ||
    null
  );
};

export const getBookingServiceDate = (booking) => {
  const raw = getBookingServiceDateRaw(booking);
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d;
};

const startOfDay = (d) => {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
};

const endOfDay = (d) => {
  const c = new Date(d);
  c.setHours(23, 59, 59, 999);
  return c;
};

export const isSameCalendarDay = (a, b) => {
  if (!a || !b) return false;
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
};

/** True when the booking's scheduled service date is today (local calendar day). */
export const isServiceDateToday = (booking, now = new Date()) => {
  const serviceDate = getBookingServiceDate(booking);
  if (!serviceDate) return false;
  return isSameCalendarDay(serviceDate, now);
};

/** True when the whole service day has passed (now is after 23:59:59 of service date). */
export const isServiceDayPassed = (booking, now = new Date()) => {
  const serviceDate = getBookingServiceDate(booking);
  if (!serviceDate) return false;
  return now.getTime() > endOfDay(serviceDate).getTime();
};

/** True when the service day is strictly in the future (after today). */
export const isServiceDateFuture = (booking, now = new Date()) => {
  const serviceDate = getBookingServiceDate(booking);
  if (!serviceDate) return false;
  return startOfDay(serviceDate).getTime() > startOfDay(now).getTime();
};

const isApproved = (booking) =>
  String(booking?.adminApprovalStatus || '').toLowerCase() === 'approved';

const normalizedStatus = (booking) => String(booking?.status || '').toLowerCase();
const isTerminal = (booking) => TERMINAL_STATUSES.includes(normalizedStatus(booking));

/** True when the booking was already paid (a refund will be due on cancellation). */
export const isBookingPaid = (booking) =>
  String(booking?.paymentStatus || '').toLowerCase() === 'paid';

const isPaid = (booking) => isBookingPaid(booking);

/**
 * A booking is ACTIVE only when ALL of these hold:
 *  - status is pending/confirmed/in_progress/pilot_assigned/assigned
 *  - adminApprovalStatus === 'approved'
 *  - scheduled service date is TODAY (local calendar day)
 *  - not cancelled / completed
 */
export const isActiveBooking = (booking, now = new Date()) => {
  if (!booking) return false;
  if (isTerminal(booking)) return false;
  if (!isApproved(booking)) return false;
  if (!ACTIVE_STATUSES.includes(normalizedStatus(booking))) return false;
  return isServiceDateToday(booking, now);
};

/**
 * Everything that is not cancelled/completed and not active goes to Upcoming.
 * This includes: pending admin approval, admin rejected, approved future bookings,
 * and approved bookings whose service day has not arrived yet.
 */
export const isUpcomingBookingByDay = (booking, now = new Date()) => {
  if (!booking) return false;
  if (isTerminal(booking)) return false;
  return !isActiveBooking(booking, now);
};

/**
 * Determine WHY a booking must be auto-cancelled. Returns a reason string or null.
 * Covers:
 *  1. Date passed + not approved by admin (pending/rejected) -> cancel (+refund if paid).
 *  2. Date passed + approved but service not done (pending/confirmed, no start) -> cancel (+refund if paid).
 *  3. Date passed + FM/pilot/drone never assigned -> cancel (+refund if paid).
 *  4. Pilot never started service by end of service day (no actualStartTime, status not in_progress/completed) -> cancel (+refund if paid).
 *  5. Service started (in_progress) but never completed and day has passed -> cancel (+refund if paid).
 *  6. Stuck in pilot_assigned/assigned past the service day without start -> cancel (+refund if paid).
 */
export const getBookingExpiryReason = (booking, now = new Date()) => {
  if (!booking) return null;
  const status = normalizedStatus(booking);
  if (status === 'cancelled' || status === 'completed') return null;

  const serviceDate = getBookingServiceDate(booking);
  if (!serviceDate) return null;
  if (!isServiceDayPassed(booking, now)) return null;

  const approval = String(booking?.adminApprovalStatus || '').toLowerCase();
  const started = Boolean(booking?.actualStartTime || booking?.startedAt || booking?.missionStartedAt);

  // Case 1: never approved (or rejected) and the date has passed.
  if (approval && approval !== 'approved') {
    return `Auto-cancelled: service date ${serviceDate.toLocaleDateString()} passed without admin approval`;
  }
  // No approval info at all + date passed + never started -> also stale.
  if (!approval && !started && (status === 'pending' || status === 'scheduled' || status === 'upcoming')) {
    return `Auto-cancelled: service date ${serviceDate.toLocaleDateString()} passed without admin approval`;
  }

  // Case 3: approved but FM/pilot/drone never assigned by end of service day.
  const hasFm = Boolean(booking?.fleetManagerUid || booking?.fleetManagerId || booking?.fmUid);
  const hasPilot = Boolean(booking?.assignedPilot || booking?.pilotUid || booking?.pilotId);
  const hasDrone = Boolean(booking?.assignedDrone || booking?.droneId || booking?.droneUid);
  if (isApproved(booking) && (status === 'pending' || status === 'confirmed') && !started) {
    if (!hasFm || !hasPilot || !hasDrone) {
      return `Auto-cancelled: FM/pilot/drone was not assigned by end of service day ${serviceDate.toLocaleDateString()}`;
    }
    // Case 2: assigned but service never done.
    return `Auto-cancelled: service scheduled on ${serviceDate.toLocaleDateString()} was not completed`;
  }

  // Case 4/6: assigned to pilot but pilot never started by end of day.
  if ((status === 'pilot_assigned' || status === 'assigned') && !started) {
    return `Auto-cancelled: pilot did not start the service by end of ${serviceDate.toLocaleDateString()}`;
  }

  // Case 5: started but never completed and the day has passed.
  if (status === 'in_progress' && !isTerminal(booking)) {
    return `Auto-cancelled: service started on ${serviceDate.toLocaleDateString()} was not completed by end of day`;
  }

  // Fallback: any other non-terminal booking whose service day fully passed.
  return `Auto-cancelled: service date ${serviceDate.toLocaleDateString()} has passed without completion`;
};

export const isBookingExpired = (booking, now = new Date()) =>
  getBookingExpiryReason(booking, now) !== null;

/**
 * Display-only reconciliation for expired bookings.
 *
 * The backend expiry cron owns actual cancellation (with a guaranteed 100%
 * refund when paid). The client must NOT call the user cancel endpoint for
 * expiries: the tiered customer-initiated policy yields ₹0 past the service
 * date, and started missions reject client cancels outright. This helper only
 * marks expired items as cancelled locally so lists/tabs stay correct until
 * the server sweep persists the change.
 *
 * Returns { bookings, expired } where `expired` holds { booking, reason,
 * refundDue } entries for optional UI messaging.
 */
export const markExpiredBookingsLocal = (bookings, now = new Date()) => {
  if (!Array.isArray(bookings)) return { bookings: [], expired: [] };
  const expired = [];
  const next = bookings.map((b) => {
    const reason = getBookingExpiryReason(b, now);
    if (!reason) return b;
    expired.push({ booking: b, reason, refundDue: isPaid(b) });
    if (String(b?.status || '').toLowerCase() === 'cancelled') return b;
    return { ...b, status: 'cancelled', cancellationReason: reason };
  });
  return { bookings: next, expired };
};

/**
 * Time slot definitions for booking scheduling.
 * Used to convert user-friendly time slot names to actual time ranges.
 */
export const TIME_SLOTS = {
  EARLY_MORNING: { start: '06:00', end: '09:00', label: 'Early Morning (6 AM - 9 AM)' },
  MORNING: { start: '09:00', end: '12:00', label: 'Morning (9 AM - 12 PM)' },
  AFTERNOON: { start: '12:00', end: '15:00', label: 'Afternoon (12 PM - 3 PM)' },
  LATE_AFTERNOON: { start: '15:00', end: '18:00', label: 'Late Afternoon (3 PM - 6 PM)' },
  EVENING: { start: '18:00', end: '21:00', label: 'Evening (6 PM - 9 PM)' },
} as const;

export type TimeSlot = keyof typeof TIME_SLOTS;

/**
 * Validates if a given string is a valid time slot.
 */
export function isValidTimeSlot(slot: string): slot is TimeSlot {
  return slot in TIME_SLOTS;
}

/**
 * Gets all available time slots with their labels.
 */
export function getAvailableTimeSlots(): Array<{ value: TimeSlot; label: string }> {
  return Object.entries(TIME_SLOTS).map(([key, value]) => ({
    value: key as TimeSlot,
    label: value.label,
  }));
}

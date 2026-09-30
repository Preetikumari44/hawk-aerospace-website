import { canTransitionBookingStatus } from './interfaces/booking-status.enum';

describe('booking status transitions', () => {
  it('allows planned lifecycle transitions', () => {
    expect(canTransitionBookingStatus('pending', 'confirmed')).toBe(true);
    expect(canTransitionBookingStatus('confirmed', 'in_progress')).toBe(true);
    expect(canTransitionBookingStatus('in_progress', 'completed')).toBe(true);
  });

  it('blocks terminal status transitions', () => {
    expect(canTransitionBookingStatus('completed', 'cancelled')).toBe(false);
    expect(canTransitionBookingStatus('cancelled', 'confirmed')).toBe(false);
  });
});

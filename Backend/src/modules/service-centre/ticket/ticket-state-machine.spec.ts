import { canTransitionTicketStatus } from './ticket-state-machine';

describe('ticket state machine', () => {
  it('allows normal service workflow', () => {
    expect(canTransitionTicketStatus('open', 'assigned')).toBe(true);
    expect(canTransitionTicketStatus('assigned', 'in_progress')).toBe(true);
    expect(canTransitionTicketStatus('in_progress', 'resolved')).toBe(true);
    expect(canTransitionTicketStatus('resolved', 'closed')).toBe(true);
  });

  it('blocks terminal reopen', () => {
    expect(canTransitionTicketStatus('closed', 'open')).toBe(false);
  });
});

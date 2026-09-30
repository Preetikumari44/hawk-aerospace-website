import {
  allowedInviteeRoles,
  canInvite,
  generateReferralCode,
  isReferralCode,
  normalizeReferralRole,
  ruleIdFor,
} from './referral.constants';

describe('Referral code format (6 letters)', () => {
  it('generates 6-char codes with at least one digit', () => {
    for (let i = 0; i < 200; i++) {
      const code = generateReferralCode();
      expect(code).toMatch(/^(?=.*\d)[A-Z2-9]{6}$/);
    }
  });

  it('generates unique codes at volume', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 500; i++) seen.add(generateReferralCode());
    expect(seen.size).toBeGreaterThan(490);
  });

  it('accepts new codes and legacy HAWK- codes', () => {
    expect(isReferralCode('X7K2QM')).toBe(true);
    expect(isReferralCode(' x7k2qm ')).toBe(true);
    expect(isReferralCode('HAWK-CUST-X7K2QM')).toBe(true);
    expect(isReferralCode('INVITE')).toBe(false); // no digit
    expect(isReferralCode('ABC')).toBe(false);
    expect(isReferralCode('')).toBe(false);
    expect(isReferralCode(null)).toBe(false);
  });
});

describe('Referral role matrix', () => {
  it('customer can only invite customers', () => {
    expect(allowedInviteeRoles('customer')).toEqual(['customer']);
    expect(canInvite('customer', 'customer')).toBe(true);
    expect(canInvite('customer', 'pilot')).toBe(false);
  });

  it('sales-agg can invite customers and sales-aggs', () => {
    expect(canInvite('aggregator', 'customer')).toBe(true);
    expect(canInvite('aggregator', 'aggregator')).toBe(true);
    expect(canInvite('aggregator', 'pilot')).toBe(false);
  });

  it('pilot can only invite pilots', () => {
    expect(canInvite('pilot', 'pilot')).toBe(true);
    expect(canInvite('pilot', 'customer')).toBe(false);
  });

  it('FM can invite FMs and pilots (vendor alias included)', () => {
    expect(canInvite('fleet_manager', 'fleet_manager')).toBe(true);
    expect(canInvite('fleet_manager', 'pilot')).toBe(true);
    expect(canInvite('vendor', 'pilot')).toBe(true);
    expect(canInvite('fleet_manager', 'technician')).toBe(false);
  });

  it('technician can only invite technicians', () => {
    expect(canInvite('technician', 'technician')).toBe(true);
    expect(canInvite('technician', 'pilot')).toBe(false);
  });

  it('normalizes frontend role spellings', () => {
    expect(normalizeReferralRole('sales')).toBe('aggregator');
    expect(normalizeReferralRole('fleet')).toBe('fleet_manager');
    expect(normalizeReferralRole('vendor')).toBe('fleet_manager');
  });

  it('builds stable rule ids', () => {
    expect(ruleIdFor('vendor', 'pilot')).toBe('fleet_manager__pilot');
  });
});

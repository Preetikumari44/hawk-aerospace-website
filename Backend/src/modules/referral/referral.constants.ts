/**
 * Refer & Earn — role matrix, triggers, default rules.
 *
 * Matrix (server-enforced):
 *  customer   -> customer only
 *  aggregator -> customer, aggregator
 *  pilot      -> pilot only
 *  fleet_manager (+vendor alias) -> fleet_manager, pilot
 *  technician -> technician only
 */

/**
 * Referral codes are bare 6-character strings (A–Z except I/O, digits 2–9,
 * always containing at least one digit so they can't be mistaken for words).
 * Legacy `HAWK-<ROLE>-XXXXXX` codes issued before the migration still resolve.
 */
export const REFERRAL_CODE_LENGTH = 6;
export const REFERRAL_CODE_RE = /^(?=.*\d)[A-Z2-9]{6}$/;
export const LEGACY_REFERRAL_CODE_RE = /^HAWK-[A-Z0-9-]{4,40}$/;

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_DIGITS = '23456789';

export function isReferralCode(value?: string | null): boolean {
  if (!value) return false;
  const v = value.toUpperCase().trim();
  return REFERRAL_CODE_RE.test(v) || LEGACY_REFERRAL_CODE_RE.test(v);
}

/** Generates a 6-char code (guaranteed ≥1 digit). Retries on collision by caller. */
export function generateReferralCode(randomSource?: (len: number) => Buffer): string {
  // Lazy import keeps this module importable in edge/minimal runtimes.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const rand = randomSource ?? ((len: number) => require('crypto').randomBytes(len));
  const bytes = rand(REFERRAL_CODE_LENGTH);
  const chars = Array.from(bytes).map(
    (b: unknown) => CODE_ALPHABET[(b as number) % CODE_ALPHABET.length],
  );
  if (!chars.some((c) => CODE_DIGITS.includes(c))) {
    chars[bytes[0] % REFERRAL_CODE_LENGTH] =
      CODE_DIGITS[bytes[1 % bytes.length] % CODE_DIGITS.length];
  }
  return chars.join('');
}
// Shareable referral links. Currently the User_Frontend web build on the EC2
// server (port 8081) — nginx serves index.html for /r/:code and the web app
// renders the invite landing. Switch to 'https://hawkaerosystem.com/r' once
// the domain + HTTPS + App Links verification are live (see
// deploy/nginx-hawkaerosystem.conf). Overridable via REFERRAL_LINK_BASE env.
export const REFERRAL_LINK_BASE =
  process.env.REFERRAL_LINK_BASE ?? 'http://43.205.190.95:8081/r';
export const REFERRAL_CODE_TTL_DAYS = Number(
  process.env.REFERRAL_CODE_TTL_DAYS ?? 60,
);
export const REFERRAL_MIN_WITHDRAWAL = Number(
  process.env.REFERRAL_MIN_WITHDRAWAL ?? 100,
);
export const REFERRAL_WITHDRAW_HOLD_DAYS = Number(
  process.env.REFERRAL_WITHDRAW_HOLD_DAYS ?? 7,
);
export const REFERRAL_MAX_INVITES_PER_DAY = Number(
  process.env.REFERRAL_MAX_INVITES_PER_DAY ?? 20,
);

export type ReferralTrigger = 'role_approved' | 'first_paid_booking';

export const REFERRAL_MATRIX: Record<string, string[]> = {
  customer: ['customer'],
  aggregator: ['customer', 'aggregator'],
  pilot: ['pilot'],
  fleet_manager: ['fleet_manager', 'pilot'],
  vendor: ['fleet_manager', 'pilot'], // legacy alias of fleet_manager
  technician: ['technician'],
};

export function normalizeReferralRole(role?: string | null): string {
  const r = (role ?? '').toLowerCase().trim();
  if (r === 'vendor') return 'fleet_manager';
  if (r === 'sales' || r === 'sales_agg' || r === 'sales-agg') return 'aggregator';
  if (r === 'fleet' || r === 'fm') return 'fleet_manager';
  return r;
}

export function allowedInviteeRoles(inviterRole?: string | null): string[] {
  return REFERRAL_MATRIX[normalizeReferralRole(inviterRole)] ?? [];
}

export function canInvite(
  inviterRole?: string | null,
  targetRole?: string | null,
): boolean {
  return allowedInviteeRoles(inviterRole).includes(
    normalizeReferralRole(targetRole),
  );
}

export interface ReferralRuleSeed {
  inviterRole: string;
  inviteeRole: string;
  trigger: ReferralTrigger;
  walletAmount: number;
  couponAmount: number;
  couponOnly?: boolean;
  maxPerUserPerMonth: number;
  codeExpiryDays: number;
}

/** Default rewards — editable anytime via Admin ReferralRulesScreen (no deploy). */
export const DEFAULT_REFERRAL_RULES: ReferralRuleSeed[] = [
  { inviterRole: 'customer', inviteeRole: 'customer', trigger: 'first_paid_booking', walletAmount: 100, couponAmount: 100, maxPerUserPerMonth: 20, codeExpiryDays: 60 },
  { inviterRole: 'aggregator', inviteeRole: 'customer', trigger: 'first_paid_booking', walletAmount: 150, couponAmount: 100, maxPerUserPerMonth: 30, codeExpiryDays: 60 },
  { inviterRole: 'aggregator', inviteeRole: 'aggregator', trigger: 'role_approved', walletAmount: 300, couponAmount: 150, maxPerUserPerMonth: 20, codeExpiryDays: 60 },
  { inviterRole: 'pilot', inviteeRole: 'pilot', trigger: 'role_approved', walletAmount: 300, couponAmount: 150, maxPerUserPerMonth: 20, codeExpiryDays: 60 },
  { inviterRole: 'fleet_manager', inviteeRole: 'fleet_manager', trigger: 'role_approved', walletAmount: 400, couponAmount: 200, maxPerUserPerMonth: 20, codeExpiryDays: 60 },
  { inviterRole: 'fleet_manager', inviteeRole: 'pilot', trigger: 'role_approved', walletAmount: 300, couponAmount: 150, maxPerUserPerMonth: 20, codeExpiryDays: 60 },
  { inviterRole: 'technician', inviteeRole: 'technician', trigger: 'role_approved', walletAmount: 300, couponAmount: 150, maxPerUserPerMonth: 20, codeExpiryDays: 60 },
];

export function ruleIdFor(inviterRole: string, inviteeRole: string): string {
  return `${normalizeReferralRole(inviterRole)}__${normalizeReferralRole(inviteeRole)}`;
}

export const REFERRAL_EVENTS = {
  SIGNED_UP: 'referral.signed_up',
  ROLE_APPROVED: 'referral.role.approved',
  BOOKING_PAID: 'referral.booking.paid',
} as const;

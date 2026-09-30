import { Linking, Platform } from 'react-native';
import { Storage } from './storage';

const PENDING_KEY = '@pending_referral_code';

/**
 * Extract a referral code from any link/text (deep link, landing URL, clipboard).
 * Current format: bare 6 chars (A–Z except I/O, 2–9, always ≥1 digit, e.g. X7K2QM).
 * Legacy `HAWK-…` codes still extract so old links keep working.
 */
const CODE_RE = /(?:^|[^A-Z0-9])([A-Z2-9]{6})(?:[^A-Z0-9]|$)/;
const LEGACY_RE = /(HAWK-[A-Z0-9-]{4,40})/;

export const isReferralCode = (value) => {
  if (!value || typeof value !== 'string') return false;
  const v = value.toUpperCase().trim();
  if (LEGACY_RE.test(v)) return true;
  return CODE_RE.test(` ${v} `) && /\d/.test(v);
};

export const extractReferralCode = (text) => {
  if (!text || typeof text !== 'string') return null;
  const upper = text.toUpperCase();
  const legacy = upper.match(LEGACY_RE);
  if (legacy) return legacy[1];
  const m = ` ${upper} `.match(CODE_RE);
  if (m && /\d/.test(m[1])) return m[1];
  return null;
};

export const parseReferralFromUrl = (url) => {
  if (!url) return null;
  try {
    // hawk://invite?code=ABC123  or  http://<ec2-ip>:8081/r/ABC123?role=pilot
    const codeParam = url.match(/[?&]code=([^&#]+)/i)?.[1];
    if (codeParam) {
      const code = extractReferralCode(decodeURIComponent(codeParam));
      if (code) return { code, role: url.match(/[?&]role=([^&#]+)/i)?.[1] ?? null };
    }
    const pathMatch = url.match(/\/r\/([^/?#]+)/i);
    if (pathMatch) {
      const code = extractReferralCode(decodeURIComponent(pathMatch[1]));
      if (code) return { code, role: url.match(/[?&]role=([^&#]+)/i)?.[1] ?? null };
    }
  } catch {
    // ignore malformed urls
  }
  return null;
};

export const savePendingReferralCode = async (code, role = null) => {
  const clean = extractReferralCode(code);
  if (!clean) return null;
  // Stored as JSON so deep links can route straight to the invited role's
  // form. extractReferralCode() still finds the code inside the JSON string,
  // so all existing readers keep working.
  const targetRole = typeof role === 'string' && role.trim() ? role.trim().toLowerCase() : null;
  await Storage.setItem(
    PENDING_KEY,
    JSON.stringify({ code: clean, role: targetRole }),
  ).catch(() => {});
  return clean;
};

export const getPendingReferralCode = async () => {
  try {
    const raw = await Storage.getItem(PENDING_KEY);
    return extractReferralCode(raw);
  } catch {
    return null;
  }
};

/** { code, role } stashed from the last invite link (role may be null). */
export const getPendingReferral = async () => {
  try {
    const raw = await Storage.getItem(PENDING_KEY);
    if (!raw) return { code: null, role: null };
    const code = extractReferralCode(raw);
    if (!code) return { code: null, role: null };
    let role = null;
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.role === 'string' && parsed.role.trim()) {
        role = parsed.role.trim().toLowerCase();
      }
    } catch {
      // legacy plain-code value — no role attached
    }
    return { code, role };
  } catch {
    return { code: null, role: null };
  }
};

export const clearPendingReferralCode = async () => {
  await Storage.removeItem(PENDING_KEY).catch(() => {});
};

/**
 * Maps a backend invite role to the frontend role-application id used by
 * RoleApplicationFormScreen (pilot/sales/fleet/technician). Returns null for
 * customer invites (normal OTP signup flow) and unknown roles.
 */
export const frontendRoleForInvite = (role) => {
  const r = String(role ?? '').toLowerCase().trim();
  if (r === 'pilot') return 'pilot';
  if (r === 'aggregator' || r === 'sales') return 'sales';
  if (r === 'fleet_manager' || r === 'fleet' || r === 'vendor' || r === 'fm') return 'fleet';
  if (r === 'technician') return 'technician';
  return null;
};

/** Call once at app boot: captures cold-start + warm deep links. */
export const initReferralDeepLinks = async (onCode) => {
  try {
    const initial = await Linking.getInitialURL();
    const parsed = parseReferralFromUrl(initial);
    if (parsed?.code) {
      await savePendingReferralCode(parsed.code, parsed.role);
      onCode?.(parsed);
    }
  } catch {
    // linking unavailable (e.g. web without handler)
  }
  const sub = Linking.addEventListener('url', async ({ url }) => {
    const parsed = parseReferralFromUrl(url);
    if (parsed?.code) {
      await savePendingReferralCode(parsed.code, parsed.role);
      onCode?.(parsed);
    }
  });
  return () => sub?.remove?.();
};

export const buildReferralMessage = ({ code, link, apkLink, roleLabel }) =>
  `Join me on Hawk Aerosystem${roleLabel ? ` as ${roleLabel}` : ''}! Open my invite link: ${link}` +
  (apkLink ? ` (App download: ${apkLink})` : '') +
  ` My referral code: ${code}`;

export const isWeb = Platform.OS === 'web';

import { Storage } from '../utils/storage';
import { getSession } from '../utils/api';
import { mapsApi } from '../utils/api';
import { getCurrentPosition } from '../utils/geolocation';
import type { LanguageCode } from './languages';

interface StateRule {
  patterns: string[];
  language: LanguageCode;
}

/**
 * Maps Indian states / union territories (with common aliases) to the
 * regional language offered by the app. States without a dedicated regional
 * language fall back to Hindi.
 */
const STATE_RULES: StateRule[] = [
  { patterns: ['maharashtra', 'maharastra', 'nashik', 'mumbai', 'pune', 'aurangabad', 'nagpur', 'thane', 'solapur', 'kolhapur'], language: 'mr' },
  { patterns: ['karnataka', 'bangalore', 'bengaluru', 'mysore', 'mysuru', 'hubli', 'dharwad', 'mangalore', 'mangaluru'], language: 'kn' },
  { patterns: ['tamil nadu', 'tamilnadu', 'chennai', 'madras', 'coimbatore', 'madurai', 'trichy', 'salem'], language: 'ta' },
  { patterns: ['kerala', 'kochi', 'cochin', 'trivandrum', 'thiruvananthapuram', 'kozhikode', 'calicut', 'ernakulam'], language: 'ml' },
  { patterns: ['punjab', 'amritsar', 'ludhiana', 'jalandhar', 'patiala', 'chandigarh'], language: 'pa' },
  { patterns: ['west bengal', 'bengal', 'kolkata', 'calcutta', 'howrah', 'siliguri', 'durgapur'], language: 'bn' },
  { patterns: ['assam', 'guwahati', 'dispur', 'silchar'], language: 'as' },
  { patterns: ['odisha', 'orissa', 'bhubaneswar', 'cuttack', 'puri', 'rourkela'], language: 'or' },
  { patterns: ['gujarat', 'ahmedabad', 'surat', 'vadodara', 'baroda', 'rajkot', 'gandhinagar'], language: 'gu' },
  { patterns: ['telangana', 'hyderabad', 'secunderabad', 'warangal', 'karimnagar'], language: 'te' },
  { patterns: ['andhra pradesh', 'andhra', 'visakhapatnam', 'vijayawada', 'guntur', 'nellore', 'tirupati'], language: 'te' },
  { patterns: ['tripura', 'agartala'], language: 'bn' },
  { patterns: ['puducherry', 'pondicherry', 'karaikal'], language: 'ta' },
  {
    patterns: [
      'haryana',
      'delhi',
      'new delhi',
      'uttar pradesh',
      'rajasthan',
      'madhya pradesh',
      'bihar',
      'chhattisgarh',
      'jharkhand',
      'uttarakhand',
      'himachal pradesh',
      'goa',
      'jammu',
      'kashmir',
      'srinagar',
      'ladakh',
      'leh',
      'arunachal pradesh',
      'manipur',
      'meghalaya',
      'mizoram',
      'nagaland',
      'sikkim',
      'andaman',
      'nicobar',
      'dadra',
      'nagar haveli',
      'daman',
      'diu',
      'lakhadweep',
      'lakshadweep',
      'gurugram',
      'gurgaon',
      'jaipur',
      'lucknow',
      'kanpur',
      'varanasi',
      'bhopal',
      'indore',
      'patna',
      'raipur',
      'ranchi',
      'dehradun',
      'shimla',
      'ambala',
      'noida',
    ],
    language: 'hi',
  },
];

const COMPILED_RULES: Array<{ regex: RegExp; language: LanguageCode }> = STATE_RULES.map(
  (rule) => ({
    regex: new RegExp(`\\b(${rule.patterns.join('|')})\\b`, 'i'),
    language: rule.language,
  }),
);

export function normalizeStateText(raw: string | null | undefined): string {
  if (!raw) return '';
  return String(raw)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Synchronously searches a free-form text blob (address, region, state, etc.)
 * for a known Indian state and returns the mapped regional language.
 */
export function getRegionalLanguageForState(stateText: string | null | undefined): LanguageCode | null {
  const normalized = normalizeStateText(stateText);
  if (!normalized) return null;
  for (const rule of COMPILED_RULES) {
    if (rule.regex.test(normalized)) {
      return rule.language;
    }
  }
  return null;
}

/**
 * Extracts a state name from any reverse-geocode response shape.
 * The backend response may vary, so we defensively scan object keys and a
 * flattened string for known state names.
 */
function extractStateFromReverseGeocode(response: unknown): string | null {
  if (!response || typeof response !== 'object') return null;

  const directKeys = ['state', 'stateName', 'state_name', 'adminAreaLevel1', 'administrativeArea', 'region'];
  for (const key of directKeys) {
    const value = (response as Record<string, unknown>)[key];
    if (typeof value === 'string' && value.trim()) {
      return value;
    }
    if (value && typeof value === 'object') {
      const nested = (value as Record<string, unknown>).name;
      if (typeof nested === 'string' && nested.trim()) {
        return nested;
      }
    }
  }

  try {
    return extractStateFromFreeText(JSON.stringify(response));
  } catch {
    return null;
  }
}

/**
 * Finds the first state whose alias appears inside an arbitrary text blob.
 */
export function extractStateFromFreeText(text: string | null | undefined): string | null {
  const normalized = normalizeStateText(text);
  if (!normalized) return null;
  const flatRules: string[] = [];
  STATE_RULES.forEach((rule) => rule.patterns.forEach((pattern) => flatRules.push(pattern)));
  for (const pattern of flatRules) {
    if (normalized.includes(pattern)) {
      return pattern;
    }
  }
  return null;
}

async function stateFromGpsCoordinates(latitude: number, longitude: number): Promise<string | null> {
  try {
    const response = await mapsApi
      .reverseGeocode(latitude, longitude)
      .catch(() => null);
    return extractStateFromReverseGeocode(response);
  } catch {
    return null;
  }
}

/**
 * Priority 1 & 2: live GPS, then persisted GPS coordinates from storage.
 */
async function detectStateFromGps(): Promise<string | null> {
  try {
    const position = await getCurrentPosition({ timeout: 8000 }).catch(() => null);
    if (position?.coords?.latitude && position?.coords?.longitude) {
      const state = await stateFromGpsCoordinates(position.coords.latitude, position.coords.longitude);
      if (state) return state;
    }
  } catch {
    // ignore and continue
  }

  try {
    const [lat, lng] = await Promise.all([
      Storage.getItem('latitude'),
      Storage.getItem('longitude'),
    ]);
    if (lat && lng) {
      const state = await stateFromGpsCoordinates(parseFloat(lat), parseFloat(lng));
      if (state) return state;
    }
  } catch {
    // ignore and continue
  }

  return null;
}

/**
 * Priority 3 & 4: stored user profile address / region / state fields.
 */
async function detectStateFromProfile(): Promise<string | null> {
  try {
    const session = await getSession();
    const user = session?.user;
    if (!user) return null;

    const profile = user.profileData || {};
    const candidates = [
      user.address,
      user.state,
      profile.state,
      profile.region,
      profile.address,
      profile.district,
      user.location?.state,
      user.location?.address,
      user.locality,
      user.district,
    ].filter((value): value is string => typeof value === 'string' && value.trim().length > 0);

    for (const candidate of candidates) {
      const state = extractStateFromFreeText(candidate);
      if (state) return state;
    }
  } catch {
    // ignore and continue
  }
  return null;
}

/**
 * Resolves the regional language for the user's current location using the
 * priority chain: GPS -> stored GPS coordinates -> user profile -> fallback.
 * Never throws; returns null when the region cannot be determined.
 */
export async function detectRegionalLanguage(): Promise<LanguageCode | null> {
  const gpsState = await detectStateFromGps();
  const fromGps = gpsState ? getRegionalLanguageForState(gpsState) : null;
  if (fromGps) return fromGps;

  const profileState = await detectStateFromProfile();
  const fromProfile = profileState ? getRegionalLanguageForState(profileState) : null;
  if (fromProfile) return fromProfile;

  return null;
}

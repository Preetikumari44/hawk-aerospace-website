export type TeamInviteKind = 'fm_invite' | 'pilot_request';
export type TeamInviteStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'superseded';

export interface TeamInvite {
  id: string;
  kind: TeamInviteKind;
  pilotUid: string;
  pilotName?: string | null;
  pilotPhone?: string | null;
  fmUid: string;
  fmName?: string | null;
  fmPhone?: string | null;
  status: TeamInviteStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  decidedAt?: string | null;
  decidedBy?: string | null;
}

export interface UnassignedPilotSummary {
  uid: string;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  serviceTypes?: string[];
  experienceYears?: number | null;
  experienceMonths?: number | null;
  experienceText?: string | null;
  distanceKm?: number | null;
  address?: string | null;
  rating?: number;
  totalMissions?: number;
}

export interface GeoFilterOptions {
  /** Explicit viewer location (live GPS from the app). Overrides stored profile. */
  lat?: number | null;
  lng?: number | null;
  /** Radius in km. Defaults to 150 when omitted. */
  radiusKm?: number | null;
}

export const DEFAULT_GEO_RADIUS_KM = 150;

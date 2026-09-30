import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { ROOT_COLLECTIONS, USER_SUBCOLLECTIONS } from '../../common/constants/collection-paths.constant';
import type { CurrentUser } from '../../common/interfaces/current-user.interface';
import { FirebaseAdminService } from '../../firebase/firebase-admin.service';
import { WS_EVENTS } from '../../gateway/events/event.constants';
import { CacheService } from '../../common/cache/cache.service';
import { UsersService } from '../users/users.service';
import { CreateInviteDto, CreateJoinRequestDto } from './dto/team.dto';
import type { TeamInvite, UnassignedPilotSummary, GeoFilterOptions } from './interfaces/team.interface';
import { DEFAULT_GEO_RADIUS_KM } from './interfaces/team.interface';

const TEAM_INVITES_COLLECTION = 'team_invites';
const FM_ROLES = ['fleet_manager', 'vendor'];
/** A pilot can join at most 3 fleet manager teams. */
export const MAX_FMS_PER_PILOT = 3;

@Injectable()
export class TeamService {
  private readonly logger = new Logger(TeamService.name);

  constructor(
    private readonly firebaseAdmin: FirebaseAdminService,
    private readonly usersService: UsersService,
    private readonly cacheService: CacheService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  private get db() {
    return this.firebaseAdmin.firestore();
  }

  private isFmRole(role?: string): boolean {
    return !!role && FM_ROLES.includes(role);
  }

  /** All FM uids a pilot belongs to (array field + legacy scalar). */
  private fmUidsOf(pilotData: any): string[] {
    const set = new Set<string>();
    if (Array.isArray(pilotData?.fleetManagerUids)) {
      for (const u of pilotData.fleetManagerUids) if (u) set.add(String(u));
    }
    if (pilotData?.managedByFleetManagerUid) set.add(String(pilotData.managedByFleetManagerUid));
    return [...set];
  }

  private assertJoinable(fmUids: string[]): void {
    if (fmUids.length >= MAX_FMS_PER_PILOT) {
      throw new ConflictException(`This pilot already has ${MAX_FMS_PER_PILOT} fleet managers (maximum).`);
    }
  }

  /**
   * Phone variants so "7856922401", "+91 78569 22401" and "+917856922401"
   * all resolve to the same user. Users are stored with varying formats.
   */
  private phoneCandidates(raw: string): string[] {
    const trimmed = String(raw || '').trim().replace(/[\s\-()]/g, '');
    if (!trimmed) return [];
    const digits = trimmed.replace(/\D/g, '');
    const last10 = digits.length > 10 ? digits.slice(-10) : digits;
    const out = new Set<string>([trimmed]);
    if (digits && digits !== trimmed) out.add(digits);
    if (last10.length === 10) {
      out.add(last10);
      out.add(`+91${last10}`);
      out.add(`91${last10}`);
    }
    if (digits) out.add(`+${digits}`);
    return [...out];
  }

  /** Flexible user lookup by phone across format variants (users + pilots docs). */
  private async findUserByPhoneFlexible(phone: string): Promise<any | null> {
    for (const candidate of this.phoneCandidates(phone)) {
      const hit = await this.usersService.findByPhone(candidate).catch(() => null);
      if (hit) return hit;
    }
    // Fallback: pilots collection stores mobile/phone in its own formats.
    for (const candidate of this.phoneCandidates(phone)) {
      for (const field of ['mobile', 'phone']) {
        const snap = await this.db
          .collection(ROOT_COLLECTIONS.pilots)
          .where(field, '==', candidate)
          .limit(1)
          .get()
          .catch(() => null);
        if (snap && !snap.empty) {
          const pilotUid = (snap.docs[0].data() as any)?.uid || snap.docs[0].id;
          const user = await this.usersService.findByUid(pilotUid).catch(() => null);
          if (user) return user;
          return { uid: pilotUid, role: 'pilot', ...(snap.docs[0].data() as any) };
        }
      }
    }
    return null;
  }

  /**
   * Pilots with fewer than MAX teams — shown on FM home "Available Pilots".
   * Geo: keeps pilots within `radiusKm` (default 150km) of the FM when both
   * locations are known; entries with unknown location are kept but sorted last.
   */
  async listUnassignedPilots(
    user: CurrentUser,
    search?: string,
    limit = 30,
    geo?: GeoFilterOptions,
  ): Promise<UnassignedPilotSummary[]> {
    if (!this.isFmRole(user.role)) {
      throw new ForbiddenException('Only fleet managers can view unassigned pilots.');
    }
    // Newest first with a wide window so recently approved pilots are never
    // cut off by Firestore's arbitrary default ordering.
    const snap = await this.db
      .collection(ROOT_COLLECTIONS.pilots)
      .orderBy('createdAt', 'desc')
      .limit(300)
      .get();
    let pilots = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
    // Joinable = fewer than MAX teams (a pilot with 1-2 FMs is still listed).
    pilots = pilots.filter((p: any) => this.fmUidsOf(p).length < MAX_FMS_PER_PILOT);

    if (search) {
      const term = search.toLowerCase();
      const digits = search.replace(/\D/g, '');
      pilots = pilots.filter(
        (p: any) =>
          p.fullName?.toLowerCase().includes(term) ||
          p.name?.toLowerCase().includes(term) ||
          (digits && (p.phone?.includes(digits) || p.mobile?.includes(digits))) ||
          p.email?.toLowerCase().includes(term),
      );
    }

    // Viewer (FM) location: explicit GPS wins, else stored profile.
    const fmLoc = this.coerceLocation(geo?.lat, geo?.lng) ?? await this.storedUserLocation(user.uid);
    const radiusKm = geo?.radiusKm ? Math.max(1, geo.radiusKm) : DEFAULT_GEO_RADIUS_KM;

    type Row = { p: any; distanceKm: number | null };
    let rows: Row[] = pilots.map((p: any) => {
      const pilotLoc = this.extractLocation(p);
      const distanceKm = fmLoc && pilotLoc ? this.haversineKm(fmLoc.lat, fmLoc.lng, pilotLoc.lat, pilotLoc.lng) : null;
      return { p, distanceKm };
    });
    if (radiusKm > 0 && fmLoc) {
      rows = rows.filter(({ distanceKm }) => distanceKm === null || distanceKm <= radiusKm);
    }
    rows.sort((a, b) => {
      if (a.distanceKm !== null && b.distanceKm !== null) return a.distanceKm - b.distanceKm;
      if (a.distanceKm !== null) return -1;
      if (b.distanceKm !== null) return 1;
      return String(b.p.createdAt || '').localeCompare(String(a.p.createdAt || ''));
    });

    return rows.slice(0, Math.min(Math.max(limit, 1), 50)).map(({ p, distanceKm }: Row) => ({
      uid: p.uid || p.id,
      name: p.fullName || p.name || null,
      phone: p.mobile || p.phone || null,
      email: p.email || null,
      serviceTypes: Array.isArray(p.serviceTypes) ? p.serviceTypes : [],
      experienceYears: typeof p.experienceYears === 'number' ? p.experienceYears : null,
      experienceMonths: typeof p.experienceMonths === 'number' ? p.experienceMonths : null,
      experienceText: p.experienceText || p.experience || null,
      distanceKm: distanceKm !== null ? Math.round(distanceKm * 10) / 10 : null,
      address: p.address || null,
      rating: typeof p.rating === 'number' ? p.rating : 0,
      totalMissions: typeof p.totalMissions === 'number' ? p.totalMissions : 0,
      fleetCount: this.fmUidsOf(p).length,
    }));
  }

  /** Primary FM for the current pilot (null when unassigned). */
  async getMyFleetManager(user: CurrentUser): Promise<any | null> {
    const managers = await this.getMyManagers(user);
    return managers[0] || null;
  }

  /** All FMs the pilot belongs to (0..3). Drives conditional UI + counts. */
  async getMyManagers(user: CurrentUser): Promise<any[]> {
    if (user.role !== 'pilot') {
      throw new ForbiddenException('Only pilots have fleet managers.');
    }
    const pilotDoc = await this.db.collection(ROOT_COLLECTIONS.pilots).doc(user.uid).get();
    if (!pilotDoc.exists) return [];
    const uids = this.fmUidsOf(pilotDoc.data());
    const out: any[] = [];
    for (const fmUid of uids) {
      const fmUser = await this.usersService.findByUid(fmUid).catch(() => null);
      out.push({
        uid: fmUid,
        name: fmUser?.name || 'Fleet Manager',
        phone: fmUser?.phone || null,
        email: fmUser?.email || null,
      });
    }
    return out;
  }

  /**
   * Pilot: 5 nearest fleet managers with short stats.
   * Only FMs within `radiusKm` (default 150km) of the pilot are suggested;
   * entries with unknown location are kept but sorted last. Excludes FMs the
   * pilot already joined or has a pending invite/request with.
   */
  async listSuggestedManagers(user: CurrentUser, limit = 5, geo?: GeoFilterOptions): Promise<any[]> {
    if (user.role !== 'pilot') {
      throw new ForbiddenException('Only pilots can view fleet manager suggestions.');
    }
    const cap = Math.min(Math.max(limit || 5, 1), 5);
    const radiusKm = geo?.radiusKm ? Math.max(1, geo.radiusKm) : DEFAULT_GEO_RADIUS_KM;

    const pilotUser = await this.usersService.findByUid(user.uid).catch(() => null);
    const pilotDoc = await this.db.collection(ROOT_COLLECTIONS.pilots).doc(user.uid).get().catch(() => null);
    const pilotProfile: any = (pilotUser as any)?.profileData || (pilotDoc?.exists ? (pilotDoc.data() as any) : {});
    const pilotLoc = this.coerceLocation(geo?.lat, geo?.lng) ?? this.extractLocation(pilotProfile);
    const joinedUids = new Set(
      pilotDoc?.exists ? this.fmUidsOf(pilotDoc.data()) : [],
    );

    const pendingSnap = await this.db
      .collection(TEAM_INVITES_COLLECTION)
      .where('pilotUid', '==', user.uid)
      .where('status', '==', 'pending')
      .get()
      .catch(() => null);
    const pendingFmUids = new Set(
      (pendingSnap?.docs || []).map((d) => (d.data() as any)?.fmUid).filter(Boolean),
    );

    const fmSnap = await this.db
      .collection(ROOT_COLLECTIONS.users)
      .where('role', '==', 'fleet_manager')
      .limit(50)
      .get();
    type Candidate = { uid: string; name: string; phone: string | null; photoUrl: string | null; address: string | null; location: any; distanceKm: number | null; createdAt: string };
    const candidates: Candidate[] = [];
    for (const doc of fmSnap.docs) {
      const data: any = doc.data();
      const uid = data?.uid || doc.id;
      if (joinedUids.has(uid) || pendingFmUids.has(uid)) continue;
      const profileData: any = data?.profileData || {};
      const location = this.extractLocation(profileData);
      candidates.push({
        uid,
        name: data?.name || 'Fleet Manager',
        phone: data?.phone || null,
        photoUrl: data?.photoUrl || profileData?.photoUrl || profileData?.profilePic || null,
        address: profileData?.address || profileData?.region || null,
        location,
        distanceKm: pilotLoc && location ? this.haversineKm(pilotLoc.lat, pilotLoc.lng, location.lat, location.lng) : null,
        createdAt: data?.createdAt || '',
      });
    }

    candidates.sort((a, b) => {
      if (a.distanceKm !== null && b.distanceKm !== null) return a.distanceKm - b.distanceKm;
      if (a.distanceKm !== null) return -1;
      if (b.distanceKm !== null) return 1;
      return String(b.createdAt).localeCompare(String(a.createdAt));
    });

    const inRadius = pilotLoc
      ? candidates.filter((c) => c.distanceKm === null || c.distanceKm <= radiusKm)
      : candidates;

    const out: any[] = [];
    for (const fm of inRadius.slice(0, cap)) {
      const [dronesCount, completedMissions, rejectedMissions] = await Promise.all([
        this.countFmDrones(fm.uid),
        this.countFmBookings(fm.uid, ['completed']),
        this.countFmBookings(fm.uid, ['cancelled', 'rejected']),
      ]);
      out.push({
        uid: fm.uid,
        name: fm.name,
        phone: fm.phone,
        photoUrl: fm.photoUrl,
        address: fm.address,
        distanceKm: fm.distanceKm !== null ? Math.round(fm.distanceKm * 10) / 10 : null,
        dronesCount,
        totalDrones: dronesCount,
        completedMissions,
        rejectedMissions,
      });
    }
    return out;
  }

  /** Explicit lat/lng query params → location, or null when absent/invalid. */
  private coerceLocation(lat: unknown, lng: unknown): { lat: number; lng: number } | null {
    const la = Number(lat);
    const ln = Number(lng);
    if (lat == null || lng == null || isNaN(la) || isNaN(ln)) return null;
    if (la < -90 || la > 90 || ln < -180 || ln > 180) return null;
    if (la === 0 && ln === 0) return null;
    return { lat: la, lng: ln };
  }

  /** Stored GPS/profile location of any user (FM or pilot). */
  private async storedUserLocation(uid: string): Promise<{ lat: number; lng: number } | null> {
    try {
      const user = await this.usersService.findByUid(uid).catch(() => null);
      const loc = this.extractLocation((user as any)?.profileData);
      if (loc) return loc;
    } catch { /* fall through to pilots doc */ }
    try {
      const pilotDoc = await this.db.collection(ROOT_COLLECTIONS.pilots).doc(uid).get();
      if (pilotDoc.exists) return this.extractLocation(pilotDoc.data());
    } catch { /* no stored location */ }
    return null;
  }

  private extractLocation(profileData: any): { lat: number; lng: number } | null {    const pts = [
      profileData?.currentLocation,
      profileData?.location,
      profileData?.serviceArea?.center,
      profileData?.serviceArea,
    ];
    for (const p of pts) {
      if (!p) continue;
      const lat = Number(p.lat ?? p.latitude);
      const lng = Number(p.lng ?? p.lon ?? p.long ?? p.longitude);
      if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) return { lat, lng };
    }
    return null;
  }

  private haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private async countFmDrones(fmUid: string): Promise<number> {
    try {
      const byFleet = await this.db
        .collectionGroup(USER_SUBCOLLECTIONS.drones)
        .where('fleetManagerUid', '==', fmUid)
        .count()
        .get();
      const n1 = byFleet.data().count || 0;
      if (n1 > 0) return n1;
    } catch { /* fall through to legacy field */ }
    try {
      const byVendor = await this.db
        .collectionGroup(USER_SUBCOLLECTIONS.drones)
        .where('assignedFleetManagerUid', '==', fmUid)
        .count()
        .get();
      return byVendor.data().count || 0;
    } catch {
      return 0;
    }
  }

  private async countFmBookings(fmUid: string, statuses: string[]): Promise<number> {
    let total = 0;
    for (const status of statuses) {
      try {
        const snap = await this.db
          .collectionGroup(USER_SUBCOLLECTIONS.bookings)
          .where('fleetManagerUid', '==', fmUid)
          .where('status', '==', status)
          .count()
          .get();
        total += snap.data().count || 0;
      } catch { /* ignore missing index combos */ }
    }
    if (total > 0) return total;
    // Fallback: vendorUid field used by older booking writes.
    for (const status of statuses) {
      try {
        const snap = await this.db
          .collectionGroup(USER_SUBCOLLECTIONS.bookings)
          .where('vendorUid', '==', fmUid)
          .where('status', '==', status)
          .count()
          .get();
        total += snap.data().count || 0;
      } catch { /* ignore */ }
    }
    return total;
  }

  /** FM invites a pilot (by uid or phone). */
  async invitePilot(dto: CreateInviteDto, fm: CurrentUser): Promise<TeamInvite> {
    if (!this.isFmRole(fm.role)) {
      throw new ForbiddenException('Only fleet managers can invite pilots.');
    }
    if (!dto.pilotUid && !dto.phone) {
      throw new BadRequestException('Provide pilotUid or phone.');
    }

    const pilot = dto.pilotUid
      ? await this.usersService.findByUid(dto.pilotUid)
      : await this.findUserByPhoneFlexible(String(dto.phone));
    if (!pilot || (pilot.role !== 'pilot' && !((pilot.roles ?? []) as string[]).includes('pilot'))) {
      throw new NotFoundException('Pilot not found.');
    }
    const pilotUid = (pilot as any).uid || dto.pilotUid!;
    if (pilotUid === fm.uid) {
      throw new BadRequestException('You cannot invite yourself.');
    }

    const pilotDoc = await this.db.collection(ROOT_COLLECTIONS.pilots).doc(pilotUid).get();
    if (pilotDoc.exists) {
      const uids = this.fmUidsOf(pilotDoc.data());
      if (uids.includes(fm.uid)) {
        throw new ConflictException('This pilot is already on your team.');
      }
      this.assertJoinable(uids);
    }

    await this.assertNoPending(pilotUid, fm.uid);

    const now = new Date().toISOString();
    const id = this.db.collection(TEAM_INVITES_COLLECTION).doc().id;
    const fmUser = await this.usersService.findByUid(fm.uid).catch(() => null);
    const invite: TeamInvite = {
      id,
      kind: 'fm_invite',
      pilotUid,
      pilotName: (pilot as any).name || null,
      pilotPhone: (pilot as any).phone || null,
      fmUid: fm.uid,
      fmName: fmUser?.name || null,
      fmPhone: fmUser?.phone || null,
      status: 'pending',
      createdBy: fm.uid,
      createdAt: now,
      updatedAt: now,
      decidedAt: null,
      decidedBy: null,
    };
    await this.db.collection(TEAM_INVITES_COLLECTION).doc(id).set(invite);

    this.eventEmitter.emit(WS_EVENTS.TEAM_INVITE_CREATED, {
      inviteId: id,
      pilotUid,
      fmUid: fm.uid,
      fmName: invite.fmName,
      timestamp: now,
    });

    this.logger.log(`FM ${fm.uid} invited pilot ${pilotUid} (invite ${id})`);
    return invite;
  }

  /** Pilot requests to join an FM (by FM phone or uid). */
  async requestToJoin(dto: CreateJoinRequestDto, pilot: CurrentUser): Promise<TeamInvite> {
    if (pilot.role !== 'pilot') {
      throw new ForbiddenException('Only pilots can request to join a team.');
    }
    if (!dto.phone && !dto.fmUid) {
      throw new BadRequestException('Provide the fleet manager phone number.');
    }

    const fm = dto.fmUid
      ? await this.usersService.findByUid(dto.fmUid)
      : await this.findUserByPhoneFlexible(String(dto.phone));
    if (!fm || (fm.role !== 'fleet_manager' && fm.role !== 'vendor' && !(fm.roles ?? []).some((r: string) => FM_ROLES.includes(r)))) {
      throw new NotFoundException('Fleet manager not found for that phone number.');
    }
    const fmUid = (fm as any).uid || dto.fmUid!;
    if (fmUid === pilot.uid) {
      throw new BadRequestException('You cannot join yourself.');
    }

    const pilotDoc = await this.db.collection(ROOT_COLLECTIONS.pilots).doc(pilot.uid).get();
    if (pilotDoc.exists) {
      const uids = this.fmUidsOf(pilotDoc.data());
      if (uids.includes(fmUid)) {
        throw new ConflictException('You are already on this fleet manager team.');
      }
      this.assertJoinable(uids);
    }

    await this.assertNoPending(pilot.uid, fmUid);

    const now = new Date().toISOString();
    const id = this.db.collection(TEAM_INVITES_COLLECTION).doc().id;
    const pilotUser = await this.usersService.findByUid(pilot.uid).catch(() => null);
    const invite: TeamInvite = {
      id,
      kind: 'pilot_request',
      pilotUid: pilot.uid,
      pilotName: pilotUser?.name || null,
      pilotPhone: pilotUser?.phone || null,
      fmUid,
      fmName: (fm as any).name || null,
      fmPhone: (fm as any).phone || null,
      status: 'pending',
      createdBy: pilot.uid,
      createdAt: now,
      updatedAt: now,
      decidedAt: null,
      decidedBy: null,
    };
    await this.db.collection(TEAM_INVITES_COLLECTION).doc(id).set(invite);

    this.eventEmitter.emit(WS_EVENTS.TEAM_REQUEST_CREATED, {
      inviteId: id,
      pilotUid: pilot.uid,
      pilotName: invite.pilotName,
      fmUid,
      timestamp: now,
    });

    this.logger.log(`Pilot ${pilot.uid} requested to join FM ${fmUid} (request ${id})`);
    return invite;
  }

  /** Pending items where the caller is the target (pilot sees invites, FM sees requests). */
  async incoming(user: CurrentUser): Promise<TeamInvite[]> {
    const col = this.db.collection(TEAM_INVITES_COLLECTION);
    if (user.role === 'pilot') {
      const snap = await col.where('pilotUid', '==', user.uid).where('status', '==', 'pending').get();
      return snap.docs
        .map((d) => d.data() as TeamInvite)
        .filter((i) => i.kind === 'fm_invite')
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    }
    if (this.isFmRole(user.role)) {
      const snap = await col.where('fmUid', '==', user.uid).where('status', '==', 'pending').get();
      return snap.docs
        .map((d) => d.data() as TeamInvite)
        .filter((i) => i.kind === 'pilot_request')
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    }
    throw new ForbiddenException('Only pilots and fleet managers use team invites.');
  }

  /** Pending items the caller created. */
  async outgoing(user: CurrentUser): Promise<TeamInvite[]> {
    const snap = await this.db
      .collection(TEAM_INVITES_COLLECTION)
      .where('createdBy', '==', user.uid)
      .where('status', '==', 'pending')
      .get();
    return snap.docs
      .map((d) => d.data() as TeamInvite)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }

  async accept(id: string, user: CurrentUser): Promise<TeamInvite> {
    return this.decide(id, user, true);
  }

  async reject(id: string, user: CurrentUser): Promise<TeamInvite> {
    return this.decide(id, user, false);
  }

  /** Creator withdraws a still-pending invite/request. */
  async cancel(id: string, user: CurrentUser): Promise<TeamInvite> {
    const ref = this.db.collection(TEAM_INVITES_COLLECTION).doc(id);
    const snap = await ref.get();
    if (!snap.exists) throw new NotFoundException('Invite not found.');
    const invite = snap.data() as TeamInvite;
    if (invite.status !== 'pending') {
      throw new BadRequestException(`Invite has already been ${invite.status}.`);
    }
    if (invite.createdBy !== user.uid) {
      throw new ForbiddenException('Only the sender can withdraw this.');
    }
    const now = new Date().toISOString();
    await ref.update({ status: 'cancelled', decidedAt: now, decidedBy: user.uid, updatedAt: now });
    this.eventEmitter.emit(WS_EVENTS.TEAM_UPDATED, {
      inviteId: id,
      pilotUid: invite.pilotUid,
      fmUid: invite.fmUid,
      status: 'cancelled',
      timestamp: now,
    });
    return { ...invite, status: 'cancelled', decidedAt: now, decidedBy: user.uid, updatedAt: now };
  }

  private async decide(id: string, user: CurrentUser, approved: boolean): Promise<TeamInvite> {
    const ref = this.db.collection(TEAM_INVITES_COLLECTION).doc(id);
    const snap = await ref.get();
    if (!snap.exists) throw new NotFoundException('Invite not found.');
    const invite = snap.data() as TeamInvite;
    if (invite.status !== 'pending') {
      throw new BadRequestException(`Invite has already been ${invite.status}.`);
    }

    // Only the target decides: pilot accepts FM invites, FM accepts pilot requests.
    const isTarget =
      (invite.kind === 'fm_invite' && invite.pilotUid === user.uid) ||
      (invite.kind === 'pilot_request' && invite.fmUid === user.uid);
    if (!isTarget) {
      throw new ForbiddenException('Only the recipient can decide on this invite.');
    }

    const now = new Date().toISOString();

    if (!approved) {
      await ref.update({ status: 'rejected', decidedAt: now, decidedBy: user.uid, updatedAt: now });
      const updated = { ...invite, status: 'rejected' as const, decidedAt: now, decidedBy: user.uid, updatedAt: now };
      this.eventEmitter.emit(WS_EVENTS.TEAM_UPDATED, {
        inviteId: id,
        pilotUid: invite.pilotUid,
        fmUid: invite.fmUid,
        status: 'rejected',
        timestamp: now,
      });
      return updated;
    }

    // Accept: append FM to the pilot's teams (max 3). Primary scalar kept
    // for backward compatibility with single-FM queries.
    const pilotRef = this.db.collection(ROOT_COLLECTIONS.pilots).doc(invite.pilotUid);
    const userRef = this.db.collection(ROOT_COLLECTIONS.users).doc(invite.pilotUid);
    let becameFull = false;
    await this.db.runTransaction(async (tx) => {
      const pilotSnap = await tx.get(pilotRef);
      const pilotData = (pilotSnap.exists ? pilotSnap.data() : {}) as any;
      const current = this.fmUidsOf(pilotData);
      if (current.includes(invite.fmUid)) {
        throw new ConflictException('Pilot is already on this team.');
      }
      if (current.length >= MAX_FMS_PER_PILOT) {
        throw new ConflictException(`This pilot already has ${MAX_FMS_PER_PILOT} fleet managers (maximum).`);
      }
      const next = [...current, invite.fmUid];
      becameFull = next.length >= MAX_FMS_PER_PILOT;
      const userSnap = await tx.get(userRef);
      const userData = (userSnap.exists ? userSnap.data() : {}) as any;
      const userFms: string[] = Array.isArray(userData?.profileData?.fleetManagerUids)
        ? [...userData.profileData.fleetManagerUids]
        : [];
      if (!userFms.includes(invite.fmUid)) userFms.push(invite.fmUid);

      tx.set(
        pilotRef,
        {
          fleetManagerUids: next,
          managedByFleetManagerUid: pilotData?.managedByFleetManagerUid || invite.fmUid,
          isAvailable: true,
          status: pilotData?.status || 'AVAILABLE',
          updatedAt: now,
        },
        { merge: true },
      );
      tx.set(
        userRef,
        {
          profileData: {
            ...(userData?.profileData ?? {}),
            fleetManagerUids: userFms,
            assignedFleetManagerUid: userData?.profileData?.assignedFleetManagerUid || invite.fmUid,
          },
          updatedAt: now,
        },
        { merge: true },
      );
      tx.update(ref, { status: 'accepted', decidedAt: now, decidedBy: user.uid, updatedAt: now });
    });

    // Once the pilot hits 3 teams, retire remaining pendings so they vanish
    // from every other FM carousel instantly.
    if (becameFull) {
      const competing = await this.db
        .collection(TEAM_INVITES_COLLECTION)
        .where('pilotUid', '==', invite.pilotUid)
        .where('status', '==', 'pending')
        .get();
      const batch = this.db.batch();
      competing.docs.forEach((d) => {
        if (d.id !== id) batch.update(d.ref, { status: 'superseded', updatedAt: now });
      });
      await batch.commit().catch(() => null);
    }

    await this.cacheService.delete(`user:${invite.pilotUid}`);

    const updated: TeamInvite = { ...invite, status: 'accepted', decidedAt: now, decidedBy: user.uid, updatedAt: now };
    this.eventEmitter.emit(WS_EVENTS.TEAM_UPDATED, {
      inviteId: id,
      pilotUid: invite.pilotUid,
      fmUid: invite.fmUid,
      status: 'accepted',
      timestamp: now,
    });
    this.logger.log(`Team formed: pilot ${invite.pilotUid} joined FM ${invite.fmUid}`);
    return updated;
  }

  private async assertNoPending(pilotUid: string, fmUid: string): Promise<void> {
    const snap = await this.db
      .collection(TEAM_INVITES_COLLECTION)
      .where('pilotUid', '==', pilotUid)
      .where('fmUid', '==', fmUid)
      .where('status', '==', 'pending')
      .limit(1)
      .get();
    if (!snap.empty) {
      throw new ConflictException('A pending invite/request already exists between this pilot and fleet manager.');
    }
  }
}

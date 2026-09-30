import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { CacheService } from '../../common/cache/cache.service';
import { FirebaseAdminService } from '../../firebase/firebase-admin.service';
import { MapsService } from '../maps/maps.service';
import {
  DEFAULT_NO_FLY_ZONES,
  NoFlyZone,
} from './constants/no-fly-zones.constant';
import {
  AirspaceCheckResult,
  AirspaceZoneHit,
  ConditionStatus,
  LatLng,
} from './interfaces/flight-conditions.interface';

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 min
const CUSTOM_ZONES_COLLECTION = 'airspace_zones';
const SAMPLE_INTERVAL_KM = 2; // sample the delivery route roughly every 2 km
const MAX_ROUTE_SAMPLES = 25; // cap work on very long routes

/**
 * Flying-restriction (airspace) pre-flight check.
 *
 * Resolution order:
 *   1. If AIRSPACE_API_URL is configured, delegate to that provider.
 *   2. Otherwise evaluate against a geofence dataset = seed no-fly zones
 *      (DEFAULT_NO_FLY_ZONES) merged with any custom zones stored in the
 *      Firestore `airspace_zones` collection.
 *
 * A location inside a zone's restricted core is RED; inside the caution ring is
 * YELLOW; clear of all zones is GREEN.
 */
@Injectable()
export class AirspaceService {
  private readonly logger = new Logger(AirspaceService.name);
  private readonly externalApiUrl: string | undefined;

  constructor(
    private readonly configService: ConfigService,
    private readonly cacheService: CacheService,
    private readonly mapsService: MapsService,
    private readonly firebaseAdminService: FirebaseAdminService,
  ) {
    this.externalApiUrl = this.configService.get<string>('AIRSPACE_API_URL');
  }

  /**
   * Route-based check for delivery bookings. Samples points from source to
   * destination and returns the WORST airspace verdict along the way — a route is
   * only as clear as its most-restricted point.
   *
   * Reuses checkRestrictions() per sampled point, so per-point results are cached
   * and shared across overlapping routes.
   */
  async checkRoute(
    source: LatLng,
    destination: LatLng,
  ): Promise<AirspaceCheckResult> {
    const distanceKm = this.mapsService.calculateHaversineDistance(
      source.lat,
      source.lng,
      destination.lat,
      destination.lng,
    );

    // Degenerate route (same point) → single-point check.
    if (distanceKm < 0.5) {
      const single = await this.checkRestrictions(source);
      return { ...single, destination, sampledPoints: 1 };
    }

    const sampleCount = Math.min(
      MAX_ROUTE_SAMPLES,
      Math.max(2, Math.ceil(distanceKm / SAMPLE_INTERVAL_KM)),
    );

    const points: LatLng[] = [];
    for (let i = 0; i < sampleCount; i++) {
      points.push(this.interpolate(source, destination, i / (sampleCount - 1)));
    }

    const results = await Promise.all(
      points.map((p) => this.checkRestrictions(p)),
    );

    return this.mergeRouteResults(source, destination, results, sampleCount);
  }

  async checkRestrictions(location: LatLng): Promise<AirspaceCheckResult> {
    const cacheKey = this.cacheKey(location);
    const cached = await this.cacheService.get<AirspaceCheckResult>(cacheKey);
    if (cached) {
      return cached;
    }

    let result: AirspaceCheckResult;
    try {
      result = this.externalApiUrl
        ? await this.checkViaProvider(location)
        : await this.checkViaGeofence(location);
    } catch (error) {
      this.logger.error(
        `Airspace lookup failed for (${location.lat}, ${location.lng}):`,
        error,
      );
      result = this.unavailableResult(location);
    }

    await this.cacheService.set(cacheKey, result, CACHE_TTL_MS);
    return result;
  }

  /** Evaluate against seed + custom geofenced zones (default path, no API key). */
  private async checkViaGeofence(location: LatLng): Promise<AirspaceCheckResult> {
    const zones = [...DEFAULT_NO_FLY_ZONES, ...(await this.loadCustomZones())];

    const hits: AirspaceZoneHit[] = [];
    let nearest: AirspaceZoneHit | null = null;

    for (const zone of zones) {
      const distanceKm = this.mapsService.calculateHaversineDistance(
        location.lat,
        location.lng,
        zone.lat,
        zone.lng,
      );

      const candidate: AirspaceZoneHit = {
        id: zone.id,
        name: zone.name,
        type: zone.type,
        zone: this.zoneSeverity(distanceKm, zone),
        distanceKm: Math.round(distanceKm * 100) / 100,
        restrictedRadiusKm: zone.restrictedRadiusKm,
      };

      if (!nearest || candidate.distanceKm < nearest.distanceKm) {
        nearest = candidate;
      }
      if (candidate.zone !== ConditionStatus.GREEN) {
        hits.push(candidate);
      }
    }

    // Worst hit first (RED before YELLOW), then by proximity.
    hits.sort((a, b) => {
      if (a.zone !== b.zone) return a.zone === ConditionStatus.RED ? -1 : 1;
      return a.distanceKm - b.distanceKm;
    });

    const status = hits.some((h) => h.zone === ConditionStatus.RED)
      ? ConditionStatus.RED
      : hits.length > 0
        ? ConditionStatus.YELLOW
        : ConditionStatus.GREEN;

    return {
      status,
      summary: this.summaryFor(status, hits[0] ?? null),
      reasons: hits.map(
        (h) => (h.zone === ConditionStatus.RED ? 'Inside no-fly zone' : 'Near restricted zone'),
      ),
      nearestZone: nearest,
      zones: hits,
      checkedAt: new Date().toISOString(),
      provider: 'geofence',
      location,
    };
  }

  /** Delegate to an external airspace provider (DGCA Digital Sky, etc.). */
  private async checkViaProvider(location: LatLng): Promise<AirspaceCheckResult> {
    const params = new URLSearchParams({
      lat: location.lat.toString(),
      lng: location.lng.toString(),
    });
    const response = await fetch(`${this.externalApiUrl}?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`Airspace provider responded ${response.status}`);
    }
    const data: any = await response.json();

    // Expected provider contract: { status: 'GREEN'|'YELLOW'|'RED', zones?: [...] }
    const status = this.normalizeStatus(data?.status);
    const zones: AirspaceZoneHit[] = Array.isArray(data?.zones)
      ? data.zones
      : [];

    return {
      status,
      summary: this.summaryFor(status, zones[0] ?? null),
      reasons: Array.isArray(data?.reasons) ? data.reasons : [],
      nearestZone: zones[0] ?? null,
      zones,
      checkedAt: new Date().toISOString(),
      provider: 'external',
      location,
    };
  }

  /** Linear interpolation between two coordinates (adequate for delivery ranges). */
  private interpolate(a: LatLng, b: LatLng, t: number): LatLng {
    return {
      lat: a.lat + (b.lat - a.lat) * t,
      lng: a.lng + (b.lng - a.lng) * t,
    };
  }

  /** Combine per-point results into a single worst-case route verdict. */
  private mergeRouteResults(
    source: LatLng,
    destination: LatLng,
    results: AirspaceCheckResult[],
    sampledPoints: number,
  ): AirspaceCheckResult {
    // Dedupe hits by zone id, keeping the worst severity and closest distance.
    const hitsById = new Map<string, AirspaceZoneHit>();
    for (const r of results) {
      for (const hit of r.zones) {
        const existing = hitsById.get(hit.id);
        if (
          !existing ||
          (hit.zone === ConditionStatus.RED &&
            existing.zone !== ConditionStatus.RED) ||
          hit.distanceKm < existing.distanceKm
        ) {
          hitsById.set(hit.id, hit);
        }
      }
    }

    const zones = [...hitsById.values()].sort((a, b) => {
      if (a.zone !== b.zone) return a.zone === ConditionStatus.RED ? -1 : 1;
      return a.distanceKm - b.distanceKm;
    });

    const status = zones.some((z) => z.zone === ConditionStatus.RED)
      ? ConditionStatus.RED
      : zones.length > 0
        ? ConditionStatus.YELLOW
        : ConditionStatus.GREEN;

    // Closest zone across every sampled point (whether or not it triggered a hit).
    const nearestZone = results
      .map((r) => r.nearestZone)
      .filter((z): z is AirspaceZoneHit => z !== null)
      .sort((a, b) => a.distanceKm - b.distanceKm)[0] ?? null;

    const provider = results[0]?.provider ?? 'geofence';

    return {
      status,
      summary: this.routeSummaryFor(status, zones[0] ?? null),
      reasons: zones.map(
        (h) => (h.zone === ConditionStatus.RED ? 'Inside no-fly zone' : 'Near restricted zone'),
      ),
      nearestZone,
      zones,
      checkedAt: new Date().toISOString(),
      provider,
      location: source,
      destination,
      sampledPoints,
    };
  }

  private routeSummaryFor(
    status: ConditionStatus,
    worst: AirspaceZoneHit | null,
  ): string {
    switch (status) {
      case ConditionStatus.GREEN:
        return 'Clear route — no flying restrictions along the delivery path.';
      case ConditionStatus.YELLOW:
        return worst
          ? `Partial restriction near ${worst.name} — proceed with caution.`
          : 'Partial restriction — proceed with caution.';
      case ConditionStatus.RED:
        return 'This is a no-fly zone. Specific permissions are required for this booking.';
    }
  }

  private zoneSeverity(distanceKm: number, zone: NoFlyZone): ConditionStatus {
    if (distanceKm <= zone.restrictedRadiusKm) return ConditionStatus.RED;
    if (distanceKm <= zone.restrictedRadiusKm + zone.bufferKm)
      return ConditionStatus.YELLOW;
    return ConditionStatus.GREEN;
  }

  /** Load operator-defined zones from Firestore; tolerate absence/errors. */
  private async loadCustomZones(): Promise<NoFlyZone[]> {
    try {
      const snapshot = await this.firebaseAdminService
        .firestore()
        .collection(CUSTOM_ZONES_COLLECTION)
        .get();

      return snapshot.docs
        .map((doc) => doc.data())
        .filter(
          (d: any) =>
            typeof d?.lat === 'number' &&
            typeof d?.lng === 'number' &&
            typeof d?.restrictedRadiusKm === 'number',
        )
        .map((d: any, i: number) => ({
          id: d.id ?? `custom-${i}`,
          name: d.name ?? 'Custom restricted zone',
          type: d.type ?? 'restricted',
          lat: d.lat,
          lng: d.lng,
          restrictedRadiusKm: d.restrictedRadiusKm,
          bufferKm: typeof d.bufferKm === 'number' ? d.bufferKm : 2,
        }));
    } catch (error) {
      this.logger.warn('Could not load custom airspace zones; using seed only.');
      return [];
    }
  }

  private normalizeStatus(value: unknown): ConditionStatus {
    const v = String(value).toUpperCase();
    if (v === 'RED') return ConditionStatus.RED;
    if (v === 'YELLOW') return ConditionStatus.YELLOW;
    return ConditionStatus.GREEN;
  }

  private summaryFor(
    status: ConditionStatus,
    worst: AirspaceZoneHit | null,
  ): string {
    switch (status) {
      case ConditionStatus.GREEN:
        return 'Clear airspace — no flying restrictions at this location.';
      case ConditionStatus.YELLOW:
        return worst
          ? `Partial restriction near ${worst.name} — proceed with caution.`
          : 'Partial restriction — proceed with caution.';
      case ConditionStatus.RED:
        return worst
          ? `This is a no-fly zone. Specific permissions are required for this booking.`
          : 'This is a no-fly zone. Specific permissions are required for this booking.';
    }
  }

  private unavailableResult(location: LatLng): AirspaceCheckResult {
    // Fail SAFE-CLOSED for airspace: if we cannot verify, warn rather than clear.
    return {
      status: ConditionStatus.YELLOW,
      summary: 'Airspace data unavailable — verify restrictions before flight.',
      reasons: ['Airspace source could not be evaluated'],
      nearestZone: null,
      zones: [],
      checkedAt: new Date().toISOString(),
      provider: 'unavailable',
      location,
    };
  }

  private cacheKey(location: LatLng): string {
    return `airspace:v5:${location.lat.toFixed(4)}:${location.lng.toFixed(4)}`;
  }
}

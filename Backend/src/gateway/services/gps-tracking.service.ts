import { Injectable, Logger } from '@nestjs/common';
import { Firestore, WriteBatch, FieldValue } from '@google-cloud/firestore';
import type { GeoPointValue } from '../../database/firestore/contracts';
import { FirebaseAdminService } from '../../firebase/firebase-admin.service';

export interface GPSCoordinate {
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
  timestamp: string;
  altitude?: number;
}

interface GPSTrackingPoint extends GPSCoordinate {
  bookingId: string;
  pilotId: string;
  distanceFromPrevious?: number;
}

interface BatchWriteBuffer {
  bookingId: string;
  pilotId: string;
  points: GPSTrackingPoint[];
  lastFlush: number;
}

/**
 * GPS Tracking Service (Firestore-Only)
 * 
 * Architecture:
 * - pilots/{pilotId}/location -> Current position (real-time)
 * - bookings/{bookingId}/gpsTrail/{timestamp} -> Historical trail (subcollection)
 * 
 * Optimizations:
 * - Distance-based debouncing (skip < 5m movements)
 * - Batch writes every 30s to reduce Firestore writes
 * - Maximum 500 writes per batch (Firestore limit)
 */
@Injectable()
export class GPSTrackingService {
  private readonly logger = new Logger(GPSTrackingService.name);
  private readonly firestore: Firestore;
  
  // In-memory buffer for batch writes
  private readonly batchBuffer = new Map<string, BatchWriteBuffer>();
  private readonly BATCH_FLUSH_INTERVAL = 30000; // 30 seconds
  private readonly MIN_DISTANCE_THRESHOLD = 5; // 5 meters
  private readonly MAX_BATCH_SIZE = 500; // Firestore batch limit
  private flushInterval: NodeJS.Timeout | null = null;

  // Last known positions for distance calculation
  private readonly lastPositions = new Map<string, GPSCoordinate>();

  constructor(
    private readonly firebaseAdminService: FirebaseAdminService,
  ) {
    this.firestore = this.firebaseAdminService.firestore();
    this.startBatchFlushTimer();
  }

  /**
   * Calculate distance between two GPS coordinates using Haversine formula
   * Returns distance in meters
   */
  private calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number {
    const R = 6371000; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lng2 - lng1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }

  /**
   * Calculate ETA based on current position, destination, and speed
   * Returns ETA in minutes
   */
  calculateETA(
    currentLat: number,
    currentLng: number,
    destLat: number,
    destLng: number,
    currentSpeed: number, // in m/s
  ): number | null {
    const distance = this.calculateDistance(currentLat, currentLng, destLat, destLng);
    
    if (!currentSpeed || currentSpeed < 0.5) {
      // If speed is too low or unknown, use average drone speed (15 m/s ≈ 54 km/h)
      const avgDroneSpeed = 15;
      return Math.ceil(distance / avgDroneSpeed / 60); // Convert to minutes
    }

    return Math.ceil(distance / currentSpeed / 60); // Convert to minutes
  }

  /**
   * Check if the position has moved significantly (> 5m)
   */
  private shouldUpdatePosition(
    bookingId: string,
    newLat: number,
    newLng: number,
  ): boolean {
    const lastPos = this.lastPositions.get(bookingId);
    
    if (!lastPos) {
      return true; // First position, always update
    }

    const distance = this.calculateDistance(
      lastPos.lat,
      lastPos.lng,
      newLat,
      newLng,
    );

    return distance >= this.MIN_DISTANCE_THRESHOLD;
  }

  /**
   * Update pilot's current location in Firestore (real-time)
   * Stored at: pilots/{pilotId}/location
   */
  async updateCurrentLocation(
    pilotId: string,
    gpsData: GPSCoordinate,
  ): Promise<void> {
    try {
      const location: GeoPointValue = {
        lat: gpsData.lat,
        lng: gpsData.lng,
      };

      // Update current location in pilot's document
      await this.firestore.collection('users').doc(pilotId).update({
        'profileData.currentLocation': location,
        'profileData.lastLocationUpdate': gpsData.timestamp,
        'profileData.heading': gpsData.heading ?? null,
        'profileData.speed': gpsData.speed ?? null,
        'profileData.altitude': gpsData.altitude ?? null,
        updatedAt: gpsData.timestamp,
      });

      // Also update dedicated location document for faster real-time queries
      await this.firestore
        .collection('users')
        .doc(pilotId)
        .collection('location')
        .doc('current')
        .set({
          location,
          heading: gpsData.heading ?? null,
          speed: gpsData.speed ?? null,
          altitude: gpsData.altitude ?? null,
          timestamp: gpsData.timestamp,
          updatedAt: gpsData.timestamp,
        }, { merge: true });

      this.logger.debug(`Updated Firestore location for pilot ${pilotId}`);
    } catch (error) {
      this.logger.error(
        `Failed to update Firestore location for pilot ${pilotId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Add GPS point to batch buffer for later persistence
   * Will be written to: bookings/{bookingId}/gpsTrail/{timestamp}
   */
  addGPSPointToBatch(
    bookingId: string,
    pilotId: string,
    gpsData: GPSCoordinate,
  ): void {
    // Check if position has moved significantly
    if (!this.shouldUpdatePosition(bookingId, gpsData.lat, gpsData.lng)) {
      this.logger.debug(
        `Skipping GPS update for booking ${bookingId} - movement < ${this.MIN_DISTANCE_THRESHOLD}m`,
      );
      return;
    }

    // Calculate distance from previous position
    let distanceFromPrevious: number | undefined;
    const lastPos = this.lastPositions.get(bookingId);
    if (lastPos) {
      distanceFromPrevious = this.calculateDistance(
        lastPos.lat,
        lastPos.lng,
        gpsData.lat,
        gpsData.lng,
      );
    }

    // Update last known position
    this.lastPositions.set(bookingId, gpsData);

    // Add to batch buffer
    let buffer = this.batchBuffer.get(bookingId);
    if (!buffer) {
      buffer = {
        bookingId,
        pilotId,
        points: [],
        lastFlush: Date.now(),
      };
      this.batchBuffer.set(bookingId, buffer);
    }

    buffer.points.push({
      ...gpsData,
      bookingId,
      pilotId,
      distanceFromPrevious,
    });

    this.logger.debug(
      `Added GPS point to batch buffer for booking ${bookingId} (${buffer.points.length} pending)`,
    );

    // Auto-flush if buffer exceeds Firestore batch limit
    if (buffer.points.length >= this.MAX_BATCH_SIZE) {
      this.logger.warn(
        `Buffer for booking ${bookingId} reached max size (${this.MAX_BATCH_SIZE}), forcing flush`,
      );
      this.flushBookingBuffer(bookingId).catch((error) => {
        this.logger.error(`Auto-flush failed for booking ${bookingId}:`, error);
      });
    }
  }

  /**
   * Flush batch buffer to Firestore (bookings/{bookingId}/gpsTrail subcollection)
   */
  private async flushBatchBuffer(): Promise<void> {
    const now = Date.now();
    const buffersToFlush: string[] = [];

    // Find buffers that need flushing
    for (const [bookingId, buffer] of this.batchBuffer.entries()) {
      if (
        buffer.points.length > 0 &&
        now - buffer.lastFlush >= this.BATCH_FLUSH_INTERVAL
      ) {
        buffersToFlush.push(bookingId);
      }
    }

    if (buffersToFlush.length === 0) {
      return;
    }

    this.logger.log(`Flushing GPS data for ${buffersToFlush.length} bookings`);

    // Flush each buffer
    for (const bookingId of buffersToFlush) {
      await this.flushBookingBuffer(bookingId);
    }
  }

  /**
   * Flush a specific booking's GPS buffer to Firestore
   */
  private async flushBookingBuffer(bookingId: string): Promise<void> {
    const buffer = this.batchBuffer.get(bookingId);
    if (!buffer || buffer.points.length === 0) return;

    try {
      // Split into chunks if exceeds Firestore batch limit
      const chunks: GPSTrackingPoint[][] = [];
      for (let i = 0; i < buffer.points.length; i += this.MAX_BATCH_SIZE) {
        chunks.push(buffer.points.slice(i, i + this.MAX_BATCH_SIZE));
      }

      for (const chunk of chunks) {
        const batch: WriteBatch = this.firestore.batch();

        // Write each GPS point to gpsTrail subcollection
        for (const point of chunk) {
          const trailRef = this.firestore
            .collection('bookings')
            .doc(bookingId)
            .collection('gpsTrail')
            .doc(point.timestamp.replace(/[:.]/g, '-')); // Firestore-safe ID

          batch.set(trailRef, {
            location: {
              lat: point.lat,
              lng: point.lng,
            },
            heading: point.heading ?? null,
            speed: point.speed ?? null,
            altitude: point.altitude ?? null,
            timestamp: point.timestamp,
            pilotId: point.pilotId,
            distanceFromPrevious: point.distanceFromPrevious ?? null,
            createdAt: point.timestamp,
          });
        }

        // Update booking's tracking metadata
        const bookingRef = this.firestore.collection('bookings').doc(bookingId);
        batch.update(bookingRef, {
          'tracking.lastGPSUpdate': chunk[chunk.length - 1].timestamp,
          'tracking.totalGPSPoints': FieldValue.increment(chunk.length),
          updatedAt: new Date().toISOString(),
        });

        await batch.commit();

        this.logger.log(
          `Flushed ${chunk.length} GPS points for booking ${bookingId}`,
        );
      }

      // Clear buffer after successful flush
      buffer.points = [];
      buffer.lastFlush = Date.now();
    } catch (error) {
      this.logger.error(
        `Failed to flush GPS data for booking ${bookingId}:`,
        error,
      );
      // Keep data in buffer for retry on next flush cycle
    }
  }

  /**
   * Start batch flush timer
   */
  private startBatchFlushTimer(): void {
    this.flushInterval = setInterval(() => {
      this.flushBatchBuffer().catch((error) => {
        this.logger.error('Batch flush failed:', error);
      });
    }, this.BATCH_FLUSH_INTERVAL);

    this.logger.log(
      `GPS batch flush timer started (interval: ${this.BATCH_FLUSH_INTERVAL}ms)`,
    );
  }

  /**
   * Force flush for a specific booking (e.g., on mission completion)
   */
  async forceFlush(bookingId: string): Promise<void> {
    const buffer = this.batchBuffer.get(bookingId);
    if (!buffer || buffer.points.length === 0) {
      return;
    }

    this.logger.log(`Force flushing ${buffer.points.length} GPS points for booking ${bookingId}`);

    await this.flushBookingBuffer(bookingId);

    // Clear buffer and last position
    this.batchBuffer.delete(bookingId);
    this.lastPositions.delete(bookingId);

    this.logger.log(`Force flush completed for booking ${bookingId}`);
  }

  /**
   * Get GPS trail from Firestore
   * Returns ordered array of GPS coordinates
   */
  async getGPSTrail(
    bookingId: string,
    options?: {
      limit?: number;
      startTime?: string;
      endTime?: string;
    },
  ): Promise<GPSCoordinate[]> {
    try {
      let query = this.firestore
        .collection('bookings')
        .doc(bookingId)
        .collection('gpsTrail')
        .orderBy('timestamp', 'asc');

      if (options?.startTime) {
        query = query.where('timestamp', '>=', options.startTime);
      }

      if (options?.endTime) {
        query = query.where('timestamp', '<=', options.endTime);
      }

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const snapshot = await query.get();

      return snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          lat: data.location.lat,
          lng: data.location.lng,
          heading: data.heading,
          speed: data.speed,
          altitude: data.altitude,
          timestamp: data.timestamp,
        };
      });
    } catch (error) {
      this.logger.error(`Failed to get GPS trail for booking ${bookingId}:`, error);
      return [];
    }
  }

  /**
   * Get GPS trail statistics
   */
  async getGPSTrailStats(bookingId: string): Promise<{
    totalPoints: number;
    totalDistance: number;
    startTime: string | null;
    endTime: string | null;
    avgSpeed: number | null;
  }> {
    try {
      const trail = await this.getGPSTrail(bookingId);

      if (trail.length === 0) {
        return {
          totalPoints: 0,
          totalDistance: 0,
          startTime: null,
          endTime: null,
          avgSpeed: null,
        };
      }

      // Calculate total distance
      let totalDistance = 0;
      for (let i = 1; i < trail.length; i++) {
        totalDistance += this.calculateDistance(
          trail[i - 1].lat,
          trail[i - 1].lng,
          trail[i].lat,
          trail[i].lng,
        );
      }

      // Calculate average speed (excluding null/zero speeds)
      const speeds = trail.filter((p) => p.speed && p.speed > 0).map((p) => p.speed!);
      const avgSpeed = speeds.length > 0
        ? speeds.reduce((sum, speed) => sum + speed, 0) / speeds.length
        : null;

      return {
        totalPoints: trail.length,
        totalDistance: Math.round(totalDistance), // in meters
        startTime: trail[0].timestamp,
        endTime: trail[trail.length - 1].timestamp,
        avgSpeed: avgSpeed ? Math.round(avgSpeed * 100) / 100 : null, // rounded to 2 decimals
      };
    } catch (error) {
      this.logger.error(`Failed to get GPS stats for booking ${bookingId}:`, error);
      throw error;
    }
  }

  /**
   * Cleanup on service shutdown
   */
  onModuleDestroy(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    
    // Force flush all remaining buffers
    this.logger.log('Flushing all GPS buffers before shutdown...');
    this.flushBatchBuffer().catch((error) => {
      this.logger.error('Final flush failed:', error);
    });
  }
}

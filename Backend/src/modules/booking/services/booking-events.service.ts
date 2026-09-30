import { Injectable, Logger } from '@nestjs/common';
import { FirebaseAdminService } from '../../../firebase/firebase-admin.service';

export type BookingEventType = 
  | 'booking_created'
  | 'status_change'
  | 'pilot_assigned'
  | 'payment_update'
  | 'rating_added'
  | 'time_slot_updated'
  | 'cancellation';

export interface BookingEventMetadata {
  area?: { value: number; unit: string };
  scheduledDate?: string;
  serviceType?: string;
  status?: string;
  previousStatus?: string;
  pilotUid?: string;
  droneId?: string;
  rating?: number;
  feedback?: string;
  preferredTimeSlot?: string;
  finalPrice?: number;
  paymentStatus?: string;
  cancellationReason?: string;
  [key: string]: any;
}

export interface BookingEvent {
  eventId: string;
  bookingId: string;
  eventType: BookingEventType;
  description: string;
  performedBy: string;
  performedByRole: string;
  status: string;
  metadata: BookingEventMetadata;
  timestamp: string;
  createdAt: string;
}

/**
 * Service for logging booking lifecycle events to Firestore
 * Events are stored in: bookings/{bookingId}/events/{eventId}
 */
@Injectable()
export class BookingEventsService {
  private readonly logger = new Logger(BookingEventsService.name);

  constructor(private readonly firebaseAdminService: FirebaseAdminService) {}

  /**
   * Generate sequential event ID
   */
  private async generateEventId(): Promise<string> {
    // Query across all booking events using collectionGroup
    const snapshot = await this.firebaseAdminService
      .firestore()
      .collectionGroup('events')
      .orderBy('eventId', 'desc')
      .limit(1)
      .get();

    let nextSequence = 1;
    
    if (!snapshot.empty) {
      const lastEventId = snapshot.docs[0].data().eventId;
      if (lastEventId) {
        const match = lastEventId.match(/EVT(\d{8})$/);
        if (match) {
          nextSequence = parseInt(match[1], 10) + 1;
        }
      }
    }
    
    return `EVT${String(nextSequence).padStart(8, '0')}`;
  }

  /**
   * Log a booking event
   */
  async logEvent(
    bookingId: string,
    eventType: BookingEventType,
    description: string,
    performedBy: string,
    performedByRole: string,
    status: string,
    metadata: BookingEventMetadata = {},
  ): Promise<BookingEvent> {
    try {
      const eventId = await this.generateEventId();
      const now = new Date().toISOString();

      const event: BookingEvent = {
        eventId,
        bookingId,
        eventType,
        description,
        performedBy,
        performedByRole,
        status,
        metadata,
        timestamp: now,
        createdAt: now,
      };

      // Store in subcollection: bookings/{bookingId}/events/{eventId}
      await this.firebaseAdminService
        .firestore()
        .collection('bookings')
        .doc(bookingId)
        .collection('events')
        .doc(eventId)
        .set(event);

      this.logger.log(`Event logged: ${eventType} for booking ${bookingId}`);

      return event;
    } catch (error) {
      this.logger.error(
        `Failed to log event for booking ${bookingId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * Log booking created event
   */
  async logBookingCreated(
    bookingId: string,
    performedBy: string,
    performedByRole: string,
    metadata: BookingEventMetadata,
  ): Promise<BookingEvent> {
    return this.logEvent(
      bookingId,
      'booking_created',
      'Booking created by customer',
      performedBy,
      performedByRole,
      'pending',
      metadata,
    );
  }

  /**
   * Log status change event
   */
  async logStatusChange(
    bookingId: string,
    newStatus: string,
    previousStatus: string,
    performedBy: string,
    performedByRole: string,
    metadata: BookingEventMetadata = {},
  ): Promise<BookingEvent> {
    return this.logEvent(
      bookingId,
      'status_change',
      `Status changed from ${previousStatus} to ${newStatus}`,
      performedBy,
      performedByRole,
      newStatus,
      { ...metadata, status: newStatus, previousStatus },
    );
  }

  /**
   * Log pilot assigned event
   */
  async logPilotAssigned(
    bookingId: string,
    pilotUid: string,
    droneId: string,
    performedBy: string,
    performedByRole: string,
    metadata: BookingEventMetadata = {},
  ): Promise<BookingEvent> {
    return this.logEvent(
      bookingId,
      'pilot_assigned',
      'Pilot and drone assigned to booking',
      performedBy,
      performedByRole,
      'confirmed',
      { ...metadata, pilotUid, droneId },
    );
  }

  /**
   * Log payment update event
   */
  async logPaymentUpdate(
    bookingId: string,
    paymentStatus: string,
    finalPrice: number,
    performedBy: string,
    performedByRole: string,
    metadata: BookingEventMetadata = {},
  ): Promise<BookingEvent> {
    return this.logEvent(
      bookingId,
      'payment_update',
      `Payment ${paymentStatus}`,
      performedBy,
      performedByRole,
      paymentStatus,
      { ...metadata, finalPrice, paymentStatus },
    );
  }

  /**
   * Log rating added event
   */
  async logRatingAdded(
    bookingId: string,
    rating: number,
    feedback: string | undefined,
    performedBy: string,
    metadata: BookingEventMetadata = {},
  ): Promise<BookingEvent> {
    return this.logEvent(
      bookingId,
      'rating_added',
      `Customer rated booking: ${rating} stars`,
      performedBy,
      'customer',
      'completed',
      { ...metadata, rating, feedback },
    );
  }

  /**
   * Log time slot updated event
   */
  async logTimeSlotUpdated(
    bookingId: string,
    timeSlot: string,
    performedBy: string,
    performedByRole: string,
    metadata: BookingEventMetadata = {},
  ): Promise<BookingEvent> {
    return this.logEvent(
      bookingId,
      'time_slot_updated',
      `Preferred time slot set to ${timeSlot}`,
      performedBy,
      performedByRole,
      'pending',
      { ...metadata, preferredTimeSlot: timeSlot },
    );
  }

  /**
   * Log cancellation event
   */
  async logCancellation(
    bookingId: string,
    reason: string,
    performedBy: string,
    performedByRole: string,
    metadata: BookingEventMetadata = {},
  ): Promise<BookingEvent> {
    return this.logEvent(
      bookingId,
      'cancellation',
      `Booking cancelled: ${reason}`,
      performedBy,
      performedByRole,
      'cancelled',
      { ...metadata, cancellationReason: reason },
    );
  }

  /**
   * Get all events for a booking
   */
  async getBookingEvents(bookingId: string): Promise<BookingEvent[]> {
    const snapshot = await this.firebaseAdminService
      .firestore()
      .collection('bookings')
      .doc(bookingId)
      .collection('events')
      .orderBy('timestamp', 'asc')
      .get();

    return snapshot.docs.map(doc => doc.data() as BookingEvent);
  }
}

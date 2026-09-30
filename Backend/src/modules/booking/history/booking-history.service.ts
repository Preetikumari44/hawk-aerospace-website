import { Injectable } from '@nestjs/common';
import type { CollectionReference, Query } from 'firebase-admin/firestore';
import { forEachFirestoreQueryBatch } from '../../../common/utils/firestore-cursor-pagination.util';

import { ROOT_COLLECTIONS } from '../../../common/constants/collection-paths.constant';
import type { CurrentUser } from '../../../common/interfaces/current-user.interface';
import type {
  FirestoreBookingDocument,
  FirestoreBookingHistoryDocument,
} from '../../../database/firestore/contracts';
import { FirebaseAdminService } from '../../../firebase/firebase-admin.service';
import { BookingHistoryFilterDto } from './dto/booking-history-filter.dto';

@Injectable()
export class BookingHistoryService {
  constructor(private readonly firebaseAdminService: FirebaseAdminService) {}

  async recordHistory(
    booking: FirestoreBookingDocument,
    updatedBy: string,
    remarks?: string,
  ): Promise<FirestoreBookingHistoryDocument> {
    const docRef = this.collection().doc();
    const document: FirestoreBookingHistoryDocument = {
      id: docRef.id,
      bookingId: booking.id,
      customerUid: booking.customerUid,
      pilotUid: booking.assignedPilot ?? null,
      fleetManagerUid: booking.fleetManagerUid ?? null,
      aggregatorUid: booking.aggregatorUid ?? null,
      cropType: booking.cropType,
      serviceType: booking.serviceType,
      amount: booking.finalPrice ?? booking.priceEstimation ?? null,
      status: booking.status,
      updatedBy,
      remarks: remarks ?? null,
      timestamp: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await docRef.set(document);
    return document;
  }

  async listOwnHistory(user: CurrentUser, filter: BookingHistoryFilterDto) {
    return this.listHistory({ ...filter, customerUid: user.uid });
  }

  async listCustomerHistory(customerUid: string, filter: BookingHistoryFilterDto) {
    return this.listHistory({ ...filter, customerUid });
  }

  async listPilotHistory(pilotId: string, filter: BookingHistoryFilterDto) {
    return this.listHistory({ ...filter, pilotId });
  }

  async listVendorHistory(vendorId: string, filter: BookingHistoryFilterDto) {
    return this.listHistory({ ...filter, vendorId });
  }

  async listAggregatorHistory(aggregatorId: string, filter: BookingHistoryFilterDto) {
    return this.listHistory({ ...filter, aggregatorId });
  }

  async getTimeline(bookingId: string): Promise<FirestoreBookingHistoryDocument[]> {
    const snapshot = await this.collection().where('bookingId', '==', bookingId).get();

    return snapshot.docs
      .map((doc) => doc.data())
      .sort((left, right) => left.timestamp.localeCompare(right.timestamp));
  }

  async getStats() {
    let total = 0;
    let completed = 0;
    let cancelled = 0;
    let completedDurationTotal = 0;
    let completedDurationCount = 0;

    await forEachFirestoreQueryBatch(
      this.firebaseAdminService
        .firestore()
        .collection(ROOT_COLLECTIONS.bookings) as unknown as Query<FirestoreBookingDocument>,
      {
        batchSize: 500,
        orderBy: [{ field: 'id', direction: 'asc' }],
        getCursorValues: (booking) => [booking.id],
        onBatch: (bookings) => {
          total += bookings.length;
          completed += bookings.filter((booking) => booking.status === 'completed').length;
          cancelled += bookings.filter((booking) => booking.status === 'cancelled').length;
          bookings.forEach((booking) => {
            if (booking.status !== 'completed' || !booking.createdAt || !booking.updatedAt) {
              return;
            }

            const duration =
              new Date(booking.updatedAt).getTime() - new Date(booking.createdAt).getTime();
            if (duration >= 0) {
              completedDurationTotal += duration;
              completedDurationCount += 1;
            }
          });
        },
      },
    );

    return {
      total,
      completed,
      cancelled,
      averageCompletionHours:
        completedDurationCount === 0
          ? 0
          : Math.round((completedDurationTotal / completedDurationCount / 36_000) * 100) / 100,
    };
  }

  async exportCsv(filter: BookingHistoryFilterDto): Promise<string> {
    const { items } = await this.listHistory(filter);
    const rows = [
      ['booking_id', 'customer_uid', 'status', 'updated_by', 'timestamp', 'amount'].join(','),
      ...items.map((item) =>
        [
          item.bookingId,
          item.customerUid,
          item.status,
          item.updatedBy,
          item.timestamp,
          item.amount ?? '',
        ].join(','),
      ),
    ];

    return rows.join('\n');
  }

  private async listHistory(
    filter: BookingHistoryFilterDto & {
      customerUid?: string;
      pilotId?: string;
      vendorId?: string;
      aggregatorId?: string;
    },
  ) {
    let query: Query<FirestoreBookingHistoryDocument> = this.collection();

    if (filter.customerUid) {
      query = query.where('customerUid', '==', filter.customerUid);
    }

    if (filter.pilotId) {
      query = query.where('pilotId', '==', filter.pilotId);
    }

    if (filter.vendorId) {
      query = query.where('vendorId', '==', filter.vendorId);
    }

    if (filter.aggregatorId) {
      query = query.where('aggregatorId', '==', filter.aggregatorId);
    }

    if (filter.status) {
      query = query.where('status', '==', filter.status);
    }

    const snapshot = await query.get();
    let items = snapshot.docs.map((doc) => doc.data());

    if (filter.cropType) {
      items = items.filter((item) => item.cropType === filter.cropType);
    }

    if (filter.serviceType) {
      items = items.filter((item) => item.serviceType === filter.serviceType);
    }

    if (filter.dateFrom) {
      items = items.filter((item) => item.timestamp >= filter.dateFrom!);
    }

    if (filter.dateTo) {
      items = items.filter((item) => item.timestamp <= filter.dateTo!);
    }

    const sortBy = filter.sortBy ?? 'date';
    const sortOrder = filter.sortOrder ?? 'desc';
    items = items.sort((left, right) => {
      const direction = sortOrder === 'asc' ? 1 : -1;
      if (sortBy === 'amount') {
        return ((left.amount ?? 0) - (right.amount ?? 0)) * direction;
      }

      if (sortBy === 'status') {
        return left.status.localeCompare(right.status) * direction;
      }

      return left.timestamp.localeCompare(right.timestamp) * direction;
    });

    const total = items.length;
    const startIndex = (filter.page - 1) * filter.limit;

    return {
      items: items.slice(startIndex, startIndex + filter.limit),
      meta: {
        page: filter.page,
        limit: filter.limit,
        total,
      },
    };
  }

  private collection(): CollectionReference<FirestoreBookingHistoryDocument> {
    const collection: CollectionReference<FirestoreBookingHistoryDocument> =
      this.firebaseAdminService.firestore().collection(ROOT_COLLECTIONS.bookingHistory);

    return collection;
  }
}

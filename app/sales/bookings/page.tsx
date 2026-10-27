import type { Metadata } from 'next';

import BookingsView from '@/components/sales/BookingsView';

export const metadata: Metadata = { title: 'Bookings — Hawk Aerospace Sales Aggregator' };

export default function SalesBookingsPage() {
  return <BookingsView />;
}

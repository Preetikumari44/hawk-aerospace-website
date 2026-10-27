'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useAsync } from '@/components/sales/useAsync';
import { aggregatorApi } from '@/lib/booking/role-apis';
import { getBookings } from '@/lib/sales/services/bookings';
import { useNotice } from '@/components/sales/SalesProviders';
import AsyncView from '@/components/sales/ui/AsyncView';
import Button from '@/components/sales/ui/Button';
import FilterTabs from '@/components/sales/ui/FilterTabs';
import Panel from '@/components/sales/ui/Panel';
import ResponsiveTable, { type Column } from '@/components/sales/ui/ResponsiveTable';
import StatusBadge from '@/components/sales/ui/StatusBadge';
import type { Booking } from '@/lib/sales/types';

const TABS = ['All', 'Active', 'Upcoming', 'Completed', 'Cancelled'] as const;
type Tab = (typeof TABS)[number];

const COLUMNS: readonly Column<Booking>[] = [
  {
    key: 'id',
    header: 'Booking ID',
    cell: (b) => (
      <Link href={`/sales/bookings/${encodeURIComponent(b.id)}`} className="font-bold text-brand hover:underline">
        {b.id}
      </Link>
    ),
  },
  { key: 'customer', header: 'Customer', cell: (b) => b.customer },
  { key: 'service', header: 'Service', cell: (b) => b.service, muted: true },
  { key: 'date', header: 'Date', cell: (b) => b.date, muted: true },
  { key: 'amount', header: 'Amount', cell: (b) => b.amount },
  { key: 'status', header: 'Status', cell: (b) => <StatusBadge status={b.status} /> },
];

export default function BookingsView() {
  const bookings = useAsync(getBookings);
  const notify = useNotice();
  const [tab, setTab] = useState<Tab>('All');
  const [cancelling, setCancelling] = useState<string | null>(null);

  const filtered = useMemo(
    () => (bookings.status === 'success' ? (tab === 'All' ? bookings.data : bookings.data.filter((b) => b.status === tab)) : []),
    [bookings, tab],
  );

  async function cancelBooking(id: string) {
    setCancelling(id);
    try {
      await aggregatorApi.cancelBooking(id, 'Cancelled from web');
      notify({ title: 'Booking cancelled', message: `Booking ${id} has been cancelled.` });
      bookings.reload();
    } catch (err) {
      notify({ title: 'Cancel failed', message: err instanceof Error ? err.message : 'Could not cancel booking.' });
    } finally {
      setCancelling(null);
    }
  }

  const columns: readonly Column<Booking>[] = [
    ...COLUMNS,
    {
      key: 'actions',
      header: 'Actions',
      cell: (b) =>
        b.status === 'Cancelled' || b.status === 'Completed' ? (
          <span className="text-xs text-muted-foreground">—</span>
        ) : (
          <button
            type="button"
            disabled={cancelling === b.id}
            onClick={() => void cancelBooking(b.id)}
            className="text-xs font-bold text-destructive hover:underline"
          >
            {cancelling === b.id ? 'Cancelling…' : 'Cancel'}
          </button>
        ),
    },
  ];

  return (
    <>
      <h1 className="text-xl font-bold text-foreground">Bookings</h1>
      <Panel title="Book on behalf">
        <p className="text-sm text-foreground">
          Booking on behalf of a verified customer?{' '}
          <Link href="/sales/book" className="text-xs font-bold text-brand hover:underline">
            Start an on-behalf booking →
          </Link>
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Pick the customer in Customers first — the booking carries their customerUid and earns you commission.
        </p>
      </Panel>
      <FilterTabs label="Filter bookings by status" items={TABS} value={tab} onChange={setTab} />
      <AsyncView
        query={bookings}
        loadingLines={5}
        errorTitle="Couldn't load bookings."
      >
        {() =>
          filtered.length === 0 ? (
            <p className="mt-6 text-center text-sm text-muted-foreground">No bookings found.</p>
          ) : (
            <ResponsiveTable caption="Bookings" rows={filtered} columns={columns} getRowKey={(b) => b.id} />
          )
        }
      </AsyncView>
    </>
  );
}

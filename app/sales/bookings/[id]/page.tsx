'use client';

// Sales booking details — aggregator booking workspace: full fields,
// cancel, support chat, status timeline-ish badges.

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { aggregatorApi, chatApi } from '@/lib/booking/role-apis';
import { useNotice } from '@/components/sales/SalesProviders';
import { useAsync } from '@/components/sales/useAsync';
import AsyncView from '@/components/sales/ui/AsyncView';
import Button from '@/components/sales/ui/Button';
import Panel from '@/components/sales/ui/Panel';
import StatusBadge from '@/components/sales/ui/StatusBadge';
import { formatBookingDate, resolveBookingLocationLabel } from '@/lib/sales/services-root';

async function getDetails(id: string): Promise<Record<string, unknown>> {
  const raw = await aggregatorApi.getBooking(decodeURIComponent(id));
  const o = (raw ?? {}) as Record<string, unknown>;
  return (o.booking ?? o) as Record<string, unknown>;
}

const str = (v: unknown, fb = '—'): string => (typeof v === 'string' && v ? v : fb);

export default function SalesBookingDetails() {
  const params = useParams<{ id?: string | string[] }>();
  const id = Array.isArray(params?.id) ? params.id[0] : (params?.id ?? '');
  const router = useRouter();
  const notify = useNotice();
  const details = useAsync(() => getDetails(id));
  const [busy, setBusy] = useState<string | null>(null);

  async function cancel() {
    setBusy('cancel');
    try {
      await aggregatorApi.cancelBooking(decodeURIComponent(id), 'Cancelled from web');
      notify({ title: 'Booking cancelled', message: `Booking ${id} has been cancelled.` });
      router.push('/sales/bookings');
    } catch (err) {
      notify({ title: 'Cancel failed', message: err instanceof Error ? err.message : 'Could not cancel.' });
    } finally {
      setBusy(null);
    }
  }

  async function openChat(bookingId: string) {
    setBusy('chat');
    try {
      const conv = (await chatApi.createConversation({
        participantUid: 'admin',
        participantRole: 'admin',
        type: 'support',
        supportCategory: 'booking',
        bookingId,
      })) as Record<string, unknown>;
      const cid = String(conv.id ?? conv._id ?? conv.conversationId ?? '');
      router.push(cid ? `/chat/${cid}?refId=${encodeURIComponent(bookingId)}` : '/chat');
    } catch (err) {
      notify({ title: 'Chat failed', message: err instanceof Error ? err.message : 'Could not open chat.' });
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <Link href="/sales/bookings" className="text-small font-bold text-primary hover:underline">← Bookings</Link>
      <h1 className="mt-1 text-h1 font-bold text-ink">Booking {id}</h1>
      <AsyncView query={details} loadingLines={5} errorTitle="Couldn't load booking.">
        {(d) => {
          const status = String(d.status ?? '');
          const cancelled = /cancel|reject/i.test(status);
          return (
            <>
              <Panel title="Details">
                <div className="grid gap-2 sm:grid-cols-2">
                  <Row label="Customer" value={str(d.customerName ?? d.customer)} />
                  <Row label="Service" value={str(d.serviceType ?? d.service)} />
                  <Row label="Date" value={formatBookingDate(str(d.scheduledDate ?? d.date))} />
                  <Row label="Slot" value={str(d.preferredTimeSlot ?? d.timeSlot)} />
                  <Row label="Location" value={resolveBookingLocationLabel(d)} />
                  <Row label="Pilot" value={str(d.assignedPilot ?? d.pilotName)} />
                  <Row label="Amount" value={typeof d.totalAmount === 'number' ? `₹${(d.totalAmount as number).toLocaleString('en-IN')}` : str(d.amount)} />
                  <Row label="Status" value={<StatusBadge status={/cancel|reject/i.test(status) ? 'Cancelled' : /complet/i.test(status) ? 'Completed' : /upcoming|confirm|schedul/i.test(status) ? 'Upcoming' : 'Active'} />} />
                </div>
              </Panel>
              {!cancelled ? (
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" disabled={busy === 'cancel'} onClick={() => void cancel()}>
                    {busy === 'cancel' ? 'Cancelling…' : 'Cancel Booking'}
                  </Button>
                  <Button variant="outline" disabled={busy === 'chat'} onClick={() => void openChat(String(d.bookingNumber ?? d.id ?? id))}>
                    {busy === 'chat' ? 'Opening…' : 'Support Chat'}
                  </Button>
                </div>
              ) : null}
            </>
          );
        }}
      </AsyncView>
    </>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex justify-between gap-2 border-t py-2">
      <span className="text-small text-ink-muted">{label}</span>
      <span className="break-words text-right text-body text-ink">{value}</span>
    </div>
  );
}

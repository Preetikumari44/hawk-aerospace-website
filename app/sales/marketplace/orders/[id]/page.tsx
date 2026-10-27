'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { customerApi } from '@/lib/booking/api-client';
import { useAsync } from '@/components/sales/useAsync';
import { useNotice } from '@/components/sales/SalesProviders';
import AsyncView from '@/components/sales/ui/AsyncView';
import Button from '@/components/sales/ui/Button';
import Panel from '@/components/sales/ui/Panel';
import StatusBadge from '@/components/sales/ui/StatusBadge';

async function getOrder(id: string): Promise<Record<string, unknown>> {
  const raw = await customerApi.getOrder(decodeURIComponent(id));
  return ((raw as Record<string, unknown>).order ?? raw) as Record<string, unknown>;
}

export default function SalesOrderDetails() {
  const params = useParams<{ id?: string | string[] }>();
  const id = Array.isArray(params?.id) ? params.id[0] : (params?.id ?? '');
  const router = useRouter();
  const notify = useNotice();
  const order = useAsync(() => getOrder(id));

  return (
    <>
      <Link href="/sales/marketplace/orders" className="text-small font-bold text-primary hover:underline">← Orders</Link>
      <h1 className="mt-1 text-h1 font-bold text-ink">Order {id}</h1>
      <AsyncView query={order} loadingLines={5} errorTitle="Couldn't load order.">
        {(o) => {
          const status = String(o.status ?? 'pending');
          const pending = /pending|in_?progress/i.test(status);
          const items = (Array.isArray(o.items) ? (o.items as Record<string, unknown>[]) : []);
          return (
            <>
              <Panel title="Status">
                <StatusBadge status={/cancel|refund/i.test(status) ? 'Cancelled' : /deliver|complet/i.test(status) ? 'Completed' : /progress/i.test(status) ? 'Active' : 'Upcoming'} />
                <p className="mt-1 text-small text-ink-muted">
                  Payment: {String(o.paymentStatus ?? '—')} · {String(o.createdAt ?? '').slice(0, 10)}
                </p>
              </Panel>
              <Panel title="Items">
                {items.length === 0 ? (
                  <p className="text-small text-ink-muted">No line items.</p>
                ) : (
                  <ul>
                    {items.map((it, i) => (
                      <li key={i} className="flex justify-between gap-2 border-t py-2">
                        <span className="text-body text-ink">
                          {Number(it.quantity ?? 1)}× {String(it.productName ?? it.name ?? 'Item')}
                        </span>
                        <span className="text-body font-bold text-ink">
                          ₹{(Number(it.price ?? 0) * Number(it.quantity ?? 1)).toLocaleString('en-IN')}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="mt-2 text-h2 font-bold text-ink">
                  Total: {typeof o.total === 'number' ? `₹${(o.total as number).toLocaleString('en-IN')}` : '—'}
                </p>
              </Panel>
              {pending ? (
                <Button
                  onClick={() => {
                    notify({ title: 'Pay now', message: 'Opening checkout for this order.' });
                    router.push(`/sales/marketplace/checkout?mode=existing&order=${encodeURIComponent(String(o.orderId ?? o.id ?? id))}`);
                  }}
                >
                  Pay Now
                </Button>
              ) : null}
            </>
          );
        }}
      </AsyncView>
    </>
  );
}

'use client';

import Link from 'next/link';
import { customerApi } from '@/lib/booking/api-client';
import { useAsync } from '@/components/sales/useAsync';
import AsyncView from '@/components/sales/ui/AsyncView';
import Panel from '@/components/sales/ui/Panel';
import StatusBadge from '@/components/sales/ui/StatusBadge';

interface OrderRow {
  id: string;
  status: string;
  total: string;
  date: string;
  items: string;
}

function toList(v: unknown): Record<string, unknown>[] {
  if (Array.isArray(v)) return v as Record<string, unknown>[];
  const o = (v ?? {}) as Record<string, unknown>;
  for (const k of ['orders', 'items', 'data', 'results']) {
    if (Array.isArray(o[k])) return o[k] as Record<string, unknown>[];
  }
  return [];
}

async function getOrders(): Promise<OrderRow[]> {
  const raw = await customerApi.getOrders({ limit: 50 });
  return toList(raw).map((o, i) => {
    const items = Array.isArray(o.items) ? (o.items as Record<string, unknown>[]) : [];
    return {
      id: String(o.orderId ?? o.id ?? o._id ?? i),
      status: String(o.status ?? 'pending'),
      total:
        typeof o.total === 'number'
          ? `₹${(o.total as number).toLocaleString('en-IN')}`
          : typeof o.amount === 'number'
            ? `₹${(o.amount as number).toLocaleString('en-IN')}`
            : '—',
      date: String(o.createdAt ?? o.placedAt ?? '').slice(0, 10),
      items: items.map((it) => `${Number(it.quantity ?? 1)}× ${String(it.productName ?? it.name ?? 'Item')}`).join(', ') || 'Marketplace order',
    };
  });
}

function badge(status: string): 'Active' | 'Completed' | 'Cancelled' | 'Upcoming' | 'Pending' {
  const t = status.toLowerCase();
  if (/cancel|refund/.test(t)) return 'Cancelled';
  if (/deliver|complet/.test(t)) return 'Completed';
  if (/progress/.test(t)) return 'Active';
  return 'Upcoming';
}

export default function SalesOrders() {
  const orders = useAsync(getOrders);

  return (
    <>
      <Link href="/sales/marketplace" className="text-small font-bold text-primary hover:underline">← Marketplace</Link>
      <h1 className="mt-1 text-h1 font-bold text-ink">Orders</h1>
      <AsyncView query={orders} isEmpty={(o) => o.length === 0} emptyTitle="No orders yet." loadingLines={4} errorTitle="Couldn't load orders.">
        {(rows) => (
          <Panel title={`${rows.length} order${rows.length === 1 ? '' : 's'}`}>
            <ul>
              {rows.map((o) => (
                <li key={o.id} className="border-t py-2">
                  <Link href={`/sales/marketplace/orders/${encodeURIComponent(o.id)}`} className="flex items-center justify-between gap-2">
                    <span>
                      <span className="block text-body font-bold text-ink hover:underline">{o.id}</span>
                      <span className="block truncate text-small text-ink-muted">{o.items} · {o.date}</span>
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="text-body font-bold text-ink">{o.total}</span>
                      <StatusBadge status={badge(o.status)} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>
        )}
      </AsyncView>
    </>
  );
}

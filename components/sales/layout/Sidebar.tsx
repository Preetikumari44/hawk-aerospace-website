'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ROUTES, SIDEBAR_ITEMS } from '@/lib/sales/routes';
import { useAsync } from '@/components/sales/useAsync';
import { getSupport } from '@/lib/sales/services/support';
import { useCart, useNotice } from '@/components/sales/SalesProviders';
import { IconBookings, IconCommission, IconHome, IconStore } from '@/components/sales/ui/icons';

const ICONS = { home: IconHome, bookings: IconBookings, commission: IconCommission } as const;

interface SidebarContentProps {
  /** Called after a link is chosen (used to close the mobile drawer). */
  onNavigate?: () => void;
  /** Adds a Marketplace link (mobile drawer only; on desktop it lives in the header). */
  includeMarketplace?: boolean;
}

/**
 * Home / Bookings / Commission only, with Support pinned to the bottom via mt-auto.
 * Rendered inside the desktop sidebar and the mobile drawer.
 */
export function SidebarContent({ onNavigate, includeMarketplace = false }: SidebarContentProps) {
  const pathname = usePathname();
  const { count } = useCart();
  const notify = useNotice();
  const support = useAsync(getSupport);

  const openSupport = () => {
    if (support.status !== 'success') return;
    const s = support.data;
    notify({ title: s.title, message: `Call ${s.phone}\nor email ${s.email}` });
  };

  return (
    <div className="flex min-h-full flex-col px-3 py-4 text-white">
      <div className="mb-6 flex items-center gap-2">
        <span className="flex size-7 items-center justify-center rounded-md bg-white/15 text-body font-bold">H</span>
        <div>
          <p className="text-body font-bold leading-4">Hawk Aerospace</p>
          <p className="text-small text-white/60">Sales Aggregator</p>
        </div>
      </div>

      <nav aria-label="Sales Aggregator" className="flex flex-col gap-1">
        {SIDEBAR_ITEMS.map((item) => {
          const Icon = ICONS[item.icon];
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.key}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? 'page' : undefined}
              className={`flex min-h-11 items-center gap-2 rounded-sm px-2 text-body transition-colors lg:min-h-9 ${
                active ? 'bg-white/15 font-semibold text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon size={16} />
              {item.label}
            </Link>
          );
        })}
        {includeMarketplace && (
          <Link
            href={ROUTES.marketplace}
            onClick={onNavigate}
            aria-current={pathname.startsWith(ROUTES.marketplace) ? 'page' : undefined}
            className={`flex min-h-11 items-center gap-2 rounded-sm px-2 text-body transition-colors ${
              pathname.startsWith(ROUTES.marketplace) ? 'bg-white/15 font-semibold text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
            }`}
          >
            <IconStore size={16} />
            Marketplace
            {count > 0 && (
              <span className="ml-1 inline-flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
                {count}
              </span>
            )}
          </Link>
        )}
      </nav>

      <div className="mt-auto pt-6">
        <p className="mb-1 text-small text-white/60">Need help?</p>
        <div className="space-y-1 rounded-md bg-white/10 p-3">
          {support.status === 'success' ? (
            <>
              <p className="text-h3 font-semibold">{support.data.title}</p>
              <p className="text-small leading-4 text-white/75">{support.data.subtitle}</p>
              <button type="button" onClick={openSupport} className="mt-1 min-h-9 text-h3 font-semibold text-mint">
                {support.data.ctaLabel}
              </button>
            </>
          ) : support.status === 'error' ? (
            <button type="button" onClick={support.reload} className="min-h-9 text-small font-semibold text-mint">
              Support unavailable — retry
            </button>
          ) : (
            <div role="status" className="h-16 animate-pulse rounded-sm bg-white/10 motion-reduce:animate-none">
              <span className="sr-only">Loading support</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Desktop sidebar (lg and up). Below lg the MobileNavigation drawer is used instead. */
export default function Sidebar() {
  return (
    <aside className="hidden w-52 shrink-0 overflow-y-auto bg-primary-dark lg:block">
      <SidebarContent />
    </aside>
  );
}

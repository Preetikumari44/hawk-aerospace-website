'use client';

import { useAsync } from '@/components/sales/useAsync';
import { getSupport } from '@/lib/sales/services/support';
import { useNotice } from '@/components/sales/SalesProviders';
import AsyncView from '@/components/sales/ui/AsyncView';

/** The dashboard's existing 24x7 Expert Support section. */
export default function SupportCard() {
  const support = useAsync(getSupport);
  const notify = useNotice();

  return (
    <section className="rounded-3xl border border-primary bg-primary p-6 text-white shadow-2xl">
      <AsyncView query={support} loadingLines={2} errorTitle="Support details unavailable.">
        {(s) => (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-semibold">{s.title}</h2>
              <p className="mt-0.5 text-xs text-white/85">{s.subtitle}</p>
            </div>
            <button
              type="button"
              onClick={() => notify({ title: s.title, message: `Call ${s.phone}\nor email ${s.email}` })}
              className="min-h-11 shrink-0 self-start rounded-full bg-white px-4 text-sm font-semibold text-brand sm:min-h-9"
            >
              {s.ctaLabel}
            </button>
          </div>
        )}
      </AsyncView>
    </section>
  );
}

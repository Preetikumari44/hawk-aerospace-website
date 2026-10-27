'use client';

import { useNotice } from '@/components/sales/SalesProviders';
import type { Promotion } from '@/lib/sales/types';

export default function PromotionCard({ promotion }: { promotion: Promotion }) {
  const notify = useNotice();
  const { badge, title, subtitle, ctaLabel, tone } = promotion;

  return (
    <article
      className={`flex min-h-[92px] w-[190px] shrink-0 flex-col justify-between rounded-2xl border border-transparent p-2 text-primary-foreground shadow-xl ${
        tone === 'amber' ? 'bg-amber-600' : 'bg-primary'
      }`}
    >
      <span className="mb-1 w-fit rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold text-white">{badge}</span>
      <h3 className="text-[15px] font-extrabold text-white">{title}</h3>
      <p className="mb-1 mt-0.5 line-clamp-2 text-xs text-white/85">{subtitle}</p>
      <button
        type="button"
        onClick={() => notify({ title, message: `"${subtitle}" has been applied to your account.` })}
        className="min-h-9 w-fit text-left text-sm font-semibold text-white"
      >
        {ctaLabel}
      </button>
    </article>
  );
}

import type { ReactNode } from 'react';

interface PanelProps {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Sage bordered card with a title row. `min-w-0` lets inner scrollers shrink inside grids. */
export default function Panel({ title, action, children, className = '' }: PanelProps) {
  return (
    <section className={`min-w-0 rounded-3xl border border-border bg-card p-6 text-card-foreground shadow-2xl ${className}`}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

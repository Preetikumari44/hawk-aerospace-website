import type { ReactNode } from 'react';

type Tone = 'default' | 'info' | 'success' | 'warning';

const TINTS: Record<Tone, string> = {
  default: 'bg-muted text-brand',
  info: 'bg-sky-100 text-sky-900',
  success: 'bg-green-100 text-green-900',
  warning: 'bg-amber-100 text-amber-900',
};

interface StatCardProps {
  icon?: ReactNode;
  label: string;
  value: string | number;
  tone?: Tone;
}

export default function StatCard({ icon, label, value, tone = 'default' }: StatCardProps) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-2xl border border-border bg-card px-2 py-2 text-card-foreground">
      {icon ? (
        <span aria-hidden="true" className={`flex size-[30px] shrink-0 items-center justify-center rounded-xl ${TINTS[tone]}`}>
          {icon}
        </span>
      ) : null}
      <div className="min-w-0">
        <p className="truncate text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-lg font-bold text-foreground">{value}</p>
      </div>
    </div>
  );
}

const TONES: Record<string, string> = {
  Active: 'bg-muted text-brand',
  Upcoming: 'bg-sky-100 text-sky-900',
  Completed: 'bg-green-100 text-green-900',
  Cancelled: 'bg-destructive/10 text-destructive',
  Rejected: 'bg-destructive/10 text-destructive',
  Pending: 'bg-amber-100 text-amber-900',
};

export default function StatusBadge({ status }: { status: string }) {
  const tone = TONES[status] ?? 'bg-muted text-muted-foreground';
  return (
    <span className={`inline-flex w-fit items-center rounded-full px-2 py-0.5 text-xs font-bold ${tone}`}>{status}</span>
  );
}

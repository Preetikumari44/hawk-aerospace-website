export default function MiniBarChart({ data, label }: { data: readonly number[]; label: string }) {
  const max = Math.max(...data, 1);
  return (
    <div role="img" aria-label={`${label}: ${data.join(', ')}`} className="mt-1 flex h-[70px] items-end gap-1.5">
      {data.map((v, i) => (
        <div key={i} className="flex h-full min-w-0 flex-1 flex-col justify-end">
          <div className="min-h-1 w-full rounded-[3px] bg-primary" style={{ height: `${(v / max) * 100}%` }} />
        </div>
      ))}
    </div>
  );
}

import { REQUIRED_FIELDS } from "@/lib/distributor/application";

export function FormProgress({ completed }: { completed: number }) {
  const total = REQUIRED_FIELDS.length;
  const pct = Math.round((completed / total) * 100);
  return (
    <div className="rounded-xl bg-[#f1f5ec] px-4 py-3.5">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="font-semibold text-[#1b2a38]">Form completion</span>
        <span className="text-[#52606e]" aria-live="polite">
          {completed} of {total} required fields complete
        </span>
      </div>
      <div
        role="progressbar"
        aria-label="Required fields completed"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={completed}
        className="mt-2.5 h-2 overflow-hidden rounded-full bg-[#d9e3d2]"
      >
        <div
          className="h-full rounded-full bg-[#1d3f5c] transition-[width] duration-500 ease-out motion-reduce:transition-none"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-[#5a695f]">This shows how much of the form is filled in. Nothing is sent until you submit.</p>
    </div>
  );
}

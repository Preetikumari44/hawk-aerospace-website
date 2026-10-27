import { cn } from "@/lib/career/cn";

export interface ProgressState { answered: number; total: number; done: Record<GroupKey, boolean>; active: GroupKey }
export type GroupKey = "details" | "eligibility" | "documents";
const steps: Array<[GroupKey, string]> = [["details", "Your details"], ["eligibility", "Eligibility"], ["documents", "Documents"]];

export function ProgressCard({ progress }: { progress: ProgressState }) {
  const pct = (progress.answered / progress.total) * 100;
  return (
    <aside aria-label="Application progress" className="rounded-[24px] bg-[#17324a] p-[22px] text-white shadow-[0_24px_50px_-24px_rgba(7,25,15,.6)] sm:p-7 lg:sticky lg:top-24">
      <h2 className="text-[1.3rem] font-bold tracking-tight">Your progress</h2>
      <p aria-live="polite" className="mt-1 text-[.95rem] text-[#cddbe8]">{progress.answered} of {progress.total} answered</p>
      <div role="progressbar" aria-label="Questions answered" aria-valuemin={0} aria-valuemax={progress.total} aria-valuenow={progress.answered} className="mt-4 h-2 overflow-hidden rounded-full bg-white/[0.14]">
        <span className="block h-full rounded-full bg-[#a9cde9] transition-[width] duration-500 ease-[cubic-bezier(.22,.7,.2,1)]" style={{ width: `${pct}%` }} />
      </div>
      <ol className="mt-[18px] grid auto-cols-fr grid-flow-col gap-2 lg:mt-6 lg:grid-flow-row lg:gap-3.5">
        {steps.map(([key, label]) => {
          const done = progress.done[key];
          const active = !done && progress.active === key;
          return (
            <li key={key} className={cn("flex flex-col items-start gap-1.5 text-[.85rem] font-medium transition-colors lg:flex-row lg:items-center lg:gap-3 lg:text-base", done || active ? "text-white" : "text-[#9fb5a5]")}>
              <span aria-hidden className={cn("grid size-[22px] shrink-0 place-items-center rounded-full border-2 transition-colors", done ? "border-[#a9cde9] bg-[#a9cde9]" : active ? "border-[#a9cde9]" : "border-white/25")}>
                {done && <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="#17324a" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>}
              </span>
              {label}{done && <span className="sr-only"> (complete)</span>}
            </li>
          );
        })}
      </ol>
    </aside>
  );
}

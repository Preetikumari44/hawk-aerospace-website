import { cn } from "@/lib/career/cn";
import type { LedgerRow } from "@/lib/career/types";

/** Accessible two-column table styled as a ledger. `tone` adapts colours to the section background. */
export function LedgerTable({ rows, tone = "light", big = false, caption }: { rows: LedgerRow[]; tone?: "light" | "dark"; big?: boolean; caption?: string }) {
  const dark = tone === "dark";
  return (
    <table className="w-full border-collapse text-left">
      {caption && <caption className="sr-only">{caption}</caption>}
      <tbody>
        {rows.map((r) => (
          <tr key={r.label} className={cn(
            r.total ? (dark ? "border-t-2 border-[#a9cde9]" : "border-t-2 border-[#263442]") : (dark ? "border-b border-white/15" : "border-b border-[#d3dacb] last:border-b-0"),
            big && "block py-6",
          )}>
            <th scope="row" className={cn("align-baseline font-normal",
              big ? "block pb-1.5 text-base sm:text-lg" : "py-[22px] pr-4 text-[1.05rem] max-sm:pr-2.5 max-sm:text-[.95rem]",
              r.total && "font-bold", dark ? (r.total ? "text-white" : "text-[#cddbe8]") : (r.total ? "text-[#263442]" : "text-[#455666]"))}>{r.label}</th>
            <td className={cn("align-baseline font-semibold tracking-tight",
              big ? "block text-[clamp(1.9rem,4.4vw,3.4rem)] leading-[1.08] tracking-[-0.035em]" : "py-[22px] text-right text-[clamp(1.2rem,2.2vw,1.55rem)] whitespace-nowrap",
              r.total && !big && "text-[clamp(1.25rem,3vw,2.1rem)] font-bold",
              dark ? (r.total ? "text-white" : "text-[#a9cde9]") : "text-[#263442]")}>{r.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

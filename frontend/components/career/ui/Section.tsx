import type { ReactNode } from "react";

import { cn } from "@/lib/career/cn";

type Tone = "ground" | "sage" | "dark" | "deep";
const tones: Record<Tone, string> = {
  ground: "bg-[#ebeee3] text-[#17211b]", sage: "bg-[#e2e9dc] text-[#17211b]", dark: "bg-[#0b2418] text-white", deep: "bg-[#0e2a1d] text-white",
};

export function Section({ id, tone = "ground", labelledBy, children, className }: { id?: string; tone?: Tone; labelledBy?: string; children: ReactNode; className?: string }) {
  return (
    <section id={id} aria-labelledby={labelledBy} className={cn("py-[clamp(64px,9vw,120px)]", tones[tone], className)}>
      <div className="mx-auto w-[min(1180px,100%-36px)] sm:w-[min(1180px,100%-48px)]">{children}</div>
    </section>
  );
}

export const h2Class = "text-[clamp(2rem,4.6vw,3.4rem)] font-bold leading-[1.02] tracking-[-0.03em]";

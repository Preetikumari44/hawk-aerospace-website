import type { ReactNode } from "react";

import { cn } from "@/lib/career/cn";

type Tone = "ground" | "sage" | "dark" | "deep";
const tones: Record<Tone, string> = {
  ground: "bg-[#f8fafc] text-[#263442]", sage: "bg-[#eaf1f7] text-[#263442]", dark: "bg-[#17324a] text-white", deep: "bg-[#1b3a57] text-white",
};

export function Section({ id, tone = "ground", labelledBy, children, className }: { id?: string; tone?: Tone; labelledBy?: string; children: ReactNode; className?: string }) {
  return (
    <section id={id} aria-labelledby={labelledBy} className={cn("py-[clamp(64px,9vw,120px)]", tones[tone], className)}>
      <div className="mx-auto w-[min(1180px,100%-36px)] sm:w-[min(1180px,100%-48px)]">{children}</div>
    </section>
  );
}

export const h2Class = "text-[clamp(2rem,4.6vw,3.4rem)] font-bold leading-[1.02] tracking-[-0.03em]";

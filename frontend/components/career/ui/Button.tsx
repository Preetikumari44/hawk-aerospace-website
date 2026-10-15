import Link from "next/link";
import type { ReactNode } from "react";

import { ArrowRightIcon } from "@/components/career/ui/icons";
import { cn } from "@/lib/career/cn";

type Variant = "primary" | "ghost" | "dark";

const base =
  "group inline-flex min-h-[52px] items-center justify-center gap-2.5 rounded-[10px] border-[1.5px] px-7 text-base font-semibold transition-colors duration-200 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-[3px] focus-visible:outline-[#7fbf95] max-sm:w-full";
const variants: Record<Variant, string> = {
  primary: "border-transparent bg-[#a6d7b4] text-[#0b2418] hover:bg-[#bfe6ca]",
  ghost: "border-white/45 bg-white/[0.04] text-white hover:border-white hover:bg-white/15",
  dark: "border-transparent bg-[#0b2418] text-white hover:bg-[#14603f]",
};

export function ButtonLink({ href, variant = "primary", children, arrow = "right", className }: {
  href: string; variant?: Variant; children: ReactNode; arrow?: "right" | "down" | "none"; className?: string;
}) {
  return (
    <Link href={href} className={cn(base, variants[variant], className)}>
      {children}
      {arrow !== "none" && (
        <ArrowRightIcon className={cn("h-[18px] w-[18px] transition-transform duration-200", arrow === "down" ? "rotate-90 group-hover:translate-y-0.5" : "group-hover:translate-x-[3px]")} />
      )}
    </Link>
  );
}

export const buttonClasses = (variant: Variant = "primary", extra?: string) => cn(base, variants[variant], extra);

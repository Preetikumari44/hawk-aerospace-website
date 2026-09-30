import { cn } from "@/lib/utils";

import { Reveal } from "./reveal";

interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "center" | "left";
  className?: string;
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
  className,
}: SectionHeadingProps) {
  return (
    <Reveal
      className={cn(
        "flex max-w-[720px] flex-col gap-4",
        align === "center" ? "items-center text-center" : "items-start text-left",
        className,
      )}
    >
      {eyebrow && (
        <span className="text-brand text-xs font-semibold tracking-[0.2em] uppercase">
          {eyebrow}
        </span>
      )}
      <h2 className="text-3xl leading-tight font-semibold text-balance sm:text-5xl sm:leading-tight">
        {title}
      </h2>
      {description && (
        <p className="text-muted-foreground text-md max-w-[640px] font-medium text-balance sm:text-lg">
          {description}
        </p>
      )}
    </Reveal>
  );
}

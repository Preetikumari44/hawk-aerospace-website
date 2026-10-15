import { capabilityStrip } from "@/lib/data/hawk";

export default function CapabilityStrip() {
  return (
    <div className="border-border/60 border-y">
      <div className="max-w-container mx-auto flex flex-wrap items-center justify-center gap-x-3 gap-y-2 px-4 py-4 sm:gap-x-4 sm:py-5">
        {capabilityStrip.map((item, i) => (
          <div key={item} className="flex items-center gap-3 sm:gap-4">
            <span className="text-muted-foreground text-xs font-semibold tracking-[0.15em] uppercase sm:text-sm">
              {item}
            </span>
            {i < capabilityStrip.length - 1 && (
              <span className="text-brand/50" aria-hidden>
                •
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

import type { ReactNode } from "react";

import { cn } from "@/lib/career/cn";

/**
 * One step of the progressive form. It always stays in the DOM (hidden with display:none until revealed),
 * exactly like the original page, so FormData still contains every field the PHP backend expects.
 */
export function FormField({ id, visible, full, children, className }: { id: string; visible: boolean; full?: boolean; children: ReactNode; className?: string }) {
  return (
    <div id={id} hidden={!visible} className={cn("mb-[26px]", full && "sm:col-span-2", visible && "translate-y-3 animate-[career-field-in_.45s_cubic-bezier(.22,.7,.2,1)_forwards] opacity-0 motion-reduce:translate-y-0 motion-reduce:animate-none motion-reduce:opacity-100", className)}>
      {children}
    </div>
  );
}

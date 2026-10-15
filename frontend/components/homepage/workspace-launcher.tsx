"use client";

import {
  ArrowRightIcon,
  LayoutGridIcon,
  UserRoundIcon,
} from "lucide-react";
import { usePathname } from "next/navigation";
import * as React from "react";

import { workspaces } from "@/lib/data/hawk";
import { cn } from "@/lib/utils";
import { useWorkspaceNavigation,type WorkspaceKey } from "@/lib/workspaces";

// Hawk Aerospace workspace launcher — a 3x3 dot grid that opens a floating
// workspace selector. Deliberately Hawk-branded (forest green dots, Hawk blue
// hover accents), not a copy of any other vendor's launcher. Shown only after
// login; before login the header carries a single "Login" action.
//
// All five workspaces (Customer, Pilot, Fleet Manager, Technician, Sales
// Aggregator) are always listed — the active workspace (the one you're
// currently viewing) is a STATE shown with a "Current" badge, never a
// FILTER that hides the other four. Selecting a workspace that isn't the
// active one navigates straight to that dashboard through the shared
// workspace navigation (lib/workspaces.ts → router.push), so browser
// Back/Forward and in-app Back follow the real history.

const WORKSPACE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  customer: UserRoundIcon,
};

function DotGrid({ variant }: { variant: "dark" | "light" }) {
  return (
    <span aria-hidden className="grid grid-cols-3 gap-[3px]">
      {Array.from({ length: 9 }).map((_, i) => (
        <span
          key={i}
          className={cn(
            "block size-[4px] rounded-[1px] transition-colors",
            variant === "dark" ? "bg-[#9fd4b0] group-hover:bg-white" : "bg-[#1c5f3f] group-hover:bg-[#0f3d28]",
          )}
        />
      ))}
    </span>
  );
}

// `variant="dark"` (default) is the original look, for the forest-green
// homepage/workspace-shell top bar. `variant="light"` is used when this same
// launcher is dropped into one of the four supplied dashboards' own
// light-colored headers (Fleet Manager, Technician, Sales Aggregator, Pilot)
// — see §14/§25: one reusable component, styling adapts to its surroundings
// instead of a second implementation being written per dashboard.
export function WorkspaceLauncher({
  className,
  variant = "dark",
}: {
  className?: string;
  variant?: "dark" | "light";
}) {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();
  const { open: openWorkspace } = useWorkspaceNavigation();
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent | TouchEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function handleSelect(workspace: (typeof workspaces)[number], isActive: boolean) {
    setOpen(false);
    if (isActive) return;
    openWorkspace(workspace.key as WorkspaceKey);
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Open workspace switcher"
        className={cn(
          "focus-visible:ring-ring flex size-11 items-center justify-center rounded-xl border transition-all duration-200 focus-visible:ring-2 focus-visible:outline-hidden",
          "group hover:shadow-md",
          variant === "dark" &&
            cn("border-white/20 bg-white/10 hover:bg-white/20", open && "border-white/40 bg-white/20"),
          variant === "light" &&
            cn("border-black/10 bg-black/5 hover:bg-black/10", open && "border-black/20 bg-black/10"),
        )}
      >
        <DotGrid variant={variant} />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Hawk Aerospace workspaces"
          className="hawk-launcher-panel border-border/70 bg-popover absolute right-0 z-50 mt-3 w-[320px] rounded-2xl border p-3 shadow-xl sm:w-[360px]"
        >
          <div className="flex items-center gap-2 px-2 pt-1 pb-2">
            <LayoutGridIcon className="text-brand size-4" />
            <span className="text-foreground text-sm font-semibold">Workspaces</span>
          </div>

          <ul className="flex flex-col gap-1">
            {workspaces.map((workspace) => {
              const Icon = WORKSPACE_ICONS[workspace.key] ?? UserRoundIcon;
              // "Current" reflects the ACTIVE WORKSPACE (the route you're
              // actually viewing), not the signed-in account's fixed role —
              // switching workspaces never changes the account, so role
              // comparison would keep badging the account's home workspace
              // even after switching away from it. See "Role Access +
              // Customer Header" integration fix §18.
              const active = pathname === workspace.href || pathname.startsWith(`${workspace.href}/`);
              return (
                <li key={workspace.key}>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => handleSelect(workspace, active)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "focus-visible:ring-ring group/item flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition-all duration-200 focus-visible:ring-2 focus-visible:outline-hidden",
                      active ? "bg-accent" : "hover:bg-accent/70",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-10 shrink-0 items-center justify-center rounded-xl transition-colors",
                        active
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-brand group-hover/item:bg-primary group-hover/item:text-primary-foreground",
                      )}
                    >
                      <Icon className="size-5" />
                    </span>
                    <span className="flex min-w-0 flex-col">
                      <span className="text-foreground flex items-center gap-2 text-sm font-semibold">
                        {workspace.title}
                        {active && (
                          <span className="bg-brand/12 text-brand rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase">
                            Current
                          </span>
                        )}
                      </span>
                      <span className="text-muted-foreground text-xs">{workspace.description}</span>
                    </span>
                    <ArrowRightIcon className="text-muted-foreground ml-auto size-4 shrink-0 opacity-0 transition-all duration-200 group-hover/item:translate-x-0.5 group-hover/item:opacity-100 motion-reduce:transform-none" />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

    </div>
  );
}

"use client";

import { usePathname, useRouter } from "next/navigation";
import * as React from "react";

import { workspaces } from "@/lib/data/hawk";

// ---------------------------------------------------------------------------
// Global dashboard switching — the ONLY thing shared between the five
// dashboards (Customer, Pilot, Fleet Manager, Technician, Sales Aggregator).
//
// Each dashboard keeps its own header, notifications, profile, sidebar and
// its own 9-dots menu design. Those menus only call `open()` below when a
// workspace is picked. This module deliberately contains:
//   - no dashboard content, notification or profile data
//   - no authentication / role / permission checks (demo application: any
//     dashboard can open any other dashboard)
//
// Navigation is plain Next.js client-side routing (router.push), so every
// switch adds a normal history entry: the browser Back/Forward buttons and
// each dashboard's in-app "Back" (router.back()) follow the REAL history.
// No history.replaceState / window.location.reload / forced redirects.
// ---------------------------------------------------------------------------

export type WorkspaceKey = "customer";

/** Route each dashboard lives at (single source of truth: lib/data/hawk.ts). */
export const WORKSPACE_HREF = Object.fromEntries(workspaces.map((w) => [w.key, w.href])) as Record<
  WorkspaceKey,
  string
>;

/** Which dashboard (if any) a pathname belongs to. */
export function workspaceKeyForPath(pathname: string | null | undefined): WorkspaceKey | null {
  if (!pathname) return null;
  for (const w of workspaces) {
    if (pathname === w.href || pathname.startsWith(`${w.href}/`)) return w.key as WorkspaceKey;
  }
  return null;
}

export function useWorkspaceNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const current = workspaceKeyForPath(pathname);

  const open = React.useCallback(
    (key: WorkspaceKey) => {
      // Picking the dashboard you are already in just closes the menu —
      // it must not stack duplicate history entries.
      if (key === current) return;
      router.push(WORKSPACE_HREF[key]);
    },
    [router, current],
  );

  return { current, open };
}

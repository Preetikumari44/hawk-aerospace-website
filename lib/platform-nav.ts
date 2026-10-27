"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

import { navLinks } from "@/lib/data/hawk";

// ---------------------------------------------------------------------------
// ONE definition of the platform-level header navigation shared by all five
// dashboards (Customer, Pilot, Fleet Manager, Technician, Sales Aggregator).
//
// These are the real Hawk Aerospace destinations (the same links the Customer
// header uses — see lib/data/hawk.ts), so no dashboard needs a "lives on the
// main website" placeholder. Marketplace is intentionally NOT here: each
// dashboard has its own marketplace screen that it keeps.
//
// Navigation is a normal client-side push, so the originating dashboard stays
// in browser history and Back returns to it (never to Customer).
// ---------------------------------------------------------------------------

export interface CommonNavItem {
  label: "Solutions" | "Technology" | "Platforms";
  href: string;
}

const COMMON_LABELS: CommonNavItem["label"][] = ["Solutions", "Technology", "Platforms"];

export const COMMON_NAVIGATION: readonly CommonNavItem[] = COMMON_LABELS.map((label) => {
  const link = navLinks.find((l) => l.title === label);
  if (!link) throw new Error(`Missing common navigation link: ${label}`);
  return { label, href: link.href };
});

/** Opens a common platform destination in the same tab, preserving history. */
export function useCommonNavigation() {
  const router = useRouter();
  return React.useCallback((href: string) => router.push(href), [router]);
}

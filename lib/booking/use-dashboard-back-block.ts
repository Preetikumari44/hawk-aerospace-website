"use client";

// Dashboard back-button guard — Back / hardware-back must NOT leave a
// homepage/dashboard (it could land on a different role's page and cause
// bugs). We trap history with a same-URL guard entry (NO hash — hashes leak
// into returnTo URLs and share links) and re-push on every popstate, so Back
// stays put. Sub-pages are unaffected (only homepages use this). Same guard
// protects /service-center (admin-only, isolated).

import * as React from "react";

export function useDashboardBackBlock(enabled = true) {
  React.useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    const url = window.location.pathname + window.location.search;
    // Guard entry on top of the stack (same URL, no visible change).
    window.history.pushState({ dashboardGuard: true }, "", url);
    const onPopState = () => {
      // Any Back press while on a dashboard: stay put, restore the guard.
      window.history.pushState({ dashboardGuard: true }, "", url);
    };
    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
    };
  }, [enabled]);
}

export function DashboardBackBlock({ enabled = true }: { enabled?: boolean }) {
  useDashboardBackBlock(enabled);
  return null;
}

"use client";

import * as React from "react";

import { sessionApi } from "./role-apis";

/**
 * Signed-in user's canonical identity for account screens: backend UID +
 * detailed address from the user document. Used by every role's
 * Profile section so User ID and Detailed Address always show.
 */
export function useSessionIdentity(): { uid: string; address: string } | null {
  const [identity, setIdentity] = React.useState<{ uid: string; address: string } | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    sessionApi
      .getCurrentUser()
      .then((u) => {
        if (cancelled) return;
        const o = (u ?? {}) as Record<string, unknown>;
        const pd = (o.profileData ?? {}) as Record<string, unknown>;
        const pick = (...vs: unknown[]): string => {
          for (const v of vs) {
            if (typeof v === "string" && v.trim()) return v.trim();
          }
          return "";
        };
        setIdentity({
          uid: pick(o.uid, o.id),
          address: pick(pd.detailedAddress, pd.address, o.detailedAddress, o.address),
        });
      })
      .catch(() => {
        /* rows fall back to locally known values */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return identity;
}

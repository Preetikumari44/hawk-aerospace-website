"use client";

// Account profile card — Super App AccountsScreen Profile-tab parity:
// avatar (photoUrl w/ initial fallback), name/email/phone/role/uid/address,
// link out to the full editor.

import Link from "next/link";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { sessionApi } from "@/lib/booking/role-apis";
import { useBookingAuth } from "@/lib/booking/auth-context";

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

export function AccountProfileCard() {
  const { user, backendUser, refreshUser } = useBookingAuth();
  const [me, setMe] = React.useState<Record<string, unknown> | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    sessionApi
      .getCurrentUser()
      .then((m) => {
        if (!cancelled) setMe((m ?? null) as Record<string, unknown> | null);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [backendUser]);

  const profile = (me?.profileData ?? {}) as Record<string, unknown>;
  const name = str(me?.name ?? backendUser?.name) || "Hawk User";
  const email = str(me?.email ?? backendUser?.email);
  const phone = str(me?.phone ?? backendUser?.phone ?? user?.phone);
  const photo = str(profile.photoUrl ?? me?.profilePhoto ?? me?.photoUrl);
  const role = str(me?.primaryRole ?? me?.role ?? backendUser?.primaryRole ?? backendUser?.role);
  const uid = str(me?.uid ?? me?.id ?? backendUser?.uid ?? backendUser?.id);
  const address = str(profile.address ?? me?.address);

  return (
    <div className="border-border/60 glass-2 flex flex-col gap-4 rounded-2xl border p-5">
      <div className="flex items-center gap-4">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element -- user-uploaded profile photo.
          <img src={photo} alt={name} className="size-14 rounded-full border object-cover" />
        ) : (
          <span className="bg-brand/15 text-brand flex size-14 items-center justify-center rounded-full text-xl font-bold">
            {(name[0] || "H").toUpperCase()}
          </span>
        )}
        <div className="min-w-0">
          <p className="text-foreground truncate font-semibold">{name}</p>
          <p className="text-muted-foreground truncate text-xs">
            {[role, phone].filter(Boolean).join(" · ")}
          </p>
          {email ? <p className="text-muted-foreground truncate text-xs">{email}</p> : null}
        </div>
      </div>
      <div className="flex flex-col gap-1 text-sm">
        <div className="flex justify-between gap-3">
          <span className="text-muted-foreground">User ID</span>
          <span className="text-foreground truncate font-mono text-xs">{uid || "—"}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-muted-foreground">Address</span>
          <span className="text-foreground truncate text-right">{address || "—"}</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" asChild>
          <Link href="/account/edit">Edit Details</Link>
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setMe(null);
            void refreshUser();
            sessionApi
              .getCurrentUser()
              .then((m) => setMe((m ?? null) as Record<string, unknown> | null))
              .catch(() => undefined);
          }}
        >
          Refresh
        </Button>
      </div>
    </div>
  );
}

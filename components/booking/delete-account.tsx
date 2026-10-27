"use client";

// Delete account — Super App delete-account parity (DELETE /customers/me
// with reason, confirm gate, session teardown).

import { useRouter } from "next/navigation";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { customerApi } from "@/lib/booking/api-client";
import { useBookingAuth } from "@/lib/booking/auth-context";

export function DeleteAccount() {
  const router = useRouter();
  const { logout } = useBookingAuth();
  const [confirming, setConfirming] = React.useState(false);
  const [reason, setReason] = React.useState("");
  const [deleting, setDeleting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      await customerApi.deleteAccount(reason.trim() || undefined);
      logout();
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete your account.");
      setDeleting(false);
    }
  }

  if (!confirming) {
    return (
      <div className="border-destructive/30 flex flex-col gap-2 rounded-2xl border p-5">
        <span className="text-foreground text-sm font-semibold">Danger zone</span>
        <p className="text-muted-foreground text-xs">
          Permanently delete your account and profile data.
        </p>
        <Button size="sm" variant="outline" className="w-fit" onClick={() => setConfirming(true)}>
          Delete Account
        </Button>
      </div>
    );
  }

  return (
    <div className="border-destructive/40 bg-destructive/5 flex flex-col gap-3 rounded-2xl border p-5">
      <span className="text-foreground text-sm font-semibold">Delete your account?</span>
      <p className="text-muted-foreground text-xs">
        This is permanent and cannot be undone. Tell us why (optional).
      </p>
      <input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Reason (optional)"
        className="border-border/70 bg-background/60 h-10 rounded-md border px-3 text-sm outline-none"
      />
      {error ? <p className="text-destructive text-xs">{error}</p> : null}
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={() => setConfirming(false)} disabled={deleting}>
          Keep my account
        </Button>
        <Button size="sm" variant="destructive" onClick={() => void handleDelete()} disabled={deleting}>
          {deleting ? "Deleting…" : "Yes, delete"}
        </Button>
      </div>
    </div>
  );
}

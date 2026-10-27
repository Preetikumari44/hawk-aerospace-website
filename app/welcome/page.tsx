"use client";

// Welcome — Super App OtpVerifiedScreen parity: post-OTP name capture +
// optional referral attach, then continue to the saved destination.

import { useRouter } from "next/navigation";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { LayoutLines } from "@/components/ui/layout-lines";
import { AerialScene } from "@/components/visuals/aerial-scene";
import { customerApi } from "@/lib/booking/api-client";
import { LOGIN_RETURN_KEY, useBookingAuth } from "@/lib/booking/auth-context";
import { referralApi } from "@/lib/booking/role-apis";

export default function WelcomePage() {
  const router = useRouter();
  const { isAuthenticated, requestLogin, refreshUser } = useBookingAuth();
  const [name, setName] = React.useState("");
  const [referral, setReferral] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isAuthenticated) requestLogin("/welcome");
    try {
      const pending = window.localStorage.getItem("@pending_referral_code");
      if (pending) {
        let code = pending.trim();
        if (code.startsWith("{")) {
          try {
            const parsed = JSON.parse(code) as { code?: unknown };
            if (parsed && typeof parsed.code === "string") code = parsed.code;
          } catch {
            /* keep raw */
          }
        }
        code = code.replace(/^["'{]+|["'}]+$/g, "").toUpperCase().trim();
        if (code && code !== "NULL" && !code.startsWith("{")) {
          // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time prefill from stashed invite.
          setReferral(code);
        }
      }
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- prefill once.
  }, [isAuthenticated]);

  function destination(): string {
    try {
      const saved = window.sessionStorage.getItem(LOGIN_RETURN_KEY);
      window.sessionStorage.removeItem(LOGIN_RETURN_KEY);
      if (saved && saved !== "/welcome") return saved === "/" ? "/#booking" : saved;
    } catch {
      /* ignore */
    }
    return "/my-bookings";
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      await customerApi.updateCurrentUser({ name: name.trim() });
      const code = referral.trim().toUpperCase();
      if (code) {
        try {
          await referralApi.attach(code);
        } catch {
          /* attach is best-effort */
        }
        try {
          window.localStorage.removeItem("@pending_referral_code");
        } catch {
          /* ignore */
        }
      }
      await refreshUser().catch(() => undefined);
      router.push(destination());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your name.");
      setSaving(false);
    }
  }

  function skip() {
    router.push(destination());
  }

  if (!isAuthenticated) {
    return (
      <main className="hawk-theme hawk-forest relative flex min-h-screen w-full items-center justify-center overflow-hidden px-4 py-16">
      <LayoutLines />
            <div aria-hidden className="absolute inset-0 -z-30">
              <AerialScene variant="terrain" />
            </div>
            <div
              aria-hidden
              className="absolute inset-0 -z-20"
              style={{
                background:
                  "linear-gradient(160deg, rgba(11,36,24,0.93) 0%, rgba(12,58,42,0.82) 55%, rgba(11,36,24,0.95) 100%)",
              }}
            />
            <div aria-hidden className="hawk-grid absolute inset-0 -z-10 text-white opacity-30" />

        <p className="text-muted-foreground text-sm">Loading…</p>
      </main>
    );
  }

  return (
    <main className="hawk-theme hawk-forest relative flex min-h-screen w-full items-center justify-center overflow-hidden px-4 py-16">
      <LayoutLines />
            <div aria-hidden className="absolute inset-0 -z-30">
        <AerialScene variant="terrain" />
      </div>
      <div
        aria-hidden
        className="absolute inset-0 -z-20"
        style={{
          background:
            "linear-gradient(160deg, rgba(11,36,24,0.93) 0%, rgba(12,58,42,0.82) 55%, rgba(11,36,24,0.95) 100%)",
        }}
      />
      <div aria-hidden className="hawk-grid absolute inset-0 -z-10 text-white opacity-30" />
      <div className="border-border bg-card shadow-2xl backdrop-blur-md w-full max-w-sm rounded-3xl border p-6 sm:p-8">
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="eyebrow">You&apos;re verified ✓</span>
          <h1 className="text-foreground text-xl font-semibold">Welcome to Hawk Aerospace</h1>
          <p className="text-muted-foreground text-sm">Tell us your name to finish setting up.</p>
        </div>
        <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-foreground text-sm font-medium">Full name *</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Arjun Mehta"
              autoComplete="name"
              className="border-input bg-card focus:border-brand focus:ring-ring h-12 w-full rounded-xl border px-3.5 text-base outline-none transition-colors focus:ring-2"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-foreground text-sm font-medium">
              Referral code <span className="text-muted-foreground font-normal">(optional)</span>
            </span>
            <input
              value={referral}
              onChange={(e) => setReferral(e.target.value.toUpperCase().replace(/\s/g, ""))}
              placeholder="e.g. HAWK-ABC123"
              className="border-input bg-card focus:border-brand focus:ring-ring h-12 w-full rounded-xl border px-3.5 text-base outline-none transition-colors focus:ring-2"
            />
          </label>
          {error ? <p className="text-destructive text-xs">{error}</p> : null}
          <Button type="submit" size="lg" disabled={!name.trim() || saving} className="w-full">
            {saving ? "Saving…" : "Continue"}
          </Button>
          <button
            type="button"
            onClick={skip}
            className="text-muted-foreground hover:text-foreground text-xs underline underline-offset-4"
          >
            Skip for now
          </button>
        </form>
      </div>
    </main>
  );
}

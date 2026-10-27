"use client";

// Referral landing — guest invite links (/r/:code): resolves the code via
// GET /referrals/landing/:code, stashes it for post-login attach, and offers
// guest role application exactly like ReferralLandingScreen.

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { LayoutLines } from "@/components/ui/layout-lines";
import { referralApi } from "@/lib/booking/role-apis";

export default function ReferralLandingPage() {
  const params = useParams<{ code?: string | string[] }>();
  const code = (Array.isArray(params?.code) ? params.code[0] : (params?.code ?? "")).toUpperCase();
  const router = useRouter();
  const [info, setInfo] = React.useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!code) {
      setLoading(false);
      return;
    }
    try {
      // Keep the stash as a plain upper-cased code so /login and /apply can
      // read it without JSON parsing. Do NOT delete it on login — the apply
      // form needs it to prefill the referral field.
      window.localStorage.setItem("@pending_referral_code", code.toUpperCase().trim());
    } catch {
      /* ignore */
    }
    referralApi
      .landing(code)
      .then((v) => setInfo((v ?? {}) as Record<string, unknown>))
      .catch(() => setInfo({}))
      .finally(() => setLoading(false));
  }, [code]);

  return (
    <main className="bg-background text-foreground relative flex min-h-screen w-full items-center justify-center px-4 py-16">
      <LayoutLines />
      <div className="border-border/60 glass-2 w-full max-w-sm rounded-2xl border p-6 text-center sm:p-8">
        <div className="text-brand text-xs font-semibold tracking-[0.2em] uppercase">You&apos;re invited</div>
        <h1 className="text-foreground mt-2 text-xl font-semibold">Join Hawk Aerospace</h1>
        {loading ? (
          <p className="text-muted-foreground mt-4 text-sm">Checking invite…</p>
        ) : (
          <>
            <p className="text-muted-foreground mt-2 text-sm">
              {typeof info?.inviter === "string" && info.inviter
                ? `${info.inviter} invited you. `
                : ""}
              Sign in to continue — your invite is applied automatically.
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <Button size="lg" onClick={() => router.push("/login")}>
                Accept & Sign In
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/account">Explore roles</Link>
              </Button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

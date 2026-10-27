"use client";

import { UserPlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

import HawkLogo from "@/components/logos/hawk";
import { AerialScene } from "@/components/visuals/aerial-scene";
import { Button } from "@/components/ui/button";
import { LayoutLines } from "@/components/ui/layout-lines";
import { useBookingAuth } from "@/lib/booking/auth-context";
import { normalizeIndianMobile } from "@/lib/booking/phone";

// Customer registration (§18) — Full Name, Mobile Number, Email, Username,
// Password, Confirm Password. On success the account is created server-side
// (see lib/booking/user-store.ts) with a hashed password, then the person is
// signed straight in via the existing BookingAuthProvider session helper.

const inputClass =
  "border-input bg-card focus:border-brand focus:ring-ring h-12 w-full rounded-xl border px-3.5 text-base outline-none transition-colors focus:ring-2";

export default function RegisterPage() {
  const router = useRouter();
  const { login } = useBookingAuth();

  const [fullName, setFullName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, phone, email, username, password }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.message ?? "Couldn't create your account. Please try again.");
        return;
      }
      login(data.phone);
      router.push("/my-bookings");
    } catch {
      setError("Network error — please try again.");
    } finally {
      setSubmitting(false);
    }
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

      <div className="border-border bg-card w-full max-w-sm rounded-3xl border p-6 shadow-2xl backdrop-blur-md sm:p-8">
        <div className="flex flex-col items-center gap-2 text-center">
          <a href="/" className="mb-2 flex items-center gap-2 text-lg font-bold tracking-tight text-white">
            <HawkLogo className="text-brand" />
            Hawk Aerospace
          </a>
          <div className="text-brand flex items-center gap-2 text-xs font-semibold tracking-[0.2em] uppercase">
            <UserPlusIcon className="size-3.5" />
            Create Customer Account
          </div>
          <h1 className="text-xl font-semibold text-white">Welcome to Hawk</h1>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3.5">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="reg-name" className="text-foreground text-sm font-semibold">
              Full name
            </label>
            <input
              id="reg-name"
              type="text"
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className={inputClass}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="reg-phone" className="text-foreground text-sm font-semibold">
              Mobile number
            </label>
            <div className="flex items-stretch gap-2">
              <span className="border-input bg-secondary text-foreground flex h-12 w-14 shrink-0 items-center justify-center rounded-xl border text-base font-medium">
                +91
              </span>
              <input
                id="reg-phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                value={phone}
                onChange={(e) => setPhone(normalizeIndianMobile(e.target.value).slice(0, 10))}
                placeholder="98765 43210"
                required
                className={inputClass}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="reg-email" className="text-foreground text-sm font-semibold">
              Email
            </label>
            <input
              id="reg-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={inputClass}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="reg-username" className="text-foreground text-sm font-semibold">
              Username
            </label>
            <input
              id="reg-username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className={inputClass}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="reg-password" className="text-foreground text-sm font-semibold">
              Password
            </label>
            <input
              id="reg-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className={inputClass}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="reg-confirm" className="text-foreground text-sm font-semibold">
              Confirm password
            </label>
            <input
              id="reg-confirm"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className={inputClass}
            />
            {error && <p className="text-destructive text-xs">{error}</p>}
          </div>

          <Button type="submit" size="lg" disabled={submitting} className="mt-1 w-full">
            {submitting ? "Creating account…" : "Create Account"}
          </Button>
        </form>

        <p className="text-muted-foreground mt-6 text-center text-xs">
          Already have an account?{" "}
          <a href="/login" className="text-brand hover:text-brand/80 font-medium underline underline-offset-4">
            Sign in
          </a>
        </p>
      </div>
    </main>
  );
}

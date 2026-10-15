"use client";

import { LockIcon, PhoneIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

import HawkLogo from "@/components/logos/hawk";
import { Button } from "@/components/ui/button";
import { LayoutLines } from "@/components/ui/layout-lines";
import { AerialScene } from "@/components/visuals/aerial-scene";
import { LOGIN_RETURN_KEY, useBookingAuth } from "@/lib/booking/auth-context";
import { roleForPhone, workspaceRouteForRole } from "@/lib/booking/demo-accounts";
import { sendOtp, verifyOtp } from "@/lib/booking/otp-client";
import { formatIndianMobile, isValidIndianMobile, normalizeIndianMobile, toE164IndianMobile } from "@/lib/booking/phone";
import { cn } from "@/lib/utils";

// Demo role-based landing — every role lands on its own workspace (see
// WORKSPACE_ROUTE_FOR_ROLE), same fallback used elsewhere for consistency.
// Only used when there's no explicit `returnTo` (e.g. resuming an
// in-progress booking), so the existing booking flow's redirect behavior is
// untouched.
function defaultLandingForPhone(phone: string): string {
  const role = roleForPhone(toE164IndianMobile(phone));
  return workspaceRouteForRole(role);
}

const inputClass =
  "border-input bg-card focus:border-brand focus:ring-ring h-12 w-full rounded-xl border px-3.5 text-base outline-none transition-colors focus:ring-2";

const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 30;

type Step = "phone" | "otp";

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, login, user } = useBookingAuth();

  const [step, setStep] = React.useState<Step>("phone");
  const [phone, setPhone] = React.useState("");
  const [phoneError, setPhoneError] = React.useState<string | null>(null);
  const [sendingOtp, setSendingOtp] = React.useState(false);

  const [digits, setDigits] = React.useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [otpError, setOtpError] = React.useState<string | null>(null);
  const [otpState, setOtpState] = React.useState<"idle" | "verifying" | "verified">("idle");
  const [cooldown, setCooldown] = React.useState(0);
  const inputRefs = React.useRef<Array<HTMLInputElement | null>>([]);

  // Already signed in (e.g. back-button after login) — send straight to the
  // saved destination instead of showing the form again.
  React.useEffect(() => {
    if (!isAuthenticated) return;
    const returnTo =
      window.sessionStorage.getItem(LOGIN_RETURN_KEY) ??
      (user ? defaultLandingForPhone(user.phone) : "/my-bookings");
    window.sessionStorage.removeItem(LOGIN_RETURN_KEY);
    router.replace(returnTo);
  }, [isAuthenticated, router, user]);

  React.useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => window.clearInterval(id);
  }, [cooldown]);

  async function requestOtp() {
    if (!isValidIndianMobile(phone)) {
      setPhoneError("Enter a valid 10-digit mobile number.");
      return;
    }
    setPhoneError(null);
    setSendingOtp(true);
    try {
      const res = await sendOtp(phone);
      if (!res.success) {
        setPhoneError(res.message ?? "Couldn't send OTP. Please try again.");
        return;
      }
      setDigits(Array(OTP_LENGTH).fill(""));
      setOtpError(null);
      setCooldown(RESEND_COOLDOWN_SECONDS);
      setStep("otp");
      window.setTimeout(() => inputRefs.current[0]?.focus(), 50);
    } catch {
      setPhoneError("Network error — please try again.");
    } finally {
      setSendingOtp(false);
    }
  }

  function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    if (sendingOtp) return;
    void requestOtp();
  }

  function setDigitAt(index: number, value: string) {
    setDigits((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  function handleDigitChange(index: number, raw: string) {
    const value = raw.replace(/\D/g, "");
    if (!value) {
      setDigitAt(index, "");
      return;
    }
    // Last typed character wins if more than one slipped in (e.g. IME quirks).
    setDigitAt(index, value.slice(-1));
    if (index < OTP_LENGTH - 1) inputRefs.current[index + 1]?.focus();
  }

  function handleDigitKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handleOtpPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!pasted) return;
    e.preventDefault();
    const next = Array(OTP_LENGTH).fill("");
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setDigits(next);
    const focusIndex = Math.min(pasted.length, OTP_LENGTH - 1);
    inputRefs.current[focusIndex]?.focus();
  }

  const code = digits.join("");

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (otpState === "verifying" || otpState === "verified") return; // prevent double-submit
    if (code.length !== OTP_LENGTH) {
      setOtpError("Enter the 6-digit code.");
      return;
    }
    setOtpState("verifying");
    setOtpError(null);
    try {
      const res = await verifyOtp(phone, code);
      if (!res.success) {
        // A wrong code resets the resend cooldown to 0 — never auto-resends,
        // but lets the user request a fresh code immediately.
        if (res.error === "OTP_EXPIRED") {
          setOtpError("This code expired. Request a new one.");
          setCooldown(0);
        } else if (res.error === "MAX_ATTEMPTS_EXCEEDED") {
          setOtpError("Too many incorrect attempts. Request a new code.");
          setCooldown(0);
        } else {
          setOtpError(res.message ?? "Incorrect code. Please try again.");
          setCooldown(0);
        }
        setDigits(Array(OTP_LENGTH).fill(""));
        inputRefs.current[0]?.focus();
        setOtpState("idle");
        return;
      }
      setOtpState("verified");
      login(phone);
      const returnTo = window.sessionStorage.getItem(LOGIN_RETURN_KEY) ?? defaultLandingForPhone(phone);
      window.sessionStorage.removeItem(LOGIN_RETURN_KEY);
      router.push(returnTo);
    } catch {
      setOtpError("Network error — please try again.");
      setOtpState("idle");
    }
  }

  return (
    <main className="hawk-theme hawk-forest relative flex min-h-screen w-full items-center justify-center overflow-hidden px-4 py-16">
      <LayoutLines />
      {/* Aerial backdrop + deep green grade — matches the homepage hero. */}
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
            <LockIcon className="size-3.5" />
            Secure Sign-In
          </div>
          <h1 className="text-xl font-semibold text-white">
            {step === "phone" ? "Welcome Back" : "Verify OTP"}
          </h1>
          <p className="text-muted-foreground text-sm">
            {step === "phone"
              ? "Enter your mobile number to sign in."
              : `OTP sent to ${formatIndianMobile(phone)}`}
          </p>
        </div>

        {step === "phone" ? (
          <form onSubmit={handleSendOtp} className="mt-6 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="login-phone" className="text-foreground text-sm font-semibold">
                Mobile number
              </label>
              <div className="flex items-stretch gap-2">
                <span className="border-input bg-secondary text-foreground flex h-12 w-14 shrink-0 items-center justify-center rounded-xl border text-base font-medium">
                  +91
                </span>
                <input
                  id="login-phone"
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
              {phoneError && <p className="text-destructive text-xs">{phoneError}</p>}
            </div>
            <Button type="submit" size="lg" disabled={sendingOtp} className="mt-1 w-full">
              <PhoneIcon className="size-4" />
              {sendingOtp ? "Sending…" : "Send OTP"}
            </Button>
            <p className="text-muted-foreground text-center text-[11px]">
              Demo access · 98765 43210 · OTP 123456
            </p>
          </form>
        ) : (
          <form onSubmit={handleVerify} className="mt-6 flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <div className="flex justify-between gap-2">
                {digits.map((d, i) => (
                  <input
                    key={i}
                    ref={(el) => {
                      inputRefs.current[i] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    autoComplete={i === 0 ? "one-time-code" : "off"}
                    maxLength={1}
                    value={d}
                    onChange={(e) => handleDigitChange(i, e.target.value)}
                    onKeyDown={(e) => handleDigitKeyDown(i, e)}
                    onPaste={handleOtpPaste}
                    aria-label={`OTP digit ${i + 1}`}
                    className={cn(
                      "border-border/70 bg-background/60 focus:border-brand/60 focus:ring-ring h-12 w-full rounded-md border text-center text-lg font-semibold outline-none transition-colors focus:ring-1",
                      otpError && "border-destructive/60",
                    )}
                  />
                ))}
              </div>
              {otpError && <p className="text-destructive text-xs">{otpError}</p>}
            </div>

            <div className="flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => {
                  setStep("phone");
                  setOtpError(null);
                }}
                className="text-muted-foreground hover:text-foreground underline underline-offset-4"
              >
                Change number
              </button>
              {cooldown > 0 ? (
                <span className="text-muted-foreground">Resend OTP in {cooldown}s</span>
              ) : (
                <button
                  type="button"
                  onClick={() => void requestOtp()}
                  disabled={sendingOtp}
                  className="text-brand hover:text-brand/80 font-medium underline underline-offset-4"
                >
                  Resend OTP
                </button>
              )}
            </div>

            <Button
              type="submit"
              size="lg"
              disabled={otpState === "verifying" || otpState === "verified" || code.length !== OTP_LENGTH}
              className="mt-1 w-full"
            >
              {otpState === "verifying" ? "Verifying…" : "Verify OTP"}
            </Button>
          </form>
        )}

        <p className="text-muted-foreground mt-6 text-center text-xs">
          <a href="/" className="hover:text-foreground underline underline-offset-4">
            Back to Hawk Aerospace
          </a>
        </p>
      </div>
    </main>
  );
}

"use client";

import { LockIcon, PhoneIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

import HawkLogo from "@/components/logos/hawk";
import { Button } from "@/components/ui/button";
import { LayoutLines } from "@/components/ui/layout-lines";
import { LOGIN_RETURN_KEY, useBookingAuth } from "@/lib/booking/auth-context";
import { sendOtp, verifyOtp } from "@/lib/booking/otp-client";
import { formatIndianMobile, isValidIndianMobile, normalizeIndianMobile } from "@/lib/booking/phone";
import { cn } from "@/lib/utils";

const inputClass =
  "border-border/70 bg-background/60 focus:border-brand/60 focus:ring-ring h-11 w-full rounded-md border px-3 text-sm outline-none transition-colors focus:ring-1";

const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 30;

type Step = "phone" | "otp";

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, login } = useBookingAuth();

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
    const returnTo = window.sessionStorage.getItem(LOGIN_RETURN_KEY) ?? "/my-bookings";
    window.sessionStorage.removeItem(LOGIN_RETURN_KEY);
    router.replace(returnTo);
  }, [isAuthenticated, router]);

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
      const returnTo = window.sessionStorage.getItem(LOGIN_RETURN_KEY) ?? "/my-bookings";
      window.sessionStorage.removeItem(LOGIN_RETURN_KEY);
      router.push(returnTo);
    } catch {
      setOtpError("Network error — please try again.");
      setOtpState("idle");
    }
  }

  return (
    <main className="bg-background text-foreground relative flex min-h-screen w-full items-center justify-center px-4 py-16">
      <LayoutLines />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-70"
        style={{
          background:
            "radial-gradient(50% 45% at 50% 0%, color-mix(in srgb, var(--brand) 16%, transparent), transparent 70%)",
        }}
      />

      <div className="border-border/60 glass-2 w-full max-w-sm rounded-2xl border p-6 sm:p-8">
        <div className="flex flex-col items-center gap-2 text-center">
          <a href="/" className="text-foreground mb-2 flex items-center gap-2 text-lg font-bold tracking-tight">
            <HawkLogo className="text-brand" />
            Hawk Aerospace
          </a>
          <div className="text-brand flex items-center gap-2 text-xs font-semibold tracking-[0.2em] uppercase">
            <LockIcon className="size-3.5" />
            Secure Sign-In
          </div>
          <h1 className="text-foreground text-xl font-semibold">
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
              <label htmlFor="login-phone" className="text-foreground text-sm font-medium">
                Mobile number
              </label>
              <div className="flex items-stretch gap-2">
                <span className="border-border/70 bg-background/60 text-muted-foreground flex h-11 w-14 shrink-0 items-center justify-center rounded-md border text-sm font-medium">
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

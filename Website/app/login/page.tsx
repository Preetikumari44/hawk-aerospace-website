"use client";

import type { ConfirmationResult } from "firebase/auth";
import { LockIcon, PhoneIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

import HawkLogo from "@/components/logos/hawk";
import { Button } from "@/components/ui/button";
import { LayoutLines } from "@/components/ui/layout-lines";
import { authApi } from "@/lib/booking/api-client";
import { LOGIN_RETURN_KEY, useBookingAuth } from "@/lib/booking/auth-context";
import { roleForPhone } from "@/lib/booking/demo-accounts";
import {
  getIdTokenFromConfirmation,
  isFirebaseTestModeEnabled,
  prepareManualRecaptcha,
  resetRecaptcha,
  sendTestModeSms,
  signInWithManualVerifier,
  toE164Indian,
} from "@/lib/booking/firebase-client";
import { formatIndianMobile, isValidIndianMobile, normalizeIndianMobile, toE164IndianMobile } from "@/lib/booking/phone";
import { cn } from "@/lib/utils";

// Demo role-based landing — pilot/admin land on their operations dashboard;
// customers land on My Bookings, same as before. Only used as a fallback
// when there's no explicit `returnTo` (e.g. resuming an in-progress
// booking), so the existing booking flow's redirect behavior is untouched.
function defaultLandingForPhone(phone: string): string {
  const role = roleForPhone(toE164IndianMobile(phone));
  if (role === "admin") return "/admin";
  if (role === "pilot") return "/pilot";
  return "/my-bookings";
}

const inputClass =
  "border-border/70 bg-background/60 focus:border-brand/60 focus:ring-ring h-11 w-full rounded-md border px-3 text-sm outline-none transition-colors focus:ring-1";

const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 30;

type Step = "phone" | "otp";

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, login, loginWithBackend, user } = useBookingAuth();
  const confirmationRef = React.useRef<ConfirmationResult | null>(null);
  const firebaseFlowRef = React.useRef(false);

  const [step, setStep] = React.useState<Step>("phone");
  const [phone, setPhone] = React.useState("");
  const [phoneError, setPhoneError] = React.useState<string | null>(null);
  const [sendingOtp, setSendingOtp] = React.useState(false);

  const [digits, setDigits] = React.useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [otpError, setOtpError] = React.useState<string | null>(null);
  const [otpState, setOtpState] = React.useState<"idle" | "verifying" | "verified">("idle");
  const [cooldown, setCooldown] = React.useState(0);
  const inputRefs = React.useRef<Array<HTMLInputElement | null>>([]);

  // Manual human-check (visible reCAPTCHA checkbox) shown only when the
  // backend answers `firebase-client-flow`. Dev/backend-OTP numbers skip it
  // entirely and go straight to the OTP boxes.
  const [needsHumanCheck, setNeedsHumanCheck] = React.useState(false);
  const [captchaReady, setCaptchaReady] = React.useState(false);
  const [captchaError, setCaptchaError] = React.useState<string | null>(null);
  const [captchaAttempt, setCaptchaAttempt] = React.useState(0);

  // Already signed in (e.g. back-button after login) — send straight to the
  // saved destination instead of showing the form again.
  React.useEffect(() => {
    if (!isAuthenticated) return;
    let returnTo =
      window.sessionStorage.getItem(LOGIN_RETURN_KEY) ??
      (user ? defaultLandingForPhone(user.phone) : "/#booking");
    // Guest booking flow saves "/" — land on the booking panel instead so the
    // restored draft is visible immediately (see booking-hub resume).
    if (returnTo === "/") returnTo = "/#booking";
    window.sessionStorage.removeItem(LOGIN_RETURN_KEY);
    router.replace(returnTo);
  }, [isAuthenticated, router, user]);

  // Tear down the reCAPTCHA widget on unmount.
  React.useEffect(() => () => resetRecaptcha(), []);

  // Render a fresh checkbox widget whenever the human-check panel is shown
  // (or rebuilt for retry). The SMS is sent from the widget's solved
  // callback — never before the user completes the challenge.
  React.useEffect(() => {
    if (!needsHumanCheck || step !== "phone") return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mounts the external reCAPTCHA widget into its container; async by nature.
    setCaptchaReady(false);
    setCaptchaError(null);
    prepareManualRecaptcha("recaptcha-container", {
      onSolved: () => {
        if (!cancelled) void sendFirebaseSms();
      },
      onExpired: () => {
        if (!cancelled)
          setCaptchaError("Verification expired — please solve the checkbox again.");
      },
    })
      .then(() => {
        if (!cancelled) setCaptchaReady(true);
      })
      .catch(() => {
        if (!cancelled)
          setCaptchaError(
            "Security check failed to load. Turn off any ad-blocker for localhost and tap Resend below.",
          );
      });
    return () => {
      cancelled = true;
      resetRecaptcha();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- rebuild intentionally on retry attempts; sendFirebaseSms is stable by closure over refs/state setters.
  }, [needsHumanCheck, step, captchaAttempt]);

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
      const e164 = toE164IndianMobile(phone);
      // Backend decides the delivery channel. Dev/backend-OTP numbers go
      // straight to the OTP boxes; `firebase-client-flow` numbers get the
      // manual checkbox first, and the SMS is sent only after it's solved.
      let useFirebase = false;
      try {
        const res = await authApi.requestOtp(e164);
        const delivery = (res as { delivery?: string })?.delivery;
        useFirebase = delivery === "firebase-client-flow";
      } catch {
        // Backend unreachable — Firebase is the only remaining hope.
        useFirebase = true;
      }
      firebaseFlowRef.current = false;
      confirmationRef.current = null;
      if (useFirebase) {
        // Fast lane first: dev test-mode (invisible, no checkbox, no SMS —
        // works when test mode is enabled and the number is whitelisted as
        // a Firebase console test number). Otherwise the manual checkbox
        // panel, with SMS auto-sent after solving.
        if (isFirebaseTestModeEnabled()) {
          try {
            confirmationRef.current = await sendTestModeSms(toE164Indian(phone));
            firebaseFlowRef.current = true;
            enterOtpStep();
            return;
          } catch {
            resetRecaptcha();
            // Fall through to the checkbox panel below.
          }
        }
        setNeedsHumanCheck(true);
        setCaptchaAttempt((a) => a + 1);
        return;
      }
      enterOtpStep();
    } catch {
      setPhoneError("Network error — please try again.");
    } finally {
      setSendingOtp(false);
    }
  }

  function enterOtpStep() {
    setDigits(Array(OTP_LENGTH).fill(""));
    setOtpError(null);
    setCooldown(RESEND_COOLDOWN_SECONDS);
    setStep("otp");
    window.setTimeout(() => inputRefs.current[0]?.focus(), 50);
  }

  /** Called by the checkbox's solved callback — sends the Firebase SMS. */
  async function sendFirebaseSms() {
    if (sendingOtp) return;
    setSendingOtp(true);
    setCaptchaError(null);
    try {
      confirmationRef.current = await signInWithManualVerifier(toE164Indian(phone));
      firebaseFlowRef.current = true;
      setNeedsHumanCheck(false);
      enterOtpStep();
    } catch (err) {
      // Silent by design (no console output). Map the Firebase code to the
      // exact cause so the next step is obvious instead of a blind retry.
      const code = (err as { code?: string })?.code ?? "";
      if (code === "auth/too-many-requests" || code === "auth/quota-exceeded") {
        setCaptchaError(
          "Google temporarily blocked SMS requests from this device/network after too many attempts. Wait an hour, or switch network (e.g. mobile hotspot) and solve the checkbox once.",
        );
      } else if (code === "auth/operation-not-allowed") {
        setCaptchaError(
          "Phone sign-in is switched off in the Firebase console (Authentication → Sign-in method → Phone). Turn it on and resend.",
        );
      } else if (code === "auth/invalid-phone-number" || code === "auth/missing-phone-number") {
        setCaptchaError("That number doesn't look valid. Check it and resend.");
      } else if (code === "auth/network-request-failed") {
        setCaptchaError("Network glitch while contacting Google. Resend once you're back online.");
      } else {
        // auth/invalid-app-credential, auth/captcha-check-failed and friends:
        // the solved token was rejected server-side — rebuild a clean widget.
        // NOTE: Google disallows phone auth from the "localhost" hostname
        // itself (official Auth policy) — if this page is open on localhost,
        // reopen it at http://127.0.0.1:3000 (pre-authorized) and resend.
        // (If test mode is on, this number is simply not whitelisted as a
        // Firebase console test number — add it there for instant login.)
        setCaptchaError(
          "Google rejected the verification. First: make sure you opened this page as http://127.0.0.1:3000 — Google blocks phone login from the localhost hostname (works fine on 127.0.0.1 and in production). Otherwise turn off any ad-blocker for this site (Brave: Shields down), solve the checkbox again — or whitelist this number under Firebase console → Authentication → Sign-in method → Phone → Phone numbers for testing for instant login.",
        );
      }
      setCaptchaAttempt((a) => a + 1);
    } finally {
      setSendingOtp(false);
    }
  }

  /** Resend from the OTP step: Firebase sends need a fresh solved challenge. */
  function handleResend() {
    if (sendingOtp) return;
    if (firebaseFlowRef.current) {
      confirmationRef.current = null;
      firebaseFlowRef.current = false;
      setOtpError(null);
      setStep("phone");
      setNeedsHumanCheck(true);
      setCaptchaAttempt((a) => a + 1);
      return;
    }
    void requestOtp();
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
      const e164 = toE164IndianMobile(phone);
      // Firebase flow: confirm the SMS code → Firebase ID token → backend JWT.
      if (firebaseFlowRef.current && confirmationRef.current) {
        try {
          const firebaseIdToken = await getIdTokenFromConfirmation(
            confirmationRef.current,
            code,
          );
          await loginWithBackend({ phone: e164, firebaseIdToken });
        } catch {
          setOtpError("Incorrect code. Please try again.");
          setCooldown(0);
          setDigits(Array(OTP_LENGTH).fill(""));
          inputRefs.current[0]?.focus();
          setOtpState("idle");
          return;
        }
      } else {
        // Backend-OTP flow (dev bypass or Twilio SMS): verify code directly.
        try {
          await loginWithBackend({ phone: e164, otpCode: code });
        } catch (err) {
          // Backend unreachable — demo fallback so local flows still work.
          if (code === "123456") {
            login(e164);
          } else {
            setOtpError(
              err instanceof Error && err.message
                ? err.message
                : "Incorrect code. Please try again.",
            );
            setCooldown(0);
            setDigits(Array(OTP_LENGTH).fill(""));
            inputRefs.current[0]?.focus();
            setOtpState("idle");
            return;
          }
        }
      }
      setOtpState("verified");
      let returnTo = window.sessionStorage.getItem(LOGIN_RETURN_KEY) ?? defaultLandingForPhone(phone);
      if (returnTo === "/") returnTo = "/#booking";
      window.sessionStorage.removeItem(LOGIN_RETURN_KEY);
      router.push(returnTo);
    } catch {
      setOtpError("Network error — please try again.");
      setOtpState("idle");
    }
  }

  return (
    <main className="bg-background text-foreground relative flex min-h-screen w-full items-center justify-center px-4 py-16">
      {/* Host for the test-mode invisible verifier. Zero-size but never
          display:none / aria-hidden, so the injected iframe stays valid. */}
      <div id="recaptcha-test-container" className="absolute h-0 w-0 overflow-hidden" />
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
            {needsHumanCheck ? (
              <div className="border-border/60 glass-1 flex flex-col items-center gap-3 rounded-xl border p-4">
                <p className="text-foreground text-xs font-semibold tracking-[0.15em] uppercase">
                  One quick check
                </p>
                {/* Visible reCAPTCHA checkbox — the human-solved token is what
                    makes Firebase accept the SMS request. Must stay visible;
                    never hide it with display:none. */}
                <div id="recaptcha-container" className="flex min-h-[78px] justify-center" />
                {!captchaReady && !captchaError && (
                  <p className="text-muted-foreground text-xs">Loading security check…</p>
                )}
                {captchaReady && !captchaError && (
                  <p className="text-muted-foreground text-xs">
                    Tick the checkbox above — the SMS sends automatically.
                  </p>
                )}
                {captchaError && <p className="text-destructive text-xs">{captchaError}</p>}
                {sendingOtp && (
                  <p className="text-muted-foreground text-xs">Sending SMS…</p>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setNeedsHumanCheck(false);
                    setCaptchaError(null);
                  }}
                  className="text-muted-foreground hover:text-foreground text-xs underline underline-offset-4"
                >
                  Use a different number
                </button>
              </div>
            ) : (
              <Button type="submit" size="lg" disabled={sendingOtp} className="mt-1 w-full">
                <PhoneIcon className="size-4" />
                {sendingOtp ? "Sending…" : "Send OTP"}
              </Button>
            )}
            <p className="text-muted-foreground text-center text-[11px]">
              Dev access · 98989 89898 · OTP 123456
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
                  setNeedsHumanCheck(false);
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
                  onClick={handleResend}
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

"use client";

import type { ConfirmationResult } from "firebase/auth";
import { LockIcon, PhoneIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

import HawkLogo from "@/components/logos/hawk";
import { Button } from "@/components/ui/button";
import { LayoutLines } from "@/components/ui/layout-lines";
import { AerialScene } from "@/components/visuals/aerial-scene";
import { authApi } from "@/lib/booking/api-client";
import { LOGIN_RETURN_KEY, stripHash, useBookingAuth } from "@/lib/booking/auth-context";
import { isDemoPhone, roleForPhone } from "@/lib/booking/demo-accounts";
import { referralApi } from "@/lib/booking/role-apis";
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
import { type FrontendRole, landingForFrontendRole, normalizeFrontendRole } from "@/lib/booking/roles";
import { cn } from "@/lib/utils";

// Single login for ALL roles — after OTP the backend's primaryRole decides
// the landing (customer->/my-bookings, pilot->/pilot, sales->/sales,
// fleet->/fleet, technician->/technician). An explicit `returnTo` (saved by
// requestLogin, e.g. resuming a booking draft) still wins when present.
// Demo fallback keeps the old phone-prefix mapping.
function defaultLandingForPhone(phone: string): string {
  const role = roleForPhone(toE164IndianMobile(phone));
  if (role === "admin") return "/admin";
  if (role === "pilot") return "/pilot";
  return "/my-bookings";
}

function landingForRole(role: FrontendRole | null, phone: string): string {
  if (role) return landingForFrontendRole(role);
  return defaultLandingForPhone(phone);
}

const inputClass =
  "border-input bg-card focus:border-brand focus:ring-ring h-12 w-full rounded-xl border px-3.5 text-base outline-none transition-colors focus:ring-2";

const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 30;

type Step = "phone" | "otp";

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, login, loginWithBackend, user, frontendRole } = useBookingAuth();
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
  // saved destination or the role landing instead of showing the form again.
  React.useEffect(() => {
    if (!isAuthenticated) return;
    const saved = window.sessionStorage.getItem(LOGIN_RETURN_KEY);
    let returnTo = stripHash(saved ?? landingForFrontendRole(frontendRole));
    // Guest booking flow saves "/" — land on the booking panel instead so the
    // restored draft is visible immediately (see booking-hub resume).
    if (returnTo === "/") returnTo = "/#booking";
    window.sessionStorage.removeItem(LOGIN_RETURN_KEY);
    router.replace(returnTo);
  }, [isAuthenticated, router, user, frontendRole]);

  // Tear down the reCAPTCHA widget on unmount.
  React.useEffect(() => () => resetRecaptcha(), []);

  // WebOTP autofill (Super App otpAutofill parity): when the SMS arrives,
  // the browser can hand the code straight to the boxes — no typing.
  React.useEffect(() => {
    if (step !== "otp") return;
    const nav = navigator as Navigator & {
      credentials?: { get?: (o: unknown) => Promise<{ code?: string } | null> };
    };
    if (typeof window === "undefined" || !nav.credentials?.get || !("OTPCredential" in window)) return;
    const abort = new AbortController();
    const get = nav.credentials.get.bind(nav.credentials) as (
      o: unknown,
    ) => Promise<{ code?: string } | null>;
    get({ otp: { transport: ["sms"] }, signal: abort.signal })
      .then((cred) => {
        const code = String(cred?.code ?? "").replace(/\D/g, "").slice(0, OTP_LENGTH);
        if (code.length === OTP_LENGTH) {
          setDigits(code.split(""));
          inputRefs.current[OTP_LENGTH - 1]?.focus();
        }
      })
      .catch(() => {
        /* unavailable / dismissed — manual entry stays */
      });
    return () => abort.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per OTP step entry.
  }, [step]);

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
        // Backend unreachable (EC2 down / 404 / timeout).
        // Demo numbers skip Firebase entirely and go straight to OTP boxes —
        // verify step accepts 123456 locally (see below). Real numbers still
        // fall through to Firebase checkbox/SMS.
        if (isDemoPhone(e164)) {
          firebaseFlowRef.current = false;
          confirmationRef.current = null;
          setNeedsHumanCheck(false);
          enterOtpStep();
          return;
        }
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
      console.warn("Firebase phone auth failed, falling back to backend OTP:", err);
      // If billing is not enabled or Firebase SMS fails, fallback to backend OTP
      firebaseFlowRef.current = false;
      confirmationRef.current = null;
      setNeedsHumanCheck(false);
      enterOtpStep();
      return;
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
    let landedRole: FrontendRole | null = null;
    let needsName = false;
    let referralCode: string | null = null;
    try {
      const raw = window.localStorage.getItem("@pending_referral_code");
      if (raw) {
        // Stash may be a plain code or a JSON blob {code, role} (Super App parity).
        try {
          const parsed = JSON.parse(raw) as { code?: unknown };
          if (parsed && typeof parsed.code === "string" && parsed.code.trim()) {
            referralCode = parsed.code.toUpperCase().trim();
          } else {
            referralCode = raw.toUpperCase().trim();
          }
        } catch {
          referralCode = raw.toUpperCase().trim();
        }
        // Strip JSON quoting artefacts if any.
        referralCode = referralCode.replace(/^["'{]+|["'}]+$/g, "").toUpperCase().trim();
        if (!referralCode || referralCode === "NULL" || referralCode.startsWith("{")) referralCode = null;
      }
    } catch { /* ignore */ }
    try {
      const e164 = toE164IndianMobile(phone);
      // Firebase flow: confirm the SMS code → Firebase ID token → backend JWT.
      if (firebaseFlowRef.current && confirmationRef.current) {
        try {
          const firebaseIdToken = await getIdTokenFromConfirmation(
            confirmationRef.current,
            code,
          );
          const res = await loginWithBackend({ phone: e164, firebaseIdToken });
          landedRole = res.role;
          needsName = res.needsName;
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
          const res = await loginWithBackend({ phone: e164, otpCode: code });
          landedRole = res.role;
          needsName = res.needsName;
        } catch (err) {
          // Backend unreachable — demo fallback so local flows still work.
          if (code === "123456") {
            login(e164);
            landedRole = null;
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
      const saved = window.sessionStorage.getItem(LOGIN_RETURN_KEY);
      // Explicit returnTo (e.g. booking resume) wins; new users without a
      // profile name go through /welcome first (OtpVerifiedScreen parity),
      // then continue to the role dashboard resolved by loginWithBackend.
      // Any #hash is stripped — back-guard hashes must never leak into URLs.
      let returnTo = stripHash(saved ?? landingForRole(landedRole, phone));
      if (needsName && !saved) {
        window.sessionStorage.setItem(LOGIN_RETURN_KEY, returnTo);
        returnTo = "/welcome";
      }
      if (returnTo === "/") returnTo = "/#booking";
      // Post-login referral routing: if a referral code was stashed (e.g. from
      // /r/[code]), check if the user needs to apply for a role. The backend
      // already attached the referral during verifyOtp — we just route.
      if (!saved && referralCode) {
        try {
          const landing = (await referralApi.landing(referralCode)) as Record<string, unknown>;
          const nextAction = String(landing?.nextAction ?? "");
          const targetRoles = Array.isArray(landing?.targetRoles) ? landing.targetRoles : [];
          if (nextAction === "apply_form" && targetRoles.length > 0) {
            const role = normalizeFrontendRole(String(targetRoles[0]));
            if (role && role !== "customer") {
              // Carry the code as a query param so /apply prefill works even
              // if the stash is cleared elsewhere.
              returnTo = `/apply/${role}?referralCode=${encodeURIComponent(referralCode)}`;
            }
          }
        } catch { /* ignore — fall through to normal routing */ }
      }
      if (returnTo !== "/welcome") window.sessionStorage.removeItem(LOGIN_RETURN_KEY);
      router.push(returnTo);
    } catch {
      setOtpError("Network error — please try again.");
      setOtpState("idle");
    }
  }

  return (
    <main className="hawk-theme hawk-forest relative flex min-h-screen w-full items-center justify-center overflow-hidden px-4 py-16">
      {/* Host for the test-mode invisible verifier. Zero-size but never
          display:none / aria-hidden, so the injected iframe stays valid. */}
      <div id="recaptcha-test-container" className="absolute h-0 w-0 overflow-hidden" />
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
            {needsHumanCheck ? (
              <div className="border-border bg-muted flex flex-col items-center gap-3 rounded-xl border p-4">
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
                      "border-input bg-card focus:border-brand focus:ring-ring h-12 w-full rounded-xl border text-center text-lg font-semibold outline-none transition-colors focus:ring-2",
                      otpError && "border-destructive",
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

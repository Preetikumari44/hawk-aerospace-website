"use client";

// ---------------------------------------------------------------------------
// Firebase web client for the Hawk customer-service booking flow.
// Project: aerosystem-2d36c (mirrors User_Frontend/src/utils/firebase.js).
// Used for phone-OTP login: the user solves a VISIBLE checkbox reCAPTCHA
// ("manual" app verification — the same pattern FirebaseUI and most
// production web apps use), then signInWithPhoneNumber sends the SMS and the
// Firebase ID token is exchanged at the backend POST /auth/verify-otp for
// the app JWT (see lib/booking/api-client.ts).
//
// Why visible instead of invisible: invisible app-verification tokens are
// rejected (auth/invalid-app-credential) whenever the browser blocks
// third-party storage/fingerprinting (Brave Shields, strict cookie modes,
// ad-blockers) because the risk check cannot complete silently. A
// human-solved checkbox produces a token that passes regardless.
// ---------------------------------------------------------------------------

import { type FirebaseApp, getApp, getApps, initializeApp, setLogLevel } from "firebase/app";
import {
  ConfirmationResult,
  getAuth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
} from "firebase/auth";

const FIREBASE_CONFIG = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ?? "",
};

let app: FirebaseApp | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (app) return app;
  // Silence ALL SDK-internal chatter. Real failures still surface as thrown
  // errors that our UI explains.
  try {
    setLogLevel("silent");
  } catch {
    /* older SDKs without setLogLevel — ignore */
  }
  app = getApps().length > 0 ? getApp() : initializeApp(FIREBASE_CONFIG);
  return app;
}

/**
 * Whether Firebase dev test mode is available in this build. Requires
 * NEXT_PUBLIC_FIREBASE_TEST_MODE=true AND a non-production build. Test mode
 * itself additionally requires the number to be whitelisted in console →
 * Authentication → Sign-in method → Phone → "Phone numbers for testing".
 *
 * NOTE: App Check / reCAPTCHA Enterprise is intentionally NOT integrated:
 * Google answers "App not registered" for this web app ID, which is a
 * console-side provisioning state no client code can change.
 */
export function isFirebaseTestModeEnabled(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  return process.env.NEXT_PUBLIC_FIREBASE_TEST_MODE === "true";
}

/**
 * Toggles the SDK's appVerificationDisabledForTesting flag. This flag is
 * GLOBAL to the auth instance: while ON, even checkbox sends carry fake
 * tokens, so it must be OFF before any real-SMS attempt and reset on
 * logout. Never logs.
 */
export function setFirebaseTestMode(on: boolean): void {
  if (process.env.NODE_ENV === "production") return;
  try {
    (getAuth(getFirebaseApp()).settings as { appVerificationDisabledForTesting: boolean })
      .appVerificationDisabledForTesting = on;
  } catch {
    /* ignore */
  }
}

let recaptchaVerifier: RecaptchaVerifier | null = null;

export function resetRecaptcha(): void {
  try {
    recaptchaVerifier?.clear();
  } catch {
    /* ignore */
  }
  recaptchaVerifier = null;
}

export interface ManualRecaptchaCallbacks {
  /** Fired when the user solves the checkbox — send the SMS now. */
  onSolved: () => void;
  /** Fired when a solved token expires before use. */
  onExpired: () => void;
}

/**
 * Renders a FRESH visible checkbox reCAPTCHA widget into `containerId`.
 * A new widget is built on every call: reusing a spent or failed verifier
 * across attempts is a known source of `auth/invalid-app-credential`.
 * Never logs — failures reject to the caller.
 */
export async function prepareManualRecaptcha(
  containerId: string,
  callbacks: ManualRecaptchaCallbacks,
): Promise<RecaptchaVerifier> {
  const auth = getAuth(getFirebaseApp());
  // The checkbox path needs REAL tokens: make sure a previous test-mode
  // attempt didn't leave fake-token mode switched on.
  setFirebaseTestMode(false);
  resetRecaptcha();
  const verifier = new RecaptchaVerifier(auth, containerId, {
    size: "normal",
    theme: "dark",
    callback: () => callbacks.onSolved(),
    "expired-callback": () => callbacks.onExpired(),
  });
  recaptchaVerifier = verifier;
  await verifier.render();
  return verifier;
}

/**
 * Sends the Firebase SMS using the currently prepared manual widget.
 * Call only after its `onSolved` fired. Resets the widget on failure so a
 * retry always starts from a clean challenge. Never logs.
 */
export async function signInWithManualVerifier(phoneE164: string): Promise<ConfirmationResult> {
  const verifier = recaptchaVerifier;
  if (!verifier) throw new Error("Security check not ready — please solve the checkbox first.");
  try {
    return await signInWithPhoneNumber(getAuth(getFirebaseApp()), phoneE164, verifier);
  } catch (err) {
    resetRecaptcha();
    throw err;
  }
}

/**
 * Test-mode SMS send (invisible widget, no solving needed). Works ONLY when
 * test mode is enabled AND the number is whitelisted as a Firebase console
 * test number — Google rejects anything else. Fake-token mode is switched
 * back OFF on failure so a later checkbox attempt sends real tokens.
 * Never logs.
 */
export async function sendTestModeSms(
  phoneE164: string,
  containerId = "recaptcha-test-container",
): Promise<ConfirmationResult> {
  if (!isFirebaseTestModeEnabled()) {
    throw new Error("Test mode is not enabled for this build.");
  }
  setFirebaseTestMode(true);
  const auth = getAuth(getFirebaseApp());
  resetRecaptcha();
  const verifier = new RecaptchaVerifier(auth, containerId, { size: "invisible" });
  recaptchaVerifier = verifier;
  try {
    await verifier.render();
  } catch {
    /* render failure surfaces as a sign-in error below */
  }
  try {
    return await signInWithPhoneNumber(auth, phoneE164, verifier);
  } catch (err) {
    setFirebaseTestMode(false);
    resetRecaptcha();
    throw err;
  }
}

/** Exchanges a confirmed Firebase result for the Firebase ID token. */
export async function getIdTokenFromConfirmation(
  confirmation: ConfirmationResult,
  otpCode: string,
): Promise<string> {
  const credential = await confirmation.confirm(otpCode);
  return credential.user.getIdToken();
}

export function toE164Indian(mobile10: string): string {
  const digits = mobile10.replace(/\D/g, "").slice(-10);
  return `+91${digits}`;
}

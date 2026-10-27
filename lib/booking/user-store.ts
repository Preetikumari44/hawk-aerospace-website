import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

import type { BookingRole } from "./types";

// ---------------------------------------------------------------------------
// Username/password credentials for Customer accounts, added alongside the
// existing phone + OTP login (§17). This is the account's IDENTITY store —
// never the source of truth held in the browser: passwords are hashed
// server-side (scrypt + per-user salt) and never sent back to the client in
// any form.
//
// DEMO STORAGE NOTE: like otp-resend-guard.ts, this lives in a module-level
// Map for the lifetime of the server process — swap for a real database
// (the existing backend/API architecture) behind this same function
// contract for a production, multi-instance deployment. What matters for
// this phase is the *shape* of the auth: real hashing, real persistence
// contract, no plaintext passwords, no browser storage of credentials.
// ---------------------------------------------------------------------------

interface StoredCustomer {
  username: string;
  passwordHash: string;
  salt: string;
  fullName: string;
  phone: string;
  email: string;
  role: BookingRole;
  createdAt: number;
}

const usersByUsername = new Map<string, StoredCustomer>();
const usersByPhone = new Map<string, string>(); // phone -> username

function hashPassword(password: string, salt: string): string {
  return scryptSync(password, salt, 64).toString("hex");
}

export type RegisterResult =
  | { ok: true }
  | { ok: false; error: "USERNAME_TAKEN" | "PHONE_TAKEN" | "WEAK_PASSWORD" };

export function registerCustomer(input: {
  fullName: string;
  phone: string;
  email: string;
  username: string;
  password: string;
}): RegisterResult {
  const username = input.username.trim().toLowerCase();
  if (input.password.length < 8) return { ok: false, error: "WEAK_PASSWORD" };
  if (usersByUsername.has(username)) return { ok: false, error: "USERNAME_TAKEN" };
  if (usersByPhone.has(input.phone)) return { ok: false, error: "PHONE_TAKEN" };

  const salt = randomBytes(16).toString("hex");
  usersByUsername.set(username, {
    username,
    passwordHash: hashPassword(input.password, salt),
    salt,
    fullName: input.fullName.trim(),
    phone: input.phone,
    email: input.email.trim(),
    role: "customer", // Every self-registered account is Customer-only this phase (§20).
    createdAt: Date.now(),
  });
  usersByPhone.set(input.phone, username);
  return { ok: true };
}

export type LoginResult =
  | { ok: true; phone: string; role: BookingRole }
  | { ok: false; error: "INVALID_CREDENTIALS" };

export function loginCustomer(username: string, password: string): LoginResult {
  const record = usersByUsername.get(username.trim().toLowerCase());
  if (!record) return { ok: false, error: "INVALID_CREDENTIALS" };

  const attempted = hashPassword(password, record.salt);
  const stored = Buffer.from(record.passwordHash, "hex");
  const attemptedBuf = Buffer.from(attempted, "hex");
  const matches =
    stored.length === attemptedBuf.length && timingSafeEqual(stored, attemptedBuf);

  if (!matches) return { ok: false, error: "INVALID_CREDENTIALS" };
  return { ok: true, phone: record.phone, role: record.role };
}

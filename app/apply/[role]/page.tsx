"use client";

// Role application form — Super App RoleApplicationFormScreen parity:
// config-driven fields, document TYPE selector (nothing pre-rendered, min 2),
// per-doc upload + on-device OCR auto-read with retry, pilot resume +
// experience range gating, referral prefill, and guest in-form phone OTP
// (no-login application via submitGuest).

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";

import Footer from "@/components/homepage/footer/default";
import Navbar from "@/components/homepage/navbar/default";
import { Button } from "@/components/ui/button";
import { LayoutLines } from "@/components/ui/layout-lines";
import { AerialScene } from "@/components/visuals/aerial-scene";
import { useBookingAuth } from "@/lib/booking/auth-context";
import { roleApplicationsApi, filesApi, referralApi } from "@/lib/booking/role-apis";
import { normalizeBackendRole } from "@/lib/booking/roles";
import { DOCUMENT_OPTIONS, ROLE_APPLICATION_CONFIG } from "@/lib/booking/roles";
import {
  preloadDocumentOcr,
  scanDocumentNumber,
} from "@/lib/booking/document-ocr";
import {
  resolveDocKind,
  validateDocumentNumber,
} from "@/lib/booking/document-number-extractor";
import {
  getIdTokenFromConfirmation,
  prepareManualRecaptcha,
  resetRecaptcha,
  signInWithManualVerifier,
  toE164Indian,
} from "@/lib/booking/firebase-client";
import type { ConfirmationResult } from "firebase/auth";

const inputClass =
  "border-input bg-card focus:border-brand focus:ring-ring h-12 w-full rounded-xl border px-3.5 text-base outline-none transition-colors focus:ring-2";

interface DocSlot {
  slotId: string;
  typeId: string;
  customName: string;
}

interface DocUpload {
  url: string;
  fileName: string;
  mimeType: string;
  previewUrl?: string;
  /** Bucket-relative path returned by /files/* (used verbatim by the
   *  backend parser — never derive this from the URL, whose pathname
   *  includes the bucket prefix). */
  storagePath?: string;
}

type ScanState = "idle" | "scanning" | "auto" | "unreadable";

function docLabel(slot: DocSlot): string {
  if (slot.typeId === "others") return slot.customName.trim() || "Other Document";
  return DOCUMENT_OPTIONS.find((o) => o.id === slot.typeId)?.label ?? slot.typeId;
}

function storagePathOf(url: string): string {
  try {
    // GCS public/signed URLs look like /<bucket>/<object-path> — the backend
    // needs the bare object path, so drop the leading slash + bucket segment.
    const parts = new URL(url).pathname.split("/").filter(Boolean);
    const decoded = parts.map((p) => {
      try {
        return decodeURIComponent(p);
      } catch {
        return p;
      }
    });
    return decoded.length > 1 ? decoded.slice(1).join("/") : decoded.join("/");
  } catch {
    return url;
  }
}

export default function ApplyRolePage() {
  return (
    <React.Suspense fallback={<ApplyFallback />}>
      <ApplyInner />
    </React.Suspense>
  );
}

function ApplyFallback() {
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

function ApplyInner() {
  const params = useParams<{ role?: string | string[] }>();
  const search = useSearchParams();
  const router = useRouter();
  const { isAuthenticated, requestLogin, backendUser } = useBookingAuth();
  const rawRole = Array.isArray(params?.role) ? params.role[0] : (params?.role ?? search.get("role") ?? "");
  const role = String(rawRole).toLowerCase();
  const config = ROLE_APPLICATION_CONFIG[role];

  const [form, setForm] = React.useState<Record<string, string>>({});
  const [selectedServices, setSelectedServices] = React.useState<string[]>([]);
  // Document slots — chosen by the user from DOCUMENT_OPTIONS, NOTHING
  // pre-rendered (mobile parity: min 2 uploads).
  const [slots, setSlots] = React.useState<DocSlot[]>([]);
  const [uploads, setUploads] = React.useState<Record<string, DocUpload>>({});
  const [fileRefs, setFileRefs] = React.useState<Record<string, File>>({});
  const [uploading, setUploading] = React.useState<Record<string, boolean>>({});
  const [docNumbers, setDocNumbers] = React.useState<Record<string, string>>({});
  const [docScan, setDocScan] = React.useState<Record<string, ScanState>>({});
  const [pickerType, setPickerType] = React.useState("");
  const [pickerName, setPickerName] = React.useState("");
  // Pilot-only resume upload (image / pdf / docx).
  const [resume, setResume] = React.useState<DocUpload | null>(null);
  const [resumeUploading, setResumeUploading] = React.useState(false);
  const [referralCode, setReferralCode] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [guestDone, setGuestDone] = React.useState(false);

  // Guest in-form phone OTP (no-login application).
  const [guestPhone, setGuestPhone] = React.useState("");
  const [guestOtpSent, setGuestOtpSent] = React.useState(false);
  const [guestOtp, setGuestOtp] = React.useState("");
  const [guestBusy, setGuestBusy] = React.useState(false);
  const [guestVerified, setGuestVerified] = React.useState(false);
  const [guestIdToken, setGuestIdToken] = React.useState<string | null>(null);
  const [guestCaptchaReady, setGuestCaptchaReady] = React.useState(false);
  const confirmationRef = React.useRef<ConfirmationResult | null>(null);

  // Warm the OCR worker during idle — first scan feels instant.
  React.useEffect(() => {
    preloadDocumentOcr();
    return () => resetRecaptcha();
  }, []);

  React.useEffect(() => {
    if (backendUser?.phone && !form.phone) {
      setForm((f) => ({ ...f, phone: String(backendUser.phone ?? "") }));
    }
    if (backendUser?.name && !form.name) {
      setForm((f) => ({ ...f, name: String(backendUser.name ?? "") }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- prefill once.
  }, [backendUser]);

  // Referral: no code input on the form. The signup/login code (query or
  // stash) travels silently in the submit payload; the form only shows WHO
  // invited them ("Invited by" row, hidden when there is no inviter).
  function extractCode(raw: string | null | undefined): string {
    if (!raw) return "";
    const t = raw.trim();
    if (!t) return "";
    // Stash may be a JSON blob {code, role} from the Super App.
    if (t.startsWith("{")) {
      try {
        const parsed = JSON.parse(t) as { code?: unknown };
        if (parsed && typeof parsed.code === "string") return parsed.code.toUpperCase().trim();
      } catch {
        /* fall through to plain handling */
      }
    }
    // Strip HAWK- prefix variants / quoting artefacts, keep the core code.
    return t.replace(/^["'{]+|["'}]+$/g, "").toUpperCase().trim();
  }
  const [inviter, setInviter] = React.useState<{ name: string; phone: string | null } | null>(null);
  React.useEffect(() => {
    const q = search.get("referralCode") || search.get("referral") || search.get("code");
    let stash: string | null = null;
    try {
      stash = window.localStorage.getItem("@pending_referral_code");
    } catch {
      /* ignore */
    }
    const code = extractCode(q || stash || "");
    if (code) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time prefill.
      setReferralCode((prev) => prev || code);
      // Resolve the inviter for the "Invited by" row (best-effort; row hides on failure).
      referralApi
        .inviter(code)
        .then((v) => {
          const name = String(v?.name ?? "").trim();
          if (name) setInviter({ name, phone: String(v?.phone ?? "").trim() || null });
        })
        .catch(() => {
          /* invalid/expired code — no row */
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- prefill on query/stash arrival.
  }, [search]);

  function toggleService(opt: string) {
    setSelectedServices((prev) => (prev.includes(opt) ? prev.filter((s) => s !== opt) : [...prev, opt]));
  }

  function addDocSlot() {
    const typeId = pickerType.trim();
    if (!typeId) {
      setError("Select a document type first.");
      return;
    }
    if (typeId === "others" && !pickerName.trim()) {
      setError("Name your other document first.");
      return;
    }
    if (typeId !== "others" && slots.some((s) => s.typeId === typeId)) {
      setError("That document type is already added.");
      return;
    }
    setError(null);
    setSlots((p) => [...p, { slotId: `doc_${Date.now()}_${p.length}`, typeId, customName: pickerName.trim() }]);
    setPickerType("");
    setPickerName("");
  }

  function removeSlot(slotId: string) {
    setSlots((p) => p.filter((s) => s.slotId !== slotId));
    setUploads((p) => {
      const next = { ...p };
      delete next[slotId];
      return next;
    });
    setFileRefs((p) => {
      const next = { ...p };
      delete next[slotId];
      return next;
    });
    setDocNumbers((p) => {
      const next = { ...p };
      delete next[slotId];
      return next;
    });
    setDocScan((p) => {
      const next = { ...p };
      delete next[slotId];
      return next;
    });
  }

  /** Upload a file (authed JWT, or guest Firebase token); returns the entry.
   *  Always sends category (backend 400s without it) — kyc for ID docs,
   *  other for resumes. Any file type is accepted; wrong files are allowed
   *  and reviewed at approval time. */
  async function uploadFile(file: File, documentType?: string, category = "kyc"): Promise<DocUpload> {
    const formData = new FormData();
    formData.append("file", file, file.name);
    formData.append("category", category);
    if (documentType) formData.append("documentType", documentType);
    const res = isAuthenticated
      ? await filesApi.upload(formData)
      : await (async () => {
          if (!guestIdToken) throw new Error("Verify your phone number (OTP) before uploading documents.");
          formData.append("firebaseIdToken", guestIdToken);
          return filesApi.uploadGuest(formData);
        })();
    const url = String(res.downloadUrl ?? res.url ?? "");
    if (!url) throw new Error("Upload succeeded but returned no URL.");
    const entry: DocUpload = {
      url,
      fileName: String(res.fileName ?? file.name),
      mimeType: String(res.mimeType ?? file.type),
      // Prefer the server's bucket-relative path verbatim; the URL-derived
      // fallback (storagePathOf) keeps a bucket prefix that GCS rejects.
      storagePath: typeof res.storagePath === "string" && res.storagePath ? String(res.storagePath) : undefined,
    };
    if (file.type.startsWith("image/")) {
      try {
        entry.previewUrl = URL.createObjectURL(file);
      } catch {
        entry.previewUrl = url;
      }
    }
    return entry;
  }

  /** Fire-and-forget on-device scan in PARALLEL with the upload — numbers are
   *  never typed, what lands in the DB is the auto-read value. */
  function autoScan(slotId: string, typeId: string, file: File) {
    setDocScan((p) => ({ ...p, [slotId]: "scanning" }));
    scanDocumentNumber(file, typeId)
      .then((r) => {
        if (r.number) {
          setDocNumbers((p) => (p[slotId] ? p : { ...p, [slotId]: r.number as string }));
          setDocScan((p) => ({ ...p, [slotId]: "auto" }));
        } else {
          setDocScan((p) => ({ ...p, [slotId]: "unreadable" }));
        }
      })
      .catch(() => setDocScan((p) => ({ ...p, [slotId]: "unreadable" })));
  }

  async function handleDocPick(slot: DocSlot, file: File | undefined) {
    if (!file) return;
    setFileRefs((p) => ({ ...p, [slot.slotId]: file }));
    setUploading((p) => ({ ...p, [slot.slotId]: true }));
    setError(null);
    autoScan(slot.slotId, slot.typeId, file);
    try {
      const entry = await uploadFile(file, slot.typeId, "kyc");
      setUploads((p) => ({ ...p, [slot.slotId]: entry }));
    } catch (err) {
      setError(err instanceof Error ? err.message : `Upload failed for ${docLabel(slot)}.`);
    } finally {
      setUploading((p) => ({ ...p, [slot.slotId]: false }));
    }
  }

  function retryScan(slot: DocSlot) {
    const file = fileRefs[slot.slotId];
    if (!file) {
      setError("Please upload the document again to retry auto-read.");
      return;
    }
    autoScan(slot.slotId, slot.typeId, file);
  }

  async function handleResumePick(file: File | undefined) {
    if (!file) return;
    setResumeUploading(true);
    setError(null);
    try {
      setResume(await uploadFile(file, "resume", "other"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Resume upload failed.");
    } finally {
      setResumeUploading(false);
    }
  }

  // ---- Guest phone OTP ----
  async function sendGuestOtp() {
    const digits = guestPhone.replace(/\D/g, "").slice(-10);
    if (digits.length !== 10) {
      setError("Enter a valid 10-digit mobile number for OTP verification.");
      return;
    }
    setGuestBusy(true);
    setError(null);
    try {
      await prepareManualRecaptcha("guest-recaptcha", {
        onSolved: () => undefined,
        onExpired: () => setError("Verification expired — solve the checkbox again."),
      });
      setGuestCaptchaReady(true);
      confirmationRef.current = await signInWithManualVerifier(toE164Indian(digits));
      setGuestOtpSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send OTP.");
    } finally {
      setGuestBusy(false);
    }
  }

  async function verifyGuestOtp() {
    if (!confirmationRef.current || guestOtp.replace(/\D/g, "").length < 4) {
      setError("Enter the OTP sent to your phone.");
      return;
    }
    setGuestBusy(true);
    setError(null);
    try {
      const idToken = await getIdTokenFromConfirmation(confirmationRef.current, guestOtp.trim());
      setGuestIdToken(idToken);
      setGuestVerified(true);
      const digits = guestPhone.replace(/\D/g, "").slice(-10);
      setForm((f) => ({ ...f, phone: f.phone || digits }));
    } catch {
      setError("Incorrect code. Please try again.");
    } finally {
      setGuestBusy(false);
    }
  }

  if (!config) {
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

        <div className="border-border bg-card shadow-2xl backdrop-blur-md flex max-w-md flex-col items-center gap-4 rounded-3xl border p-8 text-center">
          <span className="eyebrow">Apply</span>
          <p className="text-muted-foreground text-sm">
            Unknown role “{role}”. Choose pilot, sales, fleet or technician.
          </p>
          <Button asChild>
            <Link href="/account">My Roles</Link>
          </Button>
        </div>
      </main>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    for (const f of config.fields) {
      if (f.type === "multiselect") {
        if (f.required && selectedServices.length === 0) {
          setError(`${f.label} is required.`);
          return;
        }
        continue;
      }
      if (f.required && !String(form[f.key] ?? "").trim()) {
        setError(`${f.label} is required.`);
        return;
      }
    }
    // Resume is required for pilot + technician (experience is parsed from it
    // in the backend after submit — never typed, never blocking).
    const needsResume = role === "pilot" || role === "technician";
    if (needsResume && !resume?.url) {
      setError(`Resume upload is required for the ${config.title} application.`);
      return;
    }
    // Guest applications require verified phone OTP.
    if (!isAuthenticated && !guestVerified) {
      setError("Verify your phone number (OTP) before submitting a guest application.");
      return;
    }
    // Documents: min 2 uploads; every required config kind present; every
    // uploaded doc carries its auto-read (or manually confirmed) number.
    const uploaded = slots.filter((s) => uploads[s.slotId]?.url);
    if (uploaded.length < 2) {
      setError("Upload at least 2 documents — choose types from the list first.");
      return;
    }
    const requiredKinds = new Set(
      config.documents.filter((d) => d.required).map((d) => resolveDocKind(d.key)),
    );
    const presentKinds = new Set(uploaded.map((s) => resolveDocKind(s.typeId)));
    for (const kind of requiredKinds) {
      if (!presentKinds.has(kind)) {
        setError(`A ${kind.replace(/_/g, " ")} document is required — add it from the list.`);
        return;
      }
    }
    // Document numbers are OPTIONAL — uploads succeed even with wrong/missing
    // numbers; reviewers verify at approval time. Only flag format when the
    // user typed something that looks invalid (soft warning, not a block).
    for (const s of uploaded) {
      const n = (docNumbers[s.slotId] ?? "").trim();
      if (n && !validateDocumentNumber(n, s.typeId)) {
        // Soft warning only — do not block submission.
        console.warn(`Document number format looks off for ${docLabel(s)}: ${n}`);
      }
    }
    setSubmitting(true);
    try {
      // Backend expects `documents` as an ARRAY (mobile parity) — never a
      // slot-keyed object.
      const documents = uploaded.map((s) => {
        const entry = uploads[s.slotId];
        const n = (docNumbers[s.slotId] ?? "").trim();
        return {
          type: s.typeId,
          name: docLabel(s),
          ...(n ? { number: n } : {}),
          storagePath: entry.storagePath ?? storagePathOf(entry.url),
          downloadUrl: entry.url,
        };
      });
      const payload = {
        role: normalizeBackendRole(config.backendRole),
        roleLabel: config.title,
        formData: {
          ...form,
          ...(config.fields.some((f) => f.type === "multiselect") ? { serviceTypes: selectedServices } : {}),
          // Resume travels with storage path so the backend parser can fetch
          // the file without depending on signed-URL longevity.
          ...(needsResume && resume?.url
            ? { resumeUrl: resume.url, resumeFileName: resume.fileName, resumeStoragePath: resume.storagePath ?? storagePathOf(resume.url), resumeMimeType: resume.mimeType }
            : {}),
        },
        documents,
        ...(referralCode.trim() ? { referralCode: referralCode.trim().toUpperCase() } : {}),
      };
      if (isAuthenticated) {
        await roleApplicationsApi.submit(payload);
        router.push(`/application-status?role=${role}&fresh=1`);
      } else {
        await roleApplicationsApi.submitGuest({
          ...payload,
          firebaseIdToken: guestIdToken as string,
          phone: toE164Indian((form.phone || guestPhone).replace(/\D/g, "").slice(-10)),
        });
        setGuestDone(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed. Please try again.");
      setSubmitting(false);
    }
  }

  if (guestDone) {
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

        <div className="border-border bg-card shadow-2xl backdrop-blur-md flex max-w-md flex-col items-center gap-4 rounded-3xl border p-8 text-center">
          <span className="eyebrow">{config.successSubtitle}</span>
          <p className="text-muted-foreground text-sm">
            {config.successSubtitle}. Log in with your verified number anytime to track approval.
          </p>
          <Button size="lg" onClick={() => requestLogin("/account")}>
            Log In to Track Status
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="hawk-theme hawk-forest relative min-h-screen w-full overflow-hidden">
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
      <Navbar />
      <section className="px-4 pt-28 pb-16 sm:pt-36 sm:pb-24">
        <div className="max-w-container mx-auto flex max-w-2xl flex-col gap-6">
          <span className="eyebrow">Apply · {config.title}</span>
          <h1 className="text-3xl font-semibold sm:text-4xl">{config.title} Application</h1>
          <p className="text-muted-foreground text-sm">{config.description}</p>

          {!isAuthenticated ? (
            <div className="border-border bg-card shadow-2xl backdrop-blur-md flex flex-col gap-3 rounded-3xl border p-6">
              <span className="text-foreground text-sm font-semibold">
                No login needed — verify your phone to apply as guest
              </span>
              <div id="guest-recaptcha" className="flex min-h-[78px] justify-center" />
              {!guestVerified ? (
                <>
                  <div className="flex gap-2">
                    <input
                      value={guestPhone}
                      onChange={(e) => setGuestPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      placeholder="10-digit mobile number"
                      inputMode="numeric"
                      className={`${inputClass} flex-1`}
                    />
                    <Button type="button" variant="outline" disabled={guestBusy} onClick={() => void sendGuestOtp()}>
                      {guestOtpSent ? "Resend OTP" : "Send OTP"}
                    </Button>
                  </div>
                  {guestOtpSent ? (
                    <div className="flex gap-2">
                      <input
                        value={guestOtp}
                        onChange={(e) => setGuestOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        placeholder="6-digit OTP"
                        inputMode="numeric"
                        className={`${inputClass} flex-1`}
                      />
                      <Button type="button" disabled={guestBusy} onClick={() => void verifyGuestOtp()}>
                        Verify & Proceed
                      </Button>
                    </div>
                  ) : guestCaptchaReady ? (
                    <p className="text-muted-foreground text-xs">
                      Tick the checkbox above — the SMS sends automatically.
                    </p>
                  ) : null}
                </>
              ) : (
                <p className="text-sm font-semibold text-emerald-500">
                  ✓ Phone verified — fill the form below to submit.
                </p>
              )}
              <button
                type="button"
                onClick={() => requestLogin(`/apply/${role}`)}
                className="text-muted-foreground hover:text-foreground text-xs underline underline-offset-4"
              >
                Prefer to log in first instead
              </button>
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="border-border bg-card shadow-2xl backdrop-blur-md flex flex-col gap-4 rounded-3xl border p-6">
            {config.fields.map((f) =>
              f.type === "multiselect" ? (
                <div key={f.key} className="flex flex-col gap-2">
                  <span className="text-foreground text-sm font-medium">
                    {f.label} {f.required ? "*" : ""}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {(f.options ?? []).map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => toggleService(opt)}
                        className={
                          selectedServices.includes(opt)
                            ? "bg-brand text-background rounded-full px-3 py-1.5 text-xs font-semibold"
                            : "border-border/60 text-muted-foreground rounded-full border px-3 py-1.5 text-xs"
                        }
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              ) : f.type === "textarea" ? (
                <label key={f.key} className="flex flex-col gap-1.5">
                  <span className="text-foreground text-sm font-medium">
                    {f.label} {f.required ? "*" : ""}
                  </span>
                  <textarea
                    value={form[f.key] ?? ""}
                    onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                    rows={3}
                    className={`${inputClass} h-auto py-2`}
                  />
                </label>
              ) : f.type === "select" ? (
                <label key={f.key} className="flex flex-col gap-1.5">
                  <span className="text-foreground text-sm font-medium">
                    {f.label} {f.required ? "*" : ""}
                  </span>
                  <select
                    value={form[f.key] ?? ""}
                    onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                    className={inputClass}
                  >
                    <option value="">Select…</option>
                    {(f.options ?? []).map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <label key={f.key} className="flex flex-col gap-1.5">
                  <span className="text-foreground text-sm font-medium">
                    {f.label} {f.required ? "*" : ""}
                  </span>
                  <input
                    type={f.type === "number" ? "number" : f.type === "email" ? "email" : f.type === "phone" ? "tel" : "text"}
                    value={form[f.key] ?? ""}
                    placeholder={f.placeholder}
                    onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                    className={inputClass}
                  />
                </label>
              ),
            )}

            <div className="flex flex-col gap-3">
              <span className="text-foreground text-sm font-semibold">
                Documents <span className="text-muted-foreground font-normal">(choose types, upload min 2)</span>
              </span>

              {/* Selector FIRST — nothing is pre-rendered. */}
              <div className="border-border bg-card shadow-2xl backdrop-blur-md flex flex-col gap-2 rounded-xl border p-3">
                <span className="text-foreground text-sm font-medium">Add a document</span>
                <div className="flex flex-wrap gap-2">
                  <select
                    value={pickerType}
                    onChange={(e) => setPickerType(e.target.value)}
                    className="border-input bg-card focus:border-brand focus:ring-ring h-12 flex-1 rounded-xl border px-3.5 text-base outline-none transition-colors focus:ring-2"
                  >
                    <option value="">Select document type…</option>
                    {DOCUMENT_OPTIONS.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  {pickerType === "others" ? (
                    <input
                      value={pickerName}
                      onChange={(e) => setPickerName(e.target.value)}
                      placeholder="Document name"
                      className={`${inputClass} flex-1`}
                    />
                  ) : null}
                  <Button type="button" variant="outline" onClick={addDocSlot}>
                    Add
                  </Button>
                </div>
                {slots.length < 2 ? (
                  <p className="text-muted-foreground text-xs">
                    {slots.length === 0
                      ? "No documents yet — pick at least 2 types above."
                      : "Add at least 1 more document type (min 2)."}
                  </p>
                ) : null}
              </div>

              {slots.map((slot) => {
                const entry = uploads[slot.slotId];
                const busy = uploading[slot.slotId];
                const scan = docScan[slot.slotId] ?? "idle";
                const number = docNumbers[slot.slotId] ?? "";
                const valid = number.trim() ? validateDocumentNumber(number, slot.typeId) : true;
                return (
                  <div key={slot.slotId} className="border-border bg-card shadow-2xl backdrop-blur-md flex flex-col gap-2 rounded-xl border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-foreground text-sm font-medium">{docLabel(slot)}</span>
                      <button
                        type="button"
                        onClick={() => removeSlot(slot.slotId)}
                        className="text-destructive text-xs underline underline-offset-4"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <label className="bg-brand text-background cursor-pointer rounded-md px-3 py-2 text-xs font-semibold">
                        {busy ? "Uploading…" : entry?.url ? "Re-upload" : "Choose file"}
                        <input
                          type="file"
                          className="hidden"
                          disabled={busy}
                          onChange={(e) => {
                            void handleDocPick(slot, e.target.files?.[0]);
                            e.target.value = "";
                          }}
                        />
                      </label>
                      {entry?.previewUrl || (entry?.url && entry.mimeType.startsWith("image/")) ? (
                        // eslint-disable-next-line @next/next/no-img-element -- local object-URL/file preview.
                        <img
                          src={entry.previewUrl ?? entry.url}
                          alt={docLabel(slot)}
                          className="h-16 w-16 rounded-md border object-cover"
                        />
                      ) : null}
                      <span className="text-muted-foreground min-w-0 flex-1 truncate text-xs">
                        {entry?.url ? entry.fileName : "No file uploaded yet"}
                      </span>
                    </div>
                    {/* Auto-read document number (OCR in parallel with upload) — optional. */}
                    <div className="flex flex-col gap-1.5">
                      <span className="text-foreground text-xs font-medium">
                        Document number <span className="text-muted-foreground font-normal">(optional)</span>
                      </span>
                      <div className="flex gap-2">
                        <input
                          value={number}
                          onChange={(e) => {
                            setDocNumbers((p) => ({ ...p, [slot.slotId]: e.target.value.toUpperCase() }));
                            setDocScan((p) => ({ ...p, [slot.slotId]: "idle" }));
                          }}
                          placeholder={scan === "scanning" ? "Auto-reading…" : "Auto-read from scan, or type it"}
                          className={`${inputClass}  flex-1 ${number.trim() && !valid ? "border-destructive/60" : ""}`}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          disabled={!fileRefs[slot.slotId] || scan === "scanning"}
                          onClick={() => retryScan(slot)}
                        >
                          Re-scan
                        </Button>
                      </div>
                      {scan === "scanning" ? (
                        <p className="text-muted-foreground text-xs">Scanning document…</p>
                      ) : scan === "auto" ? (
                        <p className="text-xs font-semibold text-emerald-500">✓ Auto-read from scan</p>
                      ) : scan === "unreadable" ? (
                        <p className="text-xs text-amber-500">Couldn&apos;t auto-read — type the number manually.</p>
                      ) : null}
                      {number.trim() && !valid ? (
                        <p className="text-destructive text-xs">That number format looks invalid for this document.</p>
                      ) : null}
                    </div>
                  </div>
                );
              })}

              {(role === "pilot" || role === "technician") ? (
                <div className="border-border bg-card shadow-2xl backdrop-blur-md flex flex-col gap-2 rounded-xl border p-3">
                  <span className="text-foreground text-sm font-medium">
                    Resume (image / PDF / DOCX) *
                  </span>
                  <p className="text-muted-foreground text-xs">
                    Your experience is read from the resume automatically after submit.
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                      <label className="bg-brand text-background cursor-pointer rounded-md px-3 py-2 text-xs font-semibold">
                      {resumeUploading ? "Uploading…" : resume?.url ? "Re-upload" : "Choose file"}
                      <input
                        type="file"
                        className="hidden"
                        disabled={resumeUploading}
                        onChange={(e) => {
                          void handleResumePick(e.target.files?.[0]);
                          e.target.value = "";
                        }}
                      />
                    </label>
                    <span className="text-muted-foreground text-xs">
                      {resume?.url ? `${resume.fileName} ✓` : "No resume uploaded"}
                    </span>
                  </div>
                </div>
              ) : null}
            </div>

            {inviter ? (
              <div className="border-border bg-card shadow-2xl backdrop-blur-md flex items-center gap-2 rounded-xl border p-3 text-sm">
                <span className="text-muted-foreground">Invited by</span>
                <span className="text-foreground font-semibold">{inviter.name}</span>
                {inviter.phone ? (
                  <span className="text-muted-foreground">{inviter.phone}</span>
                ) : null}
              </div>
            ) : null}

            {error ? <p className="text-destructive text-sm">{error}</p> : null}

            <Button type="submit" size="lg" disabled={submitting} className="w-full">
              {submitting ? "Submitting…" : `Submit ${config.title} Application`}
            </Button>
          </form>

          <Button variant="outline" asChild className="w-fit">
            <Link href="/account">Back to My Roles</Link>
          </Button>
        </div>
      </section>
      <Footer />
    </main>
  );
}

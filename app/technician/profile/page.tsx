"use client";

// Technician profile — teammate layout + mobile-only role switcher block
// (Super App parity: switch between approved roles from here).

import Link from "next/link";
import { Star } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

import { apiUpload } from "@/lib/booking/api-client";
import { useBookingAuth } from "@/lib/booking/auth-context";
import { approvedFrontendRoles, ROLE_META, type FrontendRole } from "@/lib/booking/roles";
import { useSessionIdentity } from "@/lib/booking/session-identity";
import { payoutApi, technicianApi } from "@/lib/booking/role-apis";
import { useTech } from "@/lib/tech/data";

const ROLE_OPTIONS: FrontendRole[] = ["customer", "pilot", "sales", "fleet", "technician"];

export default function TechProfile() {
  const { profile, rating, ratingCount, showToast, reload } = useTech();
  const { backendUser, frontendRole, switchRole, logout } = useBookingAuth();
  const router = useRouter();
  const [busy, setBusy] = React.useState<FrontendRole | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [photo, setPhoto] = React.useState<string>("");
  const [uploadingPhoto, setUploadingPhoto] = React.useState(false);
  const [methods, setMethods] = React.useState<Record<string, unknown>[]>([]);
  const [showPayout, setShowPayout] = React.useState(false);
  const [pType, setPType] = React.useState<"bank" | "upi">("upi");
  const [pHolder, setPHolder] = React.useState("");
  const [pNumber, setPNumber] = React.useState("");
  const [pIfsc, setPIfsc] = React.useState("");
  const [pUpi, setPUpi] = React.useState("");
  const [pSaving, setPSaving] = React.useState(false);
  const approved = approvedFrontendRoles(backendUser);
  const session = useSessionIdentity();

  React.useEffect(() => {
    payoutApi
      .methods()
      .then((v) => setMethods(Array.isArray(v) ? (v as Record<string, unknown>[]) : []))
      .catch(() => undefined);
  }, []);

  async function uploadPhoto(file: File | undefined) {
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const form = new FormData();
      form.append("file", file, file.name);
      form.append("category", "profile");
      const res = await apiUpload<{ downloadUrl?: string; url?: string }>("/files/upload", form);
      const url = res.downloadUrl ?? res.url ?? "";
      if (!url) throw new Error("Upload returned no URL.");
      await technicianApi.updateProfile({ photoUrl: url });
      setPhoto(url);
      showToast("Profile photo updated.");
      reload();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Photo upload failed.");
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function savePayout() {
    setPSaving(true);
    try {
      if (pType === "bank") {
        if (!pHolder.trim() || !/^\d{9,18}$/.test(pNumber.replace(/\D/g, "")) || !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(pIfsc.trim().toUpperCase())) {
          showToast("Check bank details (name, 9–18 digit number, IFSC).");
          return;
        }
        await payoutApi.addMethod({
          type: "bank",
          accountHolderName: pHolder.trim(),
          accountNumber: pNumber.replace(/\D/g, ""),
          ifscCode: pIfsc.trim().toUpperCase(),
        });
      } else {
        if (!/^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test(pUpi.trim())) {
          showToast("UPI ID looks invalid.");
          return;
        }
        await payoutApi.addMethod({ type: "upi", upiId: pUpi.trim() });
      }
      showToast("Payout method saved — verification requested.");
      setShowPayout(false);
      const ms = await payoutApi.methods().catch(() => []);
      setMethods(Array.isArray(ms) ? (ms as Record<string, unknown>[]) : []);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setPSaving(false);
    }
  }

  const fields: [string, string][] = [
    ["Name", profile.name],
    ["Phone", profile.phone || "No phone"],
    ["Email", profile.email || "No email"],
    ["Role", profile.role],
    ["User ID", session?.uid || profile.id || "Not assigned"],
    ["Detailed Address", session?.address || profile.address],
  ];

  async function handleSwitch(role: FrontendRole) {
    setBusy(role);
    setError(null);
    try {
      await switchRole(role);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Switch failed.");
      setBusy(null);
    }
  }

  return (
    <>
      <div className="title">Profile</div>
      <p className="sub">Technician account.</p>
      <div className="card mt-3.5">
        <div className="flex gap-3 items-center mb-2">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element -- user-uploaded profile photo.
            <img src={photo} alt={profile.name} style={{ width: 54, height: 54, borderRadius: "50%", objectFit: "cover" }} />
          ) : (
            <span className="avatar" style={{ width: 54, height: 54, fontSize: 20 }}>
              {profile.name[0] || "T"}
            </span>
          )}
          <div>
            <b style={{ fontSize: 18 }}>{profile.name}</b>
            <p className="sub flex items-center gap-1">
              {profile.role} ·{" "}
              {rating != null ? (
                <>
                  <Star size={12} className="inline" aria-hidden="true" /> {rating.toFixed(1)}
                  {ratingCount != null ? ` (${ratingCount})` : ""}
                </>
              ) : (
                profile.rating
              )}
            </p>
            <label style={{ cursor: "pointer", fontSize: 12, color: "var(--forest)", fontWeight: 700 }}>
              {uploadingPhoto ? "Uploading…" : photo ? "Change photo" : "Add photo"}
              <input
                type="file"
                accept="image/*"
                hidden
                disabled={uploadingPhoto}
                onChange={(e) => {
                  void uploadPhoto(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
        </div>
        {fields.map(([k, v]) => (
          <div className="field" key={k}>
            <span>{k}</span>
            <b style={{ fontSize: 13 }}>{v}</b>
          </div>
        ))}
      </div>

      <div className="card mt-3.5">
        <h3 className="sectiontitle">Payout Method</h3>
        {methods.length === 0 ? (
          <div className="empty">No payout methods yet.</div>
        ) : (
          methods.slice(0, 3).map((m, i) => (
            <div className="cartrow" key={String(m.id ?? i)}>
              <b style={{ fontSize: 13 }}>{String(m.label ?? "Account")}</b>
              <span className="sub">{String(m.verificationStatus ?? "")}</span>
            </div>
          ))
        )}
        {!showPayout ? (
          <button className="btn secondary mt-2" onClick={() => setShowPayout(true)}>
            Add Payout Method
          </button>
        ) : (
          <div className="flex flex-col gap-2 mt-2">
            <div className="chips" style={{ padding: 0 }}>
              <button className={"chip" + (pType === "upi" ? " active" : "")} onClick={() => setPType("upi")}>
                UPI
              </button>
              <button className={"chip" + (pType === "bank" ? " active" : "")} onClick={() => setPType("bank")}>
                Bank
              </button>
            </div>
            {pType === "upi" ? (
              <input className="search" value={pUpi} onChange={(e) => setPUpi(e.target.value)} placeholder="UPI ID (name@bank)" />
            ) : (
              <>
                <input className="search" value={pHolder} onChange={(e) => setPHolder(e.target.value)} placeholder="Account holder name" />
                <input className="search" value={pNumber} onChange={(e) => setPNumber(e.target.value.replace(/\D/g, ""))} placeholder="Account number" inputMode="numeric" />
                <input className="search" value={pIfsc} onChange={(e) => setPIfsc(e.target.value.toUpperCase())} placeholder="IFSC" />
              </>
            )}
            <div className="flex gap-2">
              <button className="btn" disabled={pSaving} onClick={() => void savePayout()}>
                {pSaving ? "Saving…" : "Save & Verify"}
              </button>
              <button className="btn secondary" onClick={() => setShowPayout(false)}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="card mt-3.5">
        <h3 className="sectiontitle">Your Role</h3>
        {ROLE_OPTIONS.map((r) => {
          const isCurrent = frontendRole === r;
          const isApproved = approved.includes(r);
          return (
            <div className="cartrow" key={r}>
              <b style={{ fontSize: 13 }}>
                {ROLE_META[r]?.label}
                {isCurrent ? " · Current" : ""}
              </b>
              <button
                className="btn secondary"
                disabled={isCurrent || busy !== null || !isApproved}
                onClick={() => void handleSwitch(r)}
                title={isApproved ? `Switch to ${ROLE_META[r]?.label}` : "Apply from My Roles first"}
              >
                {busy === r ? "Switching…" : isCurrent ? "Current" : isApproved ? "Switch" : "Locked"}
              </button>
            </div>
          );
        })}
        {error ? <p style={{ color: "var(--danger)", fontSize: 12 }}>{error}</p> : null}
        <button className="btn secondary mt-2" style={{ width: "100%" }} onClick={() => router.push("/account")}>
          My Roles · apply for more
        </button>
      </div>

      <div className="card mt-3.5">
        <h3 className="sectiontitle">Support & More</h3>
        <div className="flex gap-2 flex-wrap">
          <Link href="/chat" className="btn secondary">
            Chat
          </Link>
          <Link href="/support" className="btn secondary">
            Support
          </Link>
          <Link href="/refer" className="btn secondary">
            Refer & Earn
          </Link>
        </div>
      </div>

      <button
        className="btn danger mt-3.5"
        onClick={() => {
          logout();
          router.replace("/");
        }}
      >
        Logout
      </button>
    </>
  );
}

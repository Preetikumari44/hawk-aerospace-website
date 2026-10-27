"use client";

// Edit details — Super App EditDetailsScreen parity: name/email/phone/
// address/DOB + profile photo (upload), UID copy, PATCH /users/me.

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";

import Footer from "@/components/homepage/footer/default";
import Navbar from "@/components/homepage/navbar/default";
import { Button } from "@/components/ui/button";
import { LayoutLines } from "@/components/ui/layout-lines";
import { AerialScene } from "@/components/visuals/aerial-scene";
import { Reveal } from "@/components/ui/reveal";
import { apiUpload,customerApi } from "@/lib/booking/api-client";
import { useBookingAuth } from "@/lib/booking/auth-context";
import { sessionApi } from "@/lib/booking/role-apis";

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function isoToInput(iso: string): string {
  const m = iso.slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : "";
}

const input =
  "border-input bg-card focus:border-brand focus:ring-ring h-12 w-full rounded-xl border px-3.5 text-base outline-none transition-colors focus:ring-2";

export default function EditDetailsPage() {
  const router = useRouter();
  const { isAuthenticated, requestLogin, refreshUser } = useBookingAuth();
  const [loading, setLoading] = React.useState(true);
  const [uid, setUid] = React.useState("");
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [dob, setDob] = React.useState("");
  const [photo, setPhoto] = React.useState("");
  const [uploading, setUploading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    sessionApi
      .getCurrentUser()
      .then((m) => {
        if (cancelled) return;
        const profile = ((m ?? {}) as Record<string, unknown>).profileData as
          | Record<string, unknown>
          | undefined;
        const o = (m ?? {}) as Record<string, unknown>;
        setUid(str(o.uid ?? o.id));
        setName(str(o.name));
        setEmail(str(o.email));
        setPhone(str(o.phone));
        setAddress(str(profile?.address ?? o.address));
        setDob(isoToInput(str(profile?.dob)));
        setPhoto(str(profile?.photoUrl ?? o.profilePhoto ?? o.photoUrl));
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  if (!isAuthenticated) {
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
          <span className="eyebrow">Edit Details</span>
          <Button size="lg" onClick={() => requestLogin("/account/edit")}>
            Log In
          </Button>
        </div>
      </main>
    );
  }

  async function handlePhoto(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setMsg(null);
    try {
      const form = new FormData();
      form.append("file", file, file.name);
      form.append("category", "profile");
      const res = await apiUpload<{ downloadUrl?: string; url?: string }>("/files/upload", form);
      const url = res.downloadUrl ?? res.url ?? "";
      if (!url) throw new Error("Upload returned no URL.");
      setPhoto(url);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Photo upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || saving) return;
    setSaving(true);
    setMsg(null);
    try {
      await customerApi.updateCurrentUser({
        name: name.trim(),
        ...(email.trim() ? { email: email.trim() } : {}),
        ...(address.trim() ? { address: address.trim() } : {}),
        ...(dob ? { dob } : {}),
        ...(phone.replace(/\D/g, "") ? { phone: phone.replace(/\D/g, "") } : {}),
        ...(photo ? { profilePhoto: photo } : {}),
      });
      await refreshUser().catch(() => undefined);
      router.push("/account");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Could not save details.");
      setSaving(false);
    }
  }

  function copyUid() {
    if (!uid) return;
    void navigator.clipboard?.writeText(uid).catch(() => undefined);
    setMsg("User ID copied.");
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
        <div className="max-w-container mx-auto flex max-w-xl flex-col gap-6">
          <Reveal className="flex flex-col gap-2">
            <span className="eyebrow">Account</span>
            <h1 className="text-3xl font-semibold sm:text-4xl">Edit Details</h1>
          </Reveal>
          {loading ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : (
            <form onSubmit={save} className="border-border bg-card shadow-2xl backdrop-blur-md flex flex-col gap-4 rounded-3xl border p-6">
              <div className="flex items-center gap-4">
                {photo ? (
                  // eslint-disable-next-line @next/next/no-img-element -- user-uploaded profile photo.
                  <img src={photo} alt="Profile" className="size-16 rounded-full border object-cover" />
                ) : (
                  <span className="bg-brand/15 text-brand flex size-16 items-center justify-center rounded-full text-2xl font-bold">
                    {(name[0] || "H").toUpperCase()}
                  </span>
                )}
                <label className="cursor-pointer text-sm">
                  <span className="text-brand font-semibold underline underline-offset-4">
                    {uploading ? "Uploading…" : photo ? "Change photo" : "Add photo"}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => {
                      void handlePhoto(e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
              <label className="flex flex-col gap-1.5">
                <span className="text-foreground text-sm font-medium">Full name *</span>
                <input value={name} onChange={(e) => setName(e.target.value)} className={input} />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-foreground text-sm font-medium">Email</span>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={input} />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-foreground text-sm font-medium">Phone</span>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} className={input} />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-foreground text-sm font-medium">Address</span>
                <input value={address} onChange={(e) => setAddress(e.target.value)} className={input} />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-foreground text-sm font-medium">Date of birth</span>
                <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className={input} />
              </label>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground font-mono text-xs">UID: {uid || "—"}</span>
                {uid ? (
                  <button type="button" onClick={copyUid} className="text-brand text-xs font-semibold underline underline-offset-4">
                    Copy
                  </button>
                ) : null}
              </div>
              {msg ? <p className="text-muted-foreground text-xs">{msg}</p> : null}
              <div className="flex gap-2">
                <Button type="submit" disabled={!name.trim() || saving || uploading}>
                  {saving ? "Saving…" : "Save"}
                </Button>
                <Button type="button" variant="outline" asChild>
                  <Link href="/account">Cancel</Link>
                </Button>
              </div>
            </form>
          )}
        </div>
      </section>
      <Footer />
    </main>
  );
}

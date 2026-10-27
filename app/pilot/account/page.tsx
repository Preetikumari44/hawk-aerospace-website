
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { useBookingAuth } from "@/lib/booking/auth-context";
import { useSessionIdentity } from "@/lib/booking/session-identity";
import { usePilot } from "@/lib/pilot/data";

export default function PilotAccount() {
  const { profile } = usePilot();
  const { backendUser, user, logout } = useBookingAuth();
  const router = useRouter();
  const session = useSessionIdentity();

  const rows: [string, string][] = [
    ["Name", profile.name || ""],
    ["Phone", profile.phone || user?.phone || ""],
    ["Email", profile.email || String(backendUser?.email ?? "")],
    ["Current Role", "Drone Pilot"],
    ["User ID", session?.uid || String(backendUser?.uid ?? backendUser?.id ?? "")],
    ["Detailed Address", session?.address || ""],
  ];

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 920,
        margin: "0 auto",
        paddingBottom: 24,
      }}
    >
      <div className="mb-6">
        <h1 className="p-h1">Account</h1>
        <p className="p-sub">Manage your pilot profile and support.</p>
      </div>

      <section
        className="p-card flex items-center gap-4 mb-5"
        style={{ padding: 24 }}
      >
        <span
          className="p-avatar"
          style={{
            width: 64,
            height: 64,
            minWidth: 64,
            fontSize: 26,
          }}
        >
          {(profile.name?.[0] || "P").toUpperCase()}
        </span>

        <div style={{ minWidth: 0 }}>
          <h2
            className="mb-1.5" style={{ fontSize: 20, fontWeight: 700, overflowWrap: "anywhere" }}
          >
            {profile.name || "Pilot"}
          </h2>
          <p className="p-sub m-0">
            Current Role:{" "}
            <strong style={{ color: "var(--p-green)" }}>
              Drone Pilot
            </strong>
          </p>
        </div>
      </section>

      <section
        className="p-card mb-5"
      >
        <h2
          className="mb-3" style={{ fontSize: 17, fontWeight: 700 }}
        >
          Profile Information
        </h2>

        {rows.map(([label, value]) => (
          <div className="p-teamrow" key={label}>
            <span className="p-sub">{label}</span>
            <strong
              className="text-right" style={{ fontSize: 13, overflowWrap: "anywhere" }}
            >
              {value || "—"}
            </strong>
          </div>
        ))}
      </section>

      <section
        className="p-card mb-5"
      >
        <h2
          className="mb-2" style={{ fontSize: 17, fontWeight: 700 }}
        >
          Support
        </h2>

        <p className="p-sub mb-4">
          24x7 Expert Support — Get help from our specialists anytime.
        </p>

        <p
          className="mb-4" style={{ fontSize: 14, fontWeight: 600 }}
        >
          Contact Support · +91 80 4000 4000
        </p>

        <div
          className="flex gap-2.5 flex-wrap"
        >
          <Link href="/chat" className="p-btn secondary">
            Chat with Support
          </Link>

          <Link href="/support" className="p-btn secondary">
            Help Center
          </Link>

          <Link href="/refer" className="p-btn secondary">
            Refer & Earn
          </Link>
        </div>
      </section>

      <button
        type="button"
        className="p-btn danger"
        onClick={async () => {
          try {
            await logout();
            router.replace("/");
          } catch {
            router.refresh();
          }
        }}
      >
        Sign Out
      </button>
    </div>
  );
}

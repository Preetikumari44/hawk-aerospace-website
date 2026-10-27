"use client";

// Fleet account — exact teammate layout, session identity, REAL role
// switching (Super App parity) instead of disabled buttons.

import { Mail, MapPin, Phone, Shield, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

import { useBookingAuth } from "@/lib/booking/auth-context";
import { useFleetData } from "@/lib/fleet/data";
import { approvedFrontendRoles, ROLE_META, type FrontendRole } from "@/lib/booking/roles";
import { useSessionIdentity } from "@/lib/booking/session-identity";

const ROLE_BUTTONS: { label: string; role: FrontendRole }[] = [
  { label: "Customer", role: "customer" },
  { label: "Drone Pilot", role: "pilot" },
  { label: "Sales Aggregator", role: "sales" },
  { label: "Technician", role: "technician" },
];

export default function FleetAccount() {
  const { user } = useFleetData();
  const { backendUser, frontendRole, switchRole } = useBookingAuth();
  const router = useRouter();
  const [busy, setBusy] = React.useState<FrontendRole | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const approved = approvedFrontendRoles(backendUser);
  const session = useSessionIdentity();

  const rows = [
    ["Name", user.name, UserRound],
    ["Phone", user.phone, Phone],
    ["Email", user.email, Mail],
    ["Role", user.role, Shield],
    ["User ID", session?.uid || user.id, Shield],
    ["Detailed Address", session?.address || user.address, MapPin],
  ] as const;

  async function handleSwitch(role: FrontendRole) {
    setBusy(role);
    setError(null);
    try {
      await switchRole(role);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Role switch failed.");
      setBusy(null);
    }
  }

  return (
    <div>
      <div className="pageTitle">
        <div>
          <h1>Account</h1>
          <p>Manage your profile and Fleet Manager workspace.</p>
        </div>
      </div>
      <div className="card" style={{ maxWidth: 680 }}>
        <h2 className="mt-0" style={{ fontSize: 14 }}>Personal Details</h2>
        <div className="list">
          {rows.map(([label, value, Icon]) => (
            <div className="row" key={label}>
              <div className="resource">
                <Icon size={16} style={{ opacity: 0.45 }} />
                <span className="muted" style={{ width: 65 }}>
                  {label}
                </span>
              </div>
              <b className="text-right" style={{ fontSize: 11 }}>{value}</b>
            </div>
          ))}
        </div>
      </div>
      <div className="sectionHead">
        <h2>Role</h2>
      </div>
      <div className="grid two" style={{ maxWidth: 680 }}>
        {ROLE_BUTTONS.map((r) => {
          const isCurrent = frontendRole === r.role;
          const isApproved = approved.includes(r.role);
          return (
            <button
              key={r.role}
              className={"btn " + (isCurrent ? "primary" : "secondary")}
              disabled={isCurrent || busy !== null || !isApproved}
              onClick={() => void handleSwitch(r.role)}
              title={
                isCurrent
                  ? "Current role"
                  : isApproved
                    ? `Switch to ${ROLE_META[r.role]?.label}`
                    : "Apply from My Roles first"
              }
            >
              {busy === r.role ? "Switching…" : r.label}
              {isCurrent ? " · Current" : isApproved ? "" : " · Locked"}
            </button>
          );
        })}
      </div>
      {error ? <p style={{ color: "#9a4c4c", fontSize: 12 }}>{error}</p> : null}
      <div className="actions mt-3">
        <button className="btn secondary" onClick={() => router.push("/account")}>
          My Roles · apply for more
        </button>
      </div>
    </div>
  );
}

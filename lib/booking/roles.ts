"use client";

// ---------------------------------------------------------------------------
// Unified role system — single source of truth mirroring the Super App
// (User_Frontend/src/utils/api.js + commonScreens/roleApplicationConfig.js).
//
// Frontend roles: customer | pilot | sales | fleet | technician (+ admin for
// the legacy /admin sim page; service-center stays isolated with its own
// sc_token_v1 + /auth/admin-login and is NEVER part of role-switching).
// Backend roles:  customer | pilot | aggregator | fleet_manager | technician
// (+ vendor alias -> fleet, admin/super_admin isolated).
// ---------------------------------------------------------------------------

export type FrontendRole = "customer" | "pilot" | "sales" | "fleet" | "technician" | "admin";
export type BackendRole =
  | "customer"
  | "pilot"
  | "aggregator"
  | "fleet_manager"
  | "technician"
  | "vendor"
  | "admin"
  | "super_admin";

export const FRONTEND_ROLES: FrontendRole[] = ["customer", "pilot", "sales", "fleet", "technician"];

export function normalizeBackendRole(role: unknown): string {
  if (!role) return "";
  const n = String(role).toLowerCase();
  if (n === "sales") return "aggregator";
  if (n === "fleet") return "fleet_manager";
  return n;
}

export function normalizeFrontendRole(role: unknown): FrontendRole | "" {
  if (!role) return "";
  const n = String(role).toLowerCase();
  if (n === "aggregator" || n === "sales") return "sales";
  if (n === "fleet_manager" || n === "fleet" || n === "vendor") return "fleet";
  if (n === "customer" || n === "pilot" || n === "technician" || n === "admin") return n as FrontendRole;
  return "";
}

/** Dashboard landing per frontend role — single login fans out here. */
export const ROLE_LANDING: Record<FrontendRole, string> = {
  customer: "/my-bookings",
  pilot: "/pilot",
  sales: "/sales",
  fleet: "/fleet",
  technician: "/technician",
  admin: "/admin",
};

export function landingForFrontendRole(role: unknown): string {
  const f = normalizeFrontendRole(role);
  if (f && ROLE_LANDING[f]) return ROLE_LANDING[f];
  return "/my-bookings";
}

/** Backend user shape (POST /auth/verify-otp, /auth/switch-role, GET /users/me). */
export interface BackendUser {
  uid?: string;
  id?: string;
  phone?: string;
  name?: string;
  role?: string;
  primaryRole?: string;
  roles?: string[];
  approvedRoles?: string[];
  [key: string]: unknown;
}

export function primaryFrontendRole(user: BackendUser | null | undefined): FrontendRole {
  if (!user) return "customer";
  return normalizeFrontendRole(user.primaryRole ?? user.role) || "customer";
}

/** All frontend roles this user may switch to (approved). Customer always allowed. */
export function approvedFrontendRoles(user: BackendUser | null | undefined): FrontendRole[] {
  const out = new Set<FrontendRole>(["customer"]);
  if (!user) return [...out];
  const raw: unknown[] = [
    ...((user.approvedRoles as unknown[]) ?? []),
    ...((user.roles as unknown[]) ?? []),
    user.primaryRole,
    user.role,
  ];
  for (const r of raw) {
    const f = normalizeFrontendRole(r);
    if (f && f !== "admin") out.add(f);
  }
  return [...out];
}

export function canSwitchTo(user: BackendUser | null | undefined, role: FrontendRole): boolean {
  if (role === "customer") return true;
  return approvedFrontendRoles(user).includes(role);
}

// --- Role-application config (port of User_Frontend roleApplicationConfig.js) ---

export interface RoleAppField {
  key: string;
  label: string;
  required: boolean;
  type: "text" | "email" | "phone" | "textarea" | "number" | "multiselect" | "select";
  placeholder?: string;
  options?: string[];
}

export interface RoleAppDoc {
  key: string;
  label: string;
  required: boolean;
}

export interface RoleAppConfig {
  id: Exclude<FrontendRole, "customer" | "admin">;
  title: string;
  backendRole: string;
  description: string;
  successSubtitle: string;
  fields: RoleAppField[];
  documents: RoleAppDoc[];
}

const COMMON_FIELDS: RoleAppField[] = [
  { key: "name", label: "Enter Full Name", required: true, type: "text" },
  { key: "phone", label: "Enter Phone Number", required: true, type: "phone" },
  { key: "email", label: "Enter Email ID", required: true, type: "email" },
  { key: "address", label: "Enter Address", required: true, type: "textarea" },
];

export const ROLE_APPLICATION_CONFIG: Record<string, RoleAppConfig> = {
  pilot: {
    id: "pilot",
    title: "Drone Pilot",
    backendRole: "pilot",
    description:
      "You Don't Have Access to the Drone Pilot App yet. Fill the Form Below to Access the Drone Pilot App & its Amazing Features",
    successSubtitle: "Your Application for the Role of Drone Pilot is Submitted",
    fields: [
      ...COMMON_FIELDS,
      {
        key: "serviceTypes",
        label: "Service Types Offered",
        required: true,
        type: "multiselect",
        options: ["monitoring", "videography", "seeding", "surveillance", "mapping", "spraying"],
      },
    ],
    documents: [
      { key: "aadhaar", label: "Aadhaar Card", required: false },
      { key: "pan", label: "PAN Card", required: false },
    ],
  },
  sales: {
    id: "sales",
    title: "Sales Aggregator",
    backendRole: "aggregator",
    description:
      "You Don't Have Access to the Sales Aggregator App yet. Fill the Form Below to Access the Sales Aggregator App & its Amazing Features",
    successSubtitle: "Your Application for the Role of Sales Aggregator is Submitted",
    fields: [
      ...COMMON_FIELDS,
      { key: "businessName", label: "Enter Business / Firm Name", required: true, type: "text" },
      { key: "gst", label: "Enter GST Number", required: false, type: "text" },
    ],
    documents: [
      { key: "aadhar_front", label: "Aadhar Card Front Side", required: true },
      { key: "aadhar_back", label: "Aadhar Card Back Side", required: true },
      { key: "business_proof", label: "Business / Firm Proof", required: true },
      { key: "gst_registration", label: "GST Registration Document", required: false },
    ],
  },
  fleet: {
    id: "fleet",
    title: "Fleet Manager",
    backendRole: "fleet_manager",
    description:
      "You Don't Have Access to the Fleet Manager App yet. Fill the Form Below to Access the Fleet Manager App & its Amazing Features",
    successSubtitle: "Your Application for the Role of Fleet Manager is Submitted",
    fields: [
      ...COMMON_FIELDS,
      { key: "gst", label: "Enter GST Number", required: false, type: "text" },
      { key: "region", label: "Preferred Operating Region / District", required: true, type: "text" },
    ],
    documents: [
      { key: "aadhar_front", label: "Aadhar Card Front Side", required: true },
      { key: "aadhar_back", label: "Aadhar Card Back Side", required: true },
      { key: "gst_registration", label: "GST Registration Document", required: true },
      { key: "pan_card", label: "Pan Card", required: true },
    ],
  },
  technician: {
    id: "technician",
    title: "Technician",
    backendRole: "technician",
    description:
      "You Don't Have Access to the Technician App yet. Fill the Form Below to Access the Technician App & its Amazing Features",
    successSubtitle: "Your Application for the Role of Technician is Submitted",
    fields: [
      ...COMMON_FIELDS,
      {
        key: "qualification",
        label: "Degree / Diploma",
        required: true,
        type: "select",
        options: ["Diploma", "Bachelors", "Masters"],
      },
      { key: "specialization", label: "Specialization", required: true, type: "text", placeholder: "e.g. Avionics, Embedded Systems" },
    ],
    documents: [
      { key: "aadhar_front", label: "Aadhar Card Front Side", required: true },
      { key: "aadhar_back", label: "Aadhar Card Back Side", required: true },
      { key: "pan_card", label: "Pan Card", required: true },
      { key: "experience_certificate", label: "Experience / Training Certificate", required: false },
    ],
  },
};

export const APPLICATION_ROLES = Object.keys(ROLE_APPLICATION_CONFIG);

/** Document-type selector options — port of DOCUMENT_OPTIONS in the Super App. */
export const DOCUMENT_OPTIONS = [
  { id: "aadhaar", label: "Aadhaar Card" },
  { id: "pan", label: "PAN Card" },
  { id: "driving_license", label: "Driving License" },
  { id: "voter_id", label: "Voter ID" },
  { id: "drone_license", label: "Drone License" },
  { id: "passport", label: "Passport" },
  { id: "others", label: "Others" },
];

export const ROLE_META: Record<FrontendRole, { label: string; dashboard: string; accent: string }> = {
  customer: { label: "Customer", dashboard: "/my-bookings", accent: "Bookings" },
  pilot: { label: "Pilot", dashboard: "/pilot", accent: "Missions" },
  sales: { label: "Sales Aggregator", dashboard: "/sales", accent: "Bookings" },
  fleet: { label: "Fleet Manager", dashboard: "/fleet", accent: "Operations" },
  technician: { label: "Technician", dashboard: "/technician", accent: "Repairs" },
  admin: { label: "Admin", dashboard: "/admin", accent: "Overview" },
};

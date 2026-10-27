// Single source of truth for the Distributor / Dealer Application fields.
// Every value below was taken from the original formdistributor.zip (distributor.html / distributor.php).

import { CALLING_CODES, DEFAULT_CALLING_CODE_ID } from "./countries";

/** Original checkbox values, verbatim. These strings are what the PHP backend stores in `models`. */
export const DRONE_MODELS = [
  { value: "H32X (10L)", name: "H32X", capacity: "10L" },
  { value: "H60-4 (30L)", name: "H60-4", capacity: "30L" },
  { value: "H120 (50L)", name: "H120", capacity: "50L" },
  { value: "H200 (100L)", name: "H200", capacity: "100L" },
] as const;

/** Original <select name="businessType"> options. First option is the default (no blank option existed). */
export const BUSINESS_TYPES = ["Drone Dealer", "Agricultural Machinery Dealer", "Farmer", "Others"] as const;

/** Original <select name="turnover"> options. First option is the default. */
export const TURNOVER_OPTIONS = [
  "Under \u20ac1m",
  "\u20ac1m - \u20ac5m",
  "\u20ac5m - \u20ac10m",
  "\u20ac10m - \u20ac50m",
  "Above \u20ac50m",
] as const;

/**
 * File guidance. The original form had NO client-side type/size limit; the server limit depends on the
 * PHP configuration (upload_max_filesize / post_max_size). These values are a documented UI addition and
 * must be kept in sync with the real backend (see docs/BACKEND-REQUIREMENTS.md).
 */
export const FILE_RULES = {
  maxBytes: 10 * 1024 * 1024,
  maxLabel: "10 MB",
  extensions: ["pdf", "doc", "docx", "ppt", "pptx", "xls", "xlsx", "png", "jpg", "jpeg"],
  typeLabel: "PDF, Word, PowerPoint, Excel or image",
} as const;

export interface ApplicationValues {
  country: string;
  city: string;
  models: string[];
  companyName: string;
  website: string;
  businessType: string;
  turnover: string;
  name: string;
  jobTitle: string;
  email: string;
  /** UI-only key so two countries sharing a dial code (+1) stay distinguishable. */
  callingCodeId: string;
  phone: string;
  brands: string;
  message: string;
  file: File | null;
}

export const INITIAL_VALUES: ApplicationValues = {
  country: "",
  city: "",
  models: [],
  companyName: "",
  website: "",
  businessType: BUSINESS_TYPES[0],
  turnover: TURNOVER_OPTIONS[0],
  name: "",
  jobTitle: "",
  email: "",
  callingCodeId: DEFAULT_CALLING_CODE_ID,
  phone: "",
  brands: "",
  message: "",
  file: null,
};

export function callingCodeFor(id: string) {
  return CALLING_CODES.find((c) => c.id === id) ?? CALLING_CODES[0];
}

/** Fields that block submission (HTML `required` in the original + companyName, which distributor.php enforces). */
export const REQUIRED_FIELDS = ["country", "city", "companyName", "name", "email", "phone"] as const;

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

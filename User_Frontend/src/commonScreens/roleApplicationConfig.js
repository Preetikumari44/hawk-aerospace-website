/**
 * Single source of truth for the self-service "Role Application" forms.
 *
 * Each role describes what fields and documents its application form must
 * contain. The form is rendered 100% dynamically from this config — nothing is
 * hardcoded per role. Removing an entry here removes it from the form, which is
 * how e.g. "Pilot License Number" stays pilot-only.
 *
 * Field `type` is one of: 'text' | 'email' | 'phone' | 'textarea' | 'number' | 'multiselect'.
 */

const COMMON_FIELDS = [
  { key: 'name', label: 'Enter Full Name', required: true, type: 'text' },
  { key: 'phone', label: 'Enter Phone Number', required: true, type: 'phone' },
  { key: 'email', label: 'Enter Email ID', required: true, type: 'email' },
  { key: 'address', label: 'Enter Address', required: true, type: 'textarea' },
];

export const DOCUMENT_OPTIONS = [
  { id: 'aadhaar', label: 'Aadhaar Card' },
  { id: 'pan', label: 'PAN Card' },
  { id: 'driving_license', label: 'Driving License' },
  { id: 'voter_id', label: 'Voter ID' },
  { id: 'drone_license', label: 'Drone License' },
  { id: 'passport', label: 'Passport' },
  { id: 'others', label: 'Others' },
];

export const ROLE_APPLICATION_CONFIG = {
  pilot: {
    id: 'pilot',
    title: 'Drone Pilot',
    backendRole: 'pilot',
    description:
      "You Don't Have Access to the Drone Pilot App yet. Fill the Form Below to Access the Drone Pilot App & its Amazing Features",
    successSubtitle: 'Your Application for the Role of Drone Pilot is Submitted',
    fields: [
      ...COMMON_FIELDS,
      { key: 'pilotLicenseNumber', label: 'Pilot License Number', required: false, type: 'text' },
      { key: 'experienceYears', label: 'Experience (Years)', required: true, type: 'number', placeholder: 'e.g. 2' },
      { key: 'experienceMonths', label: 'Experience (Months)', required: true, type: 'number', placeholder: 'e.g. 6' },
      // Booking-critical: must match fmModule AddPilotScreen options so newly
      // approved pilots are matchable to missions immediately.
      {
        key: 'serviceTypes',
        label: 'Service Types Offered',
        required: true,
        type: 'multiselect',
        options: ['monitoring', 'videography', 'seeding', 'surveillance', 'mapping', 'spraying'],
      },
    ],
    documents: [
      { key: 'aadhaar', label: 'Aadhaar Card', required: false },
      { key: 'pan', label: 'PAN Card', required: false },
    ],
  },

  sales: {
    id: 'sales',
    title: 'Sales Aggregator',
    backendRole: 'aggregator',
    description:
      "You Don't Have Access to the Sales Aggregator App yet. Fill the Form Below to Access the Sales Aggregator App & its Amazing Features",
    successSubtitle: 'Your Application for the Role of Sales Aggregator is Submitted',
    fields: [
      ...COMMON_FIELDS,
      { key: 'businessName', label: 'Enter Business / Firm Name', required: true, type: 'text' },
      { key: 'gst', label: 'Enter GST Number', required: false, type: 'text' },
    ],
    documents: [
      { key: 'aadhar_front', label: 'Aadhar Card Front Side', required: true },
      { key: 'aadhar_back', label: 'Aadhar Card Back Side', required: true },
      { key: 'business_proof', label: 'Business / Firm Proof', required: true },
      { key: 'gst_registration', label: 'GST Registration Document', required: false },
    ],
  },

  fleet: {
    id: 'fleet',
    title: 'Fleet Manager',
    backendRole: 'fleet_manager',
    description:
      "You Don't Have Access to the Fleet Manager App yet. Fill the Form Below to Access the Fleet Manager App & its Amazing Features",
    successSubtitle: 'Your Application for the Role of Fleet Manager is Submitted',
    fields: [
      ...COMMON_FIELDS,
      { key: 'gst', label: 'Enter GST Number', required: false, type: 'text' },
      { key: 'region', label: 'Preferred Operating Region / District', required: true, type: 'text' },
    ],
    documents: [
      { key: 'aadhar_front', label: 'Aadhar Card Front Side', required: true },
      { key: 'aadhar_back', label: 'Aadhar Card Back Side', required: true },
      { key: 'gst_registration', label: 'GST Registration Document', required: true },
      { key: 'pan_card', label: 'Pan Card', required: true },
    ],
  },

  technician: {
    id: 'technician',
    title: 'Technician',
    backendRole: 'technician',
    description:
      "You Don't Have Access to the Technician App yet. Fill the Form Below to Access the Technician App & its Amazing Features",
    successSubtitle: 'Your Application for the Role of Technician is Submitted',
    fields: [
      ...COMMON_FIELDS,
      { key: 'experience', label: 'Years of Drone Repair/Service Experience', required: true, type: 'text' },
      { key: 'certifications', label: 'Relevant Certifications / Training', required: false, type: 'text' },
    ],
    documents: [
      { key: 'aadhar_front', label: 'Aadhar Card Front Side', required: true },
      { key: 'aadhar_back', label: 'Aadhar Card Back Side', required: true },
      { key: 'pan_card', label: 'Pan Card', required: true },
      { key: 'experience_certificate', label: 'Experience / Training Certificate', required: false },
    ],
  },
};

/** Lookup helper: frontend role id -> config entry. */
export const getRoleApplicationConfig = (roleId) => ROLE_APPLICATION_CONFIG[roleId] || null;

/** Resolve the frontend role id (pilot/sales/fleet/technician) from a backend role id. */
export const backendToFrontendRole = {
  pilot: 'pilot',
  aggregator: 'sales',
  sales: 'sales',
  fleet_manager: 'fleet',
  vendor: 'fleet',
  technician: 'technician',
};
export const frontendRoleFromBackend = (backendRole) =>
  backendToFrontendRole[String(backendRole || '').toLowerCase()] || null;

/** All driven roles in the accounts screen that require an application. */
export const APPLICATION_ROLES = Object.keys(ROLE_APPLICATION_CONFIG);
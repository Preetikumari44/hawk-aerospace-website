import type { AppRole } from '../../../common/constants/roles.constant';

export type RoleApplicationStatus = 'pending' | 'approved' | 'rejected';

export interface RoleApplicationDocument {
  applicationId: string;
  uid: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  /** Target role the applicant wants to switch to (backend role id). */
  role: AppRole;
  /** Human readable label captured from the client config (e.g. "Drone Pilot"). */
  roleLabel?: string | null;
  currentRole?: AppRole | null;
  /** Free-form answers keyed by the field keys defined by the role form config. */
  formData: Record<string, unknown>;
  /** Uploaded/supporting documents. */
  documents: Array<{
    type: string;
    name?: string;
    number?: string;
    storagePath?: string;
    downloadUrl?: string;
    fileName?: string;
    mimeType?: string;
    fileSize?: number;
    fileId?: string;
  }>;
  status: RoleApplicationStatus;
  submittedAt: string;
  updatedAt: string;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  remarks?: string | null;
  rejectionReason?: string | null;
  lastRoleApplicationId?: string | null;
  /** Refer & Earn code that sourced this application (if any). */
  referralCode?: string | null;
  referredByUid?: string | null;
}

export interface RoleApplicationSummary {
  applicationId: string;
  uid: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  role: AppRole;
  roleLabel?: string | null;
  currentRole?: AppRole | null;
  status: RoleApplicationStatus;
  submittedAt: string;
  reviewedAt?: string | null;
  remarks?: string | null;
  documentCount: number;
}
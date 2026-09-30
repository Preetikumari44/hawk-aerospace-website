import type { FileCategory, KYCDocumentType } from '../dto/upload-file.dto';
import type { VerificationStatus } from '../dto/verify-document.dto';

export interface FileMetadata {
  fileId: string;
  fileName: string;
  fileType: string; // MIME type
  fileSize: number; // bytes
  storagePath: string; // Firebase Storage path
  downloadUrl: string; // Public or signed URL
  uploadedBy: string; // User UID
  uploadedAt: Date | FirebaseFirestore.Timestamp;
  category: FileCategory;
  documentType?: KYCDocumentType | string;
  relatedEntityId?: string; // droneId, bookingId, etc.
  description?: string;
  verificationStatus?: VerificationStatus;
  verifiedBy?: string; // Admin UID
  verifiedAt?: Date | FirebaseFirestore.Timestamp;
  verificationNotes?: string;
}

export interface FileUploadResult {
  fileId: string;
  downloadUrl: string;
  fileName: string;
  fileSize: number;
  storagePath: string;
}

export interface SignedUploadUrlResult {
  uploadUrl: string;
  storagePath: string;
  expiresAt: Date;
  fileId: string;
}

export interface FileRegistrationResult {
  fileId: string;
  downloadUrl: string;
  cdnUrl: string;
  fileName: string;
  fileSize: number;
  storagePath: string;
  category: FileCategory;
  uploadedAt: Date;
}


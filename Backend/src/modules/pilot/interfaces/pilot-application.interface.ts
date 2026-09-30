export interface PilotDocument {
  type: 'aadhaar_front' | 'aadhaar_back' | 'pilot_license' | 'gst_registration' | 'pilot_registration' | 'medical_certificate';
  storagePath: string;
  downloadUrl: string;
  verified: 'pending' | 'verified' | 'rejected';
  verifiedBy?: string;
  verifiedAt?: Date;
  verificationNotes?: string;
}

export interface PilotApplication {
  applicationId: string;
  uid: string; // Same UID as users collection
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: Date;
  reviewedBy?: string;
  reviewedAt?: Date;
  rejectionReason?: string;
  reviewNotes?: string;
  
  // Personal Information
  personalInfo: {
    name: string;
    age: number;
    phone: string;
    email: string;
    address: string;
  };
  
  // License & Documentation
  pilotLicenseNumber: string;
  pilotExpiryDate: Date;
  aadhaarCardNumber: string;
  panNumber: string;
  gstNumber?: string;
  
  // Documents (uploaded to Firebase Storage)
  documents: {
    aadhaar_front?: PilotDocument;
    aadhaar_back?: PilotDocument;
    pilot_license?: PilotDocument;
    gst_registration?: PilotDocument;
    pilot_registration?: PilotDocument;
    medical_certificate?: PilotDocument;
  };
  
  // Service Capabilities
  serviceTypes: string[];
  
  // Optional Experience Data
  flightHours?: number;
  experience?: number;
  additionalNotes?: string;
  
  // Assignment (filled during approval)
  assignedFleetManagerUid?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface PilotApplicationSummary {
  applicationId: string;
  uid: string;
  name: string;
  email: string;
  phone: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: Date;
  reviewedAt?: Date;
  serviceTypes: string[];
  documentsVerified: number;
  totalDocuments: number;
}

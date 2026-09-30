# Pilot Application Flow Documentation

## Overview

This document describes the complete flow for a customer to apply for a pilot role and the admin review process. The system ensures **One person = One UID for life**, meaning the same Firebase Auth UID is shared across all role collections (users, pilots, fleetManagers, etc.).

## Architecture Principle: One UID, Multiple Roles

```
One Firebase Auth UID
│
├─ users/{uid}              ← Always exists (profile data)
│  └─ roles: ["customer"]   → ["customer", "pilot"] after approval
│
├─ pilots/{uid}             ← Created ONLY after application approval
│  └─ uid: {same-uid}       ← Same UID as users collection
│
└─ pilotApplications/{applicationId}  ← Temporary application document
   └─ uid: {same-uid}                  ← References the user's UID
```

## Flow Diagram

```
                  Register
                     │
                     ▼
             users/{uid}
             roles=["customer"]
                     │
                     ▼
          Customer uses app
                     │
                     ▼
       Click "Become a Pilot"
                     │
                     ▼
    pilotApplications/{applicationId}
         status = pending
                     │
                     ▼
      Admin Reviews Application
         ┌───────────┴───────────┐
         │                       │
     APPROVED                REJECTED
         │                       │
         ▼                       ▼
   Create pilots/{uid}    Update application
   Update user roles      status=rejected
   roles+=pilot          reason=...
```

## Step-by-Step Process

### Step 1: User Registration
Every user starts as a customer with a unique Firebase Auth UID.

**Collection:** `users/{uid}`
```json
{
  "uid": "2mZuHmKgcdjPUZPU3g3a",
  "name": "Ramesh Patil",
  "email": "ramesh@gmail.com",
  "phone": "+919220989863",
  "roles": ["customer"],
  "status": "active",
  "createdAt": "2026-07-09T00:00:00.000Z"
}
```

### Step 2: Customer Applies to Become Pilot

**Endpoint:** `POST /pilot-applications/submit`

**Customer Action:** Click "Become a Pilot" button

**Request Body:**
```json
{
  "name": "Ramesh Patil",
  "age": 41,
  "phone": "+919220989863",
  "email": "ramesh@gmail.com",
  "address": "Pune",
  "pilotLicenseNumber": "DGCA-MA-2022-444633",
  "pilotExpiryDate": "2033-01-04T00:00:00.000Z",
  "aadhaarCardNumber": "2925 4862 8296",
  "panNumber": "PALGI5465N",
  "gstNumber": "27PALGI5465N1Z5",
  "serviceTypes": ["spraying", "mapping"],
  "specializations": ["Crop Spraying", "Monitoring"],
  "flightHours": 100,
  "experience": 3,
  "documents": [
    {
      "type": "aadhaar_front",
      "storagePath": "documents/2mZuHmKgcdjPUZPU3g3a/kyc/aadhaar_front/1704733200000_aadhaar_front.jpg",
      "downloadUrl": "https://storage.googleapis.com/...",
      "verified": "pending"
    },
    {
      "type": "aadhaar_back",
      "storagePath": "documents/2mZuHmKgcdjPUZPU3g3a/kyc/aadhaar_back/1704733200000_aadhaar_back.jpg",
      "downloadUrl": "https://storage.googleapis.com/...",
      "verified": "pending"
    },
    {
      "type": "pilot_license",
      "storagePath": "documents/2mZuHmKgcdjPUZPU3g3a/kyc/pilot_license/1704733200000_pilot_license.pdf",
      "downloadUrl": "https://storage.googleapis.com/...",
      "verified": "pending"
    },
    {
      "type": "gst_registration",
      "storagePath": "documents/2mZuHmKgcdjPUZPU3g3a/kyc/gst_registration/1704733200000_gst.pdf",
      "downloadUrl": "https://storage.googleapis.com/...",
      "verified": "pending"
    }
  ]
}
```

**Created Document:**
**Collection:** `pilotApplications/{applicationId}`
**Document ID:** `PAPP000001` (auto-generated sequential ID)

```json
{
  "applicationId": "PAPP000001",
  "uid": "2mZuHmKgcdjPUZPU3g3a",
  "status": "pending",
  "submittedAt": "2026-07-09T10:30:00.000Z",
  "reviewedBy": null,
  "reviewedAt": null,
  "rejectionReason": null,
  "personalInfo": {
    "name": "Ramesh Patil",
    "age": 41,
    "phone": "+919220989863",
    "email": "ramesh@gmail.com",
    "address": "Pune"
  },
  "pilotLicenseNumber": "DGCA-MA-2022-444633",
  "pilotExpiryDate": "2033-01-04T00:00:00.000Z",
  "aadhaarCardNumber": "2925 4862 8296",
  "panNumber": "PALGI5465N",
  "gstNumber": "27PALGI5465N1Z5",
  "documents": {
    "aadhaar_front": {
      "type": "aadhaar_front",
      "storagePath": "documents/2mZuHmKgcdjPUZPU3g3a/kyc/aadhaar_front/1704733200000_aadhaar_front.jpg",
      "downloadUrl": "https://storage.googleapis.com/...",
      "verified": "pending"
    },
    "aadhaar_back": {
      "type": "aadhaar_back",
      "storagePath": "documents/2mZuHmKgcdjPUZPU3g3a/kyc/aadhaar_back/1704733200000_aadhaar_back.jpg",
      "downloadUrl": "https://storage.googleapis.com/...",
      "verified": "pending"
    },
    "pilot_license": {
      "type": "pilot_license",
      "storagePath": "documents/2mZuHmKgcdjPUZPU3g3a/kyc/pilot_license/1704733200000_pilot_license.pdf",
      "downloadUrl": "https://storage.googleapis.com/...",
      "verified": "pending"
    },
    "gst_registration": {
      "type": "gst_registration",
      "storagePath": "documents/2mZuHmKgcdjPUZPU3g3a/kyc/gst_registration/1704733200000_gst.pdf",
      "downloadUrl": "https://storage.googleapis.com/...",
      "verified": "pending"
    }
  },
  "serviceTypes": ["spraying", "mapping"],
  "specializations": ["Crop Spraying", "Monitoring"],
  "flightHours": 100,
  "experience": 3,
  "createdAt": "2026-07-09T10:30:00.000Z",
  "updatedAt": "2026-07-09T10:30:000.000Z"
}
```

**⚠️ Important:** At this stage, the user's `roles` array in the `users` collection is still `["customer"]`.

### Step 3: Admin Reviews Application

#### 3.1 View Applications

**Endpoint:** `GET /pilot-applications?status=pending`

Admin sees list of pending applications:
```json
{
  "applications": [
    {
      "applicationId": "PAPP000001",
      "uid": "2mZuHmKgcdjPUZPU3g3a",
      "name": "Ramesh Patil",
      "email": "ramesh@gmail.com",
      "phone": "+919220989863",
      "status": "pending",
      "submittedAt": "2026-07-09T10:30:00.000Z",
      "serviceTypes": ["spraying", "mapping"],
      "documentsVerified": 0,
      "totalDocuments": 4
    }
  ],
  "total": 1
}
```

#### 3.2 View Application Details

**Endpoint:** `GET /pilot-applications/PAPP000001`

Admin reviews full application with all documents.

#### 3.3 Verify Individual Documents (Optional)

**Endpoint:** `PATCH /pilot-applications/PAPP000001/documents/aadhaar_front/verify`

```json
{
  "status": "verified",
  "notes": "Document is clear and valid"
}
```

### Step 4A: Approval Flow (Three-Step Transaction)

**Endpoint:** `PATCH /pilot-applications/PAPP000001/review`

**Request Body:**
```json
{
  "action": "approved",
  "reviewNotes": "All documents verified. Pilot license valid.",
  "assignedFleetManagerUid": "FM001" // Optional
}
```

**What Happens (Atomic Transaction):**

1. **Update Application:**
   ```json
   {
     "status": "approved",
     "reviewedBy": "ADMIN001",
     "reviewedAt": "2026-07-09T14:00:00.000Z",
     "reviewNotes": "All documents verified. Pilot license valid."
   }
   ```

2. **Update User Roles:**
   ```json
   // Before
   {
     "roles": ["customer"]
   }
   
   // After
   {
     "roles": ["customer", "pilot"],
     "updatedAt": "2026-07-09T14:00:00.000Z"
   }
   ```

3. **Create Pilot Document (Using Same UID):**
   **Collection:** `pilots/{uid}` ← **NOTICE: UID, NOT pilot0001**
   **Document ID:** `2mZuHmKgcdjPUZPU3g3a` (Same as users collection)
   
   ```json
   {
     "uid": "2mZuHmKgcdjPUZPU3g3a",
     "applicationId": "PAPP000001",
     "name": "Ramesh Patil",
     "email": "ramesh@gmail.com",
     "phone": "+919220989863",
     "photoUrl": null,
     "status": "active",
     "adminApproval": true,
     "assignedFleetManagerUid": "FM001",
     "isOnline": false,
     "isAvailable": false,
     "currentBookingId": null,
     "currentDroneUid": null,
     "currentLocation": null,
     "address": "Pune",
     "age": 41,
     "aadhaarNumber": "2925 4862 8296",
     "panNumber": "PALGI5465N",
     "gstNumber": "27PALGI5465N1Z5",
     "license": {
       "number": "DGCA-MA-2022-444633",
       "type": "medium",
       "issueDate": "2026-07-09T14:00:00.000Z",
       "expiryDate": "2033-01-04T00:00:00.000Z"
     },
     "medicalCertificate": {
       "number": "MED-640501",
       "expiry": "2031-07-09T14:00:00.000Z"
     },
     "availability": {
       "mon": true,
       "tue": true,
       "wed": true,
       "thu": true,
       "fri": true,
       "sat": false,
       "sun": true,
       "startTime": "06:00",
       "endTime": "18:00"
     },
     "serviceTypes": ["spraying", "mapping"],
     "specializations": ["Crop Spraying", "Monitoring"],
     "certifications": [],
     "rating": 0,
     "safetyScore": 100,
     "onTimePercentage": 0,
     "statistics": {
       "totalMissions": 0,
       "completedMissions": 0,
       "cancelledMissions": 0,
       "totalFlightHours": 100
     },
     "earnings": {
       "total": 0,
       "settled": 0,
       "pending": 0
     },
     "payoutMethod": {
       "type": "upi",
       "upiId": "",
       "accountNumber": "",
       "ifsc": ""
     },
     "createdAt": "2026-07-09T14:00:00.000Z",
     "updatedAt": "2026-07-09T14:00:00.000Z"
   }
   ```

### Step 4B: Rejection Flow

**Endpoint:** `PATCH /pilot-applications/PAPP000001/review`

**Request Body:**
```json
{
  "action": "rejected",
  "rejectionReason": "Pilot license has expired",
  "reviewNotes": "Applicant needs to renew license before reapplying"
}
```

**What Happens:**
- Application status updated to `rejected`
- User's `roles` remain `["customer"]`
- No pilot document is created
- User can resubmit after fixing issues

## Document Upload Flow

Documents are uploaded using the file-storage module:

### 1. Request Upload URL
```
POST /files/upload-url
{
  "fileName": "aadhaar_front.jpg",
  "contentType": "image/jpeg",
  "fileSize": 245760,
  "bucket": "documents",
  "folder": "kyc/aadhaar_front"
}
```

### 2. Upload Directly to Firebase Storage
Client uploads file using the signed URL (client-side operation).

### 3. Register File Metadata
```
POST /files/register
{
  "fileName": "aadhaar_front.jpg",
  "contentType": "image/jpeg",
  "fileSize": 245760,
  "storagePath": "documents/2mZuHmKgcdjPUZPU3g3a/kyc/aadhaar_front/1704733200000_aadhaar_front.jpg",
  "category": "kyc",
  "documentType": "aadhaar"
}
```

### 4. Use Returned URLs in Application
```json
{
  "type": "aadhaar_front",
  "storagePath": "documents/.../aadhaar_front.jpg",
  "downloadUrl": "https://storage.googleapis.com/...",
  "verified": "pending"
}
```

## API Endpoints Summary

### Customer Endpoints
- `POST /pilot-applications/submit` - Submit new application
- `GET /pilot-applications/my-application` - Check application status
- `DELETE /pilot-applications/:applicationId` - Withdraw pending application

### Admin Endpoints
- `GET /pilot-applications` - List all applications (with filters)
- `GET /pilot-applications/pending/count` - Get pending count
- `GET /pilot-applications/:applicationId` - View application details
- `PATCH /pilot-applications/:applicationId/review` - Approve/reject application
- `PATCH /pilot-applications/:applicationId/documents/:documentType/verify` - Verify individual document

## Validation Rules

1. **One Application Per User:** A user cannot submit multiple pending/approved applications
2. **Already a Pilot:** Users with 'pilot' role cannot apply again
3. **Required Documents:** Minimum documents required:
   - Aadhaar (front + back)
   - Pilot License
   - GST Registration (if applicable)
4. **Age Requirement:** 18-70 years
5. **License Validity:** Pilot license must not be expired

## Firestore Indexes Required

Create these composite indexes:
```json
{
  "indexes": [
    {
      "collectionGroup": "pilotApplications",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "submittedAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "pilotApplications",
      "fields": [
        { "fieldPath": "uid", "order": "ASCENDING" },
        { "fieldPath": "submittedAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

## Security Considerations

1. **Document Verification:** Admins should verify each document before approving
2. **Transaction Safety:** Approval process uses Firestore transactions to ensure atomicity
3. **Role Consistency:** UID remains consistent across all collections
4. **No Role Deletion:** Once 'pilot' role is added, it should not be removed (use status instead)

## Error Handling

### Common Errors
- `ConflictException` - User already has an application or is already a pilot
- `NotFoundException` - Application not found
- `BadRequestException` - Missing required fields or invalid data
- `ForbiddenException` - User trying to access another user's application

## Frontend Integration Checklist

- [ ] "Become a Pilot" button visible to customers
- [ ] Document upload UI with preview
- [ ] Application form with all required fields
- [ ] Application status tracking page
- [ ] Admin review interface with document viewer
- [ ] Approval/rejection with reason
- [ ] Individual document verification UI

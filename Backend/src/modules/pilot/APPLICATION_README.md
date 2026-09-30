# Pilot Application Module - Quick Reference

## ✅ Implementation Complete

The pilot application system has been fully implemented with the following components:

### 📁 Files Created

1. **DTOs:**
   - `dto/submit-pilot-application.dto.ts` - Application submission validation
   - `dto/review-pilot-application.dto.ts` - Admin review actions
   
2. **Interfaces:**
   - `interfaces/pilot-application.interface.ts` - TypeScript interfaces for application data

3. **Services:**
   - `services/pilot-application.service.ts` - Core business logic

4. **Controllers:**
   - `pilot-application.controller.ts` - API endpoints

5. **Documentation:**
   - `PILOT_APPLICATION_FLOW.md` - Complete flow documentation
   - `APPLICATION_README.md` - This file

6. **Configuration:**
   - `firestore-indexes/pilotApplications.json` - Database indexes
   - Updated `pilot.module.ts` - Module registration
   - Updated `collection-paths.constant.ts` - Added pilotApplications collection

## 🔑 Key Features

### For Customers
- ✅ Submit pilot application with documents
- ✅ Upload documents via Firebase Storage
- ✅ Check application status
- ✅ Withdraw pending applications

### For Admins
- ✅ View all applications with filters
- ✅ View pending applications count
- ✅ Review detailed application information
- ✅ Verify individual documents
- ✅ Approve/reject applications
- ✅ Assign fleet managers during approval

### System Features
- ✅ **One UID for Life:** Same Firebase Auth UID across users, pilots, and all role collections
- ✅ **Atomic Transactions:** Approval creates pilot document and updates user roles atomically
- ✅ **Document Management:** Full document upload, storage, and verification workflow
- ✅ **Sequential Application IDs:** PAPP000001, PAPP000002, etc.
- ✅ **Duplicate Prevention:** Cannot submit multiple pending applications
- ✅ **Role Validation:** Cannot apply if already a pilot

## 🚀 Quick Start

### Customer: Submit Application

```typescript
// 1. Upload documents first
POST /files/upload-url
POST /files/register

// 2. Submit application
POST /pilot-applications/submit
{
  "name": "John Doe",
  "age": 35,
  "phone": "+919876543210",
  "email": "john@example.com",
  "address": "Mumbai",
  "pilotLicenseNumber": "DGCA-001",
  "pilotExpiryDate": "2030-12-31",
  "aadhaarCardNumber": "1234 5678 9012",
  "panNumber": "ABCDE1234F",
  "gstNumber": "27ABCDE1234F1Z5",
  "serviceTypes": ["spraying", "mapping"],
  "specializations": ["Crop Spraying"],
  "documents": [
    {
      "type": "aadhaar_front",
      "storagePath": "documents/.../aadhaar_front.jpg",
      "downloadUrl": "https://...",
      "verified": "pending"
    },
    // ... more documents
  ]
}

// 3. Check status
GET /pilot-applications/my-application
```

### Admin: Review Applications

```typescript
// 1. Get pending applications
GET /pilot-applications?status=pending

// 2. View details
GET /pilot-applications/PAPP000001

// 3. Verify documents (optional)
PATCH /pilot-applications/PAPP000001/documents/aadhaar_front/verify
{
  "status": "verified",
  "notes": "Document is valid"
}

// 4. Approve application
PATCH /pilot-applications/PAPP000001/review
{
  "action": "approved",
  "reviewNotes": "All documents verified",
  "assignedFleetManagerUid": "FM001" // optional
}
```

## 📊 What Happens on Approval

```
BEFORE APPROVAL:
users/{uid}
  └─ roles: ["customer"]
  
pilotApplications/PAPP000001
  └─ status: "pending"
  
pilots/{uid}
  └─ (does not exist)

AFTER APPROVAL (Atomic Transaction):
users/{uid}
  └─ roles: ["customer", "pilot"] ← Updated
  
pilotApplications/PAPP000001
  └─ status: "approved" ← Updated
  
pilots/{uid} ← Created with same UID
  └─ Full pilot profile data
```

## 🔐 Permissions

### Customer (role: "customer")
- Submit application
- View own application
- Delete own pending application

### Admin (roles: "admin", "super_admin", "state_admin", "dept_admin")
- View all applications
- Review applications
- Verify documents
- Approve/reject applications

## 📝 Required Documents

1. **Aadhaar Card**
   - Front side (`aadhaar_front`)
   - Back side (`aadhaar_back`)

2. **Pilot License**
   - DGCA license document (`pilot_license`)

3. **GST Registration** (optional)
   - GST certificate (`gst_registration`)

4. **Pilot Registration** (optional)
   - Registration certificate (`pilot_registration`)

5. **Medical Certificate** (optional)
   - Medical fitness certificate (`medical_certificate`)

## 🗄️ Collections

### pilotApplications
```
Document ID: PAPP000001 (auto-generated)
Purpose: Temporary storage for applications
Lifecycle: Created on submission, updated on review
```

### pilots
```
Document ID: {uid} (same as Firebase Auth UID)
Purpose: Permanent pilot profile
Lifecycle: Created on approval, never deleted (use status field)
```

### users
```
Document ID: {uid} (Firebase Auth UID)
Purpose: User account with roles
Field Updated: roles array (adds "pilot" on approval)
```

## 🔍 Indexes Required

Deploy these Firestore indexes (already created in `firestore-indexes/pilotApplications.json`):

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

## ⚠️ Important Notes

1. **UID Consistency:** Always use the same Firebase Auth UID across all collections
2. **Never Create New UIDs:** Don't generate pilot IDs like "PILOT001" - use existing user UID
3. **Role Addition, Not Replacement:** Add "pilot" to roles array, don't replace "customer"
4. **Transaction Safety:** Approval process is atomic - either all succeed or all fail
5. **Document Verification:** Verify documents before approving applications
6. **Status Field:** Use `status` field in pilots collection instead of deleting documents

## 🧪 Testing

### Test Scenarios

1. **Happy Path:**
   - Customer submits application
   - Admin approves
   - Pilot document created
   - User roles updated
   - Customer can now access pilot features

2. **Rejection Path:**
   - Customer submits application
   - Admin rejects with reason
   - No pilot document created
   - User remains as customer
   - Can resubmit after fixing issues

3. **Duplicate Prevention:**
   - Customer with pending application tries to submit again
   - System rejects with ConflictException

4. **Already a Pilot:**
   - User with pilot role tries to apply
   - System rejects with ConflictException

## 📱 Frontend Integration

### Customer UI Components Needed
- [ ] "Become a Pilot" button in profile/menu
- [ ] Application form with document upload
- [ ] Document upload component with preview
- [ ] Application status page
- [ ] Withdrawal confirmation dialog

### Admin UI Components Needed
- [ ] Applications list with filters (pending/approved/rejected)
- [ ] Application detail view
- [ ] Document viewer with zoom
- [ ] Document verification controls
- [ ] Approval/rejection dialog with reason input
- [ ] Fleet manager assignment dropdown

## 🔄 Next Steps

1. **Deploy Firestore Indexes:**
   ```bash
   firebase deploy --only firestore:indexes
   ```

2. **Test API Endpoints:**
   - Use Postman collection
   - Test all customer flows
   - Test all admin flows

3. **Implement Frontend:**
   - Customer application flow
   - Admin review interface

4. **Configure Notifications:**
   - Application submitted notification (to admins)
   - Application approved notification (to customer)
   - Application rejected notification (to customer)

5. **Add Analytics:**
   - Track application submission rates
   - Monitor approval/rejection ratios
   - Identify common rejection reasons

## 📚 Related Documentation

- See `PILOT_APPLICATION_FLOW.md` for detailed flow diagrams
- See `file-storage/README.md` for document upload documentation
- See `postman/README.md` for API testing guide

## 🐛 Common Issues

### Issue: "Application not found"
- **Cause:** Invalid application ID
- **Solution:** Check application ID format (PAPP000001)

### Issue: "User already has a pilot application"
- **Cause:** Pending or approved application exists
- **Solution:** Check application status, withdraw if needed

### Issue: "File upload failed"
- **Cause:** Invalid file size or type
- **Solution:** Check file-storage module limits (50MB max)

### Issue: "Transaction failed"
- **Cause:** Concurrent updates or Firestore timeout
- **Solution:** Retry the operation

## 💡 Tips

1. **Document Verification:** Verify documents individually before final approval
2. **Fleet Manager Assignment:** Assign during approval or later via pilot management
3. **Batch Operations:** Use filters to review similar applications together
4. **Application IDs:** Sequential IDs make it easy to track and reference applications
5. **Status Tracking:** Use application status for dashboard metrics and reporting

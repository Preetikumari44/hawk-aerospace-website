# HAWK API Testing with Postman

Complete guide for testing the HAWK Aerosystem backend APIs using Postman.

## 📦 Quick Start

### 1. Import Collection
1. Open Postman
2. Click **Import** button
3. Select `HAWK_API_Testing_Collection.postman_collection.json`
4. Collection will appear in your workspace

### 2. Configure Environment Variables

The collection uses these variables (auto-configured during testing):

| Variable | Description | Default Value |
|----------|-------------|---------------|
| `baseUrl` | Backend API URL | `http://localhost:3001/api` |
| `phoneNumber` | Test phone number | `+919876543210` |
| `otp` | OTP code from SMS (manual entry) | - |
| `accessToken` | Auth token (auto-set) | - |
| `refreshToken` | Refresh token (auto-set) | - |
| `customerUid` | Customer UID (auto-set) | - |
| `bookingId` | Created booking ID (auto-set) | - |

### 3. Update Base URL

Backend runs on port **3001** with `/api` prefix:
1. Click collection name → **Variables** tab
2. Confirm `baseUrl` value is `http://localhost:3001/api`
3. Click **Save**

## 🚀 Testing Flow

### Complete Customer Booking Journey

#### **Step 1: Authentication**

**1.1 Request OTP**
```
POST /api/auth/request-otp
Body: {
  "phone": "+919876543210",
  "role": "customer"
}
```
- OTP will be sent to your phone via Firebase Auth SMS
- Check your phone for the 6-digit OTP code
- OTP is valid for 5 minutes

**1.2 Verify OTP & Login**
```
POST /api/auth/verify-otp
Body: {
  "phone": "+919876543210",
  "otpCode": "YOUR_OTP_HERE",
  "role": "customer"
}
```
- ✅ **Automatically saves**: `accessToken`, `refreshToken`, `customerUid`
- Use this token for all subsequent requests

#### **Step 2: Profile Setup (Optional)**

**2.1 Get Profile**
```
GET /customers/profile
Headers: Authorization: Bearer {{accessToken}}
```

**2.2 Update Profile**
```
PATCH /customers/profile
Body: {
  "fullName": "John Doe",
  "email": "john.doe@example.com",
  "address": "Farm Address"
}
```

#### **Step 3: Create Booking with Auto-Assignment**

**3.1 Get Price Estimate (Optional)**
```
POST /pricing/estimate
Body: {
  "serviceType": "spraying",
  "cropType": "wheat",
  "area": 5.5,
  "unit": "acres",
  "location": {
    "latitude": 19.9615,
    "longitude": 73.7863
  }
}
```

**3.2 Create Booking**
```
POST /bookings
Body: {
  "serviceType": "spraying",
  "cropType": "wheat",
  "area": 5.5,
  "unit": "acres",
  "address": "Farm Plot 42, Village Nandgaon, Nashik, Maharashtra",
  "location": {
    "latitude": 19.9615,
    "longitude": 73.7863
  },
  "scheduledDate": "2026-07-15",
  "preferredTimeSlot": "morning",
  "notes": "Please avoid windy conditions",
  "paymentMethod": "upi"
}
```

✅ **What happens automatically:**
1. Booking created with status `pending`
2. System triggers auto-assignment algorithm
3. Finds available pilots near location
4. Scores pilots based on:
   - Distance from booking location
   - Availability on scheduled date
   - Pilot rating & experience
   - Drone compatibility
5. Assigns best-matching pilot
6. Booking status → `confirmed`
7. Notifications sent to customer & pilot

#### **Step 4: Track Booking**

**4.1 Get Booking Details**
```
GET /bookings/{{bookingId}}
```
Check: `pilotUid`, `status`, `assignedAt`

**4.2 Get Booking Progress**
```
GET /bookings/{{bookingId}}/progress
```
View booking lifecycle stages

**4.3 List All Bookings**
```
GET /bookings?status=confirmed&page=1&limit=10
```

#### **Step 5: Payment & Completion**

**5.1 Check Payment Status**
```
GET /payments/booking/{{bookingId}}
```

**5.2 Rate Booking (After Completion)**
```
POST /bookings/{{bookingId}}/rate
Body: {
  "rating": 5,
  "review": "Excellent service!"
}
```

---

## 🔧 Testing Scenarios

### Scenario 1: Successful Booking Flow
1. Request OTP → Verify → Create Booking → Check Assignment
2. **Expected**: Pilot assigned within seconds
3. **Verify**: Booking status changes to `confirmed`

### Scenario 2: No Available Pilots
1. Create booking for remote location
2. **Expected**: Booking remains `pending`
3. **Verify**: Response indicates no pilots available

### Scenario 3: Booking Cancellation
1. Create booking
2. Cancel before pilot assignment
3. **Expected**: Full refund processed
4. **Verify**: Status → `cancelled`, refund initiated

### Scenario 4: OTP Verification Errors
1. Request OTP
2. Enter wrong OTP
3. **Expected**: 401 Unauthorized
4. Try correct OTP
5. **Expected**: Success with tokens

---

## 🐛 Troubleshooting

### Issue: OTP Not Received
**Solution:**
- Check Firebase Console → Authentication → Sign-in method → Phone enabled
- For testing, check Firestore → `auth_otp_codes` collection
- Use Firebase emulator for local testing

### Issue: 401 Unauthorized
**Solution:**
- Check if `accessToken` is set in collection variables
- Token expires after 1 hour - use refresh token endpoint
- Re-run "Verify OTP" request to get new token

### Issue: Booking Not Auto-Assigned
**Solution:**
- Check if pilots exist in database with:
  - `role: 'pilot'`
  - `status: 'active'`
  - `adminApproval: true`
- Verify pilot has location data
- Check server logs for auto-assignment errors

### Issue: 429 Too Many Requests
**Solution:**
- Rate limits applied per endpoint
- Wait 60 seconds before retrying
- Check collection throttle settings

---

## 📊 Response Validation

### Successful Login Response
```json
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "user": {
    "uid": "abc123...",
    "phoneNumber": "+919876543210",
    "role": "customer",
    "fullName": "John Doe"
  }
}
```

### Successful Booking Response
```json
{
  "id": "booking_xyz789",
  "bookingNumber": "BK-2026-001234",
  "customerUid": "abc123...",
  "serviceType": "spraying",
  "cropType": "wheat",
  "area": 5.5,
  "status": "pending",
  "scheduledDate": "2026-07-15",
  "priceEstimation": 2750,
  "createdAt": "2026-07-08T11:30:00.000Z"
}
```

### Booking with Pilot Assignment
```json
{
  "id": "booking_xyz789",
  "status": "confirmed",
  "pilotUid": "pilot_abc456",
  "pilotName": "Rajesh Kumar",
  "droneId": "drone_def789",
  "assignedAt": "2026-07-08T11:30:15.000Z",
  "estimatedStartTime": "2026-07-15T06:00:00.000Z"
}
```

---

## 🔐 Authentication & Security

### Token Management
- **Access Token**: Valid for 1 hour
- **Refresh Token**: Valid for 30 days
- Tokens auto-saved in collection variables
- Use refresh endpoint before token expiry

### Rate Limiting
| Endpoint | Limit | Window |
|----------|-------|--------|
| `/auth/request-otp` | 3 requests | 15 minutes |
| `/auth/verify-otp` | 5 requests | 15 minutes |
| `/bookings` (POST) | 10 requests | 1 minute |
| `/bookings` (GET) | 40 requests | 1 minute |
| `/pricing/estimate` | 20 requests | 1 minute |

### Headers Required
```
Authorization: Bearer {{accessToken}}
Content-Type: application/json
```

---

## 📝 Test Data Examples

### Valid Phone Numbers (India)
```
+919876543210
+918765432109
+917654321098
```

### Service Types
- `spraying` - Pesticide/Fertilizer spraying
- `seeding` - Seed sowing
- `monitoring` - Crop health monitoring
- `surveying` - Land surveying

### Crop Types
- `wheat`, `rice`, `cotton`, `sugarcane`
- `corn`, `soybean`, `potato`, `tomato`

### Location Coordinates (Maharashtra)
```json
{
  "latitude": 19.9615,
  "longitude": 73.7863
}
```

---

## 🚦 Status Codes

| Code | Meaning | Action |
|------|---------|--------|
| 200 | Success | Continue flow |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Check request body |
| 401 | Unauthorized | Refresh or re-login |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 429 | Too Many Requests | Wait and retry |
| 500 | Server Error | Check server logs |

---

## 🎯 Pre-requisites for Testing

### Backend Requirements
1. **Backend Running**
   ```bash
   cd Backend
   npm run start:dev
   ```

2. **Firebase Setup**
   - Firebase project created
   - Authentication enabled (Phone)
   - Firestore database initialized
   - Service account key configured

3. **Environment Variables**
   - `.env` file configured with all required keys
   - Firebase credentials set
   - Database connection strings set

4. **Database Seeded** (Optional but recommended)
   ```bash
   npm run firebase:seed
   ```
   Seeds test data:
   - 3 active pilots
   - 2 drones per pilot
   - Sample locations

### Firebase Console Check
1. Navigate to Firebase Console
2. Check **Authentication** → Phone auth enabled
3. Check **Firestore** → Collections created:
   - `users` (with pilot documents)
   - `bookings`
   - `missions`
   - `auth_otp_codes`

---

## 📞 Testing with Real Phone Numbers

### Option 1: Firebase Test Numbers (Development)
1. Firebase Console → Authentication → Sign-in method
2. Phone → Test phone numbers
3. Add: `+919876543210` → OTP: `123456`
4. Use in Postman requests

### Option 2: Real Phone Numbers (Staging/Production)
1. Use actual phone number
2. Wait for SMS with OTP
3. Enter received OTP in Postman

---

## 🔄 Advanced Testing

### Testing Auto-Assignment Algorithm

**Prerequisites:**
- At least 2 pilots in database
- Pilots have different locations
- Pilots are `active` and `adminApproval: true`

**Test Steps:**
1. Create booking near Pilot A's location
2. Verify Pilot A is assigned
3. Create another booking near Pilot B's location  
4. Verify Pilot B is assigned
5. Check assignment based on proximity

**Expected Behavior:**
- Closest pilot assigned first
- If closest pilot unavailable, next best pilot assigned
- If no pilots available, booking stays `pending`

### Testing Booking Lifecycle

```
pending → confirmed → in_progress → completed
         ↓
      cancelled (with refund)
```

**Test Each State:**
1. Create booking (pending)
2. Wait for auto-assignment (confirmed)
3. Pilot starts mission (in_progress)
4. Pilot completes mission (completed)
5. Customer rates booking

---

## 💡 Tips for Effective Testing

1. **Use Collection Runner**
   - Run entire flow automatically
   - Test multiple scenarios
   - Generate test reports

2. **Monitor Server Logs**
   ```bash
   # In separate terminal
   cd Backend
   npm run start:dev
   ```
   Watch for:
   - Auto-assignment triggers
   - Pilot scoring logs
   - Error messages

3. **Check Firestore Console**
   - Verify documents created
   - Check field values
   - Monitor real-time updates

4. **Test Edge Cases**
   - Invalid phone numbers
   - Expired OTP
   - Duplicate bookings
   - Past scheduled dates
   - Invalid locations

---

## 📚 Additional Resources

- [Backend API Documentation](../README.md)
- [Firebase Setup Guide](../docs/firebase-setup.md)
- [Architecture Overview](../FIRESTORE_ARCHITECTURE_MASTER.md)
- [Booking Module Docs](../src/modules/booking/README.md)

---

## ❓ FAQ

**Q: How do I get OTP for testing?**
A: Check Firebase Console → Firestore → `auth_otp_codes` collection or use test phone numbers

**Q: Why is pilot not auto-assigned?**
A: Check pilots have `status: 'active'` and `adminApproval: true` in Firestore

**Q: Can I test without real phone number?**
A: Yes, configure Firebase test phone numbers with fixed OTP codes

**Q: How to test refund flow?**
A: Create booking → Cancel before completion → Check payment status

**Q: Token expired, what to do?**
A: Use "Refresh Token" request or re-run "Verify OTP" flow

---

**Need Help?** Check server logs or Firestore console for detailed error messages.


---

## 🎯 NEW: Pilot Application Flow

### Complete Flow for Applying to Become a Pilot

#### **Step 1: Document Upload**

**1.1 Request Upload URL**
```
POST /files/upload-url
Headers: Authorization: Bearer {{accessToken}}
Body: {
  "fileName": "aadhaar_front.jpg",
  "contentType": "image/jpeg",
  "fileSize": 245760,
  "bucket": "documents",
  "folder": "kyc/aadhaar_front"
}
```
- ✅ **Returns**: `uploadUrl`, `storagePath`, `expiresAt`
- Upload file directly to Firebase Storage using the signed URL (client-side)

**1.2 Register Document**
```
POST /files/register
Body: {
  "fileName": "aadhaar_front.jpg",
  "contentType": "image/jpeg",
  "fileSize": 245760,
  "storagePath": "{{storagePath}}",
  "downloadUrl": "https://storage.googleapis.com/...",
  "category": "kyc",
  "documentType": "aadhaar"
}
```
- ✅ **Returns**: `fileId`, `downloadUrl`, `category`
- Repeat for all required documents

#### **Step 2: Submit Application**

**2.1 Submit Pilot Application**
```
POST /pilot-applications/submit
Body: {
  "name": "Ramesh Patil",
  "age": 41,
  "phone": "+919220989863",
  "email": "ramesh.patil@example.com",
  "address": "Pune, Maharashtra",
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
      "storagePath": "{{storagePath}}",
      "downloadUrl": "{{downloadUrl}}",
      "verified": "pending"
    },
    {
      "type": "aadhaar_back",
      "storagePath": "...",
      "downloadUrl": "...",
      "verified": "pending"
    },
    {
      "type": "pilot_license",
      "storagePath": "...",
      "downloadUrl": "...",
      "verified": "pending"
    }
  ]
}
```
- ✅ **Returns**: Complete application with `applicationId` (e.g., PAPP000001)
- Application status: `pending`

**2.2 Check Application Status**
```
GET /pilot-applications/my-application
```
- Returns current application status
- Shows verification progress for each document

#### **Step 3: Admin Review (Admin Endpoints)**

**3.1 Get All Applications (Admin Only)**
```
GET /pilot-applications?status=pending&limit=50
```
- View all pending applications
- Filter by status: `pending`, `approved`, `rejected`

**3.2 Get Application Details**
```
GET /pilot-applications/{{applicationId}}
```
- View complete application with all documents
- Check verification status

**3.3 Verify Individual Documents**
```
PATCH /pilot-applications/{{applicationId}}/documents/pilot_license/verify
Body: {
  "status": "verified",
  "notes": "Document verified with DGCA database"
}
```
- Document types: `aadhaar_front`, `aadhaar_back`, `pilot_license`, `gst_registration`
- Status: `pending`, `verified`, `rejected`

**3.4 Approve Application**
```
PATCH /pilot-applications/{{applicationId}}/review
Body: {
  "action": "approved",
  "reviewNotes": "All documents verified. Pilot license valid.",
  "assignedFleetManagerUid": "FM001"
}
```
✅ **What happens (Atomic Transaction):**
1. Application status → `approved`
2. User roles → `["customer", "pilot"]`
3. New pilot document created: `pilots/{uid}`
4. All changes happen atomically

**3.5 Reject Application**
```
PATCH /pilot-applications/{{applicationId}}/review
Body: {
  "action": "rejected",
  "rejectionReason": "Pilot license has expired",
  "reviewNotes": "Need valid license for approval"
}
```
- User remains as customer
- Can resubmit after fixing issues

---

## 📋 Required Documents for Pilot Application

| Document | Type | Required | Description |
|----------|------|----------|-------------|
| Aadhaar Front | `aadhaar_front` | ✅ Yes | Front side of Aadhaar card |
| Aadhaar Back | `aadhaar_back` | ✅ Yes | Back side of Aadhaar card |
| Pilot License | `pilot_license` | ✅ Yes | DGCA pilot license document |
| GST Registration | `gst_registration` | ⚠️ Optional | GST registration certificate |
| Pilot Registration | `pilot_registration` | ⚠️ Optional | Pilot registration document |
| Medical Certificate | `medical_certificate` | ⚠️ Optional | Medical fitness certificate |

### Document Requirements
- **Max file size**: 50MB per document
- **Allowed formats**: JPEG, PNG, WebP, PDF
- **Image quality**: Clear, readable, not blurred

---

## 🔄 Pilot Application Status Flow

```
Customer Submits → pending
                     ↓
Admin Reviews → pending (documents verified)
                     ↓
              ┌──────┴──────┐
              ↓             ↓
          approved      rejected
              ↓             ↓
     Pilot Created    Can Reapply
     Role Added
```

---

## 🧪 Testing Pilot Application

### Test Scenario 1: Successful Application
1. Login as customer
2. Upload all required documents
3. Submit application
4. Check status (should be `pending`)
5. Admin logs in
6. Reviews and approves application
7. Customer now has `pilot` role
8. Check `pilots` collection for new document

### Test Scenario 2: Application Rejection
1. Submit application with expired license
2. Admin reviews
3. Rejects with reason
4. Check status shows rejection reason
5. Fix issues and resubmit

### Test Scenario 3: Document Verification
1. Submit application
2. Admin verifies documents one by one
3. Some documents verified, some rejected
4. Customer resubmits rejected documents
5. Admin re-reviews
6. Final approval

---

## 🎯 Pilot Application Validation Rules

| Field | Rule |
|-------|------|
| Age | 18-70 years |
| License | Must not be expired |
| Documents | Minimum: Aadhaar (both sides) + Pilot License |
| Duplicate | Cannot have multiple pending applications |
| Already Pilot | Cannot apply if already approved as pilot |

---

## 💡 Tips for Testing Pilot Application

1. **Document Upload Flow**
   - Always request upload URL first
   - Upload file to Firebase Storage (client handles this)
   - Register file metadata after upload
   - Use returned URLs in application

2. **One UID Architecture**
   - Same Firebase Auth UID used across collections
   - User document: `users/{uid}`
   - Pilot document: `pilots/{uid}` (created on approval)
   - Never creates new UIDs for roles

3. **Admin Testing**
   - Create admin user with role: `admin`, `super_admin`, or `state_admin`
   - Use admin access token for review endpoints
   - Test document verification before final approval

4. **Status Tracking**
   - Customer can check status anytime
   - Pending count visible to admins
   - Track from submission to approval/rejection

---

## 🐛 Troubleshooting Pilot Application

### Issue: Cannot Submit Application
**Possible Causes:**
- Already have pending/approved application
- Already a pilot (check `roles` array)
- Missing required documents
- Invalid document format/size

### Issue: Documents Not Uploading
**Solutions:**
- Check file size (max 50MB)
- Verify file type (JPEG, PNG, WebP, PDF only)
- Ensure Firebase Storage permissions correct
- Check signed URL expiry (15 minutes)

### Issue: Application Not Approved
**Check:**
- All documents verified by admin
- License not expired
- Admin has correct permissions
- Review transaction logs for errors

### Issue: User Still Not Pilot After Approval
**Verify:**
- Check `users/{uid}` → roles includes "pilot"
- Check `pilots/{uid}` document exists
- Verify atomic transaction completed
- Check server logs for transaction errors

---

**Updated:** January 2026 - Added Pilot Application Flow (Sections 7 & 8)

# Quick Test Setup Guide

## 🚀 Get Started in 5 Minutes

### Step 1: Start Backend
```bash
cd c:\HAWK\Backend
npm run start:dev
```
Wait for: `Application is running on: http://localhost:3001`
Note: Server runs on **port 3001** with `/api` prefix

### Step 2: Import Postman Collection
1. Open Postman
2. **Import** → Select `HAWK_API_Testing_Collection.postman_collection.json`
3. Collection appears in left sidebar

### Step 3: Configure Test Phone
**Option A: Use Firebase Test Number (Recommended)**
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your HAWK project
3. Authentication → Sign-in method → Phone
4. Scroll to "Phone numbers for testing"
5. Add: `+919876543210` with OTP `123456`
6. Save

**Option B: Use Your Real Phone**
- Skip Firebase test setup
- Use your actual phone number
- Receive real SMS OTP

### Step 4: Update Collection Variables
1. In Postman, click collection name
2. Go to **Variables** tab
3. Confirm values:
   - `baseUrl`: `http://localhost:3001/api` ✓
   - `phoneNumber`: `+919876543210` (or your number)
4. Save

### Step 5: Run First Test
1. Open **1. Authentication Flow** folder
2. Click **1.1 Request OTP**
3. Click **Send**
4. Check response: Should see `{ "success": true }`

### Step 6: Get OTP Code
**If using Firebase test number:**
- OTP is `123456` (configured in Step 3)

**If using real phone:**
- Check your SMS
- Copy the 6-digit code

### Step 7: Complete Login
1. Click **1.2 Verify OTP & Login**
2. In Variables tab, set `otp` to your code (e.g., `123456`)
3. Click **Send**
4. ✅ Success! Access token auto-saved

### Step 8: Create Test Booking
1. Open **3. Booking Flow** folder
2. Click **3.1 Create Booking**
3. Click **Send**
4. ✅ Booking created with auto-pilot assignment!

---

## 🎯 Complete Test Sequence

Run these requests in order:

### Authentication (Required First)
```
1.1 Request OTP          → Get OTP code
1.2 Verify OTP & Login   → Get access token
```

### Profile Setup (Optional)
```
2.1 Get My Profile       → See customer data
2.2 Update Profile       → Add name, email
```

### Booking Journey (Main Flow)
```
4.1 Get Price Estimate   → See cost before booking
3.1 Create Booking       → Creates + auto-assigns pilot
3.2 Get Booking Details  → Check pilot assignment
3.3 Get Booking Progress → Track stages
3.4 List My Bookings     → See all bookings
```

### Post-Booking Actions
```
5.1 Get Payment Status   → Check payment state
3.6 Rate Booking         → Give 5-star rating
```

---

## ✅ Verification Checklist

After running tests, verify:

### 1. Authentication Works
- [ ] OTP received (SMS or Firebase console)
- [ ] Login successful with access token
- [ ] Token saved in collection variables

### 2. Booking Created
- [ ] Booking ID returned
- [ ] Status is `pending` or `confirmed`
- [ ] Price estimation calculated

### 3. Pilot Auto-Assignment
- [ ] Booking has `pilotUid` field
- [ ] Status changed to `confirmed`
- [ ] Assignment happened within seconds

### 4. Data in Firestore
Check Firebase Console → Firestore:
- [ ] Document in `bookings` collection
- [ ] Document in `users` collection (customer)
- [ ] Auth session in `auth_sessions` collection

---

## 🔍 Quick Debugging

### Problem: OTP Not Working
**Check:**
```bash
# 1. Firebase test number configured?
Firebase Console → Authentication → Phone → Test numbers

# 2. Check Firestore for OTP
Firebase Console → Firestore → auth_otp_codes collection
```

### Problem: 401 Unauthorized
**Fix:**
1. Re-run "1.2 Verify OTP & Login"
2. Check token in collection variables
3. Ensure Authorization header is set

### Problem: No Pilot Assigned
**Check Database:**
```bash
# Need at least one pilot with:
# - role: 'pilot'
# - status: 'active'  
# - adminApproval: true
```

**Seed test data:**
```bash
cd Backend
npm run firebase:seed
```

### Problem: Server Not Running
```bash
# Check if backend is running
curl http://localhost:3001/api

# If not, start it:
cd c:\HAWK\Backend
npm run start:dev
```

---

## 📊 Expected Results

### After Request OTP
```json
{
  "success": true,
  "message": "OTP sent successfully"
}
```

### After Verify OTP
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "uid": "kL9mN2pQ3rS...",
    "phoneNumber": "+919876543210",
    "role": "customer"
  }
}
```

### After Create Booking
```json
{
  "id": "booking_abc123",
  "bookingNumber": "BK-2026-001234",
  "customerUid": "kL9mN2pQ3rS...",
  "serviceType": "spraying",
  "status": "pending",
  "scheduledDate": "2026-07-15",
  "priceEstimation": 2750,
  "location": {
    "latitude": 19.9615,
    "longitude": 73.7863
  }
}
```

### After Auto-Assignment (check again)
```json
{
  "id": "booking_abc123",
  "status": "confirmed",
  "pilotUid": "pilot_xyz789",
  "pilotName": "Rajesh Kumar",
  "droneId": "drone_def456",
  "assignedAt": "2026-07-08T11:35:22.000Z"
}
```

---

## 🎓 Learning Path

**Day 1: Authentication**
- Request OTP
- Verify OTP
- Understand token flow

**Day 2: Booking Creation**
- Create simple booking
- Check booking details
- List bookings

**Day 3: Auto-Assignment**
- Understand pilot matching
- Test with multiple pilots
- Check assignment logs

**Day 4: Complete Flow**
- End-to-end customer journey
- Payment integration
- Rating & reviews

**Day 5: Edge Cases**
- Test error scenarios
- Invalid inputs
- Rate limiting

---

## 📞 Support

**Issues?**
1. Check [README.md](./README.md) for detailed docs
2. Review server logs in terminal
3. Inspect Firestore console
4. Check network tab in Postman

**Still stuck?**
- Review Backend [implementation_plan.md](../implementation_plan.md)
- Check [FIRESTORE_ARCHITECTURE_MASTER.md](../FIRESTORE_ARCHITECTURE_MASTER.md)

---

**Happy Testing! 🎉**

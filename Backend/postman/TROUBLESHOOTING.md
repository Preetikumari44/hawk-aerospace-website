# 🔧 API Testing Troubleshooting Guide

## ❌ Error: 404 Cannot POST /auth/request-otp

### Problem
Getting 404 error when calling authentication endpoints.

### Cause
Missing the `/api` prefix in the URL. The HAWK backend uses a global API prefix.

### Solution
✅ **Correct URL Format:**
```
http://localhost:3001/api/auth/request-otp
```

❌ **Incorrect:**
```
http://localhost:3000/auth/request-otp  (wrong port)
http://localhost:3001/auth/request-otp  (missing /api prefix)
```

### Quick Fix in Postman
1. Click collection name
2. Go to **Variables** tab
3. Set `baseUrl` to: `http://localhost:3001/api`
4. Save and retry

---

## 🔐 Server Configuration

| Setting | Value | Location |
|---------|-------|----------|
| **Port** | 3001 | `.env` → `PORT=3001` |
| **API Prefix** | `/api` | `.env` → `API_PREFIX=api` |
| **Full Base URL** | `http://localhost:3001/api` | - |

---

## 🚨 Common Errors & Solutions

### Error: ECONNREFUSED
```json
{
  "error": "connect ECONNREFUSED 127.0.0.1:3001"
}
```

**Cause:** Backend server not running

**Solution:**
```bash
cd c:\HAWK\Backend
npm run start:dev
```

Wait for: `Backend listening on port 3001`

---

### Error: 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

**Cause:** Missing or invalid access token

**Solutions:**
1. **Get new token:**
   - Run "1.1 Request OTP"
   - Run "1.2 Verify OTP" with correct OTP
   - Token auto-saved to collection variables

2. **Check token exists:**
   - Collection → Variables tab
   - Verify `accessToken` has value

3. **Token expired:**
   - Run "1.3 Refresh Token" OR
   - Re-run authentication flow

---

### Error: Invalid OTP
```json
{
  "statusCode": 400,
  "message": "Invalid or expired OTP"
}
```

**Solutions:**

**Option 1: Use Firebase Test Number**
1. Firebase Console → Authentication
2. Phone → Test phone numbers
3. Add: `+919876543210` → OTP: `123456`
4. Use these exact values in Postman

**Option 2: Check Firestore**
1. Firebase Console → Firestore
2. Collection: `auth_otp_codes`
3. Find document with your phone number
4. Copy `code` field value
5. Use in Postman

**Option 3: Request New OTP**
1. Re-run "1.1 Request OTP"
2. Wait for new SMS/code
3. Use fresh OTP within 10 minutes

---

### Error: 429 Too Many Requests
```json
{
  "statusCode": 429,
  "message": "ThrottlerException: Too Many Requests"
}
```

**Cause:** Rate limit exceeded

**Solution:**
- Wait 60 seconds
- Retry request
- Rate limits reset every minute

**Rate Limits:**
- OTP requests: 3 per 15 minutes
- OTP verify: 5 per 15 minutes
- Bookings: 10 per minute

---

### Error: Firebase Admin SDK not initialized
```json
{
  "statusCode": 500,
  "message": "Firebase Admin SDK is not initialized"
}
```

**Cause:** Missing Firebase credentials

**Solution:**
1. Check `.env` file has Firebase config:
   ```
   FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_CLIENT_EMAIL=your-client-email
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
   ```

2. Download service account key:
   - Firebase Console → Project Settings
   - Service Accounts tab
   - Generate new private key
   - Copy values to `.env`

3. Restart server:
   ```bash
   npm run start:dev
   ```

---

### Error: No pilots available for assignment
```json
{
  "statusCode": 200,
  "message": "Booking created but no pilots available",
  "status": "pending"
}
```

**Cause:** No active pilots in database

**Solution:**

**Option 1: Seed Test Data**
```bash
cd c:\HAWK\Backend
npm run firebase:seed
```

**Option 2: Create Pilot Manually**
Via Firestore Console:
1. Collection: `users`
2. Add document:
```json
{
  "uid": "pilot_test123",
  "role": "pilot",
  "status": "active",
  "adminApproval": true,
  "fullName": "Test Pilot",
  "phoneNumber": "+919876543211",
  "profileData": {
    "assignedVendorUid": "vendor123",
    "location": {
      "latitude": 19.96,
      "longitude": 73.78
    }
  }
}
```

---

## 🧪 Verification Checklist

Before testing, verify:

### Backend Running
```bash
# Should see: Backend listening on port 3001
curl http://localhost:3001/api
```

### Environment Variables Set
```bash
# Check .env file has:
PORT=3001
API_PREFIX=api
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY=...
```

### Firebase Configured
- [ ] Project created
- [ ] Authentication enabled (Phone)
- [ ] Firestore database created
- [ ] Service account key downloaded

### Postman Collection
- [ ] Collection imported
- [ ] `baseUrl` = `http://localhost:3001/api`
- [ ] `phoneNumber` set
- [ ] Test phone number configured in Firebase

---

## 📞 Test Phone Number Setup

### Recommended: Firebase Test Numbers

**Benefits:**
- No SMS costs
- Instant OTP
- Fixed OTP code
- Perfect for development

**Setup:**
1. Firebase Console → Authentication
2. Sign-in method → Phone
3. Scroll to "Phone numbers for testing"
4. Click "Add phone number"
5. Phone: `+919876543210`
6. OTP: `123456`
7. Save

**Usage in Postman:**
```json
{
  "phoneNumber": "+919876543210",
  "otp": "123456",
  "role": "customer"
}
```

---

## 🔍 Debug Mode

### Enable Detailed Logs
```bash
cd c:\HAWK\Backend
npm run start:debug
```

### Watch Server Output
Look for:
```
[AuthService] OTP requested for +919876543210
[AuthService] OTP sent successfully
[BookingService] Auto-assigning pilot for booking_xyz
[PilotService] Found 3 available pilots
[PilotService] Pilot pilot_abc assigned to booking_xyz
```

### Check Firestore Console
Monitor collections in real-time:
- `auth_otp_codes` - OTP codes
- `auth_sessions` - Active sessions
- `users` - Customer/Pilot profiles
- `bookings` - Created bookings

---

## 💡 Quick Fixes

### Reset Everything
```bash
# Stop server
Ctrl+C

# Clear cache
npm run cache:clear

# Restart
npm run start:dev
```

### Re-import Collection
1. Delete old collection in Postman
2. Re-import `HAWK_API_Testing_Collection.postman_collection.json`
3. Verify variables

### Check Network Tab
In Postman Console:
1. View → Show Postman Console
2. See full request/response
3. Check actual URL called
4. Verify headers sent

---

## 📚 Additional Resources

- [Main README](./README.md) - Complete documentation
- [Quick Setup Guide](./test-setup-guide.md) - Get started fast
- [Backend .env.example](../.env.example) - Environment template
- [Auth Implementation](../AUTH_IMPLEMENTATION_COMPLETE.md) - Auth details

---

**Still having issues?** Check server logs for detailed error messages.

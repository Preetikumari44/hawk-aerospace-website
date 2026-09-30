# Hawk Aerosystem Super App

A multi-role drone service platform connecting customers, pilots, fleet managers, technicians, sales aggregators, and administrators. Customers can book drone services (spraying, seeding, monitoring, mapping, surveillance, videography, delivery), track missions in real time, and manage payments — all through a single mobile app.

## Project Structure

| Directory | Description |
|-----------|-------------|
| `Backend/` | NestJS REST API + WebSocket server (TypeScript). Handles all business logic, auth, payments, real-time GPS tracking, and serves the APK for auto-updates. |
| `User_Frontend/` | React Native app for customers, pilots, fleet managers, technicians, and sales aggregators. The primary mobile app used by end users. |
| `Frontend/` | React Native app for administrators (admin CLI). Used by admins, super admins, and state/department admins to manage the platform. |
| `booking-module/` | Extracted/standalone reference of the booking module (documentation and archive). Not actively deployed. |

## How the Project Works

### Roles & Access

| Role | Description | App |
|------|-------------|-----|
| **Customer** | Books drone services for their farm/land | `User_Frontend` |
| **Pilot** | Flies drones, completes missions | `User_Frontend` |
| **Fleet Manager** | Manages pilots and drones, assigns resources | `User_Frontend` |
| **Technician** | Repairs and maintains drones | `User_Frontend` |
| **Sales Aggregator** | Onboards customers, books on their behalf | `User_Frontend` |
| **Admin / Super Admin** | Manages the entire platform | `Frontend` |
| **Sub Admin / State Admin / Dept Admin** | Regional administrative roles | `Frontend` |

### Booking Flow (End-to-End)

1. **Customer creates a booking** — selects service type (spraying, seeding, etc.), specifies farm location on a map, provides area/crop details, schedules a date. The backend validates airspace restrictions and estimates pricing.
2. **Admin approval** — an admin reviews and approves or rejects the booking.
3. **Fleet Manager assigns resources** — a pilot and drone are assigned to the booking. Status transitions to `confirmed`.
4. **Pilot executes the mission** — pilot navigates to the farm, performs pre-flight checks, starts the mission, and completes it. Real-time GPS tracking is broadcast via WebSocket.
5. **Payment** — the customer completes payment (the price was locked at booking time).
6. **Rating & Feedback** — the customer can rate the service.
7. **Completion** — the booking reaches stage 7 (`COMPLETED`).

Throughout the flow, both the customer and pilot receive real-time updates via Socket.IO (status changes, GPS location, progress).

### Auto-Update System

The app checks for updates on every launch. The backend serves:
- `GET /api/update/latest` — returns version metadata (version code, download URL, release notes)
- `GET /api/update/download` — serves the APK file directly from the server

The phone compares the server's `versionCode` against its own installed version (read from Android's PackageManager). If the server has a higher version, an update modal appears. The user taps "Update" to download and install the new APK.

## Tech Stack

### Backend
- **Runtime:** Node.js 22+, NestJS 10 (Express platform)
- **Database:** Firebase Firestore (primary), MongoDB/Mongoose (secondary)
- **Auth:** Firebase Authentication with JWT
- **Real-time:** Socket.IO WebSocket gateway
- **Payments:** Razorpay, Stripe
- **Notifications:** FCM (push), Twilio (SMS), SendGrid (email)
- **Caching:** Upstash Redis (with in-memory fallback)
- **File Storage:** Firebase Storage
- **Maps:** Google Maps API

### Mobile Apps
- **Framework:** React Native 0.86 + React 19
- **Platforms:** Android (primary), iOS, Web
- **State:** Custom navigation stack (no React Navigation)
- **Key Libraries:** react-native-maps, react-native-fs, socket.io-client, react-native-linear-gradient, Firebase native SDK

## Setup & Run

### Prerequisites
- Node.js >= 22.11.0
- npm
- Firebase project with Firestore, Authentication, Storage enabled
- MongoDB (optional, for secondary storage)
- Android SDK (for building the APK)

### 1. Backend Setup

```bash
cd Backend

# Install dependencies
npm install

# Copy environment config
cp .env.example .env

# Edit .env with your Firebase credentials and other config
# Required: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
# Optional: MONGODB_URI, UPSTASH_REDIS_URL, TWILIO/SENDGRID keys

# Generate secrets
npm run env:generate

# Start development server
npm run start:dev
```

The backend starts on `http://localhost:3001` by default.

### 2. User Frontend (Mobile App) Setup

```bash
cd User_Frontend

# Install dependencies
npm install

# For iOS (macOS only)
cd ios && pod install && cd ..

# Start Metro bundler
npx react-native start

# Run on Android
npx react-native run-android

# Run on iOS
npx react-native run-ios
```

### 3. Admin Frontend Setup

```bash
cd Frontend

npm install
npx react-native start
npx react-native run-android
```

### Building the APK for Release

```bash
cd User_Frontend/android

# Build release APK
./gradlew assembleRelease

# The APK will be at:
# app/build/outputs/apk/release/app-release.apk
```

## Sending an App Update (Release Workflow)

When you make changes to the backend or frontend and need to push an update to users:

### Step 1: Build the new APK
```bash
cd User_Frontend/android
./gradlew assembleRelease
```

### Step 2: Update version numbers

Three places need updating — keep them in sync:

| File | Field | Example |
|------|-------|---------|
| `User_Frontend/android/app/build.gradle` (line ~86) | `versionCode` | Increment from 5 to 6 |
| `User_Frontend/android/app/build.gradle` (line ~87) | `versionName` | Update to new version string |
| `User_Frontend/src/utils/updateChecker.js` | `FALLBACK_VERSION_CODE` | Match `build.gradle`'s `versionCode` |
| `Backend/public/apk/version.json` | `versionCode` | Set to **match** the APK's `versionCode` |
| `Backend/public/apk/version.json` | `versionName` | Set to **match** the APK's `versionName` |
| `Backend/public/apk/version.json` | `releaseNotes` | Describe what's new |

**Important:** The `versionCode` in `version.json` must equal the APK's `versionCode` (not higher). The app compares `server versionCode > installed versionCode`. After the update, both are equal, so the modal stops appearing.

### Step 3: Copy the APK to the backend
```bash
cp User_Frontend/android/app/build/outputs/apk/release/app-release.apk Backend/public/apk/app-release.apk
```

### Step 4: Commit and push
```bash
git add -A
git commit -m "release: vX.Y.Z"
git push
```

### Step 5: Deploy to AWS EC2

- Run from your PC: `powershell -ExecutionPolicy Bypass -File deploy\deploy-backend.ps1` (builds locally, uploads `src`/`dist`/`public`, restarts PM2)
- Verify: open `http://13.203.78.49:3001/api/update/latest` — should show the new versionCode
- Verify: open `http://13.203.78.49:3001/api/update/download` — should download the APK

### Step 6: Users receive the update

1. User opens the app → `checkForUpdate()` fires
2. Phone sees `server versionCode > installed versionCode` → update modal appears
3. User taps "Update" → APK downloads from the backend → installs
4. User reopens app → `server versionCode == installed versionCode` → no modal

### Version Number Cheat Sheet

```
build.gradle: versionCode 5  ← The version baked into the APK
updateChecker.js: FALLBACK_VERSION_CODE = 5  ← Fallback if native API fails
version.json: versionCode 5  ← Must match the APK being served
                              ← Next release: bump ALL to 6, version.json to 6
```

## Key API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/otp/send` | Send OTP for login |
| POST | `/api/auth/otp/verify` | Verify OTP and create session |
| POST | `/api/auth/switch-role` | Switch user role |
| POST | `/api/bookings` | Create a booking |
| GET | `/api/bookings` | List bookings (filtered) |
| GET | `/api/bookings/:id` | Get booking details |
| PATCH | `/api/bookings/:id/cancel` | Cancel a booking |
| POST | `/api/bookings/:id/complete-payment` | Complete payment |
| POST | `/api/bookings/:id/rate` | Rate a completed booking |
| POST | `/api/pricing/estimate` | Estimate booking price |
| GET | `/api/update/latest` | Check for app update |
| GET | `/api/update/download` | Download latest APK |

## WebSocket Events

The Socket.IO gateway (`/ws` namespace) broadcasts real-time events:

- `booking:*` — booking lifecycle (created, assigned, status_changed, cancelled, etc.)
- `mission:*` — mission lifecycle (started, gpsUpdate, progressUpdate, completed, etc.)
- `payment:*` — payment lifecycle (initiated, confirmed, failed, refunded)
- `pilot:*` — pilot availability and location updates
- `chat:*` — real-time messaging
- `notification:*` — push notifications
- `incident:*` — incident reporting

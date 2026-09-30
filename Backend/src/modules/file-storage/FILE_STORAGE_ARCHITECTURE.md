# File Storage Architecture

## Overview
The HAWK backend uses **Firebase Storage** as the primary file storage solution for all user-uploaded files, including KYC-related documents.

---

## Storage Architecture

### Primary Storage: Firebase Storage
All files are stored in Firebase Cloud Storage buckets configured via the Firebase project.

**Configuration:**
- `FIREBASE_PROJECT_ID` - Your Firebase project identifier
- `FIREBASE_STORAGE_BUCKET` - Storage bucket name EXACTLY as shown in Firebase Console > Storage (new projects: `your-project-id.firebasestorage.app`, old projects: `your-project-id.appspot.com`)
- `FIREBASE_PRIVATE_KEY` - Service account private key for authentication
- `FIREBASE_CLIENT_EMAIL` - Service account email

### Metadata Storage: Firestore + MongoDB

**Firestore (Primary):**
- Real-time file metadata
- Access control and permissions
- File URLs and references
- Upload timestamps and user associations

**MongoDB (Secondary/Historical):**
- Synchronized copy of file metadata via `SyncService`
- Historical data for analytics and reporting
- Backup metadata storage

---

## File Types and Storage Paths

### KYC Documents
**Path Structure:** `/users/{uid}/kyc/{documentType}/{fileName}`

**Document Types:**
- **Identity Proofs**
  - Aadhaar Card
  - PAN Card
  - Passport
  - Driving License
  - Voter ID

- **Business Licenses**
  - Drone Pilot License (DGCA)
  - Remote Pilot Certificate
  - Business Registration
  - GST Certificate

- **Equipment Documents**
  - Drone Registration Certificate
  - Insurance Documents
  - Maintenance Records

### User Profile Images
**Path Structure:** `/users/{uid}/profile/{fileName}`

### Drone Images and Documentation
**Path Structure:** `/users/{uid}/drones/{droneId}/{fileName}`

### Booking/Mission Evidence
**Path Structure:** `/users/{uid}/bookings/{bookingId}/{fileName}`

---

## Storage Rules and Access Control

### Security Rules
Firebase Storage security rules enforce:
1. **Authentication Required:** All uploads require authenticated users
2. **User Isolation:** Users can only access their own files
3. **File Type Validation:** Only allowed MIME types are accepted
4. **Size Limits:** Maximum file sizes enforced
5. **Admin Override:** Super admins can access all files for verification

### Firestore Rules Example
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // User files
    match /users/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      allow read: if request.auth != null && request.auth.token.role == 'super_admin';
    }
    
    // Admin read access for KYC verification
    match /users/{userId}/kyc/{document=**} {
      allow read: if request.auth != null && 
        (request.auth.token.role in ['super_admin', 'state_admin', 'dept_admin']);
    }
  }
}
```

---

## File Upload Flow

### Client-Side Upload (Mobile/Web)
1. User selects file from device
2. Client authenticates with Firebase Auth
3. Client uploads directly to Firebase Storage with structured path
4. Client receives download URL
5. Client saves metadata to Firestore

### Admin Upload (Backend)
1. Admin uploads file via API endpoint
2. Backend validates user permissions
3. Backend uploads to Firebase Storage using Admin SDK
4. Backend stores metadata in Firestore
5. SyncService automatically syncs metadata to MongoDB

---

## File Metadata Schema

### Firestore Document Structure
```typescript
{
  fileId: string;
  fileName: string;
  fileType: string; // MIME type
  fileSize: number; // bytes
  storagePath: string; // Firebase Storage path
  downloadUrl: string; // Public or signed URL
  uploadedBy: string; // User UID
  uploadedAt: Timestamp;
  category: 'kyc' | 'profile' | 'drone' | 'booking' | 'other';
  documentType?: string; // For KYC: 'aadhaar', 'pan', etc.
  verificationStatus?: 'pending' | 'verified' | 'rejected';
  verifiedBy?: string; // Admin UID
  verifiedAt?: Timestamp;
}
```

### MongoDB Collection (Synced)
Collection: `file_metadata`

Same schema as Firestore, synced automatically via `SyncService` when `FIRESTORE_SYNC_ENABLED=true`.

---

## API Endpoints (Recommended)

### Upload File
```
POST /api/files/upload
Headers: Authorization: Bearer <token>
Body: multipart/form-data
  - file: <binary>
  - category: 'kyc' | 'profile' | 'drone' | 'booking'
  - documentType?: string (for KYC)
```

### Get File Metadata
```
GET /api/files/:fileId
Headers: Authorization: Bearer <token>
```

### List User Files
```
GET /api/files/user/:userId
Headers: Authorization: Bearer <token>
Query: ?category=kyc&documentType=aadhaar
```

### Delete File
```
DELETE /api/files/:fileId
Headers: Authorization: Bearer <token>
```

### Admin: Verify KYC Document
```
POST /api/files/:fileId/verify
Headers: Authorization: Bearer <token>
Body: {
  status: 'verified' | 'rejected',
  notes?: string
}
```

---

## Implementation Guide

### 1. Firebase Storage Setup

**Firebase Console:**
1. Go to Firebase Console → Storage
2. Get started with Cloud Storage
3. Set up security rules (see above)
4. Note your storage bucket URL

**Backend Configuration:**
```bash
# .env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_STORAGE_BUCKET=your-project-id.firebasestorage.app
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### 2. Backend Implementation

**Install Dependencies:**
```bash
npm install firebase-admin
```

**Firebase Admin Service (Already configured):**
The `FirebaseAdminService` already handles Firebase Storage access via the Admin SDK.

**Create File Upload Service:**
```typescript
import { Injectable } from '@nestjs/common';
import { FirebaseAdminService } from '../../firebase/firebase-admin.service';

@Injectable()
export class FileStorageService {
  constructor(private readonly firebaseAdmin: FirebaseAdminService) {}

  async uploadFile(
    file: Express.Multer.File,
    userId: string,
    category: string,
    documentType?: string,
  ): Promise<{ downloadUrl: string; fileId: string }> {
    const bucket = this.firebaseAdmin.storage().bucket();
    const path = this.buildStoragePath(userId, category, documentType, file.originalname);
    const fileRef = bucket.file(path);

    await fileRef.save(file.buffer, {
      metadata: {
        contentType: file.mimetype,
        metadata: {
          uploadedBy: userId,
          category,
          documentType,
        },
      },
    });

    // Get signed URL (optional, for private files)
    const [url] = await fileRef.getSignedUrl({
      action: 'read',
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Or make public and get public URL
    await fileRef.makePublic();
    const downloadUrl = fileRef.publicUrl();

    // Save metadata to Firestore
    const fileMetadata = {
      fileId: fileRef.name,
      fileName: file.originalname,
      fileType: file.mimetype,
      fileSize: file.size,
      storagePath: path,
      downloadUrl,
      uploadedBy: userId,
      uploadedAt: new Date(),
      category,
      documentType,
      verificationStatus: 'pending',
    };

    await this.firebaseAdmin
      .firestore()
      .collection('file_metadata')
      .doc(fileRef.name)
      .set(fileMetadata);

    return { downloadUrl, fileId: fileRef.name };
  }

  private buildStoragePath(
    userId: string,
    category: string,
    documentType: string | undefined,
    fileName: string,
  ): string {
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    
    if (category === 'kyc' && documentType) {
      return `users/${userId}/kyc/${documentType}/${timestamp}_${sanitizedFileName}`;
    }
    
    return `users/${userId}/${category}/${timestamp}_${sanitizedFileName}`;
  }

  async deleteFile(fileId: string, userId: string): Promise<void> {
    const bucket = this.firebaseAdmin.storage().bucket();
    await bucket.file(fileId).delete();
    
    await this.firebaseAdmin
      .firestore()
      .collection('file_metadata')
      .doc(fileId)
      .delete();
  }
}
```

### 3. Client-Side Implementation (React Native)

```typescript
import storage from '@react-native-firebase/storage';
import firestore from '@react-native-firebase/firestore';

async function uploadKYCDocument(
  file: { uri: string; name: string; type: string },
  userId: string,
  documentType: string,
) {
  const path = `users/${userId}/kyc/${documentType}/${Date.now()}_${file.name}`;
  const reference = storage().ref(path);

  // Upload file
  await reference.putFile(file.uri, {
    contentType: file.type,
  });

  // Get download URL
  const downloadUrl = await reference.getDownloadURL();

  // Save metadata to Firestore
  await firestore().collection('file_metadata').add({
    fileName: file.name,
    fileType: file.type,
    storagePath: path,
    downloadUrl,
    uploadedBy: userId,
    uploadedAt: firestore.FieldValue.serverTimestamp(),
    category: 'kyc',
    documentType,
    verificationStatus: 'pending',
  });

  return { downloadUrl, path };
}
```

---

## Advantages of Firebase Storage

1. **Scalability:** Automatic scaling for any amount of data
2. **Security:** Built-in authentication and fine-grained access control
3. **Global CDN:** Fast downloads worldwide
4. **Direct Uploads:** Clients can upload directly, reducing server load
5. **Integration:** Seamless integration with Firestore and Firebase Auth
6. **Cost-Effective:** Pay only for what you use
7. **Reliability:** 99.95% uptime SLA
8. **No Server Management:** Fully managed infrastructure

---

## Monitoring and Maintenance

### Storage Metrics
Monitor in Firebase Console:
- Storage usage and growth
- Download bandwidth
- Request counts
- Error rates

### Cost Optimization
1. **Lifecycle Policies:** Auto-delete old files
2. **Compression:** Compress images before upload
3. **Signed URLs:** Use time-limited URLs for private files
4. **Thumbnail Generation:** Store compressed thumbnails

### Backup Strategy
1. **Primary:** Firebase Storage (geo-redundant)
2. **Metadata Backup:** MongoDB sync via `SyncService`
3. **Optional:** Export to Google Cloud Storage for long-term archival

---

## Migration Notes

### If migrating from AWS S3:
1. Export files from S3
2. Upload to Firebase Storage maintaining path structure
3. Update database records with new Firebase Storage URLs
4. Update client apps to use Firebase SDK

### Firebase Storage vs AWS S3:

| Feature | Firebase Storage | AWS S3 |
|---------|-----------------|--------|
| Setup Complexity | Simple | Moderate |
| Authentication | Firebase Auth | IAM/Cognito |
| Client SDK | Yes | Yes |
| Cost (per GB) | $0.026/month | $0.023/month |
| Free Tier | 5GB | 5GB (first year) |
| CDN | Included | CloudFront (extra) |
| Rules Engine | Yes | Bucket Policies |

---

**Last Updated:** June 25, 2026
**Environment:** Production Ready
**Status:** ✅ Active Implementation

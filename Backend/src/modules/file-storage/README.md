# File Storage Module

## Overview
Manages file uploads and storage using Firebase Storage for profile pictures, documents, drone images, KYC documents, and complaint attachments.

## Features
- Secure file uploads
- Multiple file type support
- File validation
- URL generation
- File deletion
- Organized folder structure
- Size and type restrictions

## Supported File Types
- Images: JPG, PNG, WEBP
- Documents: PDF, DOC, DOCX
- Certificates: PDF
- Videos: MP4, AVI (for incident reports)

## API Endpoints
- `POST /storage/upload` - Upload file
- `GET /storage/:fileId` - Get file URL
- `DELETE /storage/:fileId` - Delete file
- `POST /storage/upload-multiple` - Upload multiple files

## Storage Structure
```
/uploads
  /profiles
  /documents
    /kyc
    /licenses
    /certificates
  /drones
  /complaints
  /incidents
```

## Usage Example
```typescript
const fileUrl = await fileStorageService.upload({
  file: buffer,
  fileName: 'profile.jpg',
  folder: 'profiles',
  userId: 'user123'
});
```

## File Size Limits
- Images: 5MB
- Documents: 10MB
- Videos: 50MB

## Security
- Authenticated uploads only
- Virus scanning
- Content validation
- Access control

## Related Modules
- [Customer Module](../customer/README.md)
- [Pilot Module](../pilot/README.md)
- [Complaint Module](../complaint/README.md)

## Testing
```bash
npm test -- file-storage.service.spec.ts
```

import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import type { CollectionReference } from 'firebase-admin/firestore';
import type { File } from '@google-cloud/storage';

import { FirebaseAdminService } from '../../firebase/firebase-admin.service';
import type { CurrentUser } from '../../common/interfaces/current-user.interface';
import { UploadFileDto, FileCategory } from './dto/upload-file.dto';
import { VerifyDocumentDto, VerificationStatus } from './dto/verify-document.dto';
import { ListFilesDto } from './dto/list-files.dto';
import { RequestUploadUrlDto, StorageBucket } from './dto/request-upload-url.dto';
import { RegisterFileDto } from './dto/register-file.dto';
import type {
  FileMetadata,
  FileUploadResult,
  SignedUploadUrlResult,
  FileRegistrationResult,
} from './interfaces/file-metadata.interface';

const FILE_METADATA_COLLECTION = 'file_metadata';
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'video/mp4',
  'video/quicktime',
];

@Injectable()
export class FileStorageService {
  private readonly logger = new Logger(FileStorageService.name);

  constructor(private readonly firebaseAdmin: FirebaseAdminService) {}

  /**
   * NEW FLOW: Request a signed upload URL for client-side direct upload
   * Step 1: Client requests signed URL
   */
  async requestUploadUrl(
    dto: RequestUploadUrlDto,
    user: CurrentUser,
  ): Promise<SignedUploadUrlResult> {
    // Validate file parameters
    this.validateFileParameters(dto.fileName, dto.contentType, dto.fileSize);

    // Build storage path
    const storagePath = this.buildStoragePathFromBucket(
      user.uid,
      dto.bucket,
      dto.folder,
      dto.fileName,
    );

    // Generate signed upload URL (valid for 15 minutes)
    const bucket = this.firebaseAdmin.storage().bucket();
    const file = bucket.file(storagePath);

    const expirationTime = Date.now() + 15 * 60 * 1000; // 15 minutes

    try {
      const [uploadUrl] = await file.getSignedUrl({
        version: 'v4',
        action: 'write',
        expires: expirationTime,
        contentType: dto.contentType,
        extensionHeaders: {
          'x-goog-content-length-range': `0,${MAX_FILE_SIZE}`,
        },
      });

      this.logger.log(
        `Generated signed upload URL for user ${user.uid}: ${storagePath}`,
      );

      return {
        uploadUrl,
        storagePath,
        expiresAt: new Date(expirationTime),
        fileId: storagePath,
      };
    } catch (error) {
      this.logger.error(`Failed to generate upload URL: ${error}`);
      throw new BadRequestException(this.toStorageErrorMessage(error));
    }
  }

  /**
   * NEW FLOW: Register file metadata after client uploads directly to Firebase
   * Step 3: Client sends metadata after successful upload
   */
  async registerFile(
    dto: RegisterFileDto,
    user: CurrentUser,
  ): Promise<FileRegistrationResult> {
    // Validate that file exists in Firebase Storage
    const bucket = this.firebaseAdmin.storage().bucket();
    const file = bucket.file(dto.storagePath);

    try {
      const [exists] = await file.exists();
      if (!exists) {
        throw new NotFoundException(
          'File not found in storage. Please upload the file first.',
        );
      }

      // Get file metadata from storage
      const [metadata] = await file.getMetadata();

      // Validate file size matches
      if (metadata.size !== dto.fileSize.toString()) {
        throw new BadRequestException(
          'File size mismatch. Upload may have failed.',
        );
      }

      // Generate public URL or signed URL based on category
      let downloadUrl = dto.downloadUrl;
      if (!downloadUrl) {
        // For public files, make them publicly accessible
        if (this.isPublicCategory(dto.category)) {
          await file.makePublic();
          downloadUrl = file.publicUrl();
        } else {
          // For private files, generate a long-lived signed URL
          const [signedUrl] = await file.getSignedUrl({
            version: 'v4',
            action: 'read',
            expires: Date.now() + 365 * 24 * 60 * 60 * 1000, // 1 year
          });
          downloadUrl = signedUrl;
        }
      }

      // Generate CDN URL (same as download URL for Firebase Storage)
      const cdnUrl = downloadUrl;

      // Save metadata to Firestore
      const fileMetadata: FileMetadata = {
        fileId: dto.storagePath,
        fileName: dto.fileName,
        fileType: dto.contentType,
        fileSize: dto.fileSize,
        storagePath: dto.storagePath,
        downloadUrl,
        uploadedBy: user.uid,
        uploadedAt: new Date(),
        category: dto.category,
        documentType: dto.documentType,
        relatedEntityId: dto.relatedEntityId,
        description: dto.description,
        verificationStatus:
          dto.category === FileCategory.KYC
            ? VerificationStatus.PENDING
            : undefined,
      };

      await this.collection().doc(dto.storagePath).set(fileMetadata);

      this.logger.log(
        `File registered successfully: ${dto.storagePath} by user ${user.uid}`,
      );

      return {
        fileId: dto.storagePath,
        downloadUrl,
        cdnUrl,
        fileName: dto.fileName,
        fileSize: dto.fileSize,
        storagePath: dto.storagePath,
        category: dto.category,
        uploadedAt: new Date(),
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Failed to register file: ${error}`);
      throw new BadRequestException('File registration failed');
    }
  }

  /**
   * LEGACY FLOW: Upload a file to Firebase Storage and save metadata to Firestore
   * This is kept for backward compatibility
   */
  async uploadFile(
    file: Express.Multer.File,
    dto: UploadFileDto,
    user: CurrentUser,
  ): Promise<FileUploadResult> {
    // Validate file
    this.validateFile(file);

    // Build storage path
    const storagePath = this.buildStoragePath(user.uid, dto, file.originalname);

    // Upload to Firebase Storage ONLY. Local disk storage is forbidden.
    const bucket = this.firebaseAdmin.storage().bucket();
    const fileRef = bucket.file(storagePath);

    let downloadUrl = '';

    try {
      await fileRef.save(file.buffer, {
        metadata: {
          contentType: file.mimetype,
          metadata: {
            uploadedBy: user.uid,
            category: dto.category,
            documentType: dto.documentType,
            relatedEntityId: dto.relatedEntityId,
          },
        },
      });

      this.logger.log(`File uploaded to Firebase Storage: ${storagePath}`);

      try {
        await fileRef.makePublic();
        downloadUrl = fileRef.publicUrl();
      } catch (pubErr) {
        this.logger.warn(`Could not make Firebase Storage file public: ${pubErr}`);
        // Fall back to a signed read URL so the client still gets a Firebase URL.
        const [signedUrl] = await fileRef.getSignedUrl({
          version: 'v4',
          action: 'read',
          expires: Date.now() + 365 * 24 * 60 * 60 * 1000, // 1 year
        });
        downloadUrl = signedUrl;
      }
    } catch (gcsError: any) {
      this.logger.error(`Firebase Storage upload failed: ${gcsError?.message ?? gcsError}`);
      throw new BadRequestException(
        this.toStorageErrorMessage(gcsError),
      );
    }

    try {

      // Alternative: Generate signed URL for private access
      // const [downloadUrl] = await fileRef.getSignedUrl({
      //   action: 'read',
      //   expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
      // });

      // Save metadata to Firestore
      const fileMetadata: FileMetadata = {
        fileId: storagePath,
        fileName: file.originalname,
        fileType: file.mimetype,
        fileSize: file.size,
        storagePath,
        downloadUrl,
        uploadedBy: user.uid,
        uploadedAt: new Date(),
        category: dto.category,
        documentType: dto.documentType,
        relatedEntityId: dto.relatedEntityId,
        description: dto.description,
        verificationStatus:
          dto.category === FileCategory.KYC ? VerificationStatus.PENDING : undefined,
      };

      await this.collection().doc(storagePath).set(fileMetadata);

      this.logger.log(`File metadata saved to Firestore: ${storagePath}`);

      return {
        fileId: storagePath,
        downloadUrl,
        fileName: file.originalname,
        fileSize: file.size,
        storagePath,
      };
    } catch (error) {
      this.logger.error(`Failed to upload file: ${error}`);
      throw new BadRequestException('File upload failed');
    }
  }

  /**
   * Get file metadata by ID
   */
  async getFileMetadata(fileId: string, user: CurrentUser): Promise<FileMetadata> {
    const doc = await this.collection().doc(fileId).get();

    if (!doc.exists) {
      throw new NotFoundException(`File not found: ${fileId}`);
    }

    const metadata = doc.data() as FileMetadata;

    // Check permissions
    this.checkReadPermission(metadata, user);

    return metadata;
  }

  /**
   * List files for a user with optional filters
   */
  async listFiles(userId: string, filters: ListFilesDto, user: CurrentUser): Promise<FileMetadata[]> {
    // Check if user can access these files
    if (userId !== user.uid && !this.isAdmin(user)) {
      throw new ForbiddenException('Cannot access files of other users');
    }

    let query = this.collection().where('uploadedBy', '==', userId) as FirebaseFirestore.Query;

    // Apply filters
    if (filters.category) {
      query = query.where('category', '==', filters.category);
    }

    if (filters.documentType) {
      query = query.where('documentType', '==', filters.documentType);
    }

    if (filters.verificationStatus) {
      query = query.where('verificationStatus', '==', filters.verificationStatus);
    }

    if (filters.relatedEntityId) {
      query = query.where('relatedEntityId', '==', filters.relatedEntityId);
    }

    const snapshot = await query.orderBy('uploadedAt', 'desc').get();

    return snapshot.docs.map((doc) => doc.data() as FileMetadata);
  }

  /**
   * Delete a file from Firebase Storage and Firestore
   */
  async deleteFile(fileId: string, user: CurrentUser): Promise<void> {
    const metadata = await this.getFileMetadata(fileId, user);

    // Check if user can delete this file
    if (metadata.uploadedBy !== user.uid && !this.isAdmin(user)) {
      throw new ForbiddenException('Cannot delete files uploaded by other users');
    }

    try {
      // Delete from Firebase Storage
      const bucket = this.firebaseAdmin.storage().bucket();
      await bucket.file(fileId).delete();

      // Delete metadata from Firestore
      await this.collection().doc(fileId).delete();

      this.logger.log(`File deleted: ${fileId}`);
    } catch (error) {
      this.logger.error(`Failed to delete file: ${error}`);
      throw new BadRequestException('File deletion failed');
    }
  }

  /**
   * Verify a KYC document (admin only)
   */
  async verifyDocument(
    fileId: string,
    dto: VerifyDocumentDto,
    admin: CurrentUser,
  ): Promise<FileMetadata> {
    if (!this.isAdmin(admin)) {
      throw new ForbiddenException('Only admins can verify documents');
    }

    const metadata = await this.getFileMetadata(fileId, admin);

    if (metadata.category !== FileCategory.KYC) {
      throw new BadRequestException('Only KYC documents can be verified');
    }

    const updates = {
      verificationStatus: dto.status,
      verifiedBy: admin.uid,
      verifiedAt: new Date(),
      verificationNotes: dto.notes,
    };

    await this.collection().doc(fileId).update(updates);

    this.logger.log(
      `Document ${fileId} ${dto.status} by ${admin.uid} (${admin.role})`,
    );

    return { ...metadata, ...updates };
  }

  /**
   * Generate a new signed URL for a file (for private files)
   */
  async generateSignedUrl(fileId: string, user: CurrentUser, expiryDays = 7): Promise<string> {
    const metadata = await this.getFileMetadata(fileId, user);

    const bucket = this.firebaseAdmin.storage().bucket();
    const file = bucket.file(metadata.storagePath);

    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + expiryDays * 24 * 60 * 60 * 1000,
    });

    return url;
  }

  // ─── Private Methods ────────────────────────────────────────────

  private validateFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
      );
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `File type ${file.mimetype} is not allowed. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`,
      );
    }
  }

  private validateFileParameters(
    fileName: string,
    contentType: string,
    fileSize: number,
  ): void {
    if (!fileName || !contentType || !fileSize) {
      throw new BadRequestException('Missing required file parameters');
    }

    if (fileSize > MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
      );
    }

    if (!ALLOWED_MIME_TYPES.includes(contentType)) {
      throw new BadRequestException(
        `File type ${contentType} is not allowed. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`,
      );
    }
  }

  private buildStoragePathFromBucket(
    userId: string,
    bucket: StorageBucket,
    folder: string | undefined,
    fileName: string,
  ): string {
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const uniqueFileName = `${timestamp}_${sanitizedFileName}`;

    if (folder) {
      return `${bucket}/${userId}/${folder}/${uniqueFileName}`;
    }

    return `${bucket}/${userId}/${uniqueFileName}`;
  }

  private buildStoragePath(
    userId: string,
    dto: UploadFileDto,
    fileName: string,
  ): string {
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const uniqueFileName = `${timestamp}_${sanitizedFileName}`;

    if (dto.category === FileCategory.KYC && dto.documentType) {
      return `documents/${userId}/kyc/${dto.documentType}/${uniqueFileName}`;
    }

    if (dto.category === FileCategory.PROFILE) {
      return `profile-images/${userId}/${uniqueFileName}`;
    }

    if (dto.category === FileCategory.DRONE && dto.relatedEntityId) {
      return `maintenance-media/${userId}/drones/${dto.relatedEntityId}/${uniqueFileName}`;
    }

    if (dto.category === FileCategory.BOOKING && dto.relatedEntityId) {
      return `booking-media/${userId}/bookings/${dto.relatedEntityId}/${uniqueFileName}`;
    }

    if (dto.category === FileCategory.INCIDENT && dto.relatedEntityId) {
      return `maintenance-media/${userId}/incidents/${dto.relatedEntityId}/${uniqueFileName}`;
    }

    if (dto.category === FileCategory.SERVICE_TICKET && dto.relatedEntityId) {
      return `maintenance-media/${userId}/service-tickets/${dto.relatedEntityId}/${uniqueFileName}`;
    }

    return `general/${userId}/${dto.category}/${uniqueFileName}`;
  }

  private isPublicCategory(category: FileCategory): boolean {
    // Profile images and general files are public, everything else is private
    return [FileCategory.PROFILE, FileCategory.OTHER].includes(category);
  }

  private checkReadPermission(metadata: FileMetadata, user: CurrentUser): void {
    const isOwner = metadata.uploadedBy === user.uid;
    const isAdmin = this.isAdmin(user);

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('You do not have permission to access this file');
    }
  }

  private isAdmin(user: CurrentUser): boolean {
    return ['super_admin', 'admin', 'state_admin', 'dept_admin'].includes(user.role);
  }

  /**
   * Map raw GCS errors to actionable client messages.
   * Firebase-only policy: never fall back to local disk.
   */
  private toStorageErrorMessage(error: any): string {
    const raw = error?.message ?? String(error ?? '');
    const code = error?.code ?? error?.error?.code;
    let bucketName = '(unknown)';
    try {
      bucketName = this.firebaseAdmin.storage().bucket().name;
    } catch {
      /* ignore — fall back to unknown */
    }
    // 404 "specified bucket does not exist" = wrong bucket name in backend config
    if (
      code === 404 ||
      raw.includes('specified bucket does not exist') ||
      raw.includes('notFound')
    ) {
      return (
        `Firebase Storage bucket "${bucketName}" does not exist (404). ` +
        'Copy the EXACT bucket name from Firebase Console > Storage ' +
        '(e.g. gs://aerosystem-2d36c.firebasestorage.app -> use "aerosystem-2d36c.firebasestorage.app") ' +
        'into backend .env as FIREBASE_STORAGE_BUCKET, then restart/redeploy the backend. ' +
        'File was NOT stored locally.'
      );
    }
    if (code === 403 || raw.includes('Permission') || raw.includes('forbidden')) {
      return (
        'Firebase Storage permission denied. Grant the backend service account ' +
        '"Storage Object Admin" on the bucket and retry. File was NOT stored locally.'
      );
    }
    return `Firebase Storage upload failed (${raw}). File was NOT stored locally.`;
  }

  private collection(): CollectionReference<FileMetadata> {
    return this.firebaseAdmin
      .firestore()
      .collection(FILE_METADATA_COLLECTION) as CollectionReference<FileMetadata>;
  }
}

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiConsumes, ApiBody, ApiOperation } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUser as CurrentUserType } from '../../common/interfaces/current-user.interface';
import { FirebaseAdminService } from '../../firebase/firebase-admin.service';

import { FileStorageService } from './file-storage.service';
import { UploadFileDto } from './dto/upload-file.dto';
import { VerifyDocumentDto } from './dto/verify-document.dto';
import { ListFilesDto } from './dto/list-files.dto';
import { RequestUploadUrlDto } from './dto/request-upload-url.dto';
import { RegisterFileDto } from './dto/register-file.dto';

@ApiTags('File Storage')
@ApiBearerAuth()
@Controller('files')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FileStorageController {
  constructor(
    private readonly fileStorageService: FileStorageService,
    private readonly firebaseAdminService: FirebaseAdminService,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // NEW UPLOAD FLOW: Client → Signed URL → Direct Upload → Register
  // ═══════════════════════════════════════════════════════════════

  @Post('upload-url')
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 requests per minute
  @ApiOperation({
    summary: 'Request a signed upload URL for direct client-side upload',
    description: `Step 1 of new upload flow:
    1. Client requests signed upload URL with file metadata
    2. Backend returns signed URL valid for 15 minutes
    3. Client uploads directly to Firebase Storage using the signed URL
    4. Client calls /files/register to save metadata`,
  })
  async requestUploadUrl(
    @Body() dto: RequestUploadUrlDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.fileStorageService.requestUploadUrl(dto, user);
  }

  @Post('register')
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 registrations per minute
  @ApiOperation({
    summary: 'Register file metadata after direct upload to Firebase',
    description: `Step 3 of new upload flow:
    After client successfully uploads file directly to Firebase Storage,
    call this endpoint to validate the upload and register file metadata.
    Returns CDN URL for accessing the file.`,
  })
  async registerFile(
    @Body() dto: RegisterFileDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.fileStorageService.registerFile(dto, user);
  }

  // ═══════════════════════════════════════════════════════════════
  // LEGACY UPLOAD FLOW: Direct upload through backend (kept for compatibility)
  // ═══════════════════════════════════════════════════════════════

  @Post('upload')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 file uploads per minute
  @ApiOperation({
    summary: '[LEGACY] Upload a file through backend to Firebase Storage',
    description: 'Direct upload through backend. For large files, use the new signed URL flow instead.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        category: {
          type: 'string',
          enum: ['kyc', 'profile', 'drone', 'booking', 'incident', 'service_ticket', 'other'],
        },
        documentType: {
          type: 'string',
          enum: [
            'aadhaar',
            'pan',
            'passport',
            'driving_license',
            'voter_id',
            'drone_pilot_license',
            'remote_pilot_certificate',
            'business_registration',
            'gst_certificate',
            'drone_registration',
            'insurance_document',
          ],
        },
        relatedEntityId: { type: 'string' },
        description: { type: 'string' },
      },
      required: ['file', 'category'],
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadFileDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.fileStorageService.uploadFile(file, dto, user);
  }

  /**
   * Public guest upload for the no-login Refer & Earn application flow.
   * Authenticates with a Firebase ID token from the in-form OTP step instead
   * of a backend JWT. Strictly rate-limited; files land under the guest's
   * Firebase uid so approval-time review sees them normally.
   */
  @Public()
  @Post('guest-upload')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 file uploads per minute
  @ApiOperation({
    summary: '[GUEST] Upload a KYC document without backend login',
    description: 'Send multipart file + category + firebaseIdToken from the in-form OTP step.',
  })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async guestUploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: UploadFileDto & { firebaseIdToken?: string },
  ) {
    if (!body?.firebaseIdToken) {
      throw new BadRequestException('Verify the OTP first (missing firebaseIdToken).');
    }
    let uid: string;
    try {
      const decoded = await this.firebaseAdminService.verifyIdToken(body.firebaseIdToken);
      uid = decoded.uid;
    } catch {
      throw new BadRequestException('Phone verification expired. Please verify the OTP again.');
    }
    const guestUser = { uid, role: 'customer', status: 'pending' } as CurrentUserType;
    return this.fileStorageService.uploadFile(file, body, guestUser);
  }

  // ═══════════════════════════════════════════════════════════════
  // FILE MANAGEMENT ENDPOINTS
  // ═══════════════════════════════════════════════════════════════

  @Get(':fileId')
  @ApiOperation({ summary: 'Get file metadata by ID' })
  async getFileMetadata(@Param('fileId') fileId: string, @CurrentUser() user: CurrentUserType) {
    return this.fileStorageService.getFileMetadata(fileId, user);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'List files for a user with optional filters' })
  async listFiles(
    @Param('userId') userId: string,
    @Query() filters: ListFilesDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.fileStorageService.listFiles(userId, filters, user);
  }

  @Delete(':fileId')
  @ApiOperation({ summary: 'Delete a file from Firebase Storage and Firestore' })
  async deleteFile(@Param('fileId') fileId: string, @CurrentUser() user: CurrentUserType) {
    await this.fileStorageService.deleteFile(fileId, user);
    return { message: 'File deleted successfully' };
  }

  @Post(':fileId/verify')
  @ApiOperation({ summary: 'Verify a KYC document (admin only)' })
  @Roles('super_admin', 'admin', 'state_admin', 'dept_admin')
  async verifyDocument(
    @Param('fileId') fileId: string,
    @Body() dto: VerifyDocumentDto,
    @CurrentUser() admin: CurrentUserType,
  ) {
    return this.fileStorageService.verifyDocument(fileId, dto, admin);
  }

  @Get(':fileId/signed-url')
  @ApiOperation({ summary: 'Generate a new signed URL for private file access' })
  async generateSignedUrl(@Param('fileId') fileId: string, @CurrentUser() user: CurrentUserType) {
    const url = await this.fileStorageService.generateSignedUrl(fileId, user);
    return { signedUrl: url };
  }
}

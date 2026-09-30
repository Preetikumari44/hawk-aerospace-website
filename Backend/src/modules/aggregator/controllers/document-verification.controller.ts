import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { CurrentUser as CurrentUserType } from '../../../common/interfaces/current-user.interface';
import { DocumentVerificationService } from '../services/document-verification.service';
import {
  DocumentFilterDto,
  UpdateDocumentDto,
  VerifyDocumentDto,
} from '../dto/document-verification.dto';

@Controller('documents')
export class DocumentVerificationController {
  constructor(
    private readonly documentVerificationService: DocumentVerificationService,
  ) {}

  /**
   * Upload/Update document (Aggregator)
   */
  @Post('upload')
  @Roles('aggregator')
  uploadDocument(
    @Body() dto: UpdateDocumentDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.documentVerificationService.uploadDocument(user.uid, dto);
  }

  /**
   * Get my documents (Aggregator)
   */
  @Get('my-documents')
  @Roles('aggregator')
  getMyDocuments(@CurrentUser() user: CurrentUserType) {
    return this.documentVerificationService.getAggregatorDocuments(user.uid);
  }

  /**
   * Get verification summary (Aggregator)
   */
  @Get('my-documents/summary')
  @Roles('aggregator')
  getVerificationSummary(@CurrentUser() user: CurrentUserType) {
    return this.documentVerificationService.getVerificationSummary(user.uid);
  }

  /**
   * Get all documents by filter (Admin)
   */
  @Get()
  @Roles('admin', 'super_admin')
  getDocuments(@Query() filter: DocumentFilterDto) {
    return this.documentVerificationService.getDocuments(filter);
  }

  /**
   * Get pending documents for review (Admin dashboard)
   */
  @Get('pending')
  @Roles('admin', 'super_admin')
  getPendingDocuments() {
    return this.documentVerificationService.getPendingDocuments();
  }

  /**
   * Get expiring documents (Admin alert)
   */
  @Get('expiring')
  @Roles('admin', 'super_admin')
  getExpiringDocuments(@Query('days') days?: string) {
    const daysThreshold = days ? parseInt(days, 10) : 30;
    return this.documentVerificationService.getExpiringDocuments(daysThreshold);
  }

  /**
   * Get documents for specific aggregator (Admin)
   */
  @Get('aggregator/:aggregatorId')
  @Roles('admin', 'super_admin')
  getAggregatorDocuments(@Param('aggregatorId') aggregatorId: string) {
    return this.documentVerificationService.getAggregatorDocuments(aggregatorId);
  }

  /**
   * Verify/Reject document (Admin)
   */
  @Patch(':documentId/verify')
  @Roles('admin', 'super_admin')
  verifyDocument(
    @Param('documentId') documentId: string,
    @Body() dto: VerifyDocumentDto,
    @CurrentUser() admin: CurrentUserType,
  ) {
    return this.documentVerificationService.verifyDocument(documentId, dto, admin);
  }

  /**
   * Mark document as expired (Admin - scheduled job trigger)
   */
  @Patch(':documentId/expire')
  @Roles('admin', 'super_admin')
  markExpired(@Param('documentId') documentId: string) {
    return this.documentVerificationService.markDocumentExpired(documentId);
  }
}

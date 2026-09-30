import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUser as CurrentUserType } from '../../common/interfaces/current-user.interface';

import { PilotApplicationService } from './services/pilot-application.service';
import { SubmitPilotApplicationDto } from './dto/submit-pilot-application.dto';
import { ReviewPilotApplicationDto, UpdateApplicationDocumentDto } from './dto/review-pilot-application.dto';

@ApiTags('Pilot Applications')
@ApiBearerAuth()
@Controller('pilot-applications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PilotApplicationController {
  constructor(private readonly pilotApplicationService: PilotApplicationService) {}

  // ═══════════════════════════════════════════════════════════════
  // CUSTOMER ENDPOINTS - Apply for pilot role
  // ═══════════════════════════════════════════════════════════════

  @Post('submit')
  @Roles('customer')
  @ApiOperation({
    summary: 'Submit a pilot application',
    description: 'Customer can apply to become a pilot by submitting required documents and information',
  })
  async submitApplication(
    @Body() dto: SubmitPilotApplicationDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.pilotApplicationService.submitApplication(dto, user);
  }

  @Get('my-application')
  @Roles('customer', 'pilot')
  @ApiOperation({
    summary: 'Get my pilot application status',
    description: 'Retrieve the current user\'s pilot application if it exists',
  })
  async getMyApplication(@CurrentUser() user: CurrentUserType) {
    const application = await this.pilotApplicationService.getApplicationByUid(user.uid);
    return application || { message: 'No application found' };
  }

  @Delete(':applicationId')
  @Roles('customer')
  @ApiOperation({
    summary: 'Delete/withdraw a pending application',
    description: 'Customer can delete their own pending pilot application',
  })
  async deleteApplication(
    @Param('applicationId') applicationId: string,
    @CurrentUser() user: CurrentUserType,
  ) {
    await this.pilotApplicationService.deleteApplication(applicationId, user);
    return { message: 'Application deleted successfully' };
  }

  // ═══════════════════════════════════════════════════════════════
  // ADMIN ENDPOINTS - Review and manage applications
  // ═══════════════════════════════════════════════════════════════

  @Get()
  @Roles('admin', 'super_admin', 'state_admin', 'dept_admin')
  @ApiOperation({
    summary: 'Get all pilot applications',
    description: 'Admin can view all pilot applications with optional status filter',
  })
  @ApiQuery({ name: 'status', required: false, enum: ['pending', 'approved', 'rejected'] })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  async getAllApplications(
    @Query('status') status?: 'pending' | 'approved' | 'rejected',
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.pilotApplicationService.getAllApplications(
      status,
      limit ? parseInt(limit.toString()) : 50,
      offset ? parseInt(offset.toString()) : 0,
    );
  }

  @Get('pending/count')
  @Roles('admin', 'super_admin', 'state_admin', 'dept_admin')
  @ApiOperation({
    summary: 'Get count of pending applications',
    description: 'Get the number of applications awaiting review',
  })
  async getPendingCount() {
    const count = await this.pilotApplicationService.getPendingCount();
    return { count };
  }

  @Get(':applicationId')
  @Roles('admin', 'super_admin', 'state_admin', 'dept_admin', 'customer', 'pilot')
  @ApiOperation({
    summary: 'Get application by ID',
    description: 'Retrieve detailed information about a specific pilot application',
  })
  async getApplicationById(@Param('applicationId') applicationId: string) {
    return this.pilotApplicationService.getApplicationById(applicationId);
  }

  @Patch(':applicationId/review')
  @Roles('admin', 'super_admin', 'state_admin', 'dept_admin')
  @ApiOperation({
    summary: 'Review and approve/reject a pilot application',
    description: `
      Admin reviews an application and takes action:
      - APPROVE: Creates pilot document with same UID, updates user roles to include 'pilot'
      - REJECT: Updates application status with rejection reason
      
      This is a transactional operation that ensures data consistency.
    `,
  })
  async reviewApplication(
    @Param('applicationId') applicationId: string,
    @Body() dto: ReviewPilotApplicationDto,
    @CurrentUser() admin: CurrentUserType,
  ) {
    return this.pilotApplicationService.reviewApplication(applicationId, dto, admin);
  }

  @Patch(':applicationId/documents/:documentType/verify')
  @Roles('admin', 'super_admin', 'state_admin', 'dept_admin')
  @ApiOperation({
    summary: 'Update document verification status',
    description: 'Admin can verify or reject individual documents in an application',
  })
  async updateDocumentVerification(
    @Param('applicationId') applicationId: string,
    @Param('documentType') documentType: string,
    @Body() body: { status: 'pending' | 'verified' | 'rejected'; notes?: string },
    @CurrentUser() admin: CurrentUserType,
  ) {
    return this.pilotApplicationService.updateDocumentVerification(
      applicationId,
      documentType,
      body.status,
      body.notes,
      admin,
    );
  }
}

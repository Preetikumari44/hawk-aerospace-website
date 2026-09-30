import {
  Controller,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ComplaintService } from './complaint.service';
import {
  UpdateComplaintStatusDto,
  ComplaintFilterDto,
  ComplaintResponseDto,
} from './dto/complaint.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser as User } from '../../common/decorators/current-user.decorator';
import { CurrentUser } from '../../common/interfaces/current-user.interface';

@ApiTags('Complaints - Admin')
@ApiBearerAuth()
@Controller('admin/complaints')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'super_admin', 'subadmin')
export class ComplaintAdminController {
  constructor(private readonly complaintService: ComplaintService) {}

  @Get()
  @ApiOperation({ summary: 'Get all complaints with filtering (Admin only)' })
  @ApiResponse({ status: 200, description: 'List of all complaints' })
  async getAllComplaints(
    @Query() filter: ComplaintFilterDto,
    @User() user: CurrentUser,
  ): Promise<{ items: ComplaintResponseDto[]; meta: any }> {
    return this.complaintService.getAllComplaints(filter, user);
  }

  @Get('nearing-breach')
  @ApiOperation({ summary: 'Get complaints nearing SLA breach (Admin only)' })
  @ApiResponse({ status: 200, description: 'List of complaints nearing SLA breach' })
  async getNearingBreach(@User() user: CurrentUser): Promise<ComplaintResponseDto[]> {
    return this.complaintService.getComplaintsNearingBreach(user);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update complaint status (Admin only)' })
  @ApiResponse({ status: 200, description: 'Complaint status updated' })
  @ApiResponse({ status: 404, description: 'Complaint not found' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateComplaintStatusDto,
    @User() user: CurrentUser,
  ): Promise<ComplaintResponseDto> {
    return this.complaintService.updateStatus(id, dto, user);
  }

  @Patch(':id/assign/:adminId')
  @ApiOperation({ summary: 'Assign complaint to admin/subadmin (Admin only)' })
  @ApiResponse({ status: 200, description: 'Complaint assigned' })
  @ApiResponse({ status: 404, description: 'Complaint not found' })
  async assignComplaint(
    @Param('id') id: string,
    @Param('adminId') adminId: string,
    @User() user: CurrentUser,
  ): Promise<ComplaintResponseDto> {
    return this.complaintService.assignComplaint(id, adminId, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete complaint (Admin only)' })
  @ApiResponse({ status: 204, description: 'Complaint deleted' })
  @ApiResponse({ status: 404, description: 'Complaint not found' })
  async deleteComplaint(@Param('id') id: string, @User() user: CurrentUser): Promise<void> {
    return this.complaintService.deleteComplaint(id, user);
  }
}

import {
  Controller,
  Post,
  Get,
  Patch,
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
  CreateComplaintDto,
  ComplaintFilterDto,
  ComplaintResponseDto,
  ComplaintStatsDto,
} from './dto/complaint.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser as User } from '../../common/decorators/current-user.decorator';
import { CurrentUser } from '../../common/interfaces/current-user.interface';

@ApiTags('Complaints')
@ApiBearerAuth()
@Controller('complaints')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ComplaintController {
  constructor(private readonly complaintService: ComplaintService) {}

  @Post()
  @Roles('customer', 'pilot', 'technician', 'vendor', 'aggregator')
  @ApiOperation({ summary: 'Create a new complaint (All user roles)' })
  @ApiResponse({ status: 201, description: 'Complaint created successfully' })
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateComplaintDto,
    @User() user: CurrentUser,
  ): Promise<ComplaintResponseDto> {
    return this.complaintService.create(dto, user);
  }

  @Get('my')
  @Roles('customer', 'pilot', 'technician', 'vendor', 'aggregator')
  @ApiOperation({ summary: 'Get my complaints' })
  @ApiResponse({ status: 200, description: 'List of user complaints' })
  async getMyComplaints(
    @Query() filter: ComplaintFilterDto,
    @User() user: CurrentUser,
  ): Promise<{ items: ComplaintResponseDto[]; meta: any }> {
    return this.complaintService.getMyComplaints(user, filter);
  }

  @Get('stats')
  @Roles('customer', 'pilot', 'technician', 'vendor', 'aggregator', 'admin', 'super_admin', 'subadmin')
  @ApiOperation({ summary: 'Get complaint statistics' })
  @ApiResponse({ status: 200, description: 'Complaint statistics' })
  async getStats(@User() user: CurrentUser): Promise<ComplaintStatsDto> {
    return this.complaintService.getComplaintStats(user);
  }

  @Get(':id')
  @Roles('customer', 'pilot', 'technician', 'vendor', 'aggregator', 'admin', 'super_admin', 'subadmin')
  @ApiOperation({ summary: 'Get complaint by ID' })
  @ApiResponse({ status: 200, description: 'Complaint details' })
  @ApiResponse({ status: 404, description: 'Complaint not found' })
  async getComplaintById(
    @Param('id') id: string,
    @User() user: CurrentUser,
  ): Promise<ComplaintResponseDto> {
    return this.complaintService.getComplaintById(id, user);
  }
}

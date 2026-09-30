import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { CurrentUser as CurrentUserType } from '../../common/interfaces/current-user.interface';
import { SAManagementService } from './sa-management.service';
import {
  CreateSARequestDto,
  UpdateSARequestDto,
  SARequestFilterDto,
} from './dto/sa-request.dto';
import { SAFilterDto } from './dto/sa-filter.dto';

@Controller('sa-management')
export class SAManagementController {
  constructor(private readonly saManagementService: SAManagementService) {}

  /**
   * Get list of current (approved) Sales Aggregators
   * GET /sa-management/current
   */
  @Get('current')
  @Roles('admin', 'super_admin')
  getCurrentSAList(@Query() filter: SAFilterDto) {
    return this.saManagementService.getCurrentSAList(filter);
  }

  /**
   * Get detailed information about a specific Sales Aggregator
   * GET /sa-management/current/:id
   */
  @Get('current/:id')
  @Roles('admin', 'super_admin')
  getSADetails(@Param('id') id: string) {
    return this.saManagementService.getSADetails(id);
  }

  /**
   * Update status of a Sales Aggregator (e.g. ban/unban)
   * PATCH /sa-management/current/:id/status
   */
  @Patch('current/:id/status')
  @Roles('admin', 'super_admin')
  @HttpCode(HttpStatus.OK)
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.saManagementService.updateStatus(id, status);
  }

  /**
   * Get customers for a specific Sales Aggregator
   * GET /sa-management/current/:id/customers
   */
  @Get('current/:id/customers')
  @Roles('admin', 'super_admin')
  getSACustomers(
    @Param('id') id: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    return this.saManagementService.getSACustomers(id, parseInt(page, 10), parseInt(limit, 10));
  }

  /**
   * Get bookings for a specific Sales Aggregator
   * GET /sa-management/current/:id/bookings
   */
  @Get('current/:id/bookings')
  @Roles('admin', 'super_admin')
  getSABookings(
    @Param('id') id: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    return this.saManagementService.getSABookings(id, parseInt(page, 10), parseInt(limit, 10));
  }

  /**
   * Get list of SA requests (pending, approved, rejected)
   * GET /sa-management/requests
   */
  @Get('requests')
  @Roles('admin', 'super_admin')
  getSARequestList(@Query() filter: SARequestFilterDto) {
    return this.saManagementService.getSARequestList(filter);
  }

  /**
   * Create a new SA request
   * POST /sa-management/requests
   */
  @Post('requests')
  @Roles('admin', 'super_admin', 'aggregator')
  createSARequest(@Body() dto: CreateSARequestDto) {
    return this.saManagementService.createSARequest(dto);
  }

  /**
   * Get SA request details
   * GET /sa-management/requests/:id
   */
  @Get('requests/:id')
  @Roles('admin', 'super_admin')
  getSARequestDetails(@Param('id') id: string) {
    return this.saManagementService.getSARequestDetails(id);
  }

  /**
   * Accept an SA request
   * PATCH /sa-management/requests/:id/accept
   */
  @Patch('requests/:id/accept')
  @Roles('admin', 'super_admin')
  @HttpCode(HttpStatus.OK)
  acceptSARequest(@Param('id') id: string, @CurrentUser() user: CurrentUserType) {
    return this.saManagementService.acceptSARequest(id, user);
  }

  /**
   * Reject an SA request
   * PATCH /sa-management/requests/:id/reject
   */
  @Patch('requests/:id/reject')
  @Roles('admin', 'super_admin')
  @HttpCode(HttpStatus.OK)
  rejectSARequest(
    @Param('id') id: string,
    @Body() dto: UpdateSARequestDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.saManagementService.rejectSARequest(id, dto, user);
  }
}

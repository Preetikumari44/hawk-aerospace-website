import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUser as CurrentUserType } from '../../common/interfaces/current-user.interface';
import { RefundService } from './refund.service';
import { ApproveRefundDto, RejectRefundDto } from './dto/refund-action.dto';
import { RefundFilterDto } from './dto/refund-filter.dto';

@ApiTags('Refunds')
@ApiBearerAuth()
@Controller('refunds')
export class RefundController {
  constructor(private readonly refundService: RefundService) {}

  // ─── Admin Endpoints ─────────────────────────────────────────────────

  @Get()
  @Roles('admin', 'super_admin', 'subadmin')
  @ApiOperation({ summary: 'Get all pending refunds (admin)' })
  getPendingRefunds() {
    return this.refundService.getPendingRefunds();
  }

  @Get('all')
  @Roles('admin', 'super_admin', 'subadmin')
  @ApiOperation({ summary: 'Get all refunds with optional filters (admin)' })
  getAllRefunds(
    @Query() filters: RefundFilterDto,
    @Query('limit') limit?: number,
  ) {
    return this.refundService.getAllRefunds(filters, limit);
  }

  @Get(':id')
  @Roles('admin', 'super_admin', 'subadmin')
  @ApiOperation({ summary: 'Get refund by ID (admin)' })
  getRefundById(@Param('id') id: string) {
    return this.refundService.getRefundById(id);
  }

  @Patch(':id/approve')
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Approve refund and process via Razorpay (admin)' })
  approveRefund(
    @Param('id') id: string,
    @Body() dto: ApproveRefundDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.refundService.approveRefund(id, user.uid, dto.notes);
  }

  @Patch(':id/reject')
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Reject refund request (admin)' })
  rejectRefund(
    @Param('id') id: string,
    @Body() dto: RejectRefundDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.refundService.rejectRefund(id, user.uid, dto.reason);
  }

  // ─── User Endpoints ──────────────────────────────────────────────────

  @Get('me')
  @Roles('customer', 'aggregator', 'fleet_manager', 'vendor', 'pilot')
  @ApiOperation({ summary: 'Get all refunds for current user' })
  getUserRefunds(@CurrentUser() user: CurrentUserType) {
    return this.refundService.getUserRefunds(user.uid);
  }

  @Get('booking/:bookingId')
  @Roles('customer', 'aggregator', 'fleet_manager', 'vendor', 'pilot', 'admin')
  @ApiOperation({ summary: 'Get refund status for a specific booking' })
  getRefundForBooking(@Param('bookingId') bookingId: string) {
    return this.refundService.getRefundForBooking(bookingId);
  }
}

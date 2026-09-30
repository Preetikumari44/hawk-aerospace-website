import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseBoolPipe,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUser as CurrentUserType } from '../../common/interfaces/current-user.interface';
import { PayoutService } from './payout.service';
import { AddPayoutMethodDto } from './dto/add-payout-method.dto';
import { CreateWithdrawalDto } from './dto/create-withdrawal.dto';
import { ApproveWithdrawalDto, RejectWithdrawalDto } from './dto/approve-withdrawal.dto';

@ApiTags('Payouts')
@ApiBearerAuth()
@Controller('payouts')
export class PayoutController {
  constructor(private readonly payoutService: PayoutService) {}

  // ─── Payout Methods ──────────────────────────────────────────────────

  @Post('methods')
  @Roles('pilot', 'fleet_manager', 'vendor', 'aggregator', 'customer', 'technician')
  @ApiOperation({ summary: 'Add a new payout method (bank or UPI)' })
  addPayoutMethod(
    @Body() dto: AddPayoutMethodDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.payoutService.addPayoutMethod(dto, user);
  }

  @Get('methods')
  @Roles('pilot', 'fleet_manager', 'vendor', 'aggregator', 'customer', 'technician')
  @ApiOperation({ summary: 'Get all active payout methods' })
  getPayoutMethods(@CurrentUser() user: CurrentUserType) {
    return this.payoutService.getPayoutMethods(user);
  }

  @Post('methods/:id/verify')
  @Roles('pilot', 'fleet_manager', 'vendor', 'aggregator', 'customer', 'technician')
  @ApiOperation({ summary: 'Verify a payout method via penny-drop or VPA lookup' })
  verifyPayoutMethod(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.payoutService.verifyPayoutMethod(id, user);
  }

  @Delete('methods/:id')
  @Roles('pilot', 'fleet_manager', 'vendor', 'aggregator', 'customer', 'technician')
  @ApiOperation({ summary: 'Delete a payout method' })
  deletePayoutMethod(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.payoutService.deletePayoutMethod(id, user);
  }

  // ─── Earnings ────────────────────────────────────────────────────────

  @Get('earnings')
  @Roles('pilot', 'fleet_manager', 'vendor', 'aggregator', 'customer', 'technician')
  @ApiOperation({ summary: 'Get earnings summary (total, pending, withdrawn)' })
  getEarningsSummary(@CurrentUser() user: CurrentUserType) {
    return this.payoutService.getEarningsSummary(user.uid);
  }

  // ─── Withdrawals ─────────────────────────────────────────────────────

  @Post('withdraw')
  @Roles('pilot', 'fleet_manager', 'vendor', 'aggregator', 'customer', 'technician')
  @ApiOperation({ summary: 'Create a withdrawal request (min ₹100)' })
  createWithdrawal(
    @Body() dto: CreateWithdrawalDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.payoutService.createWithdrawal(dto, user);
  }

  @Get('withdrawals')
  @Roles('pilot', 'fleet_manager', 'vendor', 'aggregator', 'customer', 'technician')
  @ApiOperation({ summary: 'Get withdrawal history for current user' })
  getWithdrawalHistory(@CurrentUser() user: CurrentUserType) {
    return this.payoutService.getWithdrawalHistory(user);
  }

  // ─── Admin: Withdrawal Management ────────────────────────────────────

  @Get('admin/withdrawals')
  @Roles('admin', 'super_admin', 'subadmin')
  @ApiOperation({ summary: 'Get all pending withdrawals (admin)' })
  getPendingWithdrawals() {
    return this.payoutService.getPendingWithdrawals();
  }

  @Get('admin/withdrawals/all')
  @Roles('admin', 'super_admin', 'subadmin')
  @ApiOperation({ summary: 'Get all withdrawals with optional status filter (admin)' })
  getAllWithdrawals(
    @Query('status') status?: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.payoutService.getAllWithdrawals(status, limit);
  }

  @Patch('admin/withdrawals/:id/approve')
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Approve a withdrawal request (admin)' })
  approveWithdrawal(
    @Param('id') id: string,
    @Body() dto: ApproveWithdrawalDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.payoutService.approveWithdrawal(id, user.uid, dto.notes);
  }

  @Patch('admin/withdrawals/:id/reject')
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Reject a withdrawal request (admin)' })
  rejectWithdrawal(
    @Param('id') id: string,
    @Body() dto: RejectWithdrawalDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.payoutService.rejectWithdrawal(id, user.uid, dto.reason);
  }
}

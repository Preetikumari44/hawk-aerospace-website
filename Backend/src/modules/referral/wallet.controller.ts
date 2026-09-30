import { Body, Controller, Get, Post, Query } from '@nestjs/common';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUser as CurrentUserType } from '../../common/interfaces/current-user.interface';
import { WalletWithdrawDto } from './dto/referral.dto';
import { WalletService } from './wallet.service';

@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  /** Hawk Credits balance (every role incl. customer). */
  @Get()
  balance(@CurrentUser() user: CurrentUserType) {
    return this.walletService.balance(user.uid);
  }

  @Get('history')
  history(@CurrentUser() user: CurrentUserType, @Query('limit') limit?: string) {
    return this.walletService.history(user.uid, limit ? Number(limit) : 50);
  }

  /** Withdraw to verified UPI/bank → RazorpayX auto payout. Min ₹100. */
  @Post('withdraw')
  withdraw(@Body() dto: WalletWithdrawDto, @CurrentUser() user: CurrentUserType) {
    return this.walletService.withdraw(dto, user);
  }
}

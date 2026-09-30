import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { CurrentUser as CurrentUserType } from '../../common/interfaces/current-user.interface';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import {
  CreateRazorpayOrderDto,
  VerifyMarketplacePaymentDto,
  AbandonMarketplaceOrdersDto,
} from './dto/razorpay.dto';
import { PaymentService } from './payment.service';

@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  // ── Razorpay checkout (customer-facing online payments) ──

  @Post('razorpay/order')
  @Roles('customer', 'aggregator', 'admin', 'subadmin')
  createRazorpayOrder(@Body() dto: CreateRazorpayOrderDto, @CurrentUser() user: CurrentUserType) {
    return this.paymentService.createRazorpayOrder(dto, user);
  }

  @Post('razorpay/verify-marketplace')
  @Roles('customer', 'aggregator', 'admin', 'subadmin')
  verifyMarketplacePayment(
    @Body() dto: VerifyMarketplacePaymentDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.paymentService.confirmMarketplacePayment(dto, user);
  }

  @Post('razorpay/abandon-marketplace')
  @Roles('customer', 'aggregator', 'admin', 'subadmin')
  abandonMarketplaceOrders(
    @Body() dto: AbandonMarketplaceOrdersDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.paymentService.abandonMarketplaceOrders(dto, user);
  }

  // ── Pilot payment collection ────────────────────────────

  @Post('initiate')
  @Roles('pilot')
  initiate(@Body() dto: CreatePaymentDto, @CurrentUser() user: CurrentUserType) {
    return this.paymentService.initiate(dto, user);
  }

  @Patch(':id/confirm')
  @Roles('pilot')
  confirm(
    @Param('id') id: string,
    @Body() dto: ConfirmPaymentDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.paymentService.confirm(id, dto, user);
  }

  @Get(':id/invoice')
  invoice(@Param('id') id: string) {
    return this.paymentService.invoice(id);
  }

  @Get('transactions')
  transactions(@CurrentUser() user: CurrentUserType, @Query() filter: PaginationDto) {
    return this.paymentService.transactions(user, filter);
  }
}

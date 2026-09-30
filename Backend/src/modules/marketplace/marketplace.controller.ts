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

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { CurrentUser as CurrentUserType } from '../../common/interfaces/current-user.interface';
import {
  CreateOrderDto,
  MarketplaceOrderFilterDto,
  UpdateOrderStatusDto,
} from './dto/marketplace.dto';
import { MarketplaceService } from './marketplace.service';

@Controller('marketplace')
export class MarketplaceController {
  constructor(private readonly marketplaceService: MarketplaceService) {}

  // ── Stats (admin only) ────────────────────────────────

  @Get('stats')
  @Roles('admin', 'subadmin', 'super_admin')
  getStats() {
    return this.marketplaceService.getStats();
  }

  // ── Orders ────────────────────────────────────────────

  @Get('orders')
  @Roles('admin', 'subadmin', 'super_admin', 'vendor', 'customer', 'aggregator', 'pilot', 'technician')
  listOrders(@Query() filter: MarketplaceOrderFilterDto, @CurrentUser() user: CurrentUserType) {
    return this.marketplaceService.listOrders(filter, user);
  }

  @Get('orders/:id')
  @Roles('admin', 'subadmin', 'super_admin', 'vendor', 'customer', 'aggregator', 'pilot', 'technician')
  getOrder(@Param('id') id: string, @CurrentUser() user: CurrentUserType) {
    return this.marketplaceService.getOrder(id, user);
  }

  @Post('orders')
  @Roles('customer', 'aggregator', 'vendor', 'pilot', 'technician')
  createOrder(@Body() dto: CreateOrderDto, @CurrentUser() user: CurrentUserType) {
    return this.marketplaceService.createOrder(
      {
        productId: dto.productId,
        productName: dto.productName,
        price: dto.price,
        vendorUid: dto.vendorUid,
        deliveryLocation: dto.deliveryLocation,
        deliveryAddress: dto.deliveryAddress,
        deliveryDate: dto.deliveryDate,
        paymentMethod: dto.paymentMethod,
        couponCode: dto.couponCode,
        originalPrice: dto.originalPrice,
      },
      user,
    );
  }

  @Patch('orders/:id/status')
  @Roles('admin', 'subadmin', 'super_admin', 'vendor')
  updateOrderStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.marketplaceService.updateOrderStatus(id, dto.status, user);
  }

  // ── Support Tickets ───────────────────────────────────

  @Get('support-tickets')
  @Roles('admin', 'subadmin', 'super_admin')
  listSupportTickets(@Query('status') status?: string) {
    return this.marketplaceService.listSupportTickets(status);
  }

  @Get('support-tickets/:id')
  @Roles('admin', 'subadmin', 'super_admin')
  getSupportTicket(@Param('id') id: string) {
    return this.marketplaceService.getSupportTicket(id);
  }

  // ── Products ──────────────────────────────────────────

  @Get('products')
  @Roles('admin', 'subadmin', 'super_admin', 'vendor', 'customer', 'aggregator', 'pilot', 'technician', 'fleet_manager')
  listProducts(@Query('vendorId') vendorId?: string) {
    return this.marketplaceService.listProducts(vendorId);
  }
}

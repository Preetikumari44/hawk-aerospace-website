import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { AppRole } from '../../common/constants/roles.constant';
import type { CurrentUser as CurrentUserType } from '../../common/interfaces/current-user.interface';
import { ApplyCouponDto } from './dto/apply-coupon.dto';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { CouponService } from './coupon.service';

// 'vendor' covers fleet_manager via the RolesGuard alias (fleet_manager -> vendor).
const PAYING_USER_ROLES: AppRole[] = ['customer', 'aggregator', 'vendor', 'pilot', 'technician'];

const COUPON_ADMIN_ROLES: AppRole[] = ['admin', 'super_admin'];

@Controller('coupons')
export class CouponController {
  constructor(private readonly couponService: CouponService) {}

  @Post()
  @Roles(...COUPON_ADMIN_ROLES)
  create(@Body() dto: CreateCouponDto, @CurrentUser() user: CurrentUserType) {
    return this.couponService.create(dto, user);
  }

  @Get()
  @Roles(...COUPON_ADMIN_ROLES)
  list() {
    return this.couponService.list();
  }

  @Get('available')
  @Roles(...PAYING_USER_ROLES)
  available(@CurrentUser() user: CurrentUserType) {
    return this.couponService.listAvailable(user);
  }

  @Post('validate')
  @Roles(...PAYING_USER_ROLES)
  validate(@Body() dto: ApplyCouponDto, @CurrentUser() user: CurrentUserType) {
    return this.couponService.validate(dto, user);
  }

  @Patch(':id')
  @Roles(...COUPON_ADMIN_ROLES)
  update(@Param('id') id: string, @Body() dto: Partial<CreateCouponDto>) {
    return this.couponService.update(id, dto);
  }

  @Patch(':id/deactivate')
  @Roles(...COUPON_ADMIN_ROLES)
  deactivate(@Param('id') id: string) {
    return this.couponService.deactivate(id);
  }
}

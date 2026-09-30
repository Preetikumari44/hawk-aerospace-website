import { Body, Controller, Get, Patch, Post, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { CurrentUser as CurrentUserType } from '../../common/interfaces/current-user.interface';
import { EstimatePriceDto } from './dto/estimate-price.dto';
import { EstimateServiceDto } from './dto/estimate-service.dto';
import { LockPriceDto } from './dto/lock-price.dto';
import { UpdateCropRateDto } from './dto/update-crop-rate.dto';
import { PricingService } from './pricing.service';

@Controller('pricing')
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Post('estimate')
  @Roles('customer', 'aggregator')
  estimate(@Body() dto: EstimatePriceDto) {
    return this.pricingService.estimatePrice(dto);
  }

  @Post('estimate-booking')
  @Public()
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 estimates per minute
  estimateBooking(@Body() dto: any) {
    // Public endpoint for pre-booking price estimation
    return this.pricingService.estimatePrice({
      cropType: dto.cropType,
      areaValue: dto.areaValue,
      areaUnit: dto.areaUnit,
      droneTier: dto.droneTier,
      distanceKm: dto.distanceKm,
      estimatedFlightHours: dto.estimatedFlightHours,
      couponDiscountAmount: 0, // Coupon validation requires auth
      chemicalRequired: dto.serviceType === 'spraying' || dto.serviceType === 'seeding',
    });
  }

  @Post('estimate-service')
  @Public()
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 estimates per minute
  estimateService(@Body() dto: EstimateServiceDto) {
    // Public endpoint for catalog-based (price list) service estimation
    return this.pricingService.calculateServiceEstimate(dto);
  }

  @Public()
  @Get('crop-rates')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per 60 seconds for pricing data
  getCropRates(@Query('vendorId') vendorId?: string) {
    return this.pricingService.getCropRates(vendorId);
  }

  @Patch('crop-rates')
  @Roles('admin', 'vendor')
  updateCropRate(@Body() dto: UpdateCropRateDto, @CurrentUser() user: CurrentUserType) {
    return this.pricingService.updateCropRate(dto, user);
  }

  @Post('lock')
  @Roles('pilot')
  lock(@Body() dto: LockPriceDto, @CurrentUser() user: CurrentUserType) {
    return this.pricingService.lockPrice(dto, user.uid);
  }
}

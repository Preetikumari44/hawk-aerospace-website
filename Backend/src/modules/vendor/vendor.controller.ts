import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import type { CurrentUser as CurrentUserType } from '../../common/interfaces/current-user.interface';
import { BookingFilterDto } from '../booking/dto/booking-filter.dto';
import { VendorAssignPilotDto } from './dto/assign-pilot.dto';
import { VendorOnboardDto } from './dto/vendor-onboard.dto';
import { VendorService } from './vendor.service';

@Controller('vendors')
@Roles('vendor')
export class VendorController {
  constructor(private readonly vendorService: VendorService) {}

  @Post('onboard')
  onboard(@Body() dto: VendorOnboardDto, @CurrentUser() user: CurrentUserType) {
    return this.vendorService.onboardVendor(dto, user);
  }

  @Get('dashboard')
  dashboard(@CurrentUser() user: CurrentUserType) {
    return this.vendorService.getDashboard(user);
  }

  @Get('bookings')
  incomingBookings(@Query() filter: BookingFilterDto) {
    return this.vendorService.getIncomingBookings(filter);
  }

  @Post('assign-pilot')
  assignPilot(@Body() dto: VendorAssignPilotDto, @CurrentUser() user: CurrentUserType) {
    return this.vendorService.assignPilot(dto, user);
  }

  @Get('pilots')
  listPilots(@CurrentUser() user: CurrentUserType) {
    return this.vendorService.listPilots(user);
  }

  @Post('pilots/invite')
  invitePilot(@CurrentUser() user: CurrentUserType) {
    return this.vendorService.createPilotInvite(user);
  }

  @Patch('pilots/:id/approve')
  approvePilot(@Param('id') pilotId: string) {
    return this.vendorService.approvePilot(pilotId, true);
  }

  @Get('revenue')
  revenue(@CurrentUser() user: CurrentUserType) {
    return this.vendorService.getRevenue(user);
  }

  /**
   * Public endpoint for service discovery - find providers near a location
   * No authentication required for initial discovery
   */
  @Get('discover')
  @Public()
  discoverProviders(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('serviceType') serviceType?: string,
    @Query('radius') radius?: string
  ) {
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    const radiusKm = radius ? parseFloat(radius) : 50;

    if (isNaN(latitude) || isNaN(longitude)) {
      throw new Error('Invalid latitude or longitude');
    }

    return this.vendorService.discoverProviders(latitude, longitude, serviceType, radiusKm);
  }
}

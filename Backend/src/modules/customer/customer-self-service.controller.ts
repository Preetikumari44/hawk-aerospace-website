import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUser as CurrentUserType } from '../../common/interfaces/current-user.interface';
import { CustomerService } from './customer.service';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CreateFarmDto } from './dto/create-farm.dto';
import { UpdateFarmDto } from './dto/update-farm.dto';
import { UpdateNotificationSettingsDto } from './dto/update-notification-settings.dto';

/**
 * Self-service customer endpoints (/customers/me/...)
 * Customer app uses these to manage their own profile and data.
 */
@Controller('customers/me')
@Roles('customer')
export class CustomerSelfServiceController {
  constructor(private readonly customerService: CustomerService) {}

  @Get()
  @Throttle({ default: { limit: 40, ttl: 60000 } })
  getMyProfile(@CurrentUser() user: CurrentUserType) {
    return this.customerService.findById(user.uid, user);
  }

  @Patch()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  updateMyProfile(@Body() dto: UpdateCustomerDto, @CurrentUser() user: CurrentUserType) {
    return this.customerService.update(user.uid, dto, user);
  }

  @Get('bookings')
  @Throttle({ default: { limit: 40, ttl: 60000 } })
  getMyBookings(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @CurrentUser() user: CurrentUserType
  ) {
    return this.customerService.getBookings(user.uid, user, parseInt(page), parseInt(limit));
  }

  @Get('farms')
  @Throttle({ default: { limit: 40, ttl: 60000 } })
  getMyFarms(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @CurrentUser() user: CurrentUserType
  ) {
    return this.customerService.getFarms(user.uid, user, parseInt(page), parseInt(limit));
  }

  @Post('farms')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  createMyFarm(@Body() dto: CreateFarmDto, @CurrentUser() user: CurrentUserType) {
    return this.customerService.createFarm(user.uid, dto, user);
  }

  @Patch('farms/:farmId')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  updateMyFarm(
    @Param('farmId') farmId: string,
    @Body() dto: UpdateFarmDto,
    @CurrentUser() user: CurrentUserType
  ) {
    return this.customerService.updateFarm(user.uid, farmId, dto, user);
  }

  @Delete('farms/:farmId')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  deleteMyFarm(@Param('farmId') farmId: string, @CurrentUser() user: CurrentUserType) {
    return this.customerService.deleteFarm(user.uid, farmId, user);
  }

  @Get('support-tickets')
  @Throttle({ default: { limit: 40, ttl: 60000 } })
  getMySupportTickets(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @CurrentUser() user: CurrentUserType
  ) {
    return this.customerService.getSupportTickets(user.uid, user, parseInt(page), parseInt(limit));
  }

  @Get('stats')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  getMyStats(@CurrentUser() user: CurrentUserType) {
    return this.customerService.getStats(user);
  }

  @Get('notification-settings')
  @Throttle({ default: { limit: 40, ttl: 60000 } })
  getMyNotificationSettings(@CurrentUser() user: CurrentUserType) {
    return this.customerService.getNotificationSettings(user.uid, user);
  }

  @Patch('notification-settings')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  updateMyNotificationSettings(
    @Body() dto: UpdateNotificationSettingsDto,
    @CurrentUser() user: CurrentUserType
  ) {
    return this.customerService.updateNotificationSettings(user.uid, dto, user);
  }

  @Get('notifications')
  @Throttle({ default: { limit: 40, ttl: 60000 } })
  getMyNotifications(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @CurrentUser() user: CurrentUserType
  ) {
    return this.customerService.getNotifications(user.uid, user, parseInt(page), parseInt(limit));
  }

  @Patch('notifications/:notificationId/read')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  markNotificationRead(
    @Param('notificationId') notificationId: string,
    @CurrentUser() user: CurrentUserType
  ) {
    return this.customerService.markNotificationRead(user.uid, notificationId, user);
  }

  @Post('notifications/mark-all-read')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  markAllNotificationsRead(@CurrentUser() user: CurrentUserType) {
    return this.customerService.markAllNotificationsRead(user.uid, user);
  }

  @Get('bookings/history')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  getBookingHistory(
    @Query('year') year: string,
    @CurrentUser() user: CurrentUserType
  ) {
    const yearNum = year ? parseInt(year) : undefined;
    return this.customerService.getBookingHistory(user.uid, user, yearNum);
  }

  @Delete()
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  requestAccountDeletion(
    @Body('reason') reason: string,
    @CurrentUser() user: CurrentUserType
  ) {
    return this.customerService.requestDeletion(user.uid, reason, user);
  }

  @Post('bookings/flying-restriction-check')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  checkFlyingRestrictions(
    @Body() dto: any, // FlyingRestrictionCheckDto
    @CurrentUser() user: CurrentUserType
  ) {
    return this.customerService.checkFlyingRestrictions(dto);
  }

  @Post('bookings/weather-check')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  checkWeatherConditions(
    @Body() dto: any, // WeatherCheckDto
    @CurrentUser() user: CurrentUserType
  ) {
    return this.customerService.checkWeatherConditions(dto);
  }

  @Get('services')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  discoverServices(
    @Query('latitude') latitude: string,
    @Query('longitude') longitude: string,
    @Query('serviceType') serviceType?: string,
    @Query('radiusKm') radiusKm?: string,
    @CurrentUser() user?: CurrentUserType
  ) {
    return this.customerService.discoverServices({
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      serviceType,
      radiusKm: radiusKm ? parseFloat(radiusKm) : undefined,
    });
  }

  @Get('nearby-pilots')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  getNearbyPilots(
    @Query('latitude') latitude: string,
    @Query('longitude') longitude: string,
    @Query('serviceType') serviceType?: string,
    @Query('radiusKm') radiusKm?: string,
    @Query('limit') limit?: string,
    @CurrentUser() user?: CurrentUserType
  ) {
    return this.customerService.findNearbyPilots({
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      serviceType,
      radiusKm: radiusKm ? parseFloat(radiusKm) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Post('services/pricing')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  estimateServicePrice(
    @Body() dto: any, // EstimatePriceDto
    @CurrentUser() user: CurrentUserType
  ) {
    return this.customerService.estimateServicePrice(dto);
  }
}

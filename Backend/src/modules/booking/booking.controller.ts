import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { CurrentUser as CurrentUserType } from '../../common/interfaces/current-user.interface';
import { BookingService } from './booking.service';
import { AssignBookingDto } from './dto/assign-booking.dto';
import { BookingAnalyticsFilterDto } from './dto/booking-analytics-filter.dto';
import { BookingFilterDto } from './dto/booking-filter.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { CompletePaymentDto } from './dto/complete-payment.dto';
import { RateBookingDetailedDto } from './dto/rate-booking-detailed.dto';
import { SetTimeSlotDto } from './dto/set-time-slot.dto';

@Controller('bookings')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Post('migrate-assignments')
  @Roles('admin', 'super_admin')
  async migrateAssignments() {
    return this.bookingService.fixAssignedPilotDroneStatuses();
  }

  @Post()
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 bookings per minute
  @Roles('customer', 'aggregator')
  createBooking(@Body() dto: CreateBookingDto, @CurrentUser() user: CurrentUserType) {
    return this.bookingService.createBooking(dto, user);
  }

  @Get('analytics')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  getAnalytics(@Query() filter: BookingAnalyticsFilterDto) {
    return this.bookingService.getAnalytics(filter);
  }

  @Get()
  @Throttle({ default: { limit: 40, ttl: 60000 } }) // 40 list requests per minute
  listBookings(@Query() filter: BookingFilterDto, @CurrentUser() user: CurrentUserType) {
    return this.bookingService.listBookings(filter, user);
  }

  @Get(':id')
  getBooking(@Param('id') id: string, @CurrentUser() user: CurrentUserType) {
    return this.bookingService.getBooking(id, user);
  }

  @Patch(':id')
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 updates per minute
  @Roles('customer', 'admin')
  updateBooking(
    @Param('id') id: string,
    @Body() dto: UpdateBookingDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.bookingService.updatePendingBooking(id, dto, user);
  }

  @Patch(':id/cancel')
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 cancellations per minute
  @Roles('customer', 'aggregator', 'fleet_manager', 'vendor', 'pilot', 'admin', 'subadmin', 'super_admin')
  cancelBooking(@Param('id') id: string, @Body() dto: CancelBookingDto, @CurrentUser() user: CurrentUserType) {
    return this.bookingService.cancelBookingWithRefund(id, dto.reason, user);
  }

  @Post(':id/rate')
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 ratings per minute
  @Roles('customer', 'aggregator', 'admin')
  rateBooking(
    @Param('id') id: string,
    @Body() dto: RateBookingDetailedDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.bookingService.rateBooking(id, dto.rating, dto.feedback || dto.review, user);
  }

  @Patch(':id/time-slot')
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 time slot updates per minute
  @Roles('customer', 'admin')
  setPreferredTimeSlot(
    @Param('id') id: string,
    @Body() dto: SetTimeSlotDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.bookingService.setPreferredTimeSlot(id, dto.preferredTimeSlot, user);
  }

  @Get(':id/price-breakdown')
  @Throttle({ default: { limit: 30, ttl: 60000 } }) // 30 price breakdown requests per minute
  getPriceBreakdown(@Param('id') id: string, @CurrentUser() user: CurrentUserType) {
    return this.bookingService.getPriceBreakdown(id, user);
  }

  @Post(':id/admin-approve')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Roles('admin', 'super_admin', 'subadmin')
  adminApproveBooking(
    @Param('id') id: string,
    @Body() dto: { autoAssign?: boolean },
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.bookingService.adminApproveBooking(id, dto.autoAssign ?? true, user);
  }

  @Post(':id/admin-reject')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Roles('admin', 'super_admin', 'subadmin')
  adminRejectBooking(
    @Param('id') id: string,
    @Body() dto: { reason?: string },
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.bookingService.adminRejectBooking(id, dto.reason || 'Booking rejected by admin', user);
  }

  @Patch(':id/admin-assign')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Roles('admin', 'super_admin', 'subadmin')
  adminAssignBooking(
    @Param('id') id: string,
    @Body() dto: { fleetManagerUid?: string; assignedPilot?: string; assignedDrone?: string },
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.bookingService.adminAssignBooking(id, dto, user);
  }

  @Patch(':id/assign')
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 assignments per minute
  @Roles('vendor')
  assignBooking(
    @Param('id') id: string,
    @Body() dto: AssignBookingDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.bookingService.assignBooking(id, dto, user.uid);
  }

  @Patch(':id/status')
  @Throttle({ default: { limit: 30, ttl: 60000 } }) // 30 status updates per minute
  @Roles('pilot', 'vendor')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateBookingStatusDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.bookingService.updateStatus(id, dto, user);
  }

  @Post(':id/complete-payment')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Roles('customer', 'aggregator', 'admin', 'subadmin')
  completePayment(
    @Param('id') id: string,
    @Body() dto: CompletePaymentDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.bookingService.completePayment(id, user, dto);
  }

  @Post(':id/confirm-cash')
  @Roles('pilot', 'admin', 'subadmin')
  confirmCashReceipt(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.bookingService.confirmCashReceipt(id, user);
  }

  @Get(':id/progress')
  getBookingProgress(@Param('id') id: string, @CurrentUser() user: CurrentUserType) {
    return this.bookingService.getBookingProgress(id);
  }

  @Get(':id/weather')
  getWeatherForecast(@Param('id') id: string, @CurrentUser() user: CurrentUserType) {
    return this.bookingService.getWeatherForecast(id);
  }

  @Get(':id/restrictions')
  getFlyingRestrictions(@Param('id') id: string, @CurrentUser() user: CurrentUserType) {
    return this.bookingService.getFlyingRestrictions(id);
  }

  @Get(':id/metadata')
  getBookingMetadata(@Param('id') id: string, @CurrentUser() user: CurrentUserType) {
    return this.bookingService.getBookingMetadata(id);
  }

  @Get(':id/tracking')
  @Throttle({ default: { limit: 60, ttl: 60000 } }) // 60 tracking requests per minute (real-time)
  getBookingTracking(@Param('id') id: string, @CurrentUser() user: CurrentUserType) {
    return this.bookingService.getBookingTracking(id, user);
  }
}

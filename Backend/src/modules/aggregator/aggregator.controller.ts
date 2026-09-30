import { Body, Controller, Get, Post, Query, Param, Patch, Delete } from '@nestjs/common';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { CurrentUser as CurrentUserType } from '../../common/interfaces/current-user.interface';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { BookingFilterDto } from '../booking/dto/booking-filter.dto';
import { AddCustomerDto } from './dto/add-customer.dto';
import { AggregatorOnboardDto } from './dto/aggregator-onboard.dto';
import { DelegatedBookingDto } from './dto/delegated-booking.dto';
import { VerifyCustomerOtpDto } from './dto/verify-customer-otp.dto';
import { UpdateNotificationSettingsDto } from './dto/update-notification-settings.dto';
import { DeleteAccountDto } from './dto/delete-account.dto';
import { AggregatorService } from './aggregator.service';

@Controller('aggregators')
@Roles('aggregator')
export class AggregatorController {
  constructor(private readonly aggregatorService: AggregatorService) {}

  // Profile & Onboarding
  @Post('onboard')
  onboard(@Body() dto: AggregatorOnboardDto, @CurrentUser() user: CurrentUserType) {
    return this.aggregatorService.onboardAggregator(dto, user);
  }

  @Get('profile')
  getProfile(@CurrentUser() user: CurrentUserType) {
    return this.aggregatorService.getProfile(user);
  }

  @Patch('profile')
  updateProfile(@Body() dto: Partial<AggregatorOnboardDto>, @CurrentUser() user: CurrentUserType) {
    // Update profile logic
    return this.aggregatorService.onboardAggregator(dto as AggregatorOnboardDto, user);
  }

  @Post('onboarding/documents')
  uploadDocuments(@Body() dto: { documents: Array<{ type: string; url: string; name?: string }> }, @CurrentUser() user: CurrentUserType) {
    return this.aggregatorService.onboardAggregator({ 
      businessName: '', 
      documents: dto.documents 
    }, user);
  }

  @Get('onboarding/status')
  getOnboardingStatus(@CurrentUser() user: CurrentUserType) {
    return this.aggregatorService.getOnboardingStatus(user);
  }

  // Customer Management
  @Post('customers')
  addCustomer(@Body() dto: AddCustomerDto, @CurrentUser() user: CurrentUserType) {
    return this.aggregatorService.addCustomer(dto, user);
  }

  @Post('customers/send-otp')
  sendCustomerOtp(@Body() dto: AddCustomerDto, @CurrentUser() user: CurrentUserType) {
    return this.aggregatorService.initiateCustomerOtp(dto, user);
  }

  @Post('customers/verify-otp')
  verifyCustomerOtp(@Body() dto: VerifyCustomerOtpDto, @CurrentUser() user: CurrentUserType) {
    return this.aggregatorService.verifyCustomerOtp(dto, user);
  }

  @Get('customers')
  listCustomers(@Query() filter: PaginationDto, @CurrentUser() user: CurrentUserType) {
    return this.aggregatorService.listCustomers(filter, user);
  }

  @Get('customers/:customerId')
  getCustomerDetail(@Param('customerId') customerId: string, @CurrentUser() user: CurrentUserType) {
    return this.aggregatorService.getCustomerDetail(user, customerId);
  }

  @Patch('customers/:customerId')
  updateCustomer(
    @Param('customerId') customerId: string,
    @Body() dto: Partial<AddCustomerDto>,
    @CurrentUser() user: CurrentUserType
  ) {
    return this.aggregatorService.updateCustomer(customerId, dto, user);
  }

  @Get('customers/:customerId/bookings')
  getCustomerBookings(@Param('customerId') customerId: string, @CurrentUser() user: CurrentUserType) {
    const filter = new BookingFilterDto();
    filter.customerUid = customerId;
    return this.aggregatorService.listBookings(filter, user);
  }

  // Booking Flow (on behalf of customer)
  @Post('bookings')
  createBooking(@Body() dto: DelegatedBookingDto, @CurrentUser() user: CurrentUserType) {
    return this.aggregatorService.createDelegatedBooking(dto, user);
  }

  @Get('bookings')
  listBookings(@Query() filter: BookingFilterDto, @CurrentUser() user: CurrentUserType) {
    return this.aggregatorService.listBookings(filter, user);
  }

  @Get('bookings/:bookingId')
  getBookingDetail(@Param('bookingId') bookingId: string, @CurrentUser() user: CurrentUserType) {
    return this.aggregatorService.getBookingDetail(bookingId, user);
  }

  @Patch('bookings/:bookingId')
  updateBooking(
    @Param('bookingId') bookingId: string,
    @Body() dto: Partial<DelegatedBookingDto>,
    @CurrentUser() user: CurrentUserType
  ) {
    return this.aggregatorService.updateBooking(bookingId, dto, user);
  }

  @Post('bookings/:bookingId/cancel')
  cancelBooking(
    @Param('bookingId') bookingId: string,
    @Body() dto: { reason: string },
    @CurrentUser() user: CurrentUserType
  ) {
    return this.aggregatorService.cancelBooking(bookingId, dto?.reason, user);
  }

  // Pre-Booking Checks
  @Post('bookings/flying-restriction-check')
  async checkFlyingRestriction(@Body() dto: { location: { lat: number; lng: number }; serviceType?: string }) {
    return this.aggregatorService.checkFlyingRestrictions(dto.location.lat, dto.location.lng, dto.serviceType);
  }

  @Post('bookings/weather-check')
  async checkWeather(@Body() dto: { location: { lat: number; lng: number }; date: string }) {
    return this.aggregatorService.checkWeatherConditions(dto.location.lat, dto.location.lng, dto.date);
  }

  // Commission & Earnings
  @Get('commission')
  getCommission(@CurrentUser() user: CurrentUserType) {
    return this.aggregatorService.getCommission(user);
  }

  @Get('commission/dashboard')
  getCommissionDashboard(
    @Query('period') period: 'daily' | 'weekly' | 'monthly' = 'daily',
    @CurrentUser() user?: CurrentUserType
  ) {
    return this.aggregatorService.getCommissionDashboard(user!, period);
  }

  @Get('commission/pending')
  getPendingCommission(@CurrentUser() user: CurrentUserType) {
    return this.aggregatorService.getPendingCommission(user);
  }

  @Get('commission/history')
  getCommissionHistory(@Query() pagination: PaginationDto, @CurrentUser() user: CurrentUserType) {
    return this.aggregatorService.getCommissionHistory(user, pagination);
  }

  @Get('refunds')
  getRefunds(@Query() pagination: PaginationDto, @CurrentUser() user: CurrentUserType) {
    return this.aggregatorService.getRefunds(user, pagination);
  }

  @Patch('payout-method')
  updatePayoutMethod(
    @Body() dto: {
      accountNumber: string;
      ifscCode: string;
      accountHolderName: string;
      bankName: string;
      upiId?: string;
    },
    @CurrentUser() user: CurrentUserType
  ) {
    return this.aggregatorService.updatePayoutMethod(user, dto);
  }

  // Complaints (integrated with incident management)
  @Get('complaints')
  getComplaints(@CurrentUser() user: CurrentUserType) {
    return this.aggregatorService.getComplaints(user);
  }

  @Post('complaints')
  createComplaint(@Body() dto: any, @CurrentUser() user: CurrentUserType) {
    return this.aggregatorService.createComplaint(user, dto);
  }

  @Get('complaints/:complaintId')
  getComplaintDetail(@Param('complaintId') complaintId: string, @CurrentUser() user: CurrentUserType) {
    return this.aggregatorService.getComplaintDetail(user, complaintId);
  }

  // Dashboard & Analytics
  @Get('dashboard')
  getDashboard(@CurrentUser() user: CurrentUserType) {
    return this.aggregatorService.getDashboard(user);
  }

  @Get('analytics')
  getAnalytics(@Query() filter: BookingFilterDto, @CurrentUser() user: CurrentUserType) {
    return this.aggregatorService.getAnalytics(user, filter);
  }

  // Notifications & Settings
  @Get('notifications')
  getNotifications(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @CurrentUser() user?: CurrentUserType
  ) {
    return this.aggregatorService.getNotifications(user!, page, limit);
  }

  @Get('notification-settings')
  getNotificationSettings(@CurrentUser() user: CurrentUserType) {
    return this.aggregatorService.getNotificationSettings(user);
  }

  @Patch('notification-settings')
  updateNotificationSettings(
    @Body() dto: UpdateNotificationSettingsDto,
    @CurrentUser() user: CurrentUserType
  ) {
    return this.aggregatorService.updateNotificationSettings(dto, user);
  }

  @Delete('account')
  deleteAccount(@Body() dto: DeleteAccountDto, @CurrentUser() user: CurrentUserType) {
    return this.aggregatorService.requestAccountDeletion(dto, user);
  }

  // Role Switching
  @Post('switch-role')
  switchRole(@Body() dto: { role: string }, @CurrentUser() user: CurrentUserType) {
    return this.aggregatorService.switchRole(user, dto.role);
  }
}

import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUser as CurrentUserType } from '../../common/interfaces/current-user.interface';
import { CustomerService } from './customer.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CustomerFilterDto } from './dto/customer-filter.dto';

@Controller('customers')
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Post()
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 customer creations per minute
  @Roles('admin', 'subadmin', 'aggregator', 'super_admin')
  createCustomer(@Body() dto: CreateCustomerDto, @CurrentUser() user: CurrentUserType) {
    return this.customerService.create(dto, user);
  }

  @Get()
  @Throttle({ default: { limit: 30, ttl: 60000 } }) // 30 list requests per minute
  @Roles('admin', 'subadmin', 'aggregator', 'super_admin')
  getAllCustomers(@Query() filter: CustomerFilterDto, @CurrentUser() user: CurrentUserType) {
    return this.customerService.findAll(filter, user);
  }

  @Get('profile')
  @Throttle({ default: { limit: 40, ttl: 60000 } }) // 40 reads per minute
  @Roles('customer')
  getMyProfile(@CurrentUser() user: CurrentUserType) {
    // Get authenticated customer's own profile
    return this.customerService.findById(user.uid, user);
  }

  @Patch('profile')
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 writes per minute
  @Roles('customer')
  updateMyProfile(
    @Body() dto: UpdateCustomerDto,
    @CurrentUser() user: CurrentUserType
  ) {
    // Update authenticated customer's own profile
    return this.customerService.update(user.uid, dto, user);
  }

  @Get('stats')
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 reads per minute
  @Roles('admin', 'subadmin', 'aggregator', 'super_admin')
  getCustomerStats(@CurrentUser() user: CurrentUserType) {
    return this.customerService.getStats(user);
  }

  @Get('filter-options')
  @Throttle({ default: { limit: 30, ttl: 60000 } }) // 30 reads per minute
  @Roles('admin', 'subadmin', 'aggregator', 'super_admin')
  getFilterOptions(@CurrentUser() user: CurrentUserType) {
    return this.customerService.getFilterOptions(user);
  }

  @Get(':uid')
  @Throttle({ default: { limit: 40, ttl: 60000 } }) // 40 reads per minute
  @Roles('admin', 'subadmin', 'aggregator', 'customer', 'super_admin')
  getCustomerById(@Param('uid') uid: string, @CurrentUser() user: CurrentUserType) {
    return this.customerService.findById(uid, user);
  }

  @Patch(':uid')
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 writes per minute
  @Roles('admin', 'subadmin', 'aggregator', 'customer', 'super_admin')
  updateCustomer(
    @Param('uid') uid: string,
    @Body() dto: UpdateCustomerDto,
    @CurrentUser() user: CurrentUserType
  ) {
    return this.customerService.update(uid, dto, user);
  }

  @Patch(':uid/ban')
  @Roles('admin', 'subadmin', 'super_admin')
  banCustomer(
    @Param('uid') uid: string,
    @Body('banned') banned: boolean,
    @CurrentUser() user: CurrentUserType
  ) {
    return this.customerService.banCustomer(uid, banned, user);
  }

  @Get(':uid/bookings')
  @Throttle({ default: { limit: 40, ttl: 60000 } }) // 40 reads per minute
  @Roles('admin', 'subadmin', 'aggregator', 'customer', 'super_admin')
  getCustomerBookings(
    @Param('uid') uid: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @CurrentUser() user: CurrentUserType
  ) {
    return this.customerService.getBookings(uid, user, parseInt(page), parseInt(limit));
  }

  @Get(':uid/farms')
  @Throttle({ default: { limit: 40, ttl: 60000 } }) // 40 reads per minute
  @Roles('admin', 'subadmin', 'aggregator', 'customer', 'super_admin')
  getCustomerFarms(
    @Param('uid') uid: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @CurrentUser() user: CurrentUserType
  ) {
    return this.customerService.getFarms(uid, user, parseInt(page), parseInt(limit));
  }

  @Get(':uid/support-tickets')
  @Throttle({ default: { limit: 40, ttl: 60000 } }) // 40 reads per minute
  @Roles('admin', 'subadmin', 'aggregator', 'customer', 'super_admin')
  getCustomerSupportTickets(
    @Param('uid') uid: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @CurrentUser() user: CurrentUserType
  ) {
    return this.customerService.getSupportTickets(uid, user, parseInt(page), parseInt(limit));
  }

  @Delete(':uid')
  @Roles('admin', 'super_admin')
  deleteCustomer(@Param('uid') uid: string, @CurrentUser() user: CurrentUserType) {
    return this.customerService.delete(uid, user);
  }

  @Get('debug/cache-stats')
  @Roles('admin', 'super_admin')
  getCacheStats() {
    return this.customerService.getCacheStats();
  }
}
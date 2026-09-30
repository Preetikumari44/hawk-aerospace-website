import { Controller, Get, Param, Query } from '@nestjs/common';

import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import type { CurrentUser as CurrentUserType } from '../../../common/interfaces/current-user.interface';
import { BookingHistoryService } from './booking-history.service';
import { BookingHistoryFilterDto } from './dto/booking-history-filter.dto';

@Controller('bookings/history')
export class BookingHistoryController {
  constructor(private readonly bookingHistoryService: BookingHistoryService) {}

  @Get()
  @Roles('customer')
  listOwnHistory(@CurrentUser() user: CurrentUserType, @Query() filter: BookingHistoryFilterDto) {
    return this.bookingHistoryService.listOwnHistory(user, filter);
  }

  @Get('stats')
  @Roles('admin')
  getStats() {
    return this.bookingHistoryService.getStats();
  }

  @Get('export')
  @Roles('admin')
  exportCsv(@Query() filter: BookingHistoryFilterDto) {
    return this.bookingHistoryService.exportCsv(filter);
  }

  @Get('customer/:uid')
  @Roles('admin', 'subadmin')
  listCustomerHistory(@Param('uid') uid: string, @Query() filter: BookingHistoryFilterDto) {
    return this.bookingHistoryService.listCustomerHistory(uid, filter);
  }

  @Get('pilot/:uid')
  @Roles('admin', 'vendor')
  listPilotHistory(@Param('uid') uid: string, @Query() filter: BookingHistoryFilterDto) {
    return this.bookingHistoryService.listPilotHistory(uid, filter);
  }

  @Get('vendor/:uid')
  @Roles('admin')
  listVendorHistory(@Param('uid') uid: string, @Query() filter: BookingHistoryFilterDto) {
    return this.bookingHistoryService.listVendorHistory(uid, filter);
  }

  @Get('aggregator/:uid')
  @Roles('admin')
  listAggregatorHistory(@Param('uid') uid: string, @Query() filter: BookingHistoryFilterDto) {
    return this.bookingHistoryService.listAggregatorHistory(uid, filter);
  }

  @Get(':id/timeline')
  getTimeline(@Param('id') bookingId: string) {
    return this.bookingHistoryService.getTimeline(bookingId);
  }
}

import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

import { BOOKING_STATUSES } from '../interfaces/booking-status.enum';

export class UpdateBookingStatusDto {
  @IsIn(BOOKING_STATUSES)
  status!: (typeof BOOKING_STATUSES)[number];

  @IsOptional()
  @IsString()
  @MaxLength(250)
  remarks?: string;
}

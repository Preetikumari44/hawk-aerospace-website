import { IsBoolean, IsOptional } from 'class-validator';

/**
 * DTO for updating aggregator notification preferences
 */
export class UpdateNotificationSettingsDto {
  @IsOptional()
  @IsBoolean()
  pushNotifications?: boolean;

  @IsOptional()
  @IsBoolean()
  smsNotifications?: boolean;

  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;

  @IsOptional()
  @IsBoolean()
  bookingUpdates?: boolean;

  @IsOptional()
  @IsBoolean()
  commissionUpdates?: boolean;

  @IsOptional()
  @IsBoolean()
  customerUpdates?: boolean;

  @IsOptional()
  @IsBoolean()
  settlementAlerts?: boolean;

  @IsOptional()
  @IsBoolean()
  marketingPromotions?: boolean;
}

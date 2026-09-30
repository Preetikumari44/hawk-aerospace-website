import { IsBoolean, IsOptional } from 'class-validator';

/**
 * Update notification preferences for a customer
 */
export class UpdateNotificationSettingsDto {
  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;

  @IsOptional()
  @IsBoolean()
  smsNotifications?: boolean;

  @IsOptional()
  @IsBoolean()
  pushNotifications?: boolean;

  @IsOptional()
  @IsBoolean()
  bookingUpdates?: boolean;

  @IsOptional()
  @IsBoolean()
  promotionalMessages?: boolean;

  @IsOptional()
  @IsBoolean()
  weatherAlerts?: boolean;

  @IsOptional()
  @IsBoolean()
  priceAlerts?: boolean;

  @IsOptional()
  @IsBoolean()
  missionUpdates?: boolean;
}

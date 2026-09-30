import { IsArray, IsEnum, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { NotificationChannel, NotificationPriority } from '../interfaces/notification-provider.interface';

export class NotificationTargetDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  userIds?: string[];

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  phones?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  emails?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fcmTokens?: string[];
}

export class NotificationRequestDto {
  @IsArray()
  @IsEnum(NotificationChannel, { each: true })
  channels!: NotificationChannel[];

  @ValidateNested()
  @Type(() => NotificationTargetDto)
  targets!: NotificationTargetDto;

  @IsEnum(NotificationPriority)
  priority!: NotificationPriority;

  @IsOptional()
  @IsString()
  template?: string; // template key (e.g., 'booking_confirmed')

  @IsOptional()
  @IsString()
  subject?: string; // if no template

  @IsOptional()
  @IsString()
  body?: string; // if no template

  @IsOptional()
  data?: Record<string, any>; // template variables
}

export interface NotificationResult {
  channel: NotificationChannel;
  sent: number;
  failed: number;
  messageId?: string;
  error?: string;
}

import { IsString, IsBoolean, IsOptional, IsArray, IsNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class NotificationMessageDto {
  @IsString()
  message: string;

  @IsString()
  timestamp: string;

  @IsBoolean()
  read: boolean;
}

export class NotificationDto {
  @IsString()
  id: string;

  @IsString()
  uid: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NotificationMessageDto)
  messages: NotificationMessageDto[];

  @IsString()
  createdAt: string;

  @IsString()
  updatedAt: string;
}

export class NotificationListResponseDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NotificationDto)
  items: NotificationDto[];

  @IsNumber()
  total: number;

  @IsNumber()
  page: number;

  @IsNumber()
  limit: number;

  @IsBoolean()
  hasMore: boolean;
}

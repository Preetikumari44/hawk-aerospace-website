import { IsArray, IsOptional, IsString } from 'class-validator';

export class SendNotificationDto {
  @IsString()
  title!: string;

  @IsString()
  message!: string;

  @IsOptional()
  @IsArray()
  userIds?: string[];

  @IsOptional()
  @IsString()
  role?: string;
}

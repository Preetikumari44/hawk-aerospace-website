import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';

export enum DevicePlatform {
  IOS = 'ios',
  ANDROID = 'android',
  WEB = 'web',
}

export class RegisterFcmTokenDto {
  @IsString()
  @IsNotEmpty()
  fcmToken!: string;

  @IsEnum(DevicePlatform)
  @IsOptional()
  platform?: DevicePlatform;

  @IsString()
  @IsOptional()
  deviceId?: string;

  @IsString()
  @IsOptional()
  deviceName?: string;
}

export class UnregisterFcmTokenDto {
  @IsString()
  @IsNotEmpty()
  fcmToken!: string;
}

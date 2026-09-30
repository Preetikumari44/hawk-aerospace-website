import { IsIn, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class AdminSettingsDto {
  @IsOptional()
  @IsIn(['light', 'dark', 'system'])
  theme?: 'light' | 'dark' | 'system';

  @IsOptional()
  @IsString()
  @MaxLength(32)
  language?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  timezone?: string;

  @IsOptional()
  @IsObject()
  featureFlags?: Record<string, boolean>;
}

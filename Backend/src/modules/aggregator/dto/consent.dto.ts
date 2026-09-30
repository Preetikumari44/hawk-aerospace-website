import { IsEnum, IsNotEmpty, IsOptional, IsString, IsBoolean } from 'class-validator';

export enum ConsentType {
  DATA_SHARING = 'data_sharing',
  MARKETING = 'marketing',
  SMS = 'sms',
  EMAIL = 'email',
  WHATSAPP = 'whatsapp',
  AGGREGATOR_LINKAGE = 'aggregator_linkage',
}

export enum ConsentStatus {
  PENDING = 'pending',
  GRANTED = 'granted',
  DENIED = 'denied',
  REVOKED = 'revoked',
}

export enum ConsentChannel {
  SMS = 'sms',
  EMAIL = 'email',
  IN_APP = 'in_app',
  MANUAL = 'manual',
}

export class RequestConsentDto {
  @IsString()
  @IsNotEmpty()
  customerId!: string;

  @IsEnum(ConsentType)
  @IsNotEmpty()
  consentType!: ConsentType;

  @IsEnum(ConsentChannel)
  @IsNotEmpty()
  channel!: ConsentChannel;

  @IsOptional()
  @IsString()
  message?: string;
}

export class UpdateConsentDto {
  @IsEnum(ConsentStatus)
  @IsNotEmpty()
  status!: ConsentStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ConsentFilterDto {
  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  aggregatorId?: string;

  @IsOptional()
  @IsEnum(ConsentType)
  consentType?: ConsentType;

  @IsOptional()
  @IsEnum(ConsentStatus)
  status?: ConsentStatus;
}

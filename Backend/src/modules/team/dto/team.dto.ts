import { IsOptional, IsString } from 'class-validator';

export class CreateInviteDto {
  @IsOptional()
  @IsString()
  pilotUid?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

export class CreateJoinRequestDto {
  @IsOptional()
  @IsString()
  fmUid?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

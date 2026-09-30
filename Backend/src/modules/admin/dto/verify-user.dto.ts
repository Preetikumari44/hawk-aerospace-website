import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class VerifyUserDto {
  @IsOptional()
  @IsBoolean()
  approved?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(250)
  remarks?: string;
}

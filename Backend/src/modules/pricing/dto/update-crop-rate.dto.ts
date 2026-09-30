import { Type } from 'class-transformer';
import { IsBoolean, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateCropRateDto {
  @IsString()
  cropType!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  baseRatePerAcre!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  chemicalSurcharge!: number;

  @IsOptional()
  @IsString()
  fleetManagerUid?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  active?: boolean;
}

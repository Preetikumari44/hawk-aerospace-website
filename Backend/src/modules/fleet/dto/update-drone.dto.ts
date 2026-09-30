import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

class DroneSpecsDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  payloadKg?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  flightTimeMin?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  batteryCapacity?: number;
}

export class UpdateDroneDto {
  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsIn(['spraying', 'seeding', 'monitoring', 'mapping', 'surveillance', 'videography', 'delivery'])
  type?: 'spraying' | 'seeding' | 'monitoring' | 'mapping' | 'surveillance' | 'videography' | 'delivery';

  @IsOptional()
  @ValidateNested()
  @Type(() => DroneSpecsDto)
  specs?: DroneSpecsDto;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  totalFlightHours?: number;
}

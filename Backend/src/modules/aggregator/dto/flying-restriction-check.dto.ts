import { IsNotEmpty, IsNumber, IsObject, Max, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class LocationDto {
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat!: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  lng!: number;
}

export class FlyingRestrictionCheckDto {
  @IsObject()
  @ValidateNested()
  @Type(() => LocationDto)
  @IsNotEmpty()
  location!: LocationDto;
}

export class WeatherCheckDto {
  @IsObject()
  @ValidateNested()
  @Type(() => LocationDto)
  @IsNotEmpty()
  location!: LocationDto;

  @IsNotEmpty()
  date!: string;
}

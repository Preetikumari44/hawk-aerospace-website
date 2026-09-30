import { IsArray, IsString, IsBoolean, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class CheckItem {
  @IsString()
  name!: string;

  @IsBoolean()
  passed!: boolean;

  @IsString()
  remarks?: string;
}

export class PreFlightCheckDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CheckItem)
  checks!: CheckItem[];

  @IsBoolean()
  allChecksPassed!: boolean;
}

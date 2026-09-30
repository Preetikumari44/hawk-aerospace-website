import { Type } from 'class-transformer';
import { IsNumber, IsString, Min } from 'class-validator';

export class RedeemDto {
  @IsString()
  itemRedeemed!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  points!: number;
}

import { Type } from 'class-transformer';
import { IsArray, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateTicketDetailsDto {
  @IsOptional()
  @IsString()
  diagnosis?: string;

  @IsOptional()
  @IsArray()
  parts?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  time?: number;
}

import { IsArray, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class PostMissionDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  areaActual!: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  photos?: string[];
}

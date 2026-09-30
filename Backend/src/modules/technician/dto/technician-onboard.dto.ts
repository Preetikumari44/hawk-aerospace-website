import { Type } from 'class-transformer';
import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';

class DocumentDto {
  @IsString()
  type!: string;

  @IsString()
  url!: string;
}

export class TechnicianOnboardDto {
  @IsArray()
  specializations!: string[];

  @IsOptional()
  @IsString()
  serviceRegion?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DocumentDto)
  documents!: DocumentDto[];
}

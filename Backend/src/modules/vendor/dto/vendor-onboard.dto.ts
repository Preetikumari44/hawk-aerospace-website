import { Type } from 'class-transformer';
import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';

class DocumentDto {
  @IsString()
  type!: string;

  @IsString()
  url!: string;
}

export class VendorOnboardDto {
  @IsString()
  businessName!: string;

  @IsOptional()
  @IsString()
  gstNumber?: string;

  @IsOptional()
  @IsArray()
  serviceRegions?: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DocumentDto)
  documents!: DocumentDto[];
}

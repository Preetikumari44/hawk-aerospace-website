import { Type } from 'class-transformer';
import { IsArray, IsString, ValidateNested } from 'class-validator';

class DocumentDto {
  @IsString()
  type!: string;

  @IsString()
  url!: string;
}

export class PilotOnboardDto {
  @IsString()
  vendorUid!: string;

  @IsArray()
  serviceTypes!: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DocumentDto)
  documents!: DocumentDto[];
}

import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';

import type { ServiceCatalogEntry } from '../data/service-catalog';

const SERVICE_TYPES: ServiceCatalogEntry['serviceType'][] = [
  'videography',
  'spraying',
  'monitoring',
  'mapping',
  'surveillance',
];

export class EstimateServiceDto {
  @IsIn(SERVICE_TYPES)
  serviceType!: ServiceCatalogEntry['serviceType'];

  @IsOptional()
  @IsString()
  key?: string;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  quantity?: number;

  @IsOptional()
  @IsString()
  scheduledDate?: string;

  @IsOptional()
  @IsString()
  preferredTime?: string;
}
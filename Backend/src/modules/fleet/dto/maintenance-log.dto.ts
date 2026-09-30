import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class MaintenanceLogDto {
  @IsIn([
    'battery_replacement',
    'firmware_update',
    'propeller',
    'motor',
    'calibration',
    'full_service',
  ])
  type!:
    | 'battery_replacement'
    | 'firmware_update'
    | 'propeller'
    | 'motor'
    | 'calibration'
    | 'full_service';

  @IsOptional()
  @IsIn(['scheduled', 'in_progress', 'completed'])
  status?: 'scheduled' | 'in_progress' | 'completed';

  @IsOptional()
  @IsString()
  technicianUid?: string;

  @IsOptional()
  @IsString()
  partsReplaced?: string;

  @IsOptional()
  @IsString()
  diagnosisNotes?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  timeTakenHours?: number;

  @IsOptional()
  @IsArray()
  evidenceMedia?: string[];

  @IsOptional()
  @IsDateString()
  scheduledDate?: string;
}

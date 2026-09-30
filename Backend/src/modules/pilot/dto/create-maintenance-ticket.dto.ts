import { IsString, IsIn, IsArray, IsOptional, MaxLength } from 'class-validator';
import type { TicketPriority } from '../../../database/firestore/contracts';

export class CreateMaintenanceTicketDto {
  @IsString()
  droneId!: string;

  @IsString()
  @MaxLength(100)
  category!: string;

  @IsString()
  @MaxLength(1000)
  description!: string;

  @IsIn(['low', 'medium', 'high', 'critical'])
  priority!: TicketPriority;

  @IsOptional()
  @IsString()
  missionId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  location?: string;

  @IsOptional()
  @IsString()
  dateTime?: string;

  @IsOptional()
  @IsString()
  fleetManagerUid?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  fleetManagerName?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mediaUrls?: string[];
}

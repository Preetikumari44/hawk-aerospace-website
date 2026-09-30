import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class DroneHealthCheckDto {
  @IsNotEmpty()
  @IsString()
  droneId!: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  totalFlightHours!: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  batteryCycles!: number;

  @IsOptional()
  @IsString()
  lastFlightDate?: string;

  @IsOptional()
  @IsString()
  lastMaintenanceDate?: string;

  @IsOptional()
  @IsString()
  insuranceExpiry?: string;

  @IsOptional()
  @IsString()
  registrationExpiry?: string;
}

export class TriggerMaintenanceDto {
  @IsNotEmpty()
  @IsString()
  droneId!: string;

  @IsNotEmpty()
  @IsIn(['scheduled', 'urgent', 'routine', 'emergency'])
  priority!: string;

  @IsNotEmpty()
  @IsString()
  reason!: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  technicianUid?: string;
}

export class DroneHealthResponseDto {
  droneId!: string;
  status!: 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'GROUNDED';
  score!: number; // 0-100
  issues!: Array<{
    type: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    message: string;
    requiresAction: boolean;
  }>;
  nextMaintenanceDue?: string;
  recommendations!: string[];
}

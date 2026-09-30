import { IsDateString, IsIn, IsOptional } from 'class-validator';

import { PaginationDto } from '../../../common/dto/pagination.dto';

export class IncidentFilterDto extends PaginationDto {
  @IsOptional()
  @IsIn(['drone_malfunction', 'pilot_emergency', 'crash', 'chemical_spill', 'customer_complaint'])
  type?:
    | 'drone_malfunction'
    | 'pilot_emergency'
    | 'crash'
    | 'chemical_spill'
    | 'customer_complaint';

  @IsOptional()
  @IsIn(['low', 'medium', 'high', 'critical'])
  severity?: 'low' | 'medium' | 'high' | 'critical';

  @IsOptional()
  @IsIn(['reported', 'investigating', 'resolved', 'escalated', 'closed'])
  status?: 'reported' | 'investigating' | 'resolved' | 'escalated' | 'closed';

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;
}

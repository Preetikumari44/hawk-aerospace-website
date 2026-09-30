import { IsDateString, IsIn, IsOptional, IsString } from 'class-validator';

import { PaginationDto } from '../../../common/dto/pagination.dto';

export class TicketFilterDto extends PaginationDto {
  @IsOptional()
  @IsIn(['open', 'assigned', 'in_progress', 'resolved', 'closed'])
  status?: 'open' | 'assigned' | 'in_progress' | 'resolved' | 'closed';

  @IsOptional()
  @IsString()
  droneId?: string;

  @IsOptional()
  @IsString()
  technicianUid?: string;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;
}

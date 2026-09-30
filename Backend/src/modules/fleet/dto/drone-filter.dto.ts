import { IsIn, IsOptional, IsString } from 'class-validator';

import { PaginationDto } from '../../../common/dto/pagination.dto';

export class DroneFilterDto extends PaginationDto {
  @IsOptional()
  @IsString()
  fleetManagerUid?: string;

  @IsOptional()
  @IsString()
  vendorUid?: string;

  @IsOptional()
  @IsIn(['deployable', 'assigned', 'under_maintenance', 'crashed'])
  status?: 'deployable' | 'assigned' | 'under_maintenance' | 'crashed';

  @IsOptional()
  @IsIn(['spraying', 'seeding', 'monitoring', 'mapping', 'surveillance', 'videography', 'delivery'])
  type?: 'spraying' | 'seeding' | 'monitoring' | 'mapping' | 'surveillance' | 'videography' | 'delivery';
}

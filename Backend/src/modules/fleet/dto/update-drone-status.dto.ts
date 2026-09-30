import { IsIn } from 'class-validator';

export class UpdateDroneStatusDto {
  @IsIn(['deployable', 'assigned', 'under_maintenance', 'crashed'])
  status!: 'deployable' | 'assigned' | 'under_maintenance' | 'crashed';
}

import { IsIn, IsString } from 'class-validator';

const SELF_SERVICE_ROLES = ['customer', 'aggregator', 'pilot', 'technician', 'vendor', 'fleet_manager'] as const;

export class SwitchRoleDto {
  @IsString()
  @IsIn(SELF_SERVICE_ROLES)
  role: typeof SELF_SERVICE_ROLES[number];
}

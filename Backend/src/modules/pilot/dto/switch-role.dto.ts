import { IsEnum } from 'class-validator';

export enum SwitchableRole {
  PILOT = 'pilot',
  FLEET_MANAGER = 'fleet_manager',
  VENDOR = 'vendor',
  TECHNICIAN = 'technician',
  CUSTOMER = 'customer',
}

export class SwitchRoleDto {
  @IsEnum(SwitchableRole)
  targetRole: SwitchableRole;
}

export interface AvailableRole {
  role: SwitchableRole;
  displayName: string;
  description: string;
  isActive: boolean;
}

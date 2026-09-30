import { IsObject } from 'class-validator';

export class UpdateSubAdminPermissionsDto {
  @IsObject()
  permissions!: Record<string, boolean>;
}

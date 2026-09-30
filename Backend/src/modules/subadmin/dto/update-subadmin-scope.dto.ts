import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateSubAdminScopeDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  assignedRegion?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  assignedDepartment?: string | null;
}

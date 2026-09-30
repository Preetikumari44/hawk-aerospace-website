import { PartialType, OmitType, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateAdminDto } from './create-admin.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { AdminStatus } from './admin-query.dto';

export class UpdateAdminDto extends PartialType(OmitType(CreateAdminDto, ['email'] as const)) {
  @ApiPropertyOptional({ enum: AdminStatus })
  @IsOptional()
  @IsEnum(AdminStatus)
  status?: AdminStatus;
}

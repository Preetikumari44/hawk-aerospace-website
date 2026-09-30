import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class ReviewRoleApplicationDto {
  @IsBoolean()
  approved!: boolean;

  @IsOptional()
  @IsString()
  remarks?: string;

  @IsOptional()
  @IsString()
  rejectionReason?: string;
}

export class RoleApplicationQueryDto {
  @IsOptional()
  @IsString()
  status?: 'pending' | 'approved' | 'rejected';

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  limit?: string;
}
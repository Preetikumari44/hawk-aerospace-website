import { IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateIncidentDto {
  @IsIn(['investigating', 'resolved', 'closed'])
  status!: 'investigating' | 'resolved' | 'closed';

  @IsOptional()
  @IsString()
  resolutionNotes?: string;
}

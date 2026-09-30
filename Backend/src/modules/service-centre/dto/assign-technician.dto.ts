import { IsIn, IsString } from 'class-validator';

export class AssignTechnicianDto {
  @IsString()
  technicianUid!: string;

  @IsIn(['low', 'medium', 'high', 'critical'])
  priority!: 'low' | 'medium' | 'high' | 'critical';
}

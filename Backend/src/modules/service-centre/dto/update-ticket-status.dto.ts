import { IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateTicketStatusDto {
  @IsIn(['open', 'assigned', 'in_progress', 'resolved', 'closed'])
  status!: 'open' | 'assigned' | 'in_progress' | 'resolved' | 'closed';

  @IsOptional()
  @IsString()
  remarks?: string;
}

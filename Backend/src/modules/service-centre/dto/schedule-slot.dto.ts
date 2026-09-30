import { IsDateString, IsString } from 'class-validator';

export class ScheduleSlotDto {
  @IsString()
  ticketId!: string;

  @IsString()
  technicianUid!: string;

  @IsDateString()
  date!: string;
}

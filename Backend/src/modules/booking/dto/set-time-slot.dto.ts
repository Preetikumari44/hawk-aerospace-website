import { IsIn } from 'class-validator';

export class SetTimeSlotDto {
  @IsIn(['morning', 'afternoon', 'evening'])
  preferredTimeSlot!: 'morning' | 'afternoon' | 'evening';
}

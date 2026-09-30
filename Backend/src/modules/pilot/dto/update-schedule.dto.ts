import { IsArray, ValidateNested, IsIn, IsString } from 'class-validator';
import { Type } from 'class-transformer';

class TimeSlot {
  @IsString()
  start!: string; // HH:MM format

  @IsString()
  end!: string; // HH:MM format
}

class DaySchedule {
  @IsIn(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])
  day!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TimeSlot)
  slots!: TimeSlot[];
}

export class UpdateScheduleDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DaySchedule)
  weeklySchedule!: DaySchedule[];
}

import { IsString, IsOptional, MaxLength, IsIn } from 'class-validator';

export class CreateComplaintDto {
  @IsString()
  @MaxLength(100)
  subject!: string;

  @IsString()
  @MaxLength(1000)
  description!: string;

  @IsOptional()
  @IsString()
  bookingId?: string;

  @IsIn(['payment', 'customer', 'equipment', 'safety', 'other'])
  category!: string;
}

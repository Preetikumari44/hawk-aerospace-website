import { Type } from 'class-transformer';
import { IsArray, IsIn, IsOptional, IsString } from 'class-validator';

export class CreateTicketDto {
  @IsString()
  droneId!: string;

  @IsString()
  category!: string;

  @IsString()
  description!: string;

  @IsOptional()
  @IsIn(['low', 'medium', 'high', 'critical'])
  priority?: 'low' | 'medium' | 'high' | 'critical';

  @IsOptional()
  @IsArray()
  @Type(() => String)
  mediaUrls?: string[];
}

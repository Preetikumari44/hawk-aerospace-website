import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignDroneDto {
  @ApiProperty({
    description: 'Drone ID to assign to the booking',
    example: 'DRN000001',
  })
  @IsString()
  @IsNotEmpty()
  droneId: string;

  @ApiProperty({
    description: 'Booking ID (optional - for backward compatibility with fleet.service.ts)',
    example: 'BK-2024-001',
    required: false,
  })
  @IsString()
  @IsOptional()
  bookingId?: string;
}

import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsPhoneNumber,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { CreateCustomerDto } from './create-customer.dto';

/**
 * Update Customer DTO
 * All fields from CreateCustomerDto are optional for updates.
 * Using PartialType automatically makes all fields optional.
 * 
 * Available fields:
 * - name?: string
 * - phone?: string (Indian phone number format)
 * - email?: string
 * - language?: string
 * - profileData?: { occupation, region, state, location }
 */
export class UpdateCustomerDto extends PartialType(CreateCustomerDto) {
  // All fields inherited from CreateCustomerDto are automatically optional
  // You can add update-specific fields here if needed
  
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  preferredLanguage?: string;
}
import { IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

/**
 * DTO for requesting account deletion
 */
export class DeleteAccountDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(10)
  reason: string;

  @IsOptional()
  @IsString()
  feedback?: string;
}

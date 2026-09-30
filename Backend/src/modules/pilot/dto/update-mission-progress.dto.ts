import { IsNotEmpty, IsNumber, IsString, Min, Max } from 'class-validator';

export class UpdateMissionProgressDto {
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsNotEmpty()
  progressPercentage!: number;

  @IsString()
  @IsNotEmpty()
  currentPhase!: string;
}

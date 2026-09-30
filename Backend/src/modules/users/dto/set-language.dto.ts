import { IsString, MaxLength } from 'class-validator';

export class SetLanguageDto {
  @IsString()
  @MaxLength(32)
  language!: string;
}

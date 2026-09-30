import { IsString } from 'class-validator';

export class FollowUpDto {
  @IsString()
  note!: string;
}

import { IsArray, IsString, IsUrl } from 'class-validator';

export class UploadMediaDto {
  @IsArray()
  @IsString({ each: true })
  @IsUrl({}, { each: true })
  mediaUrls!: string[];
}

import { Expose } from 'class-transformer';

export class FilterOptionsDto {
  @Expose()
  states: string[];

  @Expose()
  regions: string[];

  @Expose()
  occupations: string[];

  @Expose()
  regionsByState: Record<string, string[]>;
}

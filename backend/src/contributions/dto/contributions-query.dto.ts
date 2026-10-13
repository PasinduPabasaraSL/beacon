import { IsDateString, IsOptional } from 'class-validator';

export class ContributionsQueryDto {
  /** Any date within the requested week (YYYY-MM-DD); defaults to the current week. */
  @IsOptional()
  @IsDateString({ strict: true })
  week?: string;
}

import { PartialType } from '@nestjs/mapped-types';
import { ContributionType, TimesheetStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export const MAX_DAILY_HOURS = 24;

export class WeekDto {
  /** Any date within the week (YYYY-MM-DD). */
  @IsDateString({ strict: true })
  week!: string;
}

export class TimesheetQueryDto {
  /** Any date within the requested week (YYYY-MM-DD); defaults to the current week. */
  @IsOptional()
  @IsDateString({ strict: true })
  week?: string;
}

export class RowFieldsDto {
  @IsEnum(ContributionType)
  type!: ContributionType;

  /** `null` clears the linked task when updating. */
  @IsOptional()
  @IsUUID()
  taskId?: string | null;

  /** Required when the row has no task, so the row says what the work was. */
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class CreateRowDto extends RowFieldsDto {
  /** Any date within the week (YYYY-MM-DD). */
  @IsDateString({ strict: true })
  week!: string;
}

export class UpdateRowDto extends PartialType(RowFieldsDto) {}

export class SetDayDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(MAX_DAILY_HOURS)
  hours!: number;

  /** Omit to keep the current note; an empty string clears it. */
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(1000)
  note?: string;
}

export class LogTimeDto {
  /** The day the work happened (YYYY-MM-DD). */
  @IsDateString({ strict: true })
  date!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.25)
  @Max(MAX_DAILY_HOURS)
  hours!: number;

  @IsEnum(ContributionType)
  type!: ContributionType;

  @IsOptional()
  @IsUUID()
  taskId?: string | null;

  @Transform(trim)
  @IsString()
  @Length(1, 1000)
  note!: string;
}

export const REVIEW_DECISIONS = [
  TimesheetStatus.APPROVED,
  TimesheetStatus.CHANGES_REQUESTED,
] as const;

export class ReviewTimesheetDto {
  @IsIn(REVIEW_DECISIONS)
  status!: (typeof REVIEW_DECISIONS)[number];

  @Transform(trim)
  @ValidateIf(
    (dto: ReviewTimesheetDto) =>
      dto.status === TimesheetStatus.CHANGES_REQUESTED ||
      dto.comment !== undefined,
  )
  @IsString()
  @IsNotEmpty({ message: 'Explain what needs to change' })
  @MaxLength(1000)
  comment?: string;
}

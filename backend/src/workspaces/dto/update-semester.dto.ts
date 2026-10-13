import { SemesterBreakKind } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export const MAX_SEMESTER_WEEKS = 52;

export class SemesterBreakDto {
  /** Any date in the break week (YYYY-MM-DD). */
  @IsDateString({ strict: true })
  week!: string;

  @IsEnum(SemesterBreakKind)
  kind!: SemesterBreakKind;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(40)
  label?: string;
}

export class UpdateSemesterDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(60)
  name?: string;

  /** Any date in teaching week 1 (YYYY-MM-DD). */
  @IsDateString({ strict: true })
  startDate!: string;

  @IsInt()
  @Min(1)
  @Max(MAX_SEMESTER_WEEKS)
  weeks!: number;

  @IsArray()
  @ArrayMaxSize(MAX_SEMESTER_WEEKS)
  @ValidateNested({ each: true })
  @Type(() => SemesterBreakDto)
  breaks!: SemesterBreakDto[];
}

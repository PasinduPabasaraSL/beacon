import { PartialType } from '@nestjs/mapped-types';
import { ContributionReviewStatus, ContributionType } from '@prisma/client';
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

export const MAX_WEEKLY_HOURS = 168;

export class CreateContributionDto {
  /** Any date within the week the work belongs to (YYYY-MM-DD). */
  @IsDateString({ strict: true })
  week!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.25)
  @Max(MAX_WEEKLY_HOURS)
  hours!: number;

  @IsEnum(ContributionType)
  type!: ContributionType;

  /** `null` clears the linked task when updating. */
  @IsOptional()
  @IsUUID()
  taskId?: string | null;

  @Transform(trim)
  @IsString()
  @Length(1, 2000)
  description!: string;
}

export class UpdateContributionDto extends PartialType(CreateContributionDto) {}

export const REVIEW_DECISIONS = [
  ContributionReviewStatus.APPROVED,
  ContributionReviewStatus.CHANGES_REQUESTED,
] as const;

export class ReviewContributionDto {
  @IsIn(REVIEW_DECISIONS)
  status!: (typeof REVIEW_DECISIONS)[number];

  @Transform(trim)
  @ValidateIf(
    (dto: ReviewContributionDto) =>
      dto.status === ContributionReviewStatus.CHANGES_REQUESTED ||
      dto.comment !== undefined,
  )
  @IsString()
  @IsNotEmpty({ message: 'Explain what needs to change' })
  @MaxLength(1000)
  comment?: string;
}

import { PartialType } from '@nestjs/mapped-types';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateMilestoneDto {
  @Transform(trim)
  @IsString()
  @Length(1, 120)
  title!: string;

  /** `null` or an empty string clears it when updating. */
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(1000)
  description?: string | null;

  @IsDateString({ strict: true })
  dueDate!: string;
}

export class UpdateMilestoneDto extends PartialType(CreateMilestoneDto) {}

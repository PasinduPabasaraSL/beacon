import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export const MAX_PROJECT_NAME = 80;
export const MAX_TEAM_NAME = 80;
export const MAX_DESCRIPTION = 20_000;

/** Every field is optional; only the ones sent are changed. */
export class UpdateProjectProfileDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'The project needs a name' })
  @MaxLength(MAX_PROJECT_NAME)
  name?: string;

  /** The record book's group name; an empty string clears it. */
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(MAX_TEAM_NAME)
  teamName?: string;

  /** Markdown. */
  @IsOptional()
  @IsString()
  @MaxLength(MAX_DESCRIPTION)
  description?: string;

  /** An image data URL, or null to remove the logo. */
  @IsOptional()
  @IsString()
  logo?: string | null;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

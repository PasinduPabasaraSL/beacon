import { PartialType } from '@nestjs/mapped-types';
import { MeetingMode, MeetingPhase } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsDateString,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class UpdateRecordBookDetailsDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(120)
  moduleTitle?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(40)
  level?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(40)
  batch?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(120)
  groupName?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(120)
  department?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(120)
  faculty?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(120)
  university?: string;
}

export class SignRecordBookDto {
  /** Required for students who have not saved one yet. */
  @IsOptional()
  @Transform(trim)
  @IsString()
  @Matches(/^[A-Za-z0-9/-]{3,20}$/, {
    message: 'Use letters, digits, "-" or "/" for the registration number',
  })
  registrationNumber?: string;
}

export class CreateMeetingDto {
  @IsEnum(MeetingPhase)
  phase!: MeetingPhase;

  @IsEnum(MeetingMode)
  mode!: MeetingMode;

  @IsDateString({ strict: true })
  meetingDate!: string;

  @Transform(trim)
  @IsString()
  @Length(1, 4000)
  summary!: string;

  @IsArray()
  @ArrayNotEmpty({ message: 'Pick at least one group member' })
  @ArrayMaxSize(20)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  attendeeIds!: string[];
}

export class UpdateMeetingDto extends PartialType(CreateMeetingDto) {}

export const MEETING_DECISIONS = ['CERTIFIED', 'CHANGES_REQUESTED'] as const;

export class ReviewMeetingDto {
  @IsIn(MEETING_DECISIONS)
  decision!: (typeof MEETING_DECISIONS)[number];

  @Transform(trim)
  @ValidateIf(
    (dto: ReviewMeetingDto) =>
      dto.decision === 'CHANGES_REQUESTED' || dto.comment !== undefined,
  )
  @IsString()
  @IsNotEmpty({ message: 'Explain what needs to change' })
  @MaxLength(2000)
  comment?: string;
}

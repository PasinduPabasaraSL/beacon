import { SignatureMethod } from '@prisma/client';
import { IsEnum, IsString, MaxLength } from 'class-validator';

export class SaveSignatureDto {
  @IsEnum(SignatureMethod)
  method!: SignatureMethod;

  /** PNG or JPEG data URL; content and size are checked in the service. */
  @IsString()
  @MaxLength(300_000)
  image!: string;
}

import { BadRequestException } from '@nestjs/common';

export const MAX_SIGNATURE_BYTES = 200 * 1024;

const DATA_URL = /^data:image\/(png|jpeg);base64,([A-Za-z0-9+/]+={0,2})$/;

const MAGIC_BYTES: Record<string, number[]> = {
  png: [0x89, 0x50, 0x4e, 0x47],
  jpeg: [0xff, 0xd8, 0xff],
};

/** Rejects anything that is not a real PNG or JPEG data URL within the size limit. */
export function assertSignatureImage(dataUrl: string): void {
  const match = DATA_URL.exec(dataUrl);
  if (!match) {
    throw new BadRequestException('The signature must be a PNG or JPEG image');
  }
  const [, format, base64] = match;
  const bytes = Buffer.from(base64, 'base64');
  if (bytes.length > MAX_SIGNATURE_BYTES) {
    throw new BadRequestException(
      'The signature image must be 200 KB or smaller',
    );
  }
  if (!MAGIC_BYTES[format].every((byte, i) => bytes[i] === byte)) {
    throw new BadRequestException('The signature file is not a valid image');
  }
}

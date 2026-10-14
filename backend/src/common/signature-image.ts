import { BadRequestException } from '@nestjs/common';

export const MAX_SIGNATURE_BYTES = 200 * 1024;
export const MAX_LOGO_BYTES = 200 * 1024;

type ImageFormat = 'png' | 'jpeg' | 'webp';

const DATA_URL = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/;

const FORMAT_NAMES: Record<ImageFormat, string> = {
  png: 'PNG',
  jpeg: 'JPEG',
  webp: 'WebP',
};

function hasMagicBytes(format: ImageFormat, bytes: Buffer): boolean {
  const startsWith = (offset: number, magic: number[]) =>
    magic.every((byte, i) => bytes[offset + i] === byte);
  if (format === 'png') return startsWith(0, [0x89, 0x50, 0x4e, 0x47]);
  if (format === 'jpeg') return startsWith(0, [0xff, 0xd8, 0xff]);
  // RIFF....WEBP
  return (
    startsWith(0, [0x52, 0x49, 0x46, 0x46]) &&
    startsWith(8, [0x57, 0x45, 0x42, 0x50])
  );
}

/** Rejects anything that is not a real image of an allowed format within the size limit. */
export function assertImageDataUrl(
  dataUrl: string,
  {
    label,
    formats,
    maxBytes,
  }: { label: string; formats: ImageFormat[]; maxBytes: number },
): void {
  const names = formats.map((f) => FORMAT_NAMES[f]);
  const allowed =
    names.length > 1
      ? `${names.slice(0, -1).join(', ')} or ${names[names.length - 1]}`
      : names[0];
  const match = DATA_URL.exec(dataUrl);
  if (!match || !formats.includes(match[1] as ImageFormat)) {
    throw new BadRequestException(`The ${label} must be a ${allowed} image`);
  }
  const format = match[1] as ImageFormat;
  const bytes = Buffer.from(match[2], 'base64');
  if (bytes.length > maxBytes) {
    throw new BadRequestException(
      `The ${label} image must be ${Math.round(maxBytes / 1024)} KB or smaller`,
    );
  }
  if (!hasMagicBytes(format, bytes)) {
    throw new BadRequestException(`The ${label} file is not a valid image`);
  }
}

export function assertSignatureImage(dataUrl: string): void {
  assertImageDataUrl(dataUrl, {
    label: 'signature',
    formats: ['png', 'jpeg'],
    maxBytes: MAX_SIGNATURE_BYTES,
  });
}

export function assertLogoImage(dataUrl: string): void {
  assertImageDataUrl(dataUrl, {
    label: 'logo',
    formats: ['png', 'jpeg', 'webp'],
    maxBytes: MAX_LOGO_BYTES,
  });
}

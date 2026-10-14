import { loadImage } from '@/lib/signature'

const LOGO_SIZE = 256
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024
/** Matches the API limit (200 KB decoded) with headroom for base64. */
const MAX_DATA_URL_LENGTH = 270_000
export const LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp']

/** Centre-crops an uploaded image to a 256px square and exports it as WebP, or PNG where WebP isn't supported. */
export async function prepareLogo(file: File): Promise<string> {
  if (!LOGO_TYPES.includes(file.type)) {
    throw new Error('Upload a PNG, JPEG or WebP image')
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error('Upload an image smaller than 5 MB')
  }
  const image = await loadImage(file)
  const side = Math.min(image.naturalWidth, image.naturalHeight)
  const canvas = document.createElement('canvas')
  canvas.width = LOGO_SIZE
  canvas.height = LOGO_SIZE
  canvas
    .getContext('2d')!
    .drawImage(
      image,
      (image.naturalWidth - side) / 2,
      (image.naturalHeight - side) / 2,
      side,
      side,
      0,
      0,
      LOGO_SIZE,
      LOGO_SIZE,
    )

  const webp = canvas.toDataURL('image/webp', 0.9)
  const logo = webp.startsWith('data:image/webp')
    ? webp
    : canvas.toDataURL('image/png')
  if (logo.length > MAX_DATA_URL_LENGTH) {
    throw new Error('This image is too detailed. Try a simpler logo.')
  }
  return logo
}

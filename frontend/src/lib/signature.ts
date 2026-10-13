// Canvas helpers that turn drawn, typed and uploaded signatures into PNG data URLs.

export const SIGNATURE_FONT = '"Dancing Script", cursive'
export const SIGNATURE_INK = '#1e2a4a'

const MAX_WIDTH = 600
const MAX_HEIGHT = 200
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024
/** Matches the API limit (200 KB decoded) with headroom for base64. */
const MAX_DATA_URL_LENGTH = 270_000
/** Paper-white pixels above this luminance become transparent. */
const PAPER_LUMINANCE = 200

/** Bounding box of the non-transparent pixels, or null for a blank canvas. */
function inkBounds(canvas: HTMLCanvasElement) {
  const { width, height } = canvas
  const data = canvas.getContext('2d')!.getImageData(0, 0, width, height).data
  let top = height
  let left = width
  let right = -1
  let bottom = -1
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 0) {
        if (x < left) left = x
        if (x > right) right = x
        if (y < top) top = y
        if (y > bottom) bottom = y
      }
    }
  }
  return right < 0
    ? null
    : { x: left, y: top, width: right - left + 1, height: bottom - top + 1 }
}

/** Crops to the ink, scales into 600x200 and exports a PNG data URL. */
export function exportSignature(source: HTMLCanvasElement): string | null {
  const bounds = inkBounds(source)
  if (!bounds) return null

  const padding = 8
  const scale = Math.min(
    1,
    (MAX_WIDTH - padding * 2) / bounds.width,
    (MAX_HEIGHT - padding * 2) / bounds.height,
  )
  const output = document.createElement('canvas')
  output.width = Math.round(bounds.width * scale) + padding * 2
  output.height = Math.round(bounds.height * scale) + padding * 2
  output
    .getContext('2d')!
    .drawImage(
      source,
      bounds.x,
      bounds.y,
      bounds.width,
      bounds.height,
      padding,
      padding,
      output.width - padding * 2,
      output.height - padding * 2,
    )

  const png = output.toDataURL('image/png')
  if (png.length > MAX_DATA_URL_LENGTH) {
    throw new Error('This signature is too detailed. Try a simpler image.')
  }
  return png
}

export async function renderTypedSignature(name: string): Promise<string> {
  const fontSize = 96
  const font = `600 ${fontSize}px ${SIGNATURE_FONT}`
  await document.fonts.load(font, name)

  const canvas = document.createElement('canvas')
  canvas.width = MAX_WIDTH * 2
  canvas.height = MAX_HEIGHT
  const context = canvas.getContext('2d')!
  context.font = font
  context.fillStyle = SIGNATURE_INK
  context.textBaseline = 'middle'
  context.fillText(name, 16, MAX_HEIGHT / 2, canvas.width - 32)
  const image = exportSignature(canvas)
  if (!image) throw new Error('Type your name to create a signature')
  return image
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('That file could not be read as an image'))
    }
    image.src = url
  })
}

/**
 * Resizes an uploaded photo or scan and removes the paper background so the
 * signature sits cleanly on the record book page.
 */
export async function uploadedSignature(file: File): Promise<string> {
  if (!['image/png', 'image/jpeg'].includes(file.type)) {
    throw new Error('Upload a PNG or JPEG image')
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error('Upload an image smaller than 5 MB')
  }
  const image = await loadImage(file)
  const scale = Math.min(
    1,
    (MAX_WIDTH * 2) / image.naturalWidth,
    (MAX_HEIGHT * 2) / image.naturalHeight,
  )
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
  const context = canvas.getContext('2d')!
  context.drawImage(image, 0, 0, canvas.width, canvas.height)

  const pixels = context.getImageData(0, 0, canvas.width, canvas.height)
  const data = pixels.data
  for (let i = 0; i < data.length; i += 4) {
    const luminance =
      0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
    if (luminance > PAPER_LUMINANCE) data[i + 3] = 0
  }
  context.putImageData(pixels, 0, 0)

  const result = exportSignature(canvas)
  if (!result) throw new Error('No signature found in that image')
  return result
}

import { cn } from '@/lib/utils'

/** Dark ink on a transparent PNG; inverted in dark mode so it stays legible. */
export function SignatureImage({
  src,
  alt,
  className,
}: {
  src: string
  alt: string
  className?: string
}) {
  return (
    <img
      src={src}
      alt={alt}
      draggable={false}
      className={cn('max-h-14 w-auto object-contain dark:invert', className)}
    />
  )
}

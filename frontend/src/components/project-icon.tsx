import { hueFor } from '@/lib/hue'
import { cn } from '@/lib/utils'

const SIZES = {
  sm: 'size-5 rounded-[5px] text-[9px]',
  default: 'size-8 rounded-md text-[11px]',
  lg: 'size-11 rounded-lg text-sm',
  xl: 'size-20 rounded-2xl text-2xl',
}

/** First letters of the first two words, or the first two letters of a one-word name. */
function initialsFor(name: string, fallback: string): string {
  const [first = fallback, second] = name.match(/[\p{L}\p{N}]+/gu) ?? []
  const initials = second
    ? first.charAt(0) + second.charAt(0)
    : first.slice(0, 2)
  return initials.toUpperCase()
}

/** The project's uploaded logo, or a coloured tile with its name's initials. */
export function ProjectIcon({
  projectKey,
  name,
  logo,
  size = 'default',
  className,
}: {
  projectKey: string
  name: string
  logo?: string | null
  size?: keyof typeof SIZES
  className?: string
}) {
  if (logo) {
    return (
      <img
        src={logo}
        alt=""
        aria-hidden
        className={cn(
          'bg-card ring-border shrink-0 object-cover shadow-xs ring-1',
          SIZES[size],
          className,
        )}
      />
    )
  }
  return (
    <span
      aria-hidden
      className={cn(
        'flex shrink-0 items-center justify-center font-semibold tracking-tight text-white shadow-xs',
        SIZES[size],
        className,
      )}
      style={{ backgroundColor: `oklch(0.6 0.13 ${hueFor(projectKey)})` }}
    >
      {initialsFor(name, projectKey)}
    </span>
  )
}

import { hueFor } from '@/lib/hue'
import { cn } from '@/lib/utils'

const SIZES = {
  sm: 'size-5 rounded-[5px] text-[9px]',
  default: 'size-8 rounded-md text-[11px]',
  lg: 'size-11 rounded-lg text-sm',
}

export function ProjectIcon({
  projectKey,
  size = 'default',
  className,
}: {
  projectKey: string
  size?: keyof typeof SIZES
  className?: string
}) {
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
      {projectKey.slice(0, 2)}
    </span>
  )
}

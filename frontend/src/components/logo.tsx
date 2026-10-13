import { useId } from 'react'
import { cn } from '@/lib/utils'

/** The Beacon mark: a lamp casting an amber beam, on an ink tile. */
export function LogoMark({ className }: { className?: string }) {
  const gradientId = useId()
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden
      className={cn('size-8 shrink-0', className)}
    >
      <defs>
        <linearGradient
          id={gradientId}
          x1="12"
          x2="30"
          y1="16"
          y2="16"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#f5b13d" stopOpacity=".95" />
          <stop offset="1" stopColor="#f5b13d" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill="#141414" />
      <path fill={`url(#${gradientId})`} d="M12 16 30 8v16z" />
      <circle cx="11" cy="16" r="4.5" fill="#f5b13d" />
      <circle cx="11" cy="16" r="2" fill="#fff4dc" />
    </svg>
  )
}

export function LogoMark({ className = 'size-7' }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden>
      <defs>
        <linearGradient
          id="logo-beam"
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
      <path fill="url(#logo-beam)" d="M12 16 30 8v16z" />
      <circle cx="11" cy="16" r="4.5" fill="#f5b13d" />
      <circle cx="11" cy="16" r="2" fill="#fff4dc" />
    </svg>
  )
}

export function Logo() {
  return (
    <span className="flex items-center gap-2.5 text-lg font-semibold tracking-tight">
      <LogoMark />
      Beacon
    </span>
  )
}

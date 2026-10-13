const VARIANTS = {
  primary:
    'bg-ink text-white shadow-[0_8px_24px_-12px_rgb(0_0_0/0.6)] hover:bg-ink-soft',
  outline: 'border border-line bg-white text-ink hover:border-ink/25',
  light: 'bg-white text-ink hover:bg-beam-soft',
  ghost: 'border border-white/15 text-white hover:bg-white/10',
}

export function ButtonLink({
  href,
  variant = 'primary',
  className = '',
  children,
  ...props
}) {
  const external = href.startsWith('http')
  return (
    <a
      href={href}
      className={`inline-flex h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-beam focus-visible:ring-offset-2 focus-visible:outline-none ${VARIANTS[variant]} ${className}`}
      {...(external && { target: '_blank', rel: 'noreferrer' })}
      {...props}
    >
      {children}
    </a>
  )
}

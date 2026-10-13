import { useEffect, useState } from 'react'
import { ButtonLink } from '@/components/button'
import { GithubIcon } from '@/components/github-icon'
import { Logo } from '@/components/logo'
import { NAV_LINKS, REPO_URL } from '@/lib/site'

export function Header() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={`sticky top-0 z-50 transition-colors duration-300 ${
        scrolled
          ? 'border-b border-line bg-white/80 backdrop-blur-xl'
          : 'border-b border-transparent'
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-6">
        <a href="#top" aria-label="Beacon home">
          <Logo />
        </a>
        <nav
          aria-label="Main"
          className="hidden items-center gap-1 text-sm text-subtle md:flex"
        >
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-full px-3 py-1.5 transition-colors hover:bg-paper hover:text-ink"
            >
              {link.label}
            </a>
          ))}
        </nav>
        <ButtonLink href={REPO_URL} className="h-9 px-4">
          <GithubIcon />
          <span className="hidden sm:inline">View on</span> GitHub
        </ButtonLink>
      </div>
    </header>
  )
}

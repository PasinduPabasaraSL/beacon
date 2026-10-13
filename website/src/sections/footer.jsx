import { Logo } from '@/components/logo'
import {
  ISSUES_URL,
  LICENSE_URL,
  NAV_LINKS,
  README_URL,
  REPO_URL,
} from '@/lib/site'

const PROJECT_LINKS = [
  { href: REPO_URL, label: 'GitHub repository' },
  { href: README_URL, label: 'Documentation' },
  { href: ISSUES_URL, label: 'Issues' },
  { href: LICENSE_URL, label: 'MIT License' },
]

function LinkColumn({ title, links }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-medium">{title}</p>
      {links.map((link) => (
        <a
          key={link.href}
          href={link.href}
          className="text-sm text-subtle transition-colors hover:text-ink"
          {...(link.href.startsWith('http') && {
            target: '_blank',
            rel: 'noreferrer',
          })}
        >
          {link.label}
        </a>
      ))}
    </div>
  )
}

export function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 sm:grid-cols-[2fr_1fr_1fr]">
        <div className="flex flex-col gap-4">
          <Logo />
          <p className="max-w-sm text-sm leading-relaxed text-subtle">
            Open source project management for software teams and the people who
            guide them.
          </p>
        </div>
        <LinkColumn title="Product" links={NAV_LINKS} />
        <LinkColumn title="Project" links={PROJECT_LINKS} />
      </div>
      <div className="border-t border-line">
        <p className="mx-auto max-w-6xl px-6 py-6 text-xs text-subtle">
          © {new Date().getFullYear()} Beacon contributors. Released under the
          MIT License.
        </p>
      </div>
    </footer>
  )
}

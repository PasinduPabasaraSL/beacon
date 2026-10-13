export const REPO_URL = 'https://github.com/PasinduPabasaraSL/beacon'
export const LICENSE_URL = `${REPO_URL}/blob/main/LICENSE`
export const ISSUES_URL = `${REPO_URL}/issues`
export const README_URL = `${REPO_URL}#readme`

export const NAV_LINKS = [
  { href: '#features', label: 'Features' },
  { href: '#record-book', label: 'Record book' },
  { href: '#how-it-works', label: 'How it works' },
  { href: '#tour', label: 'Tour' },
  { href: '#open-source', label: 'Open source' },
]

export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

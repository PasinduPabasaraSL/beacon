import { Check, Copy, Scale, Users } from 'lucide-react'
import { useState } from 'react'
import { ButtonLink } from '@/components/button'
import { GithubIcon } from '@/components/github-icon'
import { Reveal } from '@/components/reveal'
import { ISSUES_URL, LICENSE_URL, REPO_URL } from '@/lib/site'

const COMMANDS = [
  `git clone ${REPO_URL}.git`,
  'cd beacon && cp .env.example .env',
  'docker compose up --build',
]

const STACK = [
  'React',
  'TypeScript',
  'Tailwind CSS',
  'shadcn/ui',
  'NestJS',
  'Prisma',
  'PostgreSQL',
  'Docker',
  'Playwright',
]

function QuickStart() {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    await navigator.clipboard.writeText(COMMANDS.join('\n'))
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/40">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
        <span className="text-xs text-white/50">Run it locally</span>
        <button
          type="button"
          onClick={copy}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-beam focus-visible:outline-none"
        >
          {copied ? (
            <Check className="size-3.5" />
          ) : (
            <Copy className="size-3.5" />
          )}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="overflow-x-auto p-5 font-mono text-sm leading-7 text-white/90">
        {COMMANDS.map((command) => (
          <div key={command}>
            <span className="text-beam select-none">$ </span>
            {command}
          </div>
        ))}
      </pre>
    </div>
  )
}

export function OpenSource() {
  return (
    <section id="open-source" className="mx-auto max-w-6xl px-6 pb-24 sm:pb-32">
      <Reveal>
        <div className="relative overflow-hidden rounded-4xl bg-ink px-8 py-14 text-white sm:px-14 sm:py-20">
          <div
            aria-hidden
            className="absolute -top-40 -right-40 size-136 animate-pulse-light rounded-full bg-beam/25 blur-3xl"
          />
          <div
            aria-hidden
            className="absolute inset-0 bg-[linear-gradient(rgb(255_255_255/0.04)_1px,transparent_1px),linear-gradient(90deg,rgb(255_255_255/0.04)_1px,transparent_1px)] mask-[radial-gradient(ellipse_at_top_right,black,transparent_70%)] bg-size-[44px_44px]"
          />

          <div className="relative grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-center">
            <div className="flex flex-col gap-6">
              <p className="flex items-center gap-2 text-xs font-semibold tracking-[0.18em] text-beam uppercase">
                <span className="size-1.5 rounded-full bg-beam" />
                Open source
              </p>
              <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
                Free, open source and yours to run
              </h2>
              <p className="text-lg leading-relaxed text-white/70">
                Beacon is released under the MIT License. Use it, self-host it,
                adapt it to your faculty or company, and contribute back. No
                accounts, no fees, no lock-in.
              </p>
              <ul className="flex flex-col gap-3 text-white/80">
                <li className="flex items-center gap-3">
                  <Scale className="size-4 text-beam" /> MIT licensed, free for
                  any use
                </li>
                <li className="flex items-center gap-3">
                  <GithubIcon className="size-4 text-beam" /> Developed in the
                  open on GitHub
                </li>
                <li className="flex items-center gap-3">
                  <Users className="size-4 text-beam" />
                  <a
                    href={ISSUES_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="underline decoration-white/30 underline-offset-4 transition-colors hover:decoration-beam"
                  >
                    Issues, ideas and pull requests welcome
                  </a>
                </li>
              </ul>
              <div className="flex flex-wrap gap-3 pt-2">
                <ButtonLink href={REPO_URL} variant="light">
                  <GithubIcon /> View the source
                </ButtonLink>
                <ButtonLink href={LICENSE_URL} variant="ghost">
                  Read the license
                </ButtonLink>
              </div>
            </div>

            <div className="flex flex-col gap-6">
              <QuickStart />
              <div>
                <p className="mb-3 text-sm text-white/50">Built with</p>
                <div className="flex flex-wrap gap-2">
                  {STACK.map((tool) => (
                    <span
                      key={tool}
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-white/80"
                    >
                      {tool}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  )
}

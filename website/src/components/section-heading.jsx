import { Reveal } from '@/components/reveal'

export function SectionHeading({ eyebrow, title, children, align = 'center' }) {
  return (
    <Reveal
      className={`flex max-w-2xl flex-col gap-4 ${
        align === 'center' ? 'mx-auto items-center text-center' : ''
      }`}
    >
      <p className="flex items-center gap-2 text-xs font-semibold tracking-[0.18em] text-beam-deep uppercase">
        <span className="size-1.5 rounded-full bg-beam" />
        {eyebrow}
      </p>
      <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
        {title}
      </h2>
      {children && (
        <p className="text-lg leading-relaxed text-pretty text-subtle">
          {children}
        </p>
      )}
    </Reveal>
  )
}

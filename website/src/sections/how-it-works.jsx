import { BadgeCheck, ListTodo, NotebookPen } from 'lucide-react'
import { Reveal } from '@/components/reveal'
import { SectionHeading } from '@/components/section-heading'
import { TiltCard } from '@/components/tilt-card'

const STEPS = [
  {
    icon: ListTodo,
    title: 'Plan the work',
    text: 'Set up the board, sprints and milestones. The timeline shows which week of the term or release cycle you are in.',
  },
  {
    icon: NotebookPen,
    title: 'Log and check in',
    text: 'Members log their weekly hours. After each update or meeting, the team adds a record book entry.',
  },
  {
    icon: BadgeCheck,
    title: 'Review and certify',
    text: 'The supervisor approves hours, signs entries or asks for changes. The record stays complete and printable.',
  },
]

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="mx-auto max-w-6xl px-6 py-24 sm:py-32"
    >
      <SectionHeading eyebrow="How it works" title="Three steps, every week">
        A simple rhythm that keeps the team and its supervisor in sync, even
        when they can't meet.
      </SectionHeading>

      <div className="relative mt-16">
        <div
          aria-hidden
          className="absolute top-12 right-[16%] left-[16%] hidden h-px bg-gradient-to-r from-transparent via-beam to-transparent md:block"
        />
        <ol className="relative grid gap-5 md:grid-cols-3">
          {STEPS.map(({ icon: Icon, title, text }, index) => (
            <Reveal as="li" key={title} delay={index * 120}>
              <TiltCard className="p-7">
                <div className="flex items-center justify-between">
                  <span className="flex size-12 items-center justify-center rounded-2xl bg-ink text-white shadow-[0_10px_30px_-10px_rgb(0_0_0/0.5)]">
                    <Icon className="size-5" />
                  </span>
                  <span className="font-mono text-sm text-subtle">
                    0{index + 1}
                  </span>
                </div>
                <h3 className="mt-6 text-lg font-semibold tracking-tight">
                  {title}
                </h3>
                <p className="mt-2 leading-relaxed text-subtle">{text}</p>
              </TiltCard>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  )
}

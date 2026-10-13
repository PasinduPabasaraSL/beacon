import { Check } from 'lucide-react'
import { Reveal } from '@/components/reveal'
import { SectionHeading } from '@/components/section-heading'
import { TiltCard } from '@/components/tilt-card'

const AUDIENCES = [
  {
    title: 'For team members',
    points: [
      'A personal week view with tasks, hours and feedback',
      'Log effort honestly, linked to the task it went into',
      'Record online updates when meetings are not possible',
      'Sign the record book once, reuse the signature',
    ],
  },
  {
    title: 'For supervisors, leads and mentors',
    points: [
      'One queue for every team you guide',
      'Approve hours in bulk or send them back with a note',
      'Certify meeting records with a stored digital signature',
      'Print the full record book for assessment or audits',
    ],
  },
]

const USE_CASES = [
  'University capstone projects',
  'Bootcamps and cohorts',
  'Internship programmes',
  'Small product teams',
]

export function Audiences() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
      <SectionHeading
        eyebrow="Who it's for"
        title="Built for teams that answer to someone"
      >
        Wherever a team works under a supervisor, mentor or lead, Beacon keeps
        progress visible and accountability on record.
      </SectionHeading>

      <div className="mt-16 grid gap-5 md:grid-cols-2">
        {AUDIENCES.map((audience, index) => (
          <Reveal key={audience.title} delay={index * 100}>
            <TiltCard className="p-8">
              <h3 className="text-xl font-semibold tracking-tight">
                {audience.title}
              </h3>
              <ul className="mt-6 flex flex-col gap-3.5">
                {audience.points.map((point) => (
                  <li key={point} className="flex gap-3 text-ink-soft">
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-beam-soft text-beam-deep">
                      <Check className="size-3.5" strokeWidth={3} />
                    </span>
                    {point}
                  </li>
                ))}
              </ul>
            </TiltCard>
          </Reveal>
        ))}
      </div>

      <Reveal className="mt-10 flex flex-wrap justify-center gap-2">
        {USE_CASES.map((useCase) => (
          <span
            key={useCase}
            className="rounded-full border border-line px-4 py-1.5 text-sm text-subtle"
          >
            {useCase}
          </span>
        ))}
      </Reveal>
    </section>
  )
}

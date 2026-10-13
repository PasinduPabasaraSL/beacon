import { Lock, MonitorSmartphone, Printer, Users } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import printDetails from '@/assets/screens/print-details.webp'
import printPhase from '@/assets/screens/print-phase.webp'
import { Reveal } from '@/components/reveal'
import { SectionHeading } from '@/components/section-heading'

const POINTS = [
  {
    icon: MonitorSmartphone,
    title: 'Online update',
    text: "Can't meet this week? Share progress through Beacon and the supervisor responds and signs online.",
  },
  {
    icon: Users,
    title: 'In-person meeting',
    text: 'Met face to face? Record who attended, what was discussed and the agreed next steps.',
  },
  {
    icon: Lock,
    title: 'Certified and locked',
    text: 'The supervisor certifies with their signature or asks for changes. Certified entries cannot be edited.',
  },
  {
    icon: Printer,
    title: 'Paper-ready',
    text: 'Cover, details page and six slots per phase, laid out like the paper book. Print or save as PDF.',
  },
]

/** A hardcover book in CSS 3D. The cover swings open when it scrolls into view. */
function Book3D() {
  const ref = useRef(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    const observer = new IntersectionObserver(
      ([entry]) => setOpen(entry.isIntersecting),
      { threshold: 0.6 },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className="group relative mx-auto flex aspect-[4/5] w-full max-w-md items-center justify-center perspective-[1800px]"
      onPointerEnter={() => setOpen(true)}
    >
      <div
        aria-hidden
        className="absolute inset-x-8 bottom-6 h-10 rounded-[50%] bg-ink/20 blur-2xl"
      />
      <div
        className="relative h-[86%] w-[64%] transition-transform duration-1000 ease-out transform-3d"
        style={{
          transform: open
            ? 'translateX(37.5%) scale(0.75) rotateX(24deg)'
            : 'rotateX(18deg) rotateY(-32deg) rotateZ(3deg)',
        }}
      >
        {/* Page block: the printed phase page and its paper edges. */}
        <div
          className="absolute inset-0 overflow-hidden rounded-r-md border border-line bg-white shadow-[0_30px_60px_-30px_rgb(0_0_0/0.4)]"
          style={{ transform: 'translateZ(-14px)' }}
        >
          <img
            src={printPhase}
            alt="Printed record book page for phase A with a certified meeting"
            loading="lazy"
            className="size-full object-cover object-top"
          />
        </div>
        <div
          className="absolute inset-y-1 right-0 w-[14px] origin-right bg-[repeating-linear-gradient(90deg,#f4f1ea,#f4f1ea_1px,#e7e2d6_1px,#e7e2d6_2px)]"
          style={{ transform: 'rotateY(90deg)' }}
        />

        {/* Spine. */}
        <div
          className="absolute inset-y-0 left-0 w-[28px] origin-left rounded-l-sm bg-ink"
          style={{ transform: 'rotateY(-90deg) translateX(-14px)' }}
        />

        {/* Front cover, hinged on the left. */}
        <div
          className="absolute inset-0 origin-left transition-transform duration-[1400ms] ease-[cubic-bezier(0.3,0.7,0.2,1)] transform-3d"
          style={{
            transform: open
              ? 'translateZ(0) rotateY(-172deg)'
              : 'translateZ(0) rotateY(0deg)',
          }}
        >
          <div className="absolute inset-0 flex flex-col justify-between overflow-hidden rounded-r-md bg-ink p-[9%] text-white backface-hidden">
            <div
              aria-hidden
              className="absolute -top-1/3 -right-1/3 size-[90%] rounded-full bg-beam/30 blur-3xl"
            />
            <div className="relative flex flex-col gap-1 text-[10px] tracking-[0.2em] text-white/60 uppercase">
              <span>Software development project</span>
              <span>Level 02</span>
            </div>
            <div className="relative">
              <div className="mb-4 h-px w-12 bg-beam" />
              <p className="text-2xl leading-tight font-semibold tracking-tight">
                Supervisor meeting record book
              </p>
              <p className="mt-3 text-xs text-white/60">
                Group 07 · Beacon Capstone
              </p>
            </div>
          </div>
          <div
            className="absolute inset-0 flex flex-col justify-between overflow-hidden rounded-l-md border border-line bg-white backface-hidden"
            style={{ transform: 'rotateY(180deg)' }}
          >
            <img
              src={printDetails}
              alt="Printed record book details page with member signatures"
              loading="lazy"
              className="w-full"
            />
            <div className="flex flex-col gap-2 p-[8%] text-[10px] text-subtle">
              <span className="h-px w-full bg-line" />
              <span>Digitally kept with Beacon</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function RecordBook() {
  return (
    <section
      id="record-book"
      className="relative overflow-hidden border-y border-line bg-paper"
    >
      <div className="mx-auto grid max-w-6xl items-center gap-16 px-6 py-24 sm:py-32 lg:grid-cols-[1.05fr_1fr]">
        <Book3D />
        <div className="flex flex-col gap-10">
          <SectionHeading
            align="start"
            eyebrow="Record book"
            title="Every supervisor check-in, signed and on record"
          >
            Busy schedules make regular meetings hard. Beacon keeps supervision
            continuous, with a digital meeting record book modelled on the paper
            books universities already use.
          </SectionHeading>
          <ul className="grid gap-6 sm:grid-cols-2">
            {POINTS.map(({ icon: Icon, title, text }, index) => (
              <Reveal as="li" key={title} delay={index * 70}>
                <div className="flex items-center gap-2 font-medium">
                  <Icon className="size-4 text-beam-deep" />
                  {title}
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-subtle">
                  {text}
                </p>
              </Reveal>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}

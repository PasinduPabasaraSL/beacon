import {
  BookOpenCheck,
  CalendarRange,
  ClipboardCheck,
  Clock,
  KanbanSquare,
  PenLine,
} from 'lucide-react'
import recordBook from '@/assets/screens/record-book.webp'
import reviews from '@/assets/screens/reviews.webp'
import { Reveal } from '@/components/reveal'
import { SectionHeading } from '@/components/section-heading'
import { SignatureStroke } from '@/components/signature-stroke'
import { TiltCard } from '@/components/tilt-card'

function CardText({ icon: Icon, title, children }) {
  return (
    <div className="relative flex flex-col gap-2 p-7">
      <span className="mb-2 flex size-10 items-center justify-center rounded-xl border border-line bg-paper text-ink">
        <Icon className="size-5" />
      </span>
      <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
      <p className="leading-relaxed text-subtle">{children}</p>
    </div>
  )
}

function Screenshot({ src, alt }) {
  return (
    <div className="relative mt-auto px-7">
      <div className="translate-y-2 overflow-hidden rounded-t-xl border border-b-0 border-line shadow-[0_-10px_40px_-20px_rgb(0_0_0/0.25)] transition-transform duration-500 group-hover:translate-y-0">
        <img
          src={src}
          alt={alt}
          loading="lazy"
          width={1920}
          height={1200}
          className="block w-full"
        />
      </div>
    </div>
  )
}

const HOURS = [3, 5.5, 4, 6.5, 2.5, 7, 4.5]

function HoursChart() {
  return (
    <div className="mt-auto flex h-28 items-end gap-2 px-7 pb-7" aria-hidden>
      {HOURS.map((hours, index) => (
        <div key={index} className="flex flex-1 flex-col items-center gap-1.5">
          <div
            className={`w-full origin-bottom rounded-md transition-transform duration-500 group-hover:scale-y-110 ${
              index === HOURS.length - 2 ? 'bg-beam' : 'bg-ink/10'
            }`}
            style={{
              height: `${hours * 12}px`,
              transitionDelay: `${index * 40}ms`,
            }}
          />
          <span className="text-[10px] text-subtle">W{index + 1}</span>
        </div>
      ))}
    </div>
  )
}

const WEEKS = Array.from({ length: 14 }, (_, i) =>
  i === 3 ? 'break' : i === 13 ? 'exam' : 'week',
)

function SemesterStrip() {
  return (
    <div className="mt-auto px-7 pb-7" aria-hidden>
      <div className="flex gap-1">
        {WEEKS.map((kind, index) => (
          <div
            key={index}
            className={`relative h-9 flex-1 rounded-md ${
              kind === 'break'
                ? 'bg-[repeating-linear-gradient(45deg,var(--color-line),var(--color-line)_3px,white_3px,white_6px)]'
                : kind === 'exam'
                  ? 'bg-ink/80'
                  : index === 6
                    ? 'bg-beam'
                    : 'bg-ink/8'
            }`}
          >
            {(index === 2 || index === 8 || index === 12) && (
              <span className="absolute -top-2 left-1/2 size-2 -translate-x-1/2 rotate-45 rounded-[2px] bg-ink" />
            )}
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-subtle">
        <span>Week 1</span>
        <span>Break</span>
        <span>Exams</span>
      </div>
    </div>
  )
}

const COLUMNS = [
  { name: 'Todo', cards: 2 },
  { name: 'In progress', cards: 3 },
  { name: 'QA', cards: 1 },
  { name: 'Done', cards: 2 },
]

function MiniBoard() {
  return (
    <div className="mt-auto grid grid-cols-4 gap-2 px-7 pb-7" aria-hidden>
      {COLUMNS.map((column, columnIndex) => (
        <div key={column.name} className="flex flex-col gap-1.5">
          <span className="truncate text-[10px] font-medium text-subtle">
            {column.name}
          </span>
          {Array.from({ length: column.cards }, (_, i) => (
            <div
              key={i}
              className="h-7 rounded-md border border-line bg-white shadow-sm transition-transform duration-500 group-hover:-translate-y-0.5"
              style={{ transitionDelay: `${(columnIndex + i) * 50}ms` }}
            >
              <div
                className={`mx-2 mt-2 h-1.5 rounded-full ${
                  columnIndex === 1 && i === 0 ? 'bg-beam' : 'bg-ink/10'
                }`}
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

export function Features() {
  return (
    <section id="features" className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
      <SectionHeading
        eyebrow="Features"
        title="Everything a project team needs, nothing it doesn't"
      >
        Beacon covers the work between planning and review: what is being built,
        who did what, and what the supervisor signed off.
      </SectionHeading>

      <div className="mt-16 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        <Reveal className="md:col-span-2">
          <TiltCard className="flex flex-col">
            <CardText
              icon={BookOpenCheck}
              title="Supervisor meeting record book"
            >
              A digital record of every online update and in-person meeting,
              grouped by project phase and certified by the supervisor. View it
              on the web or print it as a paper-style A4 book.
            </CardText>
            <Screenshot
              src={recordBook}
              alt="Record book with certified meetings"
            />
          </TiltCard>
        </Reveal>

        <Reveal delay={80}>
          <TiltCard className="flex flex-col">
            <CardText icon={PenLine} title="Digital signatures">
              Supervisors upload, draw or type a signature once. A copy is
              stamped on every entry they certify, and the entry is locked.
            </CardText>
            <div className="mt-auto flex flex-col items-center gap-4 px-7 pb-7">
              <SignatureStroke className="h-20 w-full text-[#1e2a4a]" />
              <div className="flex gap-2 text-xs">
                {['Upload', 'Draw', 'Type'].map((method) => (
                  <span
                    key={method}
                    className="rounded-full border border-line px-3 py-1 text-subtle"
                  >
                    {method}
                  </span>
                ))}
              </div>
            </div>
          </TiltCard>
        </Reveal>

        <Reveal>
          <TiltCard className="flex flex-col">
            <CardText icon={Clock} title="Weekly check-ins">
              Members log the hours they actually spent, by type and task.
              Effort is self-reported; commits are never counted as hours.
            </CardText>
            <HoursChart />
          </TiltCard>
        </Reveal>

        <Reveal delay={80}>
          <TiltCard className="flex flex-col">
            <CardText icon={ClipboardCheck} title="One review queue">
              Supervisors and leads see pending hours and meeting records across
              every team, approve in bulk or send work back with a note.
            </CardText>
            <Screenshot src={reviews} alt="Review queue across teams" />
          </TiltCard>
        </Reveal>

        <Reveal delay={160}>
          <TiltCard className="flex flex-col">
            <CardText icon={CalendarRange} title="Timeline and milestones">
              A shared calendar of working weeks, breaks and exam or release
              weeks, with milestones that track their linked tasks.
            </CardText>
            <SemesterStrip />
          </TiltCard>
        </Reveal>

        <Reveal className="md:col-span-2 lg:col-span-3">
          <TiltCard className="grid md:grid-cols-[1fr_1.1fr]">
            <CardText
              icon={KanbanSquare}
              title="Boards, sprints and dependencies"
            >
              Custom columns mapped to fixed status categories, sprints with
              goals, priorities, assignees, due dates and blocking tasks. A
              personal "My week" page shows each person what to do next.
            </CardText>
            <MiniBoard />
          </TiltCard>
        </Reveal>
      </div>
    </section>
  )
}

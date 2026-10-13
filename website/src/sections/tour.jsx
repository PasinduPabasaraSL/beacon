import { useState } from 'react'
import addEntry from '@/assets/screens/add-entry.webp'
import board from '@/assets/screens/board.webp'
import certify from '@/assets/screens/certify.webp'
import myWeek from '@/assets/screens/my-week.webp'
import recordBook from '@/assets/screens/record-book.webp'
import reviews from '@/assets/screens/reviews.webp'
import signature from '@/assets/screens/signature.webp'
import timeline from '@/assets/screens/timeline.webp'
import { BrowserFrame } from '@/components/browser-frame'
import { Reveal } from '@/components/reveal'
import { SectionHeading } from '@/components/section-heading'

const SCREENS = [
  {
    id: 'record-book',
    label: 'Record book',
    src: recordBook,
    url: 'beacon / projects / bcn / record-book',
    caption:
      'The details page and phases A to D, with each entry certified by the supervisor.',
  },
  {
    id: 'add-entry',
    label: 'Add entry',
    src: addEntry,
    url: 'beacon / projects / bcn / record-book',
    caption:
      'Choose online update or in-person meeting, then the phase, date, people and summary.',
  },
  {
    id: 'certify',
    label: 'Certify',
    src: certify,
    url: 'beacon / projects / bcn / record-book',
    caption:
      'Supervisors preview their signature, add remarks and certify in one step.',
  },
  {
    id: 'signature',
    label: 'Signature',
    src: signature,
    url: 'beacon / my-signature',
    caption:
      'Draw, type in a script font, or upload a photo. The paper background is removed.',
  },
  {
    id: 'reviews',
    label: 'Reviews',
    src: reviews,
    url: 'beacon / reviews',
    caption:
      'Meeting records and weekly hours waiting for review across every team.',
  },
  {
    id: 'my-week',
    label: 'My week',
    src: myWeek,
    url: 'beacon / me',
    caption:
      'Each member sees this week’s hours, feedback, open tasks and what is due next.',
  },
  {
    id: 'timeline',
    label: 'Timeline',
    src: timeline,
    url: 'beacon / projects / bcn / timeline',
    caption: 'Working weeks, breaks and milestones with task progress.',
  },
  {
    id: 'board',
    label: 'Board',
    src: board,
    url: 'beacon / projects / bcn / board',
    caption: 'Custom columns, sprints, priorities and blocked tasks.',
  },
]

export function Tour() {
  const [activeId, setActiveId] = useState(SCREENS[0].id)
  const active = SCREENS.find((screen) => screen.id === activeId)

  return (
    <section
      id="tour"
      className="relative overflow-hidden border-y border-line bg-paper"
    >
      <div className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
        <SectionHeading eyebrow="Product tour" title="See Beacon in action">
          Real screens from the app, running the demo workspace.
        </SectionHeading>

        <Reveal className="mt-12">
          <div
            role="tablist"
            aria-label="Beacon screens"
            className="mx-auto flex max-w-full gap-1 overflow-x-auto rounded-full border border-line bg-white p-1 sm:w-fit"
          >
            {SCREENS.map((screen) => (
              <button
                key={screen.id}
                type="button"
                role="tab"
                id={`tab-${screen.id}`}
                aria-selected={screen.id === activeId}
                aria-controls="tour-panel"
                onClick={() => setActiveId(screen.id)}
                className={`shrink-0 rounded-full px-4 py-2 text-sm whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-beam focus-visible:outline-none ${
                  screen.id === activeId
                    ? 'bg-ink text-white'
                    : 'text-subtle hover:text-ink'
                }`}
              >
                {screen.label}
              </button>
            ))}
          </div>

          <div
            id="tour-panel"
            role="tabpanel"
            aria-labelledby={`tab-${activeId}`}
            className="mt-10 perspective-[2000px]"
          >
            <BrowserFrame
              key={active.id}
              src={active.src}
              alt={`${active.label} screen in Beacon`}
              url={active.url}
              className="animate-flip-in"
            />
            <p className="mt-6 text-center text-subtle">{active.caption}</p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

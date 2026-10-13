import { BookOpen, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { Dialog as DialogPrimitive } from 'radix-ui'
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from 'react'
import {
  BackCoverFace,
  ContentsPage,
  CoverFace,
  DetailsPage,
  MeetingPage,
  MembersPage,
  NotesPage,
  PhasePage,
  type ContentsEntry,
  type PageSide,
} from '@/components/record-book/book-pages'
import { Button } from '@/components/ui/button'
import { useWindowSize } from '@/hooks/use-window-size'
import {
  formatDate,
  MEETING_PHASE_LABELS,
  MEETING_PHASE_LETTERS,
} from '@/lib/format'
import type { RecordBook } from '@/lib/types'
import { cn } from '@/lib/utils'

/** Design size of one page; the whole book is scaled to fit the window. */
const PAGE_W = 460
const PAGE_H = 640
const BOARD = 10
const TURN_MS = 900
const SPREAD_MIN_WIDTH = 900

interface Face {
  key: string
  /** Short name for the page indicator, e.g. "Meeting 3". */
  label: string
  /** Section chip this page belongs to. */
  section: string
  render: (side: PageSide, onJump: (face: number) => void) => ReactNode
}

function buildFaces(book: RecordBook): Face[] {
  const faces: Face[] = []
  const contents: ContentsEntry[] = []
  const add = (face: Face) => faces.push(face)

  add({
    key: 'cover',
    label: 'Cover',
    section: 'Cover',
    render: () => <CoverFace book={book} />,
  })
  add({
    key: 'details',
    label: 'Project details',
    section: 'Details',
    render: (side) => <DetailsPage book={book} side={side} pageNumber={1} />,
  })
  add({
    key: 'members',
    label: 'Group members',
    section: 'Details',
    render: (side) => <MembersPage book={book} side={side} pageNumber={2} />,
  })
  contents.push(
    { label: 'Project and group details', page: 1, face: 1 },
    { label: 'Group members', page: 2, face: 2 },
  )
  add({
    key: 'contents',
    label: 'Contents',
    section: 'Contents',
    render: (side, onJump) => (
      <ContentsPage
        entries={contents}
        side={side}
        pageNumber={3}
        onJump={onJump}
      />
    ),
  })

  for (const { phase, meetings } of book.phases) {
    const letter = MEETING_PHASE_LETTERS[phase]
    const section = `Phase ${letter}`
    const phaseFace = faces.length
    contents.push({
      label: section,
      detail: MEETING_PHASE_LABELS[phase],
      page: phaseFace,
      face: phaseFace,
    })
    add({
      key: `phase-${phase}`,
      label: section,
      section,
      render: (side) => (
        <PhasePage
          phase={phase}
          meetings={meetings}
          side={side}
          pageNumber={phaseFace}
        />
      ),
    })
    for (const meeting of meetings) {
      const face = faces.length
      contents.push({
        label: `Meeting ${meeting.number}`,
        detail: formatDate(meeting.meetingDate, true),
        page: face,
        face,
        nested: true,
      })
      add({
        key: meeting.id,
        label: `Meeting ${meeting.number}`,
        section,
        render: (side) => (
          <MeetingPage meeting={meeting} side={side} pageNumber={face} />
        ),
      })
    }
  }

  // Every leaf has two faces, and the back cover is the last one.
  if (faces.length % 2 === 0) {
    const face = faces.length
    add({
      key: 'notes',
      label: 'Notes',
      section: 'Back',
      render: (side) => <NotesPage side={side} pageNumber={face} />,
    })
  }
  add({
    key: 'back',
    label: 'Back cover',
    section: 'Back',
    render: () => <BackCoverFace book={book} />,
  })
  return faces
}

/** Leaves flipped onto the left so that `face` is showing. */
const flippedFor = (face: number) => Math.ceil(face / 2)

function BookStage({ book }: { book: RecordBook }) {
  const faces = useMemo(() => buildFaces(book), [book])
  const leafCount = faces.length / 2
  const last = faces.length - 1

  const [face, setFace] = useState(0)
  const [turning, setTurning] = useState<number | null>(null)
  const swipeStart = useRef<number | null>(null)
  useEffect(() => {
    if (turning === null) return
    const timer = setTimeout(() => setTurning(null), TURN_MS)
    return () => clearTimeout(timer)
  }, [turning, face])

  const { width, height } = useWindowSize()
  const spread = width >= SPREAD_MIN_WIDTH
  const scale = spread
    ? Math.min(
        1.3,
        (width - 220) / (2 * PAGE_W + 2 * BOARD),
        (height - 190) / (PAGE_H + 2 * BOARD),
      )
    : Math.min(
        1.3,
        (width - 24) / (PAGE_W + 2 * BOARD),
        (height - 190) / (PAGE_H + 2 * BOARD),
      )

  const flipped = flippedFor(face)
  const visible = spread
    ? new Set([2 * flipped - 1, 2 * flipped])
    : new Set([face])

  const goTo = (target: number) => {
    const next = Math.max(0, Math.min(last, target))
    const from = flippedFor(face)
    const to = flippedFor(next)
    if (from !== to) {
      // The leaf in motion goes on top of both stacks until it lands.
      setTurning(to > from ? to - 1 : to)
    }
    setFace(next)
  }
  // In a spread, one step turns a whole leaf; on a phone, one page.
  const step = (direction: 1 | -1) => {
    if (!spread) return goTo(face + direction)
    const target = flipped + direction
    goTo(target <= 0 ? 0 : Math.min(2 * target, last))
  }
  const atStart = face === 0
  const atEnd = spread ? flipped === leafCount : face === last

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'ArrowRight') step(1)
    else if (event.key === 'ArrowLeft') step(-1)
    else if (event.key === 'Home') goTo(0)
    else if (event.key === 'End') goTo(last)
    else return
    event.preventDefault()
  }
  const onPointerDown = (event: PointerEvent) => {
    swipeStart.current = event.clientX
  }
  const onPointerUp = (event: PointerEvent) => {
    if (swipeStart.current === null) return
    const dx = event.clientX - swipeStart.current
    swipeStart.current = null
    if (Math.abs(dx) > 60) step(dx < 0 ? 1 : -1)
  }

  // Closed books sit centered; an open one is centered on its spine.
  const showingSide: PageSide = face % 2 === 0 ? 'right' : 'left'
  const shift = spread
    ? flipped === 0
      ? -PAGE_W / 2
      : flipped === leafCount
        ? PAGE_W / 2
        : 0
    : showingSide === 'right'
      ? -PAGE_W
      : 0
  const stageWidth = (spread ? 2 * PAGE_W : PAGE_W) * scale

  const indicator = spread
    ? flipped === 0 || flipped === leafCount
      ? faces[face].label
      : `${faces[2 * flipped - 1].label} · ${faces[2 * flipped].label}`
    : faces[face].label
  const pageNumbers = spread
    ? [2 * flipped - 1, 2 * flipped].filter((f) => f > 0 && f < last)
    : face > 0 && face < last
      ? [face]
      : []

  const sections = faces.reduce<{ name: string; face: number }[]>(
    (list, f, index) =>
      list.some((s) => s.name === f.section)
        ? list
        : [...list, { name: f.section, face: index }],
    [],
  )
  const currentSections = new Set(
    [...visible]
      .filter((f) => f >= 0 && f <= last)
      .map((f) => faces[f].section),
  )

  const leftStack = Math.min(flipped, leafCount - 1)
  const rightStack = Math.min(leafCount - flipped, leafCount - 1)

  return (
    <div
      className="flex size-full flex-col outline-none"
      onKeyDown={onKeyDown}
      tabIndex={-1}
    >
      <header className="flex items-center gap-3 px-4 pt-4 sm:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/10 text-[#e9c77b]">
            <BookOpen className="size-4" />
          </span>
          <div className="min-w-0">
            <DialogPrimitive.Title className="truncate text-sm font-semibold text-white">
              {book.project.name}
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="truncate text-xs text-white/60">
              Supervisor meeting record book
            </DialogPrimitive.Description>
          </div>
        </div>
        <nav
          aria-label="Sections"
          className="hidden flex-wrap justify-center gap-1 md:flex"
        >
          {sections.map((section) => (
            <button
              key={section.name}
              type="button"
              onClick={() => goTo(section.face)}
              aria-current={currentSections.has(section.name) || undefined}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-[#e9c77b]',
                currentSections.has(section.name)
                  ? 'bg-[#e9c77b] text-stone-900'
                  : 'text-white/70 hover:bg-white/10 hover:text-white',
              )}
            >
              {section.name}
            </button>
          ))}
        </nav>
        <div className="flex flex-1 justify-end">
          <DialogPrimitive.Close asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Close record book"
              className="text-white/80 hover:bg-white/10 hover:text-white"
            >
              <X />
            </Button>
          </DialogPrimitive.Close>
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1 items-center justify-center gap-4 px-2 sm:gap-8">
        <NavButton
          direction="previous"
          disabled={atStart}
          onClick={() => step(-1)}
        />
        <div
          className={cn(
            'relative shrink-0 touch-pan-y',
            !spread && 'overflow-hidden',
          )}
          style={{ width: stageWidth, height: PAGE_H * scale }}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerCancel={() => (swipeStart.current = null)}
        >
          <div
            className="absolute top-0 left-0 transition-transform duration-700 ease-out motion-reduce:transition-none"
            style={{
              width: 2 * PAGE_W,
              height: PAGE_H,
              transformOrigin: '0 0',
              transform: `scale(${scale}) translateX(${shift}px)`,
              perspective: 2600,
            }}
          >
            {/* Hard boards behind the paper, with the page edges of each stack. */}
            <Board side="left" show={flipped > 0} stack={leftStack} />
            <Board side="right" show={flipped < leafCount} stack={rightStack} />

            {Array.from({ length: leafCount }, (_, leaf) => {
              const isFlipped = leaf < flipped
              const front = faces[2 * leaf]
              const back = faces[2 * leaf + 1]
              return (
                <div
                  key={front.key}
                  className="absolute top-0 transition-transform ease-[cubic-bezier(0.645,0.045,0.355,1)] motion-reduce:transition-none"
                  style={{
                    left: PAGE_W,
                    width: PAGE_W,
                    height: PAGE_H,
                    transformOrigin: 'left center',
                    transformStyle: 'preserve-3d',
                    transitionDuration: `${TURN_MS}ms`,
                    transform: `rotateY(${isFlipped ? -180 : 0}deg)`,
                    zIndex:
                      turning === leaf
                        ? leafCount + 1
                        : isFlipped
                          ? leaf + 1
                          : leafCount - leaf,
                  }}
                >
                  <div
                    className="absolute inset-0 overflow-hidden rounded-r-md shadow-[2px_0_6px_rgba(0,0,0,0.12)] backface-hidden"
                    role="group"
                    aria-roledescription="page"
                    aria-label={front.label}
                    inert={!visible.has(2 * leaf)}
                    aria-hidden={!visible.has(2 * leaf)}
                  >
                    {front.render('right', goTo)}
                  </div>
                  <div
                    className="absolute inset-0 overflow-hidden rounded-l-md shadow-[-2px_0_6px_rgba(0,0,0,0.12)] backface-hidden"
                    style={{ transform: 'rotateY(180deg)' }}
                    role="group"
                    aria-roledescription="page"
                    aria-label={back.label}
                    inert={!visible.has(2 * leaf + 1)}
                    aria-hidden={!visible.has(2 * leaf + 1)}
                  >
                    {back.render('left', goTo)}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        <NavButton direction="next" disabled={atEnd} onClick={() => step(1)} />
      </div>

      <footer className="flex flex-col items-center gap-1 px-4 pt-2 pb-5 text-center">
        <p className="text-sm font-medium text-white" aria-live="polite">
          {indicator}
        </p>
        <p className="text-xs text-white/55">
          {pageNumbers.length > 0
            ? `Page ${pageNumbers.join('–')} of ${last - 1}`
            : `${last - 1} pages`}
          <span className="hidden sm:inline">{' · '}Use ← → to turn pages</span>
        </p>
      </footer>
    </div>
  )
}

function Board({
  side,
  show,
  stack,
}: {
  side: PageSide
  show: boolean
  stack: number
}) {
  const edge = Math.min(7, stack * 0.6)
  return (
    <div
      aria-hidden
      className={cn(
        'absolute bg-[radial-gradient(120%_90%_at_30%_20%,#5a3820_0%,#3a2312_60%,#26160a_100%)] shadow-[0_40px_70px_-25px_rgba(0,0,0,0.85)] transition-opacity duration-300',
        side === 'left' ? 'rounded-l-lg' : 'rounded-r-lg',
        show ? 'opacity-100 delay-300' : 'opacity-0',
      )}
      style={{
        top: -BOARD,
        height: PAGE_H + 2 * BOARD,
        left: side === 'left' ? -BOARD : PAGE_W,
        width: PAGE_W + BOARD,
      }}
    >
      {edge > 0.5 && (
        <div
          className="absolute bg-[repeating-linear-gradient(to_right,#f3ecdc_0,#f3ecdc_1px,#d6ccb6_1px,#d6ccb6_2px)]"
          style={{
            top: BOARD + 3,
            bottom: BOARD + 3,
            width: edge,
            ...(side === 'left'
              ? { left: BOARD - edge }
              : { right: BOARD - edge }),
          }}
        />
      )}
    </div>
  )
}

function NavButton({
  direction,
  disabled,
  onClick,
}: {
  direction: 'previous' | 'next'
  disabled: boolean
  onClick: () => void
}) {
  const Icon = direction === 'previous' ? ChevronLeft : ChevronRight
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={direction === 'previous' ? 'Previous page' : 'Next page'}
      className={cn(
        'z-10 flex size-12 shrink-0 items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-white/15 backdrop-blur transition outline-none hover:bg-[#e9c77b] hover:text-stone-900 focus-visible:ring-2 focus-visible:ring-[#e9c77b] disabled:pointer-events-none disabled:opacity-25',
        'max-[899px]:absolute max-[899px]:bottom-2 max-[899px]:size-11',
        direction === 'previous' ? 'max-[899px]:left-4' : 'max-[899px]:right-4',
      )}
    >
      <Icon className="size-6" />
    </button>
  )
}

/** Full-screen 3D view of the record book with page turning. */
export function RecordBookViewer({
  book,
  open,
  onOpenChange,
}: {
  book: RecordBook
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 fixed inset-0 z-50 bg-[radial-gradient(ellipse_at_center,#2a2118_0%,#120d09_70%,#0a0806_100%)]" />
        <DialogPrimitive.Content className="data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 fixed inset-0 z-50 outline-none">
          <BookStage book={book} />
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

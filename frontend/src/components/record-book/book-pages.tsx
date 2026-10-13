import type { ReactNode } from 'react'
import { LogoMark } from '@/components/logo'
import { SignatureImage } from '@/components/signature/signature-image'
import {
  displayName,
  formatDate,
  MEETING_ATTENDEE_LABELS,
  MEETING_MODE_LABELS,
  MEETING_PHASE_LABELS,
  MEETING_PHASE_LETTERS,
} from '@/lib/format'
import type {
  MeetingMode,
  MeetingPhase,
  MeetingRecord,
  MeetingRecordStatus,
  RecordBook,
} from '@/lib/types'
import { cn } from '@/lib/utils'

const MODES: MeetingMode[] = ['ONLINE_UPDATE', 'IN_PERSON']
const RULED =
  'bg-[repeating-linear-gradient(to_bottom,transparent_0,transparent_23px,rgba(120,96,60,0.16)_23px,rgba(120,96,60,0.16)_24px)]'
const LEATHER =
  'bg-[radial-gradient(120%_90%_at_30%_20%,#6b4428_0%,#432815_55%,#2b190c_100%)]'
const GOLD = 'text-[#e9c77b]'

export type PageSide = 'left' | 'right'

/** Cream paper with a soft shadow toward the spine. */
export function Paper({
  side,
  pageNumber,
  children,
}: {
  side: PageSide
  pageNumber?: number
  children: ReactNode
}) {
  return (
    <div className="light relative flex size-full flex-col overflow-hidden bg-[#fbf7ee] px-10 pt-9 pb-7 font-serif text-stone-800">
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-y-0 w-14',
          side === 'right'
            ? 'left-0 bg-[linear-gradient(to_right,rgba(60,40,10,0.22),rgba(60,40,10,0.06)_40%,transparent)]'
            : 'right-0 bg-[linear-gradient(to_left,rgba(60,40,10,0.22),rgba(60,40,10,0.06)_40%,transparent)]',
        )}
      />
      <div className="relative flex min-h-0 flex-1 flex-col">{children}</div>
      {pageNumber !== undefined && (
        <p
          className={cn(
            'relative pt-3 text-xs text-stone-500 tabular-nums',
            side === 'right' ? 'text-right' : 'text-left',
          )}
        >
          {pageNumber}
        </p>
      )}
    </div>
  )
}

function PageTitle({ eyebrow, title }: { eyebrow?: string; title: string }) {
  return (
    <div className="mb-5 border-b border-stone-300 pb-3">
      {eyebrow && (
        <p className="text-[11px] font-semibold tracking-[0.18em] text-amber-800 uppercase">
          {eyebrow}
        </p>
      )}
      <h3 className="mt-1 text-2xl font-semibold tracking-tight text-stone-900">
        {title}
      </h3>
    </div>
  )
}

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-end gap-3 py-1.5">
      <span className="w-32 shrink-0 text-[13px] text-stone-500">{label}</span>
      <span className="min-h-6 flex-1 border-b border-dotted border-stone-400 pb-0.5 text-[15px] font-medium text-stone-900">
        {value || <span className="text-stone-400">—</span>}
      </span>
    </div>
  )
}

export function CoverFace({ book }: { book: RecordBook }) {
  const { details } = book
  return (
    <div
      className={cn(
        'relative flex size-full flex-col items-center justify-between overflow-hidden rounded-r-md px-12 py-14 text-center font-serif',
        LEATHER,
        GOLD,
      )}
    >
      <div aria-hidden className="absolute inset-y-0 left-4 w-px bg-black/40" />
      <div
        aria-hidden
        className="absolute inset-y-0 left-4.5 w-px bg-white/10"
      />
      <div
        aria-hidden
        className="absolute inset-6 rounded-sm border border-[#e9c77b]/45"
      />
      <div
        aria-hidden
        className="absolute inset-7.5 rounded-sm border border-[#e9c77b]/20"
      />
      <div className="relative flex flex-col gap-1">
        <p className="text-sm font-semibold tracking-[0.2em] uppercase">
          {details.university ?? 'University'}
        </p>
        {details.faculty && (
          <p className="text-xs opacity-80">{details.faculty}</p>
        )}
      </div>
      <div className="relative flex flex-col items-center gap-5">
        <LogoMark className="size-14 rounded-xl shadow-lg ring-1 ring-[#e9c77b]/40" />
        <p className="text-[32px] leading-tight font-bold tracking-[0.08em] uppercase drop-shadow">
          Supervisor
          <br />
          meeting
          <br />
          record book
        </p>
        <div className="h-px w-24 bg-[#e9c77b]/60" />
        <p className="text-base">{details.moduleTitle}</p>
        <p className="text-sm opacity-80">{details.level}</p>
      </div>
      <div className="relative w-full max-w-70 rounded-sm bg-[#f6efdc] px-5 py-3 text-left text-stone-800 shadow-inner">
        <p className="truncate text-base font-semibold">{book.project.name}</p>
        <p className="text-xs text-stone-600">
          {[details.groupName, details.batch && `Batch ${details.batch}`]
            .filter(Boolean)
            .join(' · ') || book.project.key}
        </p>
      </div>
    </div>
  )
}

export function BackCoverFace({ book }: { book: RecordBook }) {
  return (
    <div
      className={cn(
        'relative flex size-full flex-col items-center justify-end overflow-hidden rounded-l-md pb-14 text-center font-serif',
        LEATHER,
        GOLD,
      )}
    >
      <div
        aria-hidden
        className="absolute inset-6 rounded-sm border border-[#e9c77b]/30"
      />
      <LogoMark className="relative size-9 rounded-lg opacity-90" />
      <p className="relative mt-3 text-xs tracking-[0.2em] uppercase opacity-80">
        {book.project.key} · Kept with Beacon
      </p>
    </div>
  )
}

export function DetailsPage({
  book,
  side,
  pageNumber,
}: {
  book: RecordBook
  side: PageSide
  pageNumber: number
}) {
  const { details } = book
  const supervisor = book.supervisors[0]
  return (
    <Paper side={side} pageNumber={pageNumber}>
      <PageTitle eyebrow="Record book" title="Project and group details" />
      <div className="flex flex-col">
        <Field label="University" value={details.university} />
        <Field label="Faculty" value={details.faculty} />
        <Field label="Department" value={details.department} />
        <Field label="Module" value={details.moduleTitle} />
        <Field label="Level" value={details.level} />
        <Field label="Project title" value={book.project.name} />
        <Field label="Group" value={details.groupName} />
        <Field label="Batch" value={details.batch} />
        <Field
          label="Supervisor"
          value={book.supervisors.map((p) => displayName(p.user)).join(', ')}
        />
      </div>
      <div className="mt-auto flex flex-col items-end">
        <div className="flex h-16 items-end">
          {supervisor?.signature && (
            <SignatureImage
              src={supervisor.signature.image}
              alt="Supervisor's signature"
              className="max-h-16"
            />
          )}
        </div>
        <p className="w-56 border-t border-dotted border-stone-400 pt-1 text-right text-xs text-stone-500">
          Supervisor's signature
        </p>
      </div>
    </Paper>
  )
}

export function MembersPage({
  book,
  side,
  pageNumber,
}: {
  book: RecordBook
  side: PageSide
  pageNumber: number
}) {
  return (
    <Paper side={side} pageNumber={pageNumber}>
      <PageTitle
        eyebrow={`${book.members.length} members`}
        title="Group members"
      />
      <ol className="flex flex-col gap-3">
        {book.members.map((person, index) => (
          <li
            key={person.user.id}
            className="flex items-center gap-4 rounded-md border border-stone-300/80 bg-white/50 px-4 py-3"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-sm font-semibold text-amber-900">
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-semibold text-stone-900">
                {displayName(person.user)}
              </p>
              <p className="text-xs text-stone-500">
                {person.role === 'OWNER' ? 'Group lead' : 'Member'}
                {' · '}
                <span className="font-mono">
                  {person.registrationNumber ?? 'No registration no.'}
                </span>
              </p>
            </div>
            <div className="flex h-10 w-24 items-center justify-end">
              {person.signature ? (
                <SignatureImage
                  src={person.signature.image}
                  alt={`Signature of ${displayName(person.user)}`}
                  className="max-h-10"
                />
              ) : (
                <span className="text-[11px] text-stone-400 italic">
                  Not signed
                </span>
              )}
            </div>
          </li>
        ))}
      </ol>
    </Paper>
  )
}

export interface ContentsEntry {
  label: string
  detail?: string
  page: number
  /** Index of the face to open. */
  face: number
  nested?: boolean
}

export function ContentsPage({
  entries,
  side,
  pageNumber,
  onJump,
}: {
  entries: ContentsEntry[]
  side: PageSide
  pageNumber: number
  onJump: (face: number) => void
}) {
  return (
    <Paper side={side} pageNumber={pageNumber}>
      <PageTitle eyebrow="Record book" title="Contents" />
      <ul className="-mx-2 flex min-h-0 flex-1 flex-col overflow-y-auto">
        {entries.map((entry) => (
          <li key={`${entry.face}-${entry.label}`}>
            <button
              type="button"
              onClick={() => onJump(entry.face)}
              className={cn(
                'flex w-full items-baseline gap-2 rounded px-2 text-left outline-none hover:bg-amber-100/60 focus-visible:ring-2 focus-visible:ring-amber-600',
                entry.nested
                  ? 'py-1 pl-6 text-[13px] text-stone-600'
                  : 'mt-1.5 py-1.5 text-[15px] font-semibold text-stone-900',
              )}
            >
              <span className="shrink-0">{entry.label}</span>
              {entry.detail && (
                <span className="truncate text-xs font-normal text-stone-500">
                  {entry.detail}
                </span>
              )}
              <span
                aria-hidden
                className="min-w-4 flex-1 border-b border-dotted border-stone-400"
              />
              <span className="shrink-0 tabular-nums">{entry.page}</span>
            </button>
          </li>
        ))}
      </ul>
    </Paper>
  )
}

export function PhasePage({
  phase,
  meetings,
  side,
  pageNumber,
}: {
  phase: MeetingPhase
  meetings: MeetingRecord[]
  side: PageSide
  pageNumber: number
}) {
  const certified = meetings.filter((m) => m.status === 'CERTIFIED').length
  return (
    <Paper side={side} pageNumber={pageNumber}>
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <span className="flex size-24 items-center justify-center rounded-full border-2 border-amber-700/60 bg-amber-50 text-5xl font-bold text-amber-800 shadow-inner">
          {MEETING_PHASE_LETTERS[phase]}
        </span>
        <p className="mt-6 text-[11px] font-semibold tracking-[0.2em] text-amber-800 uppercase">
          Phase {MEETING_PHASE_LETTERS[phase]}
        </p>
        <h3 className="mt-2 max-w-xs text-2xl leading-snug font-semibold text-stone-900">
          {MEETING_PHASE_LABELS[phase]}
        </h3>
        <div className="mt-6 h-px w-20 bg-stone-300" />
        <p className="mt-4 text-sm text-stone-600">
          {meetings.length === 0
            ? 'No meetings recorded in this phase yet.'
            : `${meetings.length} ${meetings.length === 1 ? 'meeting' : 'meetings'} · ${certified} certified`}
        </p>
        {meetings.length > 0 && (
          <p className="mt-1 text-xs text-stone-500">
            {formatDate(meetings[0].meetingDate, true)}
            {meetings.length > 1 &&
              ` – ${formatDate(meetings[meetings.length - 1].meetingDate, true)}`}
          </p>
        )}
      </div>
    </Paper>
  )
}

const STAMPS: Record<
  MeetingRecordStatus,
  { label: string; className: string }
> = {
  CERTIFIED: {
    label: 'Certified',
    className: 'border-emerald-700/70 text-emerald-700',
  },
  SUBMITTED: {
    label: 'Awaiting signature',
    className: 'border-amber-600/70 text-amber-700',
  },
  CHANGES_REQUESTED: {
    label: 'Changes requested',
    className: 'border-red-700/60 text-red-700',
  },
}

function Stamp({ meeting }: { meeting: MeetingRecord }) {
  const stamp = STAMPS[meeting.status]
  return (
    <div
      className={cn(
        'flex -rotate-6 flex-col items-center rounded-md border-[3px] border-double px-3 py-1 whitespace-nowrap opacity-90',
        stamp.className,
      )}
    >
      <span className="text-[13px] font-bold tracking-[0.18em] uppercase">
        {stamp.label}
      </span>
      {meeting.certifiedAt && (
        <span className="text-[10px] tracking-wide">
          {formatDate(meeting.certifiedAt, true)}
        </span>
      )}
    </div>
  )
}

function Check({ checked, label }: { checked: boolean; label: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-[13px]',
        checked ? 'font-semibold text-stone-900' : 'text-stone-500',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'inline-flex size-4 items-center justify-center rounded-[3px] border text-[11px] leading-none',
          checked
            ? 'border-amber-800 bg-amber-700 text-white'
            : 'border-stone-400',
        )}
      >
        {checked ? '✓' : ''}
      </span>
      {label}
      <span className="sr-only">{checked ? '(selected)' : ''}</span>
    </span>
  )
}

export function MeetingPage({
  meeting,
  side,
  pageNumber,
}: {
  meeting: MeetingRecord
  side: PageSide
  pageNumber: number
}) {
  const remarksLabel =
    meeting.status === 'CHANGES_REQUESTED'
      ? 'Changes requested'
      : "Supervisor's remarks"
  return (
    <Paper side={side} pageNumber={pageNumber}>
      <div className="relative">
        <div className="absolute top-1 right-0">
          <Stamp meeting={meeting} />
        </div>
        <div>
          <p className="text-[11px] font-semibold tracking-[0.18em] text-amber-800 uppercase">
            Phase {MEETING_PHASE_LETTERS[meeting.phase]}
          </p>
          <h3 className="mt-1 text-[28px] leading-none font-semibold whitespace-nowrap text-stone-900">
            Meeting {meeting.number}
          </h3>
          <p className="mt-2 text-sm text-stone-600">
            {formatDate(meeting.meetingDate, true)}
          </p>
        </div>
      </div>

      <div className="mt-4 flex gap-5 border-y border-stone-300 py-2.5">
        {MODES.map((mode) => (
          <Check
            key={mode}
            checked={meeting.mode === mode}
            label={MEETING_MODE_LABELS[mode]}
          />
        ))}
      </div>

      <div className="mt-3">
        <p className="text-[11px] font-semibold tracking-[0.14em] text-stone-500 uppercase">
          {MEETING_ATTENDEE_LABELS[meeting.mode]}
        </p>
        <p className="mt-0.5 text-[15px] text-stone-900">
          {meeting.attendees.map(displayName).join(', ') || '—'}
        </p>
      </div>

      <div className="mt-4 flex min-h-0 flex-1 flex-col">
        <p className="text-[11px] font-semibold tracking-[0.14em] text-stone-500 uppercase">
          Discussion and progress
        </p>
        <p
          className={cn(
            'mt-1 min-h-0 flex-1 overflow-y-auto text-[15px] leading-6 whitespace-pre-line text-stone-900',
            RULED,
          )}
        >
          {meeting.summary}
        </p>
      </div>

      <div className="mt-4 grid grid-cols-[1fr_11rem] gap-5 border-t border-stone-300 pt-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-[0.14em] text-stone-500 uppercase">
            {remarksLabel}
          </p>
          <p className="mt-0.5 line-clamp-4 text-[13px] text-stone-800 italic">
            {meeting.status === 'SUBMITTED'
              ? '—'
              : (meeting.supervisorComment ?? '—')}
          </p>
        </div>
        <div className="flex flex-col">
          <div className="flex h-12 items-end justify-center">
            {meeting.status === 'CERTIFIED' && meeting.signatureImage ? (
              <SignatureImage
                src={meeting.signatureImage}
                alt={`Supervisor's signature for meeting ${meeting.number}`}
                className="max-h-12"
              />
            ) : (
              <span className="pb-1 text-[11px] text-stone-400 italic">
                Awaiting signature
              </span>
            )}
          </div>
          <p className="border-t border-dotted border-stone-400 pt-0.5 text-center text-[11px] text-stone-500">
            {meeting.certifiedBy
              ? displayName(meeting.certifiedBy)
              : "Supervisor's signature"}
          </p>
        </div>
      </div>
    </Paper>
  )
}

export function NotesPage({
  side,
  pageNumber,
}: {
  side: PageSide
  pageNumber: number
}) {
  return (
    <Paper side={side} pageNumber={pageNumber}>
      <PageTitle title="Notes" />
      <div className={cn('flex-1', RULED)} />
    </Paper>
  )
}

import { ArrowLeft, Printer } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { ErrorState } from '@/components/query-state'
import { SignatureImage } from '@/components/signature/signature-image'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useRecordBook } from '@/hooks/queries'
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
  MeetingRecord,
  RecordBook,
  RecordBookPerson,
} from '@/lib/types'
import { cn } from '@/lib/utils'

/** The paper book has six meeting slots per phase. */
const SLOTS_PER_PHASE = 6
const MODES: MeetingMode[] = ['ONLINE_UPDATE', 'IN_PERSON']

function Sheet({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={cn(
        'bg-card mx-auto flex w-full max-w-[210mm] flex-col border p-[14mm] shadow-sm',
        'print:max-w-none print:break-after-page print:border-0 print:p-0 print:shadow-none print:last:break-after-auto',
        className,
      )}
    >
      {children}
    </section>
  )
}

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-end gap-3 py-1.5">
      <span className="w-40 shrink-0 text-sm">{label}</span>
      <span className="min-h-6 flex-1 border-b border-dotted border-current/40 pb-0.5 text-sm font-medium">
        {value}
      </span>
    </div>
  )
}

function Box({ checked, label }: { checked: boolean; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      <span
        aria-hidden
        className="inline-flex size-3.5 items-center justify-center border border-current text-[10px] leading-none"
      >
        {checked ? '✓' : ''}
      </span>
      <span className={checked ? 'font-medium' : undefined}>{label}</span>
      <span className="sr-only">{checked ? '(selected)' : ''}</span>
    </span>
  )
}

function SignatureCell({
  image,
  alt,
}: {
  image: string | null | undefined
  alt: string
}) {
  return (
    <div className="flex h-12 items-center">
      {image && <SignatureImage src={image} alt={alt} className="max-h-12" />}
    </div>
  )
}

function CoverSheet({ book }: { book: RecordBook }) {
  const { details } = book
  return (
    <Sheet className="min-h-[267mm] items-center justify-between text-center print:min-h-[267mm]">
      <div className="flex flex-col gap-1">
        <p className="text-lg font-semibold uppercase">
          {details.university ?? 'University'}
        </p>
        {details.faculty && <p>{details.faculty}</p>}
        {details.department && <p>{details.department}</p>}
      </div>
      <div className="flex flex-col gap-4">
        <p className="text-xl font-semibold">{details.moduleTitle}</p>
        <p className="text-lg">{details.level}</p>
        <p className="mt-6 text-3xl font-bold tracking-wide uppercase">
          Supervisor meeting record book
        </p>
      </div>
      <div className="flex w-full max-w-md flex-col text-left">
        <Field label="Project" value={book.project.name} />
        <Field label="Group" value={details.groupName ?? ''} />
        <Field label="Batch" value={details.batch ?? ''} />
      </div>
    </Sheet>
  )
}

function DetailsSheet({ book }: { book: RecordBook }) {
  const supervisor: RecordBookPerson | undefined = book.supervisors[0]
  return (
    <Sheet className="gap-6">
      <h2 className="text-center text-lg font-semibold uppercase">
        Project and group details
      </h2>
      <div className="flex flex-col">
        <Field label="Project title" value={book.project.name} />
        <Field label="Group" value={book.details.groupName ?? ''} />
        <Field label="Batch" value={book.details.batch ?? ''} />
        <Field
          label="Supervisor"
          value={book.supervisors.map((p) => displayName(p.user)).join(', ')}
        />
        <div className="flex items-end gap-3 py-1.5">
          <span className="w-40 shrink-0 text-sm">Supervisor's signature</span>
          <div className="flex-1 border-b border-dotted border-current/40">
            <SignatureCell
              image={supervisor?.signature?.image}
              alt="Supervisor's signature"
            />
          </div>
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold">Group members</p>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="w-10 border border-current/40 px-2 py-1.5 text-left font-medium">
                No.
              </th>
              <th className="border border-current/40 px-2 py-1.5 text-left font-medium">
                Name
              </th>
              <th className="w-36 border border-current/40 px-2 py-1.5 text-left font-medium">
                Registration no.
              </th>
              <th className="w-44 border border-current/40 px-2 py-1.5 text-left font-medium">
                Signature
              </th>
            </tr>
          </thead>
          <tbody>
            {book.members.map((person, index) => (
              <tr key={person.user.id}>
                <td className="border border-current/40 px-2 py-1">
                  {index + 1}
                </td>
                <td className="border border-current/40 px-2 py-1">
                  {displayName(person.user)}
                  {person.role === 'OWNER' && ' (group lead)'}
                </td>
                <td className="border border-current/40 px-2 py-1 font-mono">
                  {person.registrationNumber}
                </td>
                <td className="border border-current/40 px-2 py-1">
                  <SignatureCell
                    image={person.signature?.image}
                    alt={`Signature of ${displayName(person.user)}`}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Sheet>
  )
}

function MeetingSlot({
  meeting,
  slot,
}: {
  meeting: MeetingRecord | undefined
  slot: number
}) {
  return (
    <div
      className="flex break-inside-avoid flex-col gap-2 border border-current/50 p-3 text-sm"
      data-testid={meeting ? 'print-meeting' : 'print-empty-slot'}
    >
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
        <span>
          Meeting no.{' '}
          <span className="font-semibold">{meeting?.number ?? ''}</span>
          {!meeting && <span className="text-muted-foreground">({slot})</span>}
        </span>
        <span>
          Date:{' '}
          <span className="font-medium">
            {meeting ? formatDate(meeting.meetingDate, true) : ''}
          </span>
        </span>
        <span className="flex gap-4">
          {MODES.map((mode) => (
            <Box
              key={mode}
              checked={meeting?.mode === mode}
              label={MEETING_MODE_LABELS[mode]}
            />
          ))}
        </span>
      </div>
      <div>
        <span>
          {meeting ? MEETING_ATTENDEE_LABELS[meeting.mode] : 'Members present'}
          :{' '}
        </span>
        <span className="font-medium">
          {meeting?.attendees.map(displayName).join(', ')}
        </span>
      </div>
      <div className="min-h-20">
        <p className="text-xs font-semibold uppercase">
          Discussion and progress
        </p>
        <p className="whitespace-pre-line">{meeting?.summary}</p>
      </div>
      <div className="grid grid-cols-[1fr_14rem] gap-4 border-t border-current/30 pt-2">
        <div>
          <p className="text-xs font-semibold uppercase">
            Supervisor's remarks
          </p>
          <p>
            {meeting?.status === 'CERTIFIED' ? meeting.supervisorComment : ''}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase">
            Supervisor's signature
          </p>
          {meeting && meeting.status !== 'CERTIFIED' ? (
            <p className="text-muted-foreground flex h-12 items-center text-xs italic">
              Awaiting signature
            </p>
          ) : (
            <SignatureCell
              image={meeting?.signatureImage}
              alt={`Supervisor's signature for meeting ${meeting?.number}`}
            />
          )}
          <p className="border-t border-dotted border-current/40 pt-0.5 text-xs">
            {meeting?.certifiedBy && displayName(meeting.certifiedBy)}
            {meeting?.certifiedAt &&
              ` · ${formatDate(meeting.certifiedAt, true)}`}
          </p>
        </div>
      </div>
    </div>
  )
}

function PhaseSheet({ phase, meetings }: RecordBook['phases'][number]) {
  const slots = Math.max(SLOTS_PER_PHASE, meetings.length)
  return (
    <Sheet className="gap-3">
      <h2 className="text-base font-semibold uppercase">
        Phase {MEETING_PHASE_LETTERS[phase]} - {MEETING_PHASE_LABELS[phase]}
      </h2>
      {Array.from({ length: slots }, (_, index) => (
        <MeetingSlot key={index} meeting={meetings[index]} slot={index + 1} />
      ))}
    </Sheet>
  )
}

export function RecordBookPrintPage() {
  const { projectId = '' } = useParams()
  const { data: book, error, isPending, refetch } = useRecordBook(projectId)

  useEffect(() => {
    if (!book) return
    const previous = document.title
    document.title = `${book.project.key} supervisor meeting record book`
    return () => {
      document.title = previous
    }
  }, [book])

  return (
    <div className="light bg-muted/40 text-foreground min-h-svh print:bg-transparent">
      <div className="bg-background sticky top-0 z-10 flex h-14 items-center justify-between gap-4 border-b px-6 print:hidden">
        <Button variant="ghost" size="sm" asChild>
          <Link to={`/projects/${projectId}/record-book`}>
            <ArrowLeft /> Back to record book
          </Link>
        </Button>
        <Button onClick={() => window.print()} disabled={!book}>
          <Printer /> Print / Save as PDF
        </Button>
      </div>
      <main className="flex flex-col gap-6 p-6 font-serif print:gap-0 print:p-0">
        {error ? (
          <ErrorState error={error} onRetry={() => refetch()} />
        ) : isPending ? (
          <Skeleton className="mx-auto h-[297mm] w-full max-w-[210mm]" />
        ) : (
          <>
            <CoverSheet book={book} />
            <DetailsSheet book={book} />
            {book.phases.map((phase) => (
              <PhaseSheet key={phase.phase} {...phase} />
            ))}
          </>
        )}
      </main>
    </div>
  )
}

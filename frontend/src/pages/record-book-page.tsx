import { BookOpen, Plus, Printer } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { ErrorState } from '@/components/query-state'
import { RecordBookViewer } from '@/components/record-book/book-viewer'
import { RecordBookDetailsCard } from '@/components/record-book/details-card'
import { MeetingCard } from '@/components/record-book/meeting-card'
import { MeetingDialog } from '@/components/record-book/meeting-dialog'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useRecordBook } from '@/hooks/queries'
import { useActingUserId } from '@/lib/acting-user'
import { MEETING_PHASE_LABELS, MEETING_PHASE_LETTERS } from '@/lib/format'
import type { MeetingRecord } from '@/lib/types'

function phaseSummary(meetings: MeetingRecord[]): string {
  if (meetings.length === 0) return 'No entries yet'
  const certified = meetings.filter((m) => m.status === 'CERTIFIED').length
  return `${meetings.length} ${meetings.length === 1 ? 'entry' : 'entries'} · ${certified} certified`
}

export function RecordBookPage() {
  const { projectId = '' } = useParams()
  const actingUserId = useActingUserId()
  const { data: book, error, isPending, refetch } = useRecordBook(projectId)
  const [adding, setAdding] = useState(false)
  const [viewing, setViewing] = useState(false)

  if (error) return <ErrorState error={error} onRetry={() => refetch()} />
  if (isPending) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-56 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    )
  }

  const member = book.members.find((p) => p.user.id === actingUserId)
  const supervisor = book.supervisors.find((p) => p.user.id === actingUserId)
  const canEditDetails = member?.role === 'OWNER' || !!supervisor
  const meetings = book.phases.flatMap((p) => p.meetings)
  const awaiting = meetings.filter((m) => m.status === 'SUBMITTED').length

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            Supervisor meeting record book
          </h2>
          <p className="text-muted-foreground text-sm">
            {meetings.length === 0
              ? 'Record online updates and in-person meetings for your supervisor to certify.'
              : `${meetings.length} ${meetings.length === 1 ? 'entry' : 'entries'} · ${awaiting} awaiting the supervisor`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setViewing(true)}>
            <BookOpen /> View record book
          </Button>
          <Button variant="outline" asChild>
            <Link to="print">
              <Printer /> Print
            </Link>
          </Button>
          {member && (
            <Button onClick={() => setAdding(true)}>
              <Plus /> Add entry
            </Button>
          )}
        </div>
      </div>

      <RecordBookDetailsCard
        book={book}
        actingUserId={actingUserId}
        canEditDetails={canEditDetails}
      />

      {book.phases.map(({ phase, meetings: phaseMeetings }) => (
        <Card key={phase} aria-labelledby={`phase-${phase}`}>
          <CardHeader>
            <CardTitle id={`phase-${phase}`}>
              Phase {MEETING_PHASE_LETTERS[phase]} ·{' '}
              {MEETING_PHASE_LABELS[phase]}
            </CardTitle>
            <CardDescription>{phaseSummary(phaseMeetings)}</CardDescription>
          </CardHeader>
          <CardContent>
            {phaseMeetings.length === 0 ? (
              <p className="text-muted-foreground rounded-md border border-dashed px-4 py-6 text-center text-sm">
                {member
                  ? 'No meetings in this phase yet. Use "Add entry" after you update or meet your supervisor.'
                  : 'The group has not recorded a meeting in this phase yet.'}
              </p>
            ) : (
              <div className="divide-y">
                {phaseMeetings.map((meeting) => (
                  <MeetingCard
                    key={meeting.id}
                    projectId={projectId}
                    meeting={meeting}
                    members={book.members}
                    canEdit={!!member}
                    canReview={!!supervisor}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      <MeetingDialog
        projectId={projectId}
        members={book.members}
        defaultPhase={
          [...book.phases].reverse().find((p) => p.meetings.length > 0)
            ?.phase ?? 'PROBLEM_IDENTIFICATION'
        }
        open={adding}
        onOpenChange={setAdding}
      />
      <RecordBookViewer book={book} open={viewing} onOpenChange={setViewing} />
    </div>
  )
}

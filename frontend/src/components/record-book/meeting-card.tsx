import { MessageSquare, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { MeetingModeBadge, MeetingStatusBadge } from '@/components/badges'
import { MeetingDialog } from '@/components/record-book/meeting-dialog'
import { MeetingReviewActions } from '@/components/record-book/review-dialogs'
import { SignatureImage } from '@/components/signature/signature-image'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { UserAvatarStack } from '@/components/user-avatar'
import { useDeleteMeeting } from '@/hooks/queries'
import { errorMessage } from '@/lib/api'
import {
  displayName,
  formatDate,
  MEETING_ATTENDEE_LABELS,
  MEETING_PHASE_LABELS,
  MEETING_PHASE_LETTERS,
} from '@/lib/format'
import type { MeetingRecord, RecordBookPerson } from '@/lib/types'

function SupervisorSignatureBox({ meeting }: { meeting: MeetingRecord }) {
  return (
    <div className="flex flex-col gap-1 sm:w-52">
      <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        Supervisor
      </p>
      {meeting.status === 'CERTIFIED' && meeting.signatureImage ? (
        <div className="flex flex-col gap-1 rounded-md border px-3 py-2">
          <div className="flex h-12 items-center">
            <SignatureImage
              src={meeting.signatureImage}
              alt={`Signature of ${meeting.certifiedBy ? displayName(meeting.certifiedBy) : 'the supervisor'}`}
              className="max-h-12"
            />
          </div>
          <p className="text-muted-foreground border-t pt-1 text-xs">
            {meeting.certifiedBy && displayName(meeting.certifiedBy)}
            {meeting.certifiedAt && ` · ${formatDate(meeting.certifiedAt)}`}
          </p>
        </div>
      ) : (
        <div className="text-muted-foreground flex h-18 items-center justify-center rounded-md border border-dashed px-3 text-center text-xs">
          Awaiting signature
        </div>
      )}
    </div>
  )
}

function MeetingActions({
  projectId,
  meeting,
  members,
}: {
  projectId: string
  meeting: MeetingRecord
  members: RecordBookPerson[]
}) {
  const [dialog, setDialog] = useState<'edit' | 'delete' | null>(null)
  const remove = useDeleteMeeting(projectId)
  const close = () => setDialog(null)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Actions for meeting ${meeting.number}`}
          >
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setDialog('edit')}>
            <Pencil /> Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => setDialog('delete')}
          >
            <Trash2 /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <MeetingDialog
        projectId={projectId}
        members={members}
        meeting={meeting}
        open={dialog === 'edit'}
        onOpenChange={(open) => !open && close()}
      />
      <Dialog open={dialog === 'delete'} onOpenChange={(o) => !o && close()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete meeting {meeting.number}?</DialogTitle>
            <DialogDescription>
              The entry from {formatDate(meeting.meetingDate, true)} is removed
              from the record book. Later meetings keep their numbers.
            </DialogDescription>
          </DialogHeader>
          {remove.error && (
            <p className="text-destructive text-sm">
              {errorMessage(remove.error)}
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={remove.isPending}
              onClick={() =>
                remove.mutate(meeting.id, {
                  onSuccess: () => {
                    toast.success(`Meeting ${meeting.number} deleted`)
                    close()
                  },
                })
              }
            >
              {remove.isPending ? 'Deleting...' : 'Delete entry'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export function MeetingCard({
  projectId,
  meeting,
  members,
  canEdit,
  canReview,
  showPhase = false,
}: {
  projectId: string
  meeting: MeetingRecord
  /** Group members, for the edit dialog. */
  members: RecordBookPerson[]
  canEdit: boolean
  canReview: boolean
  showPhase?: boolean
}) {
  const open = meeting.status !== 'CERTIFIED'

  return (
    <article
      className="flex flex-col gap-4 py-4 first:pt-0 last:pb-0 sm:flex-row sm:gap-6"
      aria-label={`Meeting ${meeting.number}`}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium">Meeting {meeting.number}</p>
          <span className="text-muted-foreground text-sm">
            {formatDate(meeting.meetingDate, true)}
          </span>
          <MeetingModeBadge mode={meeting.mode} />
          <MeetingStatusBadge status={meeting.status} />
          {canEdit && open && (
            <div className="ml-auto">
              <MeetingActions
                projectId={projectId}
                meeting={meeting}
                members={members}
              />
            </div>
          )}
        </div>
        {showPhase && (
          <p className="text-muted-foreground text-xs">
            Phase {MEETING_PHASE_LETTERS[meeting.phase]} ·{' '}
            {MEETING_PHASE_LABELS[meeting.phase]}
          </p>
        )}
        <p className="text-sm whitespace-pre-line">{meeting.summary}</p>
        <div className="text-muted-foreground flex items-center gap-2 text-xs">
          <UserAvatarStack users={meeting.attendees} max={6} />
          <span className="truncate">
            {MEETING_ATTENDEE_LABELS[meeting.mode]}:{' '}
            {meeting.attendees.map(displayName).join(', ')}
          </span>
        </div>
        {meeting.supervisorComment && (
          <div className="bg-muted/40 flex gap-2 rounded-md px-3 py-2 text-sm">
            <MessageSquare className="text-muted-foreground mt-0.5 size-3.5 shrink-0" />
            <p>
              <span className="font-medium">Supervisor: </span>
              {meeting.supervisorComment}
            </p>
          </div>
        )}
        {canReview && open && (
          <div className="flex flex-wrap gap-2">
            <MeetingReviewActions projectId={projectId} meeting={meeting} />
          </div>
        )}
      </div>
      <SupervisorSignatureBox meeting={meeting} />
    </article>
  )
}

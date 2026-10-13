import { PenLine, Undo2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { SignatureDialog } from '@/components/signature/signature-dialog'
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
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { useMySignature, useReviewMeeting } from '@/hooks/queries'
import { errorMessage } from '@/lib/api'
import { formatDate } from '@/lib/format'
import type { MeetingRecord } from '@/lib/types'

interface ReviewDialogProps {
  projectId: string
  meeting: MeetingRecord
  open: boolean
  onOpenChange: (open: boolean) => void
}

function CertifyForm({ projectId, meeting, onOpenChange }: ReviewDialogProps) {
  const signature = useMySignature()
  const review = useReviewMeeting()
  const [comment, setComment] = useState('')
  const [signatureOpen, setSignatureOpen] = useState(false)
  const saved = signature.data?.signature

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    review.mutate(
      {
        projectId,
        id: meeting.id,
        input: { decision: 'CERTIFIED', comment: comment.trim() || undefined },
      },
      {
        onSuccess: () => {
          toast.success(`Meeting ${meeting.number} certified`)
          onOpenChange(false)
        },
      },
    )
  }

  const form = (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <DialogHeader>
        <DialogTitle>Sign and certify meeting {meeting.number}?</DialogTitle>
        <DialogDescription>
          Held {formatDate(meeting.meetingDate, true)}. A copy of your signature
          is stamped on the entry, and the group can no longer change it.
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">Your signature</p>
        {signature.isPending ? (
          <Skeleton className="h-20" />
        ) : saved ? (
          <div className="flex items-center gap-3 rounded-md border p-3">
            <div className="flex h-14 min-w-0 flex-1 items-center">
              <SignatureImage src={saved.image} alt="Your signature" />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setSignatureOpen(true)}
            >
              Change
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-start gap-2 rounded-md border border-dashed p-4">
            <p className="text-muted-foreground text-sm">
              Upload, draw or type your signature once. It is reused for every
              entry you certify.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSignatureOpen(true)}
            >
              <PenLine /> Create signature
            </Button>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="certify-comment">
          Remarks{' '}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Textarea
          id="certify-comment"
          rows={3}
          maxLength={2000}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
      </div>

      {review.error && (
        <p className="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-sm">
          {errorMessage(review.error)}
        </p>
      )}

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={!saved || review.isPending}>
          {review.isPending ? 'Certifying...' : 'Sign and certify'}
        </Button>
      </DialogFooter>
    </form>
  )

  // Outside the form: React submit events bubble through portals.
  return (
    <>
      {form}
      <SignatureDialog
        open={signatureOpen}
        onOpenChange={setSignatureOpen}
        description="Saved to your profile and stamped on the entries you certify."
      />
    </>
  )
}

function RequestChangesForm({
  projectId,
  meeting,
  onOpenChange,
}: ReviewDialogProps) {
  const review = useReviewMeeting()
  const [comment, setComment] = useState(meeting.supervisorComment ?? '')
  const [submitted, setSubmitted] = useState(false)
  const commentError =
    comment.trim() === '' ? 'Tell the group what to change' : null

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    setSubmitted(true)
    if (commentError) return
    review.mutate(
      {
        projectId,
        id: meeting.id,
        input: { decision: 'CHANGES_REQUESTED', comment: comment.trim() },
      },
      {
        onSuccess: () => {
          toast.success(`Meeting ${meeting.number} sent back to the group`)
          onOpenChange(false)
        },
      },
    )
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <DialogHeader>
        <DialogTitle>Request changes to meeting {meeting.number}</DialogTitle>
        <DialogDescription>
          The group sees your comment, edits the entry and resubmits it.
        </DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-2">
        <Label htmlFor="changes-comment">Comment</Label>
        <Textarea
          id="changes-comment"
          rows={4}
          maxLength={2000}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          aria-invalid={submitted && !!commentError}
          autoFocus
        />
        {submitted && commentError && (
          <p className="text-destructive text-sm">{commentError}</p>
        )}
      </div>
      {review.error && (
        <p className="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-sm">
          {errorMessage(review.error)}
        </p>
      )}
      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={review.isPending}>
          {review.isPending ? 'Sending...' : 'Request changes'}
        </Button>
      </DialogFooter>
    </form>
  )
}

/** "Request changes" and "Sign and certify" for the group's supervisor. */
export function MeetingReviewActions({
  projectId,
  meeting,
}: {
  projectId: string
  meeting: MeetingRecord
}) {
  const [dialog, setDialog] = useState<'certify' | 'changes' | null>(null)
  const props = {
    projectId,
    meeting,
    onOpenChange: (open: boolean) => !open && setDialog(null),
  }

  return (
    <>
      {meeting.status === 'SUBMITTED' && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setDialog('changes')}
        >
          <Undo2 /> Request changes
        </Button>
      )}
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setDialog('certify')}
      >
        <PenLine /> Sign and certify
      </Button>

      <Dialog open={dialog === 'certify'} onOpenChange={props.onOpenChange}>
        <DialogContent className="sm:max-w-md">
          {dialog === 'certify' && <CertifyForm {...props} open />}
        </DialogContent>
      </Dialog>
      <Dialog open={dialog === 'changes'} onOpenChange={props.onOpenChange}>
        <DialogContent className="sm:max-w-md">
          {dialog === 'changes' && <RequestChangesForm {...props} open />}
        </DialogContent>
      </Dialog>
    </>
  )
}

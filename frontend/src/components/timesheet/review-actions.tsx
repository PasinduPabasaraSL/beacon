import { Check, MessageSquareWarning, RotateCcw } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
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
import { Textarea } from '@/components/ui/textarea'
import { useReviewTimesheet } from '@/hooks/queries'
import { errorMessage } from '@/lib/api'
import { displayName, formatHours, formatWeekRange } from '@/lib/format'
import type { Timesheet, UserSummary } from '@/lib/types'

interface ReviewActionsProps {
  projectId: string
  timesheet: Timesheet & { id: string }
  user: UserSummary
}

/** Approve / request changes on a submitted week, or reopen an approved one. */
export function ReviewActions({
  projectId,
  timesheet,
  user,
}: ReviewActionsProps) {
  const [open, setOpen] = useState(false)
  const review = useReviewTimesheet()
  const name = displayName(user)

  const approve = () =>
    review.mutate(
      { projectId, id: timesheet.id, input: { status: 'APPROVED' } },
      {
        onSuccess: () => toast.success(`Approved ${name}'s week`),
        onError: (error) => toast.error(errorMessage(error)),
      },
    )

  if (timesheet.status === 'APPROVED') {
    return (
      <>
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          <RotateCcw /> Reopen
        </Button>
        <RequestChangesDialog
          {...{ projectId, timesheet, user, open }}
          reopen
          onClose={() => setOpen(false)}
        />
      </>
    )
  }
  if (timesheet.status !== 'SUBMITTED') return null

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <MessageSquareWarning /> Request changes
      </Button>
      <Button size="sm" onClick={approve} disabled={review.isPending}>
        <Check /> {review.isPending ? 'Approving...' : 'Approve'}
      </Button>
      <RequestChangesDialog
        {...{ projectId, timesheet, user, open }}
        onClose={() => setOpen(false)}
      />
    </>
  )
}

function RequestChangesDialog({
  projectId,
  timesheet,
  user,
  open,
  reopen = false,
  onClose,
}: ReviewActionsProps & {
  open: boolean
  reopen?: boolean
  onClose: () => void
}) {
  const review = useReviewTimesheet()
  const [comment, setComment] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const missing = comment.trim() === ''
  const name = displayName(user)

  const close = () => {
    setComment('')
    setSubmitted(false)
    review.reset()
    onClose()
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    setSubmitted(true)
    if (missing) return
    review.mutate(
      {
        projectId,
        id: timesheet.id,
        input: { status: 'CHANGES_REQUESTED', comment: comment.trim() },
      },
      {
        onSuccess: () => {
          toast.success(`Sent ${name}'s week back for changes`)
          close()
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <DialogHeader>
            <DialogTitle>
              {reopen ? 'Reopen this week?' : 'Request changes'}
            </DialogTitle>
            <DialogDescription>
              {name} · {formatWeekRange(timesheet.weekStart)} ·{' '}
              {formatHours(timesheet.totalHours)}
              {reopen && '. The approval is withdrawn and they can edit again.'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`review-comment-${timesheet.id}`}>
              What should be changed?
            </Label>
            <Textarea
              id={`review-comment-${timesheet.id}`}
              rows={3}
              maxLength={1000}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              aria-invalid={submitted && missing}
              autoFocus
            />
            {submitted && missing && (
              <p className="text-destructive text-sm">
                Explain what needs to change
              </p>
            )}
          </div>
          {review.error && (
            <p className="text-destructive text-sm">
              {errorMessage(review.error)}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" disabled={review.isPending}>
              {review.isPending
                ? 'Sending...'
                : reopen
                  ? 'Reopen week'
                  : 'Request changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

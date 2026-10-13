import {
  Check,
  MessageSquareWarning,
  MoreHorizontal,
  Pencil,
  Trash2,
} from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { ContributionFormDialog } from '@/components/contributions/contribution-form-dialog'
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useDeleteContribution, useReviewContribution } from '@/hooks/queries'
import { errorMessage } from '@/lib/api'
import { displayName, formatHours } from '@/lib/format'
import type { ContributionEntry } from '@/lib/types'

export interface EntryPermissions {
  canEdit: boolean
  canReview: boolean
}

type OpenDialog = 'edit' | 'delete' | 'changes' | null

export function EntryActions({
  projectId,
  entry,
  permissions,
}: {
  projectId: string
  entry: ContributionEntry
  permissions: EntryPermissions
}) {
  const [dialog, setDialog] = useState<OpenDialog>(null)
  const review = useReviewContribution(projectId)
  const close = () => setDialog(null)

  const approve = () =>
    review.mutate(
      { id: entry.id, input: { status: 'APPROVED' } },
      {
        onSuccess: () => toast.success('Contribution approved'),
        onError: (error) => toast.error(errorMessage(error)),
      },
    )

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label="Entry actions">
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {permissions.canReview && (
            <>
              {entry.reviewStatus !== 'APPROVED' && (
                <DropdownMenuItem onSelect={approve}>
                  <Check /> Approve
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onSelect={() => setDialog('changes')}>
                <MessageSquareWarning /> Request changes
              </DropdownMenuItem>
            </>
          )}
          {permissions.canReview && permissions.canEdit && (
            <DropdownMenuSeparator />
          )}
          {permissions.canEdit && (
            <>
              <DropdownMenuItem onSelect={() => setDialog('edit')}>
                <Pencil /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => setDialog('delete')}
              >
                <Trash2 /> Delete
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <ContributionFormDialog
        projectId={projectId}
        week={entry.weekStart.slice(0, 10)}
        entry={entry}
        open={dialog === 'edit'}
        onOpenChange={(open) => !open && close()}
      />
      <DeleteDialog
        projectId={projectId}
        entry={entry}
        open={dialog === 'delete'}
        onClose={close}
      />
      <RequestChangesDialog
        projectId={projectId}
        entry={entry}
        open={dialog === 'changes'}
        onClose={close}
      />
    </>
  )
}

function DeleteDialog({
  projectId,
  entry,
  open,
  onClose,
}: {
  projectId: string
  entry: ContributionEntry
  open: boolean
  onClose: () => void
}) {
  const remove = useDeleteContribution(projectId)
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete this entry?</DialogTitle>
          <DialogDescription>
            {formatHours(entry.hours)} · {entry.description}
          </DialogDescription>
        </DialogHeader>
        {remove.error && (
          <p className="text-destructive text-sm">
            {errorMessage(remove.error)}
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={remove.isPending}
            onClick={() =>
              remove.mutate(entry.id, {
                onSuccess: () => {
                  toast.success('Entry deleted')
                  onClose()
                },
              })
            }
          >
            {remove.isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function RequestChangesDialog({
  projectId,
  entry,
  open,
  onClose,
}: {
  projectId: string
  entry: ContributionEntry
  open: boolean
  onClose: () => void
}) {
  const review = useReviewContribution(projectId)
  const [comment, setComment] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const missing = comment.trim() === ''

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    setSubmitted(true)
    if (missing) return
    review.mutate(
      {
        id: entry.id,
        input: { status: 'CHANGES_REQUESTED', comment: comment.trim() },
      },
      {
        onSuccess: () => {
          toast.success(`Changes requested from ${displayName(entry.user)}`)
          setComment('')
          setSubmitted(false)
          onClose()
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <DialogHeader>
            <DialogTitle>Request changes</DialogTitle>
            <DialogDescription>
              {displayName(entry.user)} · {formatHours(entry.hours)} ·{' '}
              {entry.description}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`review-comment-${entry.id}`}>
              What should be changed?
            </Label>
            <Textarea
              id={`review-comment-${entry.id}`}
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
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={review.isPending}>
              {review.isPending ? 'Sending...' : 'Request changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useDeleteMilestone, useSaveMilestone } from '@/hooks/queries'
import { errorMessage } from '@/lib/api'
import { formatDate } from '@/lib/format'
import type { Milestone } from '@/lib/types'

interface MilestoneFormDialogProps {
  projectId: string
  /** Present when editing. */
  milestone?: Milestone
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function MilestoneFormDialog(props: MilestoneFormDialogProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {props.open && <MilestoneForm {...props} />}
      </DialogContent>
    </Dialog>
  )
}

function MilestoneForm({
  projectId,
  milestone,
  onOpenChange,
}: MilestoneFormDialogProps) {
  const [title, setTitle] = useState(milestone?.title ?? '')
  const [dueDate, setDueDate] = useState(milestone?.dueDate.slice(0, 10) ?? '')
  const [description, setDescription] = useState(milestone?.description ?? '')
  const [submitted, setSubmitted] = useState(false)
  const save = useSaveMilestone(projectId)

  const titleError = title.trim() === '' ? 'Name the deliverable' : null
  const dueError = dueDate === '' ? 'Pick a due date' : null

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    setSubmitted(true)
    if (titleError || dueError) return
    save.mutate(
      {
        id: milestone?.id,
        input: {
          title: title.trim(),
          dueDate,
          description: description.trim() || null,
        },
      },
      {
        onSuccess: () => {
          toast.success(milestone ? 'Milestone updated' : 'Milestone added')
          onOpenChange(false)
        },
      },
    )
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <DialogHeader>
        <DialogTitle>
          {milestone ? 'Edit milestone' : 'Add milestone'}
        </DialogTitle>
        <DialogDescription>
          An assessed deliverable, such as a proposal, demo or final report.
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-2">
        <Label htmlFor="milestone-title">Title</Label>
        <Input
          id="milestone-title"
          maxLength={120}
          placeholder="e.g. Midterm demo"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          aria-invalid={submitted && !!titleError}
          autoFocus
        />
        {submitted && titleError && (
          <p className="text-destructive text-sm">{titleError}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="milestone-due">Due date</Label>
        <Input
          id="milestone-due"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          aria-invalid={submitted && !!dueError}
        />
        {submitted && dueError && (
          <p className="text-destructive text-sm">{dueError}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="milestone-description">
          Details{' '}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Textarea
          id="milestone-description"
          rows={3}
          maxLength={1000}
          placeholder="What has to be submitted or shown"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      {save.error && (
        <p className="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-sm">
          {errorMessage(save.error)}
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
        <Button type="submit" disabled={save.isPending}>
          {save.isPending
            ? 'Saving...'
            : milestone
              ? 'Save changes'
              : 'Add milestone'}
        </Button>
      </DialogFooter>
    </form>
  )
}

export function MilestoneActions({
  projectId,
  milestone,
}: {
  projectId: string
  milestone: Milestone
}) {
  const [dialog, setDialog] = useState<'edit' | 'delete' | null>(null)
  const remove = useDeleteMilestone(projectId)
  const close = () => setDialog(null)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label="Milestone actions">
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

      <MilestoneFormDialog
        projectId={projectId}
        milestone={milestone}
        open={dialog === 'edit'}
        onOpenChange={(open) => !open && close()}
      />
      <Dialog open={dialog === 'delete'} onOpenChange={(o) => !o && close()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete “{milestone.title}”?</DialogTitle>
            <DialogDescription>
              Due {formatDate(milestone.dueDate, true)}.{' '}
              {milestone.taskCount > 0
                ? `Its ${milestone.taskCount} ${milestone.taskCount === 1 ? 'task stays' : 'tasks stay'} on the board without a milestone.`
                : 'No tasks are linked to it.'}
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
                remove.mutate(milestone.id, {
                  onSuccess: () => {
                    toast.success('Milestone deleted')
                    close()
                  },
                })
              }
            >
              {remove.isPending ? 'Deleting...' : 'Delete milestone'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

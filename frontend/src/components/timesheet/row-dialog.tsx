import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { TaskSelect, TypeSelect } from '@/components/timesheet/fields'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAddRow, useUpdateRow } from '@/hooks/queries'
import { errorMessage } from '@/lib/api'
import { formatWeekRange } from '@/lib/format'
import type { ContributionType, TimesheetRow } from '@/lib/types'

const MAX_DESCRIPTION = 500

interface RowDialogProps {
  projectId: string
  week: string
  /** Present when editing an existing row. */
  row?: TimesheetRow
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function RowDialog(props: RowDialogProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {props.open && <RowForm {...props} />}
      </DialogContent>
    </Dialog>
  )
}

function RowForm({ projectId, week, row, onOpenChange }: RowDialogProps) {
  const [type, setType] = useState<ContributionType>(row?.type ?? 'DEVELOPMENT')
  const [taskId, setTaskId] = useState<string | null>(row?.task?.id ?? null)
  const [description, setDescription] = useState(row?.description ?? '')
  const [submitted, setSubmitted] = useState(false)

  const add = useAddRow(projectId)
  const update = useUpdateRow(projectId)
  const mutation = row ? update : add
  const missing = !taskId && description.trim() === ''

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    setSubmitted(true)
    if (missing) return
    const input = { type, taskId, description: description.trim() }
    const options = {
      onSuccess: () => {
        toast.success(row ? 'Row updated' : 'Row added')
        onOpenChange(false)
      },
    }
    if (row) update.mutate({ id: row.id, input }, options)
    else add.mutate({ ...input, week }, options)
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <DialogHeader>
        <DialogTitle>{row ? 'Edit row' : 'Add a row'}</DialogTitle>
        <DialogDescription>
          {row
            ? 'Hours already logged on this row stay as they are.'
            : `A row for the week of ${formatWeekRange(`${week}T00:00:00Z`)}. Fill in hours per day on the grid.`}
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-2">
        <Label htmlFor="row-type">Type of work</Label>
        <TypeSelect id="row-type" value={type} onChange={setType} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="row-task">
          Task{' '}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <TaskSelect
          id="row-task"
          projectId={projectId}
          value={taskId}
          onChange={setTaskId}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="row-description">
          Description
          {taskId && (
            <span className="text-muted-foreground font-normal">
              {' '}
              (optional)
            </span>
          )}
        </Label>
        <Input
          id="row-description"
          maxLength={MAX_DESCRIPTION}
          placeholder={taskId ? 'Add detail' : 'e.g. Sprint planning'}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          aria-invalid={submitted && missing}
          autoFocus
        />
        {submitted && missing && (
          <p className="text-destructive text-sm">
            Pick a task or describe the work
          </p>
        )}
      </div>

      {mutation.error && (
        <p className="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-sm">
          {errorMessage(mutation.error)}
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
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Saving...' : row ? 'Save row' : 'Add row'}
        </Button>
      </DialogFooter>
    </form>
  )
}

import { useMemo, useState, type FormEvent } from 'react'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  useBoard,
  useCreateContribution,
  useUpdateContribution,
} from '@/hooks/queries'
import { errorMessage } from '@/lib/api'
import {
  CONTRIBUTION_TYPE_COLORS,
  CONTRIBUTION_TYPE_LABELS,
  formatWeekRange,
} from '@/lib/format'
import type {
  ContributionEntry,
  ContributionInput,
  ContributionType,
} from '@/lib/types'
import { cn } from '@/lib/utils'

const NO_TASK = 'none'
const MAX_DESCRIPTION = 2000
const TYPES = Object.keys(CONTRIBUTION_TYPE_LABELS) as ContributionType[]

interface ContributionFormDialogProps {
  projectId: string
  /** YYYY-MM-DD of the week being logged; ignored when editing. */
  week: string
  /** Present when editing an existing entry. */
  entry?: ContributionEntry
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ContributionFormDialog(props: ContributionFormDialogProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {props.open && <ContributionForm {...props} />}
      </DialogContent>
    </Dialog>
  )
}

function ContributionForm({
  projectId,
  week,
  entry,
  onOpenChange,
}: ContributionFormDialogProps) {
  const weekStart = entry ? entry.weekStart.slice(0, 10) : week
  const [hours, setHours] = useState(entry ? String(entry.hours) : '')
  const [type, setType] = useState<ContributionType>(
    entry?.type ?? 'DEVELOPMENT',
  )
  const [taskId, setTaskId] = useState(entry?.task?.id ?? NO_TASK)
  const [description, setDescription] = useState(entry?.description ?? '')
  const [submitted, setSubmitted] = useState(false)

  const { data: board } = useBoard(projectId)
  const tasks = useMemo(
    () =>
      board?.columns
        .flatMap((column) => column.tasks)
        .sort((a, b) => a.number - b.number) ?? [],
    [board],
  )

  const create = useCreateContribution(projectId)
  const update = useUpdateContribution(projectId)
  const mutation = entry ? update : create

  const hoursValue = Number(hours)
  const hoursError =
    hours.trim() === '' || !Number.isFinite(hoursValue)
      ? 'Enter the hours you spent'
      : hoursValue < 0.25
        ? 'Log at least 0.25 hours'
        : hoursValue > 168
          ? 'A week has at most 168 hours'
          : Math.round(hoursValue * 100) !== hoursValue * 100
            ? 'Use at most two decimals'
            : null
  const descriptionError =
    description.trim() === '' ? 'Describe what you worked on' : null

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    setSubmitted(true)
    if (hoursError || descriptionError) return

    const input: ContributionInput = {
      week: weekStart,
      hours: hoursValue,
      type,
      taskId: taskId === NO_TASK ? null : taskId,
      description: description.trim(),
    }
    const options = {
      onSuccess: () => {
        toast.success(entry ? 'Entry updated' : 'Hours logged')
        onOpenChange(false)
      },
    }
    if (entry) update.mutate({ id: entry.id, input }, options)
    else create.mutate(input, options)
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <DialogHeader>
        <DialogTitle>{entry ? 'Edit contribution' : 'Log hours'}</DialogTitle>
        <DialogDescription>
          Week of {formatWeekRange(`${weekStart}T00:00:00Z`)}
          {entry?.reviewStatus === 'CHANGES_REQUESTED' &&
            ' · saving sends it back for review'}
        </DialogDescription>
      </DialogHeader>

      {entry?.reviewStatus === 'CHANGES_REQUESTED' && entry.reviewComment && (
        <p className="border-warning/35 bg-warning-soft text-warning-foreground rounded-md border px-3 py-2 text-sm">
          <span className="font-medium">Requested changes: </span>
          {entry.reviewComment}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
        <div className="flex flex-col gap-2">
          <Label htmlFor="contribution-hours">Hours</Label>
          <Input
            id="contribution-hours"
            type="number"
            inputMode="decimal"
            min={0.25}
            max={168}
            step={0.25}
            placeholder="e.g. 2.5"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            aria-invalid={submitted && !!hoursError}
            autoFocus
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="contribution-type">Type</Label>
          <Select
            value={type}
            onValueChange={(v) => setType(v as ContributionType)}
          >
            <SelectTrigger id="contribution-type" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  <span
                    className={cn(
                      'size-2 rounded-full',
                      CONTRIBUTION_TYPE_COLORS[t],
                    )}
                  />
                  {CONTRIBUTION_TYPE_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {submitted && hoursError && (
        <p className="text-destructive -mt-3 text-sm">{hoursError}</p>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="contribution-task">
          Task{' '}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Select value={taskId} onValueChange={setTaskId}>
          <SelectTrigger id="contribution-task" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_TASK}>No specific task</SelectItem>
            {tasks.map((task) => (
              <SelectItem key={task.id} value={task.id}>
                <span className="text-muted-foreground font-mono text-xs">
                  {task.key}
                </span>
                <span className="truncate">{task.title}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="contribution-description">What did you work on?</Label>
        <Textarea
          id="contribution-description"
          rows={4}
          maxLength={MAX_DESCRIPTION}
          placeholder="Summarise the work, decisions or outcomes for this week"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          aria-invalid={submitted && !!descriptionError}
        />
        <div className="flex justify-between text-xs">
          <span className="text-destructive">
            {submitted ? descriptionError : null}
          </span>
          <span className="text-muted-foreground">
            {description.length}/{MAX_DESCRIPTION}
          </span>
        </div>
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
          {mutation.isPending
            ? 'Saving...'
            : entry
              ? 'Save changes'
              : 'Log hours'}
        </Button>
      </DialogFooter>
    </form>
  )
}

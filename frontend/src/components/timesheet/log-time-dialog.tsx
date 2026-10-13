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
import { Textarea } from '@/components/ui/textarea'
import { useLogTime } from '@/hooks/queries'
import { errorMessage } from '@/lib/api'
import {
  formatHours,
  formatLongDay,
  localToday,
  parseHoursInput,
} from '@/lib/format'
import type { ContributionType } from '@/lib/types'

const MAX_NOTE = 1000

interface LogTimeDialogProps {
  projectId: string
  /** YYYY-MM-DD; defaults to today. */
  defaultDate?: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function LogTimeDialog(props: LogTimeDialogProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {props.open && <LogTimeForm {...props} />}
      </DialogContent>
    </Dialog>
  )
}

function hoursErrorFor(text: string, hours: number | null): string | null {
  if (text.trim() === '') return 'Enter the hours you spent'
  if (hours === null) return 'Use a number like 1.5 or 1:30'
  if (hours < 0.25) return 'Log at least 15 minutes'
  if (hours > 24) return 'A day has at most 24 hours'
  return null
}

function LogTimeForm({
  projectId,
  defaultDate,
  onOpenChange,
}: LogTimeDialogProps) {
  const today = localToday()
  const [date, setDate] = useState(defaultDate ?? today)
  const [hoursText, setHoursText] = useState('')
  const [type, setType] = useState<ContributionType>('DEVELOPMENT')
  const [taskId, setTaskId] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const log = useLogTime(projectId)

  const hours = parseHoursInput(hoursText)
  const hoursError = hoursErrorFor(hoursText, hours)
  const dateError = !date
    ? 'Pick a day'
    : date > today
      ? "You can't log time in the future"
      : null
  const noteError = note.trim() === '' ? 'Describe what you worked on' : null

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    setSubmitted(true)
    if (hoursError || dateError || noteError || hours === null) return
    const rounded = Math.round(hours * 100) / 100
    log.mutate(
      { date, hours: rounded, type, taskId, note: note.trim() },
      {
        onSuccess: () => {
          toast.success(
            `Logged ${formatHours(rounded)} on ${formatLongDay(date)}`,
          )
          onOpenChange(false)
        },
      },
    )
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <DialogHeader>
        <DialogTitle>Log time</DialogTitle>
        <DialogDescription>
          Adds the hours to that day on your weekly timesheet.
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="log-date">Date</Label>
          <Input
            id="log-date"
            type="date"
            max={today}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            aria-invalid={submitted && !!dateError}
          />
          {submitted && dateError && (
            <p className="text-destructive text-sm">{dateError}</p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="log-hours">Hours</Label>
          <Input
            id="log-hours"
            inputMode="decimal"
            placeholder="e.g. 1.5 or 1:30"
            value={hoursText}
            onChange={(e) => setHoursText(e.target.value)}
            aria-invalid={submitted && !!hoursError}
            autoFocus
          />
          {submitted && hoursError && (
            <p className="text-destructive text-sm">{hoursError}</p>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="log-type">Type</Label>
          <TypeSelect id="log-type" value={type} onChange={setType} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="log-task">
            Task{' '}
            <span className="text-muted-foreground font-normal">
              (optional)
            </span>
          </Label>
          <TaskSelect
            id="log-task"
            projectId={projectId}
            value={taskId}
            onChange={setTaskId}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="log-note">What did you work on?</Label>
        <Textarea
          id="log-note"
          rows={3}
          maxLength={MAX_NOTE}
          placeholder="Summarise the work, decisions or outcomes"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          aria-invalid={submitted && !!noteError}
        />
        <div className="flex justify-between text-xs">
          <span className="text-destructive">
            {submitted ? noteError : null}
          </span>
          <span className="text-muted-foreground">
            {note.length}/{MAX_NOTE}
          </span>
        </div>
      </div>

      {log.error && (
        <p className="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-sm">
          {errorMessage(log.error)}
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
        <Button type="submit" disabled={log.isPending}>
          {log.isPending ? 'Logging...' : 'Log hours'}
        </Button>
      </DialogFooter>
    </form>
  )
}

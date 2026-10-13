import { MonitorSmartphone, Users } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { UserAvatar } from '@/components/user-avatar'
import { useSaveMeeting } from '@/hooks/queries'
import { errorMessage } from '@/lib/api'
import {
  displayName,
  MEETING_ATTENDEE_LABELS,
  MEETING_MODE_DESCRIPTIONS,
  MEETING_MODE_LABELS,
  MEETING_PHASE_LABELS,
  MEETING_PHASE_LETTERS,
  MEETING_PHASES,
} from '@/lib/format'
import type {
  MeetingMode,
  MeetingPhase,
  MeetingRecord,
  RecordBookPerson,
} from '@/lib/types'
import { cn } from '@/lib/utils'

const MODES: { mode: MeetingMode; icon: typeof Users }[] = [
  { mode: 'ONLINE_UPDATE', icon: MonitorSmartphone },
  { mode: 'IN_PERSON', icon: Users },
]

/** The API rejects dates after today in UTC. */
const todayUtc = () => new Date().toISOString().slice(0, 10)

interface MeetingDialogProps {
  projectId: string
  members: RecordBookPerson[]
  /** Present when editing. */
  meeting?: MeetingRecord
  defaultPhase?: MeetingPhase
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function MeetingDialog(props: MeetingDialogProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        {props.open && <MeetingForm {...props} />}
      </DialogContent>
    </Dialog>
  )
}

function MeetingForm({
  projectId,
  members,
  meeting,
  defaultPhase,
  onOpenChange,
}: MeetingDialogProps) {
  const [mode, setMode] = useState<MeetingMode>(
    meeting?.mode ?? 'ONLINE_UPDATE',
  )
  const [phase, setPhase] = useState<MeetingPhase>(
    meeting?.phase ?? defaultPhase ?? 'PROBLEM_IDENTIFICATION',
  )
  const [meetingDate, setMeetingDate] = useState(
    meeting?.meetingDate.slice(0, 10) ?? todayUtc(),
  )
  const [attendeeIds, setAttendeeIds] = useState<Set<string>>(
    () =>
      new Set(
        meeting?.attendees.map((a) => a.id) ?? members.map((m) => m.user.id),
      ),
  )
  const [summary, setSummary] = useState(meeting?.summary ?? '')
  const [submitted, setSubmitted] = useState(false)
  const save = useSaveMeeting(projectId)

  const dateError =
    meetingDate === ''
      ? 'Pick the date'
      : meetingDate > todayUtc()
        ? 'The date cannot be in the future'
        : null
  const attendeeError =
    attendeeIds.size === 0 ? 'Pick at least one group member' : null
  const summaryError =
    summary.trim() === '' ? 'Summarise what was discussed' : null

  const toggleAttendee = (id: string, checked: boolean) =>
    setAttendeeIds((current) => {
      const next = new Set(current)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    setSubmitted(true)
    if (dateError || attendeeError || summaryError) return
    save.mutate(
      {
        id: meeting?.id,
        input: {
          mode,
          phase,
          meetingDate,
          summary: summary.trim(),
          attendeeIds: [...attendeeIds],
        },
      },
      {
        onSuccess: () => {
          toast.success(meeting ? 'Entry updated' : 'Entry added')
          onOpenChange(false)
        },
      },
    )
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <DialogHeader>
        <DialogTitle>
          {meeting ? `Edit meeting ${meeting.number}` : 'Add record book entry'}
        </DialogTitle>
        <DialogDescription>
          {meeting?.status === 'CHANGES_REQUESTED'
            ? 'Saving sends the entry back to your supervisor.'
            : 'Your supervisor certifies the entry with their signature.'}
        </DialogDescription>
      </DialogHeader>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">How did you meet?</legend>
        <RadioGroup
          value={mode}
          onValueChange={(value) => setMode(value as MeetingMode)}
          className="grid gap-2 sm:grid-cols-2"
        >
          {MODES.map(({ mode: option, icon: Icon }) => (
            <Label
              key={option}
              htmlFor={`mode-${option}`}
              className={cn(
                'hover:bg-muted/40 flex cursor-pointer items-start gap-3 rounded-md border p-3 font-normal',
                mode === option && 'border-foreground/40 bg-muted/40',
              )}
            >
              <RadioGroupItem
                id={`mode-${option}`}
                value={option}
                className="mt-0.5"
              />
              <span className="flex flex-col gap-0.5">
                <span className="flex items-center gap-1.5 font-medium">
                  <Icon className="size-3.5" />
                  {MEETING_MODE_LABELS[option]}
                </span>
                <span className="text-muted-foreground text-xs">
                  {MEETING_MODE_DESCRIPTIONS[option]}
                </span>
              </span>
            </Label>
          ))}
        </RadioGroup>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
        <div className="flex min-w-0 flex-col gap-2">
          <Label htmlFor="meeting-phase">Phase</Label>
          <Select
            value={phase}
            onValueChange={(value) => setPhase(value as MeetingPhase)}
          >
            <SelectTrigger id="meeting-phase" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MEETING_PHASES.map((option) => (
                <SelectItem key={option} value={option}>
                  {MEETING_PHASE_LETTERS[option]}.{' '}
                  {MEETING_PHASE_LABELS[option]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="meeting-date">Date</Label>
          <Input
            id="meeting-date"
            type="date"
            max={todayUtc()}
            value={meetingDate}
            onChange={(e) => setMeetingDate(e.target.value)}
            aria-invalid={submitted && !!dateError}
          />
        </div>
      </div>
      {submitted && dateError && (
        <p className="text-destructive -mt-3 text-sm">{dateError}</p>
      )}

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">
          {MEETING_ATTENDEE_LABELS[mode]}
        </legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {members.map(({ user, registrationNumber }) => (
            <Label
              key={user.id}
              className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 font-normal"
            >
              <Checkbox
                checked={attendeeIds.has(user.id)}
                onCheckedChange={(checked) =>
                  toggleAttendee(user.id, checked === true)
                }
              />
              <UserAvatar user={user} size="sm" withTooltip={false} />
              <span className="min-w-0 truncate">{displayName(user)}</span>
              {registrationNumber && (
                <span className="text-muted-foreground ml-auto font-mono text-xs">
                  {registrationNumber}
                </span>
              )}
            </Label>
          ))}
        </div>
        {submitted && attendeeError && (
          <p className="text-destructive text-sm">{attendeeError}</p>
        )}
      </fieldset>

      <div className="flex flex-col gap-2">
        <Label htmlFor="meeting-summary">Discussion and progress</Label>
        <Textarea
          id="meeting-summary"
          rows={5}
          maxLength={4000}
          placeholder="What you showed, what was discussed and the agreed next steps"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          aria-invalid={submitted && !!summaryError}
        />
        {submitted && summaryError && (
          <p className="text-destructive text-sm">{summaryError}</p>
        )}
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
            : !meeting
              ? 'Add entry'
              : meeting.status === 'CHANGES_REQUESTED'
                ? 'Save and resubmit'
                : 'Save changes'}
        </Button>
      </DialogFooter>
    </form>
  )
}

import { Plus, X } from 'lucide-react'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useUpdateSemester } from '@/hooks/queries'
import { errorMessage } from '@/lib/api'
import {
  formatDate,
  formatWeekRange,
  isoWeekStart,
  SEMESTER_BREAK_LABELS,
  shiftWeek,
} from '@/lib/format'
import type { Semester, SemesterBreakKind } from '@/lib/types'

const MAX_WEEKS = 52
const DEFAULT_WEEKS = 14

interface BreakRow {
  key: number
  week: string
  kind: SemesterBreakKind
  label: string
}

interface SemesterFormDialogProps {
  workspaceId: string
  workspaceName: string
  semester: Semester | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SemesterFormDialog(props: SemesterFormDialogProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        {props.open && <SemesterForm {...props} />}
      </DialogContent>
    </Dialog>
  )
}

function SemesterForm({
  workspaceId,
  workspaceName,
  semester,
  onOpenChange,
}: SemesterFormDialogProps) {
  const [name, setName] = useState(semester?.name ?? '')
  const [startDate, setStartDate] = useState(
    semester?.startDate.slice(0, 10) ?? isoWeekStart(new Date()),
  )
  const [weeks, setWeeks] = useState(String(semester?.weeks ?? DEFAULT_WEEKS))
  const [breaks, setBreaks] = useState<BreakRow[]>(
    () =>
      semester?.calendar
        .filter((w) => w.kind !== 'TEACHING')
        .map((w, index) => ({
          key: index,
          week: w.weekStart.slice(0, 10),
          kind: w.kind as SemesterBreakKind,
          label: w.label ?? '',
        })) ?? [],
  )
  const [submitted, setSubmitted] = useState(false)
  const update = useUpdateSemester(workspaceId)

  const weekCount = Number(weeks)
  const validLength =
    Number.isInteger(weekCount) && weekCount >= 1 && weekCount <= MAX_WEEKS
  const firstMonday = startDate
    ? isoWeekStart(new Date(`${startDate}T00:00:00Z`))
    : null
  const weekOptions =
    firstMonday && validLength
      ? Array.from({ length: weekCount }, (_, i) => shiftWeek(firstMonday, i))
      : []

  const chosen = breaks.map((b) => b.week)
  const error = !firstMonday
    ? 'Pick the first teaching week'
    : !validLength
      ? `Use between 1 and ${MAX_WEEKS} weeks`
      : breaks.some((b) => !weekOptions.includes(b.week))
        ? 'Choose a week inside the semester for every break'
        : new Set(chosen).size !== chosen.length
          ? 'Each week can only be marked once'
          : breaks.length >= weekCount
            ? 'Leave at least one teaching week'
            : null

  const changeBreak = (key: number, patch: Partial<BreakRow>) =>
    setBreaks((rows) =>
      rows.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    )

  const addBreak = () =>
    setBreaks((rows) => [
      ...rows,
      {
        key: Math.max(0, ...rows.map((r) => r.key)) + 1,
        week: weekOptions.find((w) => !chosen.includes(w)) ?? '',
        kind: 'BREAK',
        label: '',
      },
    ])

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    setSubmitted(true)
    if (error || !firstMonday) return
    update.mutate(
      {
        name: name.trim() || undefined,
        startDate: firstMonday,
        weeks: weekCount,
        breaks: breaks.map((b) => ({
          week: b.week,
          kind: b.kind,
          label: b.label.trim() || undefined,
        })),
      },
      {
        onSuccess: () => {
          toast.success('Semester saved')
          onOpenChange(false)
        },
      },
    )
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <DialogHeader>
        <DialogTitle>
          {semester ? 'Edit semester' : 'Set up semester'}
        </DialogTitle>
        <DialogDescription>
          Shared by every group in {workspaceName}. Weekly logs and milestones
          are shown against these weeks.
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-2">
        <Label htmlFor="semester-name">
          Name{' '}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Input
          id="semester-name"
          maxLength={60}
          placeholder="e.g. Semester 2, 2026"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
        <div className="flex flex-col gap-2">
          <Label htmlFor="semester-start">First teaching week</Label>
          <Input
            id="semester-start"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          {firstMonday && (
            <p className="text-muted-foreground text-xs">
              Week 1 starts Monday{' '}
              {formatDate(`${firstMonday}T00:00:00Z`, true)}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="semester-weeks">Length (weeks)</Label>
          <Input
            id="semester-weeks"
            type="number"
            min={1}
            max={MAX_WEEKS}
            value={weeks}
            onChange={(e) => setWeeks(e.target.value)}
          />
          <p className="text-muted-foreground text-xs">Including breaks</p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Break and exam weeks</p>
            <p className="text-muted-foreground text-xs">
              These weeks are not numbered, and logging hours is optional.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addBreak}
            disabled={weekOptions.length === 0}
          >
            <Plus /> Add week
          </Button>
        </div>
        {breaks.map((row) => (
          <div
            key={row.key}
            className="grid grid-cols-[1fr_6.5rem_auto] gap-2 sm:grid-cols-[1fr_6.5rem_1fr_auto]"
          >
            <Select
              value={row.week}
              onValueChange={(week) => changeBreak(row.key, { week })}
            >
              <SelectTrigger className="w-full" aria-label="Week">
                <SelectValue placeholder="Choose a week" />
              </SelectTrigger>
              <SelectContent>
                {weekOptions.map((week) => (
                  <SelectItem key={week} value={week}>
                    {formatWeekRange(`${week}T00:00:00Z`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={row.kind}
              onValueChange={(kind) =>
                changeBreak(row.key, { kind: kind as SemesterBreakKind })
              }
            >
              <SelectTrigger className="w-full" aria-label="Kind">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(['BREAK', 'EXAM'] as const).map((kind) => (
                  <SelectItem key={kind} value={kind}>
                    {SEMESTER_BREAK_LABELS[kind]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              className="col-span-2 row-start-2 sm:col-span-1 sm:row-start-auto"
              aria-label="Label"
              maxLength={40}
              placeholder="Label (optional)"
              value={row.label}
              onChange={(e) => changeBreak(row.key, { label: e.target.value })}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Remove week"
              onClick={() =>
                setBreaks((rows) => rows.filter((r) => r.key !== row.key))
              }
            >
              <X />
            </Button>
          </div>
        ))}
      </div>

      {submitted && error && (
        <p className="text-destructive text-sm">{error}</p>
      )}
      {update.error && (
        <p className="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-sm">
          {errorMessage(update.error)}
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
        <Button type="submit" disabled={update.isPending}>
          {update.isPending ? 'Saving...' : 'Save semester'}
        </Button>
      </DialogFooter>
    </form>
  )
}

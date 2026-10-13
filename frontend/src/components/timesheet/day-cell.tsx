import { MessageSquareText } from 'lucide-react'
import { useRef, useState, type KeyboardEvent } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Textarea } from '@/components/ui/textarea'
import { useSetDay } from '@/hooks/queries'
import { errorMessage } from '@/lib/api'
import { formatHoursValue, formatLongDay, parseHoursInput } from '@/lib/format'
import type { TimesheetDay } from '@/lib/types'
import { cn } from '@/lib/utils'

const MAX_NOTE = 1000

interface DayCellProps {
  projectId: string
  week: string
  rowId: string
  /** Used in accessible labels, e.g. "BCN-3 Login page". */
  itemLabel: string
  date: string
  day: TimesheetDay | undefined
  editable: boolean
  /** Grid position for keyboard navigation. */
  position: { row: number; day: number }
}

function focusCell(from: HTMLElement, row: number, day: number) {
  const target = from
    .closest('table')
    ?.querySelector<HTMLInputElement>(`[data-cell="${row}:${day}"]`)
  target?.focus()
}

export function DayCell({
  projectId,
  week,
  rowId,
  itemLabel,
  date,
  day,
  editable,
  position,
}: DayCellProps) {
  const hours = day?.hours ?? 0
  const note = day?.note ?? null
  const shown = hours > 0 ? formatHoursValue(hours) : ''
  const [draft, setDraft] = useState<string | null>(null)
  const skipCommit = useRef(false)
  const setDay = useSetDay(projectId, week)
  const label = `${itemLabel} hours on ${formatLongDay(date)}`

  const save = (nextHours: number, nextNote?: string) =>
    setDay.mutate(
      { rowId, date, hours: nextHours, note: nextNote },
      { onError: (error) => toast.error(errorMessage(error)) },
    )

  const commit = (text: string) => {
    const parsed = parseHoursInput(text)
    if (parsed === null) {
      toast.error('Use hours like 1.5, 1:30 or 90m')
      return
    }
    if (parsed > 24) {
      toast.error('A day has at most 24 hours')
      return
    }
    const rounded = Math.round(parsed * 100) / 100
    if (rounded !== hours) save(rounded)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const input = event.currentTarget
    if (event.key === 'Escape') {
      skipCommit.current = true
      input.blur()
    } else if (event.key === 'Enter' || event.key === 'ArrowDown') {
      event.preventDefault()
      input.blur()
      focusCell(input, position.row + 1, position.day)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      input.blur()
      focusCell(input, position.row - 1, position.day)
    }
  }

  return (
    <div className="group/cell relative h-full min-h-12">
      {editable ? (
        <input
          aria-label={label}
          data-cell={`${position.row}:${position.day}`}
          inputMode="decimal"
          autoComplete="off"
          placeholder="–"
          value={draft ?? shown}
          onFocus={(e) => {
            setDraft(shown)
            e.currentTarget.select()
          }}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            if (!skipCommit.current && draft !== null && draft !== shown) {
              commit(draft)
            }
            skipCommit.current = false
            setDraft(null)
          }}
          onKeyDown={onKeyDown}
          className="hover:bg-muted/60 focus:bg-background focus:ring-ring placeholder:text-muted-foreground/50 absolute inset-0 size-full bg-transparent text-center text-sm font-medium tabular-nums outline-none focus:ring-2 focus:ring-inset"
        />
      ) : (
        <span
          aria-label={label}
          className={cn(
            'absolute inset-0 flex items-center justify-center text-sm tabular-nums',
            hours > 0 ? 'font-medium' : 'text-muted-foreground/50',
          )}
        >
          {shown || '–'}
        </span>
      )}
      {(note || editable) && (
        <NoteButton
          note={note}
          date={date}
          itemLabel={itemLabel}
          editable={editable}
          pending={setDay.isPending}
          onSave={(next) => save(hours, next)}
        />
      )}
    </div>
  )
}

function NoteButton({
  note,
  date,
  itemLabel,
  editable,
  pending,
  onSave,
}: {
  note: string | null
  date: string
  itemLabel: string
  editable: boolean
  pending: boolean
  onSave: (note: string) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`${note ? 'Note' : 'Add note'} for ${itemLabel} on ${formatLongDay(date)}`}
          className={cn(
            'focus-visible:ring-ring absolute top-0.5 right-0.5 z-10 flex size-5 items-center justify-center rounded outline-none focus-visible:ring-2',
            note
              ? 'text-brand-strong hover:bg-brand-soft'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground opacity-0 group-hover/cell:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100',
          )}
        >
          <MessageSquareText className="size-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72">
        {open && (
          <NoteEditor
            note={note}
            date={date}
            editable={editable}
            pending={pending}
            onSave={(next) => {
              onSave(next)
              setOpen(false)
            }}
          />
        )}
      </PopoverContent>
    </Popover>
  )
}

function NoteEditor({
  note,
  date,
  editable,
  pending,
  onSave,
}: {
  note: string | null
  date: string
  editable: boolean
  pending: boolean
  onSave: (note: string) => void
}) {
  const [text, setText] = useState(note ?? '')
  return (
    <div className="flex flex-col gap-3">
      <p className="text-muted-foreground text-xs font-medium">
        {formatLongDay(date)}
      </p>
      {editable ? (
        <>
          <Textarea
            aria-label="Note"
            rows={3}
            maxLength={MAX_NOTE}
            placeholder="What did you do this day?"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                onSave(text.trim())
              }
            }}
            autoFocus
          />
          <div className="flex justify-end gap-2">
            {note && (
              <Button
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={() => onSave('')}
              >
                Remove
              </Button>
            )}
            <Button
              size="sm"
              disabled={pending || text.trim() === (note ?? '')}
              onClick={() => onSave(text.trim())}
            >
              Save note
            </Button>
          </div>
        </>
      ) : (
        <p className="text-sm whitespace-pre-wrap">{note}</p>
      )}
    </div>
  )
}

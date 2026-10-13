import { MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { DayCell } from '@/components/timesheet/day-cell'
import { RowDialog } from '@/components/timesheet/row-dialog'
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
import { useDeleteRow } from '@/hooks/queries'
import { errorMessage } from '@/lib/api'
import {
  CONTRIBUTION_TYPE_COLORS,
  CONTRIBUTION_TYPE_LABELS,
  formatHours,
  formatHoursValue,
  formatWeekday,
  localToday,
} from '@/lib/format'
import type { Timesheet, TimesheetRow } from '@/lib/types'
import { cn } from '@/lib/utils'

interface TimesheetGridProps {
  projectId: string
  week: string
  /** YYYY-MM-DD, Monday to Sunday. */
  days: string[]
  timesheet: Timesheet
  /** The viewer owns this sheet and it is open for edits. */
  editable: boolean
}

function rowLabel(row: TimesheetRow): string {
  if (row.task) return `${row.task.key} ${row.task.title}`
  return row.description || CONTRIBUTION_TYPE_LABELS[row.type]
}

const isWeekend = (index: number) => index >= 5

export function TimesheetGrid({
  projectId,
  week,
  days,
  timesheet,
  editable,
}: TimesheetGridProps) {
  const today = localToday()
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<TimesheetRow | null>(null)
  const [deleting, setDeleting] = useState<TimesheetRow | null>(null)
  const { rows } = timesheet

  const dayColumnClass = (index: number) =>
    cn(
      'border-l',
      isWeekend(index) && 'bg-muted/40',
      days[index] === today && 'bg-brand-soft/40',
    )

  return (
    <div className="bg-card overflow-x-auto rounded-xl border">
      <table className="w-full min-w-240 table-fixed border-collapse text-sm">
        <colgroup>
          <col />
          {days.map((day) => (
            <col key={day} className="w-21" />
          ))}
          <col className="w-20" />
          <col className="w-11" />
        </colgroup>
        <thead>
          <tr className="border-b">
            <th className="bg-card text-muted-foreground sticky left-0 z-20 px-4 py-2.5 text-left text-xs font-medium">
              Item
            </th>
            {days.map((day, index) => {
              const isToday = day === today
              return (
                <th
                  key={day}
                  className={cn(dayColumnClass(index), 'px-1 py-2 font-normal')}
                >
                  <span
                    className={cn(
                      'text-muted-foreground block text-[11px] font-medium tracking-wide uppercase',
                      isToday && 'text-brand-strong',
                    )}
                  >
                    {formatWeekday(day)}
                  </span>
                  <span
                    className={cn(
                      'mx-auto mt-0.5 flex size-6 items-center justify-center rounded-full text-sm font-semibold tabular-nums',
                      isToday && 'bg-brand text-brand-foreground',
                    )}
                  >
                    {Number(day.slice(8))}
                  </span>
                </th>
              )
            })}
            <th className="text-muted-foreground border-l px-2 text-right text-xs font-medium">
              Total
            </th>
            <th>
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr className="border-b">
              <td colSpan={days.length + 3} className="px-4 py-10 text-center">
                <p className="font-medium">
                  {editable ? 'No rows yet' : 'No time logged this week'}
                </p>
                <p className="text-muted-foreground mt-1 text-sm">
                  {editable
                    ? 'Add a row for each task or kind of work, then fill in the hours per day.'
                    : 'Rows appear here once hours are logged.'}
                </p>
              </td>
            </tr>
          )}
          {rows.map((row, rowIndex) => {
            const label = rowLabel(row)
            return (
              <tr key={row.id} className="group/row border-b">
                <td className="bg-card sticky left-0 z-10 p-0">
                  <div className="relative flex min-h-12 items-center gap-2.5 py-1.5 pr-2 pl-4">
                    <span
                      aria-hidden
                      className={cn(
                        'absolute inset-y-1.5 left-0 w-1 rounded-r',
                        CONTRIBUTION_TYPE_COLORS[row.type],
                      )}
                    />
                    <RowItem row={row} />
                  </div>
                </td>
                {days.map((day, dayIndex) => (
                  <td
                    key={day}
                    className={cn(dayColumnClass(dayIndex), 'h-12 p-0')}
                  >
                    <DayCell
                      projectId={projectId}
                      week={week}
                      rowId={row.id}
                      itemLabel={label}
                      date={day}
                      day={row.days.find((d) => d.date === day)}
                      editable={editable && day <= today}
                      position={{ row: rowIndex, day: dayIndex }}
                    />
                  </td>
                ))}
                <td className="border-l px-2 text-right font-semibold tabular-nums">
                  {row.hours > 0 ? formatHours(row.hours) : '–'}
                </td>
                <td className="px-1 text-center">
                  {editable && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Row actions for ${label}`}
                          className="opacity-60 group-hover/row:opacity-100 data-[state=open]:opacity-100"
                        >
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => setEditing(row)}>
                          <Pencil /> Edit row
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onSelect={() => setDeleting(row)}
                        >
                          <Trash2 /> Delete row
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </td>
              </tr>
            )
          })}
          {editable && (
            <tr className="border-b">
              <td colSpan={days.length + 3} className="p-0">
                <button
                  type="button"
                  onClick={() => setAdding(true)}
                  className="text-muted-foreground hover:bg-muted/50 hover:text-foreground focus-visible:ring-ring flex w-full items-center gap-2 px-4 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-inset"
                >
                  <Plus className="size-4" /> Add row
                </button>
              </td>
            </tr>
          )}
        </tbody>
        <tfoot>
          <tr className="bg-muted">
            <th
              scope="row"
              className="bg-muted sticky left-0 z-10 rounded-bl-xl px-4 py-3 text-left text-xs font-medium"
            >
              Daily total
            </th>
            {timesheet.dailyHours.map((hours, index) => (
              <td
                key={days[index]}
                className={cn(
                  dayColumnClass(index),
                  'text-center font-semibold tabular-nums',
                  hours === 0 && 'text-muted-foreground/60 font-normal',
                )}
              >
                {hours > 0 ? formatHoursValue(hours) : '–'}
              </td>
            ))}
            <td className="text-brand-strong border-l px-2 text-right text-base font-semibold tabular-nums">
              {formatHours(timesheet.totalHours)}
            </td>
            <td />
          </tr>
        </tfoot>
      </table>

      <RowDialog
        projectId={projectId}
        week={week}
        open={adding}
        onOpenChange={setAdding}
      />
      <RowDialog
        projectId={projectId}
        week={week}
        row={editing ?? undefined}
        open={!!editing}
        onOpenChange={(open) => !open && setEditing(null)}
      />
      <DeleteRowDialog
        projectId={projectId}
        row={deleting}
        onClose={() => setDeleting(null)}
      />
    </div>
  )
}

function RowItem({ row }: { row: TimesheetRow }) {
  const title = row.task?.title ?? row.description
  const detail = row.task && row.description ? row.description : null
  return (
    <div className="min-w-0 flex-1">
      <p className="flex min-w-0 items-baseline gap-1.5">
        {row.task && (
          <span className="text-muted-foreground shrink-0 font-mono text-xs">
            {row.task.key}
          </span>
        )}
        <span className="truncate font-medium" title={title}>
          {title || CONTRIBUTION_TYPE_LABELS[row.type]}
        </span>
      </p>
      <p className="text-muted-foreground truncate text-xs">
        {CONTRIBUTION_TYPE_LABELS[row.type]}
        {detail && ` · ${detail}`}
      </p>
    </div>
  )
}

function DeleteRowDialog({
  projectId,
  row,
  onClose,
}: {
  projectId: string
  row: TimesheetRow | null
  onClose: () => void
}) {
  const remove = useDeleteRow(projectId)
  return (
    <Dialog open={!!row} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete this row?</DialogTitle>
          <DialogDescription>
            {row && rowLabel(row)}
            {row &&
              row.hours > 0 &&
              ` · ${formatHours(row.hours)} and any day notes will be removed.`}
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
            disabled={remove.isPending || !row}
            onClick={() =>
              row &&
              remove.mutate(row.id, {
                onSuccess: () => {
                  toast.success('Row deleted')
                  onClose()
                },
              })
            }
          >
            {remove.isPending ? 'Deleting...' : 'Delete row'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

import { Coffee, NotebookPen } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { academicWeekLabel, formatWeekRange, isoWeekStart } from '@/lib/format'
import type { AcademicWeek, Milestone, Semester } from '@/lib/types'
import { cn } from '@/lib/utils'

function WeekCell({
  week,
  teachingWeeks,
  isCurrent,
  isPast,
  milestones,
}: {
  week: AcademicWeek
  teachingWeeks: number
  isCurrent: boolean
  isPast: boolean
  milestones: Milestone[]
}) {
  const label = academicWeekLabel(week, teachingWeeks)
  const isTeaching = week.kind === 'TEACHING'

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          tabIndex={0}
          aria-label={`${label}, ${formatWeekRange(week.weekStart)}`}
          aria-current={isCurrent ? 'date' : undefined}
          className={cn(
            'focus-visible:ring-ring relative flex h-10 items-center justify-center rounded-md border text-xs font-medium tabular-nums outline-none focus-visible:ring-2',
            isTeaching
              ? isPast
                ? 'bg-muted text-muted-foreground'
                : 'bg-background'
              : 'bg-muted/40 text-muted-foreground border-dashed',
            isCurrent &&
              'border-brand bg-brand text-brand-foreground border-solid',
          )}
        >
          {isTeaching ? (
            week.teachingWeek
          ) : week.kind === 'EXAM' ? (
            <NotebookPen className="size-3.5" />
          ) : (
            <Coffee className="size-3.5" />
          )}
          {milestones.length > 0 && (
            <span
              className={cn(
                'ring-background absolute -bottom-1 left-1/2 size-2 -translate-x-1/2 rounded-full ring-2',
                isCurrent ? 'bg-brand-strong' : 'bg-foreground',
              )}
            />
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent className="max-w-64">
        <p className="font-medium">
          {label}
          {isCurrent && ' · this week'}
        </p>
        <p className="opacity-70">{formatWeekRange(week.weekStart)}</p>
        {milestones.map((m) => (
          <p key={m.id}>Due: {m.title}</p>
        ))}
      </TooltipContent>
    </Tooltip>
  )
}

export function SemesterStrip({
  semester,
  milestones,
}: {
  semester: Semester
  milestones: Milestone[]
}) {
  const thisWeek = isoWeekStart(new Date())
  const dueIn = (week: AcademicWeek) =>
    milestones.filter(
      (m) => isoWeekStart(new Date(m.dueDate)) === week.weekStart.slice(0, 10),
    )

  return (
    <div className="flex flex-col gap-3">
      <div className="grid auto-cols-[minmax(2rem,1fr)] grid-flow-col gap-1 overflow-x-auto pb-2">
        {semester.calendar.map((week) => {
          const day = week.weekStart.slice(0, 10)
          return (
            <WeekCell
              key={day}
              week={week}
              teachingWeeks={semester.teachingWeeks}
              isCurrent={day === thisWeek}
              isPast={day < thisWeek}
              milestones={dueIn(week)}
            />
          )
        })}
      </div>
      <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="bg-brand size-2.5 rounded-sm" /> This week
        </span>
        <span className="flex items-center gap-1.5">
          <Coffee className="size-3.5" /> Break
        </span>
        <span className="flex items-center gap-1.5">
          <NotebookPen className="size-3.5" /> Exams
        </span>
        <span className="flex items-center gap-1.5">
          <span className="bg-foreground size-2 rounded-full" /> Milestone due
        </span>
      </div>
    </div>
  )
}

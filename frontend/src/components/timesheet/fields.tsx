import { useMemo } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useBoard } from '@/hooks/queries'
import {
  CONTRIBUTION_TYPE_COLORS,
  CONTRIBUTION_TYPE_LABELS,
} from '@/lib/format'
import type { ContributionType } from '@/lib/types'
import { cn } from '@/lib/utils'

const NO_TASK = 'none'
const CONTRIBUTION_TYPES = Object.keys(
  CONTRIBUTION_TYPE_LABELS,
) as ContributionType[]

export function TypeSelect({
  id,
  value,
  onChange,
}: {
  id: string
  value: ContributionType
  onChange: (type: ContributionType) => void
}) {
  return (
    <Select
      value={value}
      onValueChange={(v) => onChange(v as ContributionType)}
    >
      <SelectTrigger id={id} className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {CONTRIBUTION_TYPES.map((type) => (
          <SelectItem key={type} value={type}>
            <span
              className={cn(
                'size-2 rounded-full',
                CONTRIBUTION_TYPE_COLORS[type],
              )}
            />
            {CONTRIBUTION_TYPE_LABELS[type]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function TaskSelect({
  id,
  projectId,
  value,
  onChange,
}: {
  id: string
  projectId: string
  value: string | null
  onChange: (taskId: string | null) => void
}) {
  const { data: board } = useBoard(projectId)
  const tasks = useMemo(
    () =>
      board?.columns
        .flatMap((column) => column.tasks)
        .sort((a, b) => a.number - b.number) ?? [],
    [board],
  )

  return (
    <Select
      value={value ?? NO_TASK}
      onValueChange={(v) => onChange(v === NO_TASK ? null : v)}
    >
      <SelectTrigger id={id} className="w-full">
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
  )
}

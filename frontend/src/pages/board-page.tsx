import { CalendarDays, Lock } from 'lucide-react'
import { useParams, useSearchParams } from 'react-router'
import { PriorityBadge } from '@/components/badges'
import { ErrorState } from '@/components/query-state'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { UserAvatarStack } from '@/components/user-avatar'
import { useBoard, useProject } from '@/hooks/queries'
import { CATEGORY_LABELS, formatDate, isOverdue } from '@/lib/format'
import type { BoardColumn, BoardTask } from '@/lib/types'
import { cn } from '@/lib/utils'

function TaskCard({ task, done }: { task: BoardTask; done: boolean }) {
  const overdue = isOverdue(task.dueDate, done)
  return (
    <article className="bg-card flex flex-col gap-2.5 rounded-lg border p-3 shadow-xs">
      <div className="flex items-center justify-between gap-2">
        <span className="text-muted-foreground font-mono text-xs">
          {task.key}
        </span>
        <PriorityBadge priority={task.priority} />
      </div>
      <p className={cn('text-sm font-medium', done && 'text-muted-foreground')}>
        {task.title}
      </p>
      {task.openBlockers.length > 0 && (
        <p className="flex items-center gap-1.5 text-xs text-amber-700">
          <Lock className="size-3" />
          Blocked by {task.openBlockers.join(', ')}
        </p>
      )}
      {(task.dueDate || task.assignees.length > 0) && (
        <div className="flex items-center justify-between gap-2">
          {task.dueDate ? (
            <span
              className={cn(
                'flex items-center gap-1 text-xs',
                overdue ? 'font-medium text-red-600' : 'text-muted-foreground',
              )}
            >
              <CalendarDays className="size-3" />
              {overdue ? 'Overdue · ' : ''}
              {formatDate(task.dueDate)}
            </span>
          ) : (
            <span />
          )}
          <UserAvatarStack users={task.assignees} max={3} />
        </div>
      )}
    </article>
  )
}

function Column({ column }: { column: BoardColumn }) {
  const done = column.category === 'DONE'
  return (
    <section className="bg-muted/50 flex w-72 shrink-0 flex-col gap-3 rounded-xl p-3">
      <header className="flex items-center gap-2 px-1">
        <span
          className="size-2.5 rounded-full"
          style={{ backgroundColor: column.color ?? '#94a3b8' }}
        />
        <h2 className="text-sm font-semibold">{column.name}</h2>
        <span className="text-muted-foreground text-xs tabular-nums">
          {column.tasks.length}
        </span>
        {column.name.toLowerCase() !==
          CATEGORY_LABELS[column.category].toLowerCase() && (
          <span className="text-muted-foreground ml-auto text-[11px]">
            {CATEGORY_LABELS[column.category]}
          </span>
        )}
      </header>
      <div className="flex flex-col gap-2">
        {column.tasks.length === 0 ? (
          <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-center text-xs">
            No tasks
          </p>
        ) : (
          column.tasks.map((task) => (
            <TaskCard key={task.id} task={task} done={done} />
          ))
        )}
      </div>
    </section>
  )
}

export function BoardPage() {
  const { projectId = '' } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const sprintId = searchParams.get('sprint') ?? undefined

  const { data: project } = useProject(projectId)
  const {
    data: board,
    error,
    isPending,
    refetch,
  } = useBoard(projectId, sprintId)

  const selectSprint = (id?: string) =>
    setSearchParams(id ? { sprint: id } : {}, { replace: true })

  const visibleSprints =
    project?.sprints.filter((s) => s.status !== 'COMPLETED') ?? []

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-muted-foreground text-sm">Show:</span>
        <Button
          size="sm"
          variant={sprintId ? 'ghost' : 'secondary'}
          onClick={() => selectSprint()}
        >
          All tasks
        </Button>
        {visibleSprints.map((sprint) => (
          <Button
            key={sprint.id}
            size="sm"
            variant={sprintId === sprint.id ? 'secondary' : 'ghost'}
            onClick={() => selectSprint(sprint.id)}
          >
            {sprint.name}
            {sprint.status === 'ACTIVE' && (
              <span className="size-1.5 rounded-full bg-green-500" />
            )}
          </Button>
        ))}
      </div>

      {error ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : isPending ? (
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-80 w-72 shrink-0 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="-mx-6 overflow-x-auto px-6 pb-4 lg:-mx-8 lg:px-8">
          <div className="flex items-start gap-4">
            {board.columns.map((column) => (
              <Column key={column.id} column={column} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

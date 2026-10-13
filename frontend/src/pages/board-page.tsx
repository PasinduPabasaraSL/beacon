import {
  CalendarDays,
  ChevronsRightLeft,
  Lock,
  Search,
  ChevronsLeftRight,
  X,
} from 'lucide-react'
import {
  type ReactNode,
  type RefObject,
  useEffect,
  useRef,
  useState,
} from 'react'
import { useParams, useSearchParams } from 'react-router'
import { PriorityBadge } from '@/components/badges'
import { ErrorState } from '@/components/query-state'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { UserAvatarStack } from '@/components/user-avatar'
import { useBoard, useProject } from '@/hooks/queries'
import { useFillHeight } from '@/hooks/use-fill-height'
import {
  CATEGORY_LABELS,
  displayName,
  formatDate,
  isOverdue,
  PRIORITY_LABELS,
} from '@/lib/format'
import type { BoardColumn, BoardTask, TaskPriority } from '@/lib/types'
import { cn } from '@/lib/utils'

const ANY = 'any'
const UNASSIGNED = 'unassigned'
const PRIORITIES = Object.keys(PRIORITY_LABELS) as TaskPriority[]

interface Filters {
  text: string
  assignee: string
  priority: string
}

function matches(task: BoardTask, filters: Filters): boolean {
  const text = filters.text.trim().toLowerCase()
  if (
    text &&
    !task.title.toLowerCase().includes(text) &&
    !task.key.toLowerCase().includes(text)
  ) {
    return false
  }
  if (filters.assignee === UNASSIGNED && task.assignees.length > 0) {
    return false
  }
  if (
    filters.assignee !== ANY &&
    filters.assignee !== UNASSIGNED &&
    !task.assignees.some((user) => user.id === filters.assignee)
  ) {
    return false
  }
  return filters.priority === ANY || task.priority === filters.priority
}

function TaskCard({ task, done }: { task: BoardTask; done: boolean }) {
  const overdue = isOverdue(task.dueDate, done)
  return (
    <article className="bg-card hover:border-foreground/15 flex flex-col gap-2 rounded-md border p-2.5 shadow-xs transition-[border-color,box-shadow] hover:shadow-sm">
      <p
        className={cn(
          'text-sm leading-snug font-medium',
          done && 'text-muted-foreground line-through decoration-1',
        )}
      >
        {task.title}
      </p>
      {task.openBlockers.length > 0 && (
        <p className="text-warning-foreground flex items-center gap-1.5 text-xs">
          <Lock className="size-3" />
          Blocked by {task.openBlockers.join(', ')}
        </p>
      )}
      <div className="flex min-h-6 items-center gap-2">
        <span className="text-muted-foreground font-mono text-[11px]">
          {task.key}
        </span>
        <PriorityBadge priority={task.priority} />
        {task.dueDate && (
          <span
            className={cn(
              'flex items-center gap-1 text-xs',
              overdue
                ? 'text-danger-foreground font-medium'
                : 'text-muted-foreground',
            )}
          >
            <CalendarDays className="size-3" />
            {overdue ? 'Overdue · ' : ''}
            {formatDate(task.dueDate)}
          </span>
        )}
        <span className="ml-auto">
          <UserAvatarStack users={task.assignees} max={3} />
        </span>
      </div>
    </article>
  )
}

const COLLAPSED_KEY = 'beacon.board.collapsed'

/** Per-column collapse choices; columns without one collapse when empty. */
function readCollapsed(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(COLLAPSED_KEY) ?? '{}')
  } catch {
    return {}
  }
}

function useScrollEdges(ref: RefObject<HTMLElement | null>) {
  const [edges, setEdges] = useState({ start: false, end: false })

  useEffect(() => {
    const element = ref.current
    if (!element) return
    const update = () => {
      const start = element.scrollLeft > 1
      const end =
        element.scrollLeft + element.clientWidth < element.scrollWidth - 1
      setEdges((current) =>
        current.start === start && current.end === end
          ? current
          : { start, end },
      )
    }
    const observer = new ResizeObserver(update)
    observer.observe(element)
    if (element.firstElementChild) observer.observe(element.firstElementChild)
    element.addEventListener('scroll', update, { passive: true })
    return () => {
      observer.disconnect()
      element.removeEventListener('scroll', update)
    }
  }, [ref])

  return edges
}

function edgeMask({ start, end }: { start: boolean; end: boolean }) {
  if (!start && !end) return undefined
  const fade = '2.5rem'
  const image = `linear-gradient(to right, ${start ? 'transparent' : '#000'}, #000 ${start ? fade : '0'}, #000 calc(100% - ${end ? fade : '0px'}), ${end ? 'transparent' : '#000'})`
  return { maskImage: image, WebkitMaskImage: image }
}

function ColumnDot({ column }: { column: BoardColumn }) {
  return (
    <span
      className="size-2 shrink-0 rounded-full"
      style={{ backgroundColor: column.color ?? 'var(--muted-foreground)' }}
    />
  )
}

function CountPill({ children }: { children: ReactNode }) {
  return (
    <span className="bg-background text-muted-foreground rounded-full border px-1.5 text-[11px] font-medium tabular-nums">
      {children}
    </span>
  )
}

function CollapsedColumn({
  column,
  count,
  onExpand,
}: {
  column: BoardColumn
  count: ReactNode
  onExpand: () => void
}) {
  return (
    <button
      type="button"
      onClick={onExpand}
      aria-label={`Expand ${column.name}`}
      title={`Expand ${column.name}`}
      className="bg-muted/50 hover:bg-muted focus-visible:ring-ring flex h-full w-10 shrink-0 snap-start flex-col items-center gap-3 rounded-lg border py-3 transition-colors outline-none focus-visible:ring-2"
    >
      <ChevronsLeftRight className="text-muted-foreground size-4" />
      <ColumnDot column={column} />
      <span className="text-sm font-semibold whitespace-nowrap [writing-mode:vertical-rl]">
        {column.name}
      </span>
      <CountPill>{count}</CountPill>
    </button>
  )
}

function Column({
  column,
  tasks,
  filtered,
  onCollapse,
}: {
  column: BoardColumn
  tasks: BoardTask[]
  filtered: boolean
  onCollapse: () => void
}) {
  const done = column.category === 'DONE'
  const showCategory =
    column.name.toLowerCase() !== CATEGORY_LABELS[column.category].toLowerCase()

  return (
    <section className="group/column bg-muted/50 flex h-full w-[calc(100vw-3rem)] max-w-72 shrink-0 snap-start flex-col gap-2 rounded-lg border p-2 sm:w-72">
      <header className="flex h-7 shrink-0 items-center gap-2 pl-1">
        <ColumnDot column={column} />
        <h2 className="truncate text-sm font-semibold">{column.name}</h2>
        <CountPill>
          {filtered ? `${tasks.length}/${column.tasks.length}` : tasks.length}
        </CountPill>
        <span className="ml-auto flex items-center gap-1">
          {showCategory && (
            <span className="text-muted-foreground text-[11px]">
              {CATEGORY_LABELS[column.category]}
            </span>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={onCollapse}
            aria-label={`Collapse ${column.name}`}
            title={`Collapse ${column.name}`}
            className="text-muted-foreground size-7 focus-visible:opacity-100 md:opacity-0 md:group-hover/column:opacity-100"
          >
            <ChevronsRightLeft />
          </Button>
        </span>
      </header>
      <div className="-mx-1 flex min-h-0 flex-1 scrollbar-thin flex-col gap-1.5 overflow-y-auto px-1 pb-1">
        {tasks.length === 0 ? (
          <p className="text-muted-foreground rounded-md border border-dashed p-4 text-center text-xs">
            {filtered && column.tasks.length > 0
              ? 'No matching tasks'
              : 'No tasks'}
          </p>
        ) : (
          tasks.map((task) => (
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
  const [filters, setFilters] = useState<Filters>({
    text: '',
    assignee: ANY,
    priority: ANY,
  })

  const { data: project } = useProject(projectId)
  const {
    data: board,
    error,
    isPending,
    refetch,
  } = useBoard(projectId, sprintId)

  const selectSprint = (id: string) =>
    setSearchParams(id === ANY ? {} : { sprint: id }, { replace: true })

  const visibleSprints =
    project?.sprints.filter((s) => s.status !== 'COMPLETED') ?? []
  const filtered =
    filters.text.trim() !== '' ||
    filters.assignee !== ANY ||
    filters.priority !== ANY
  const update = (patch: Partial<Filters>) =>
    setFilters((current) => ({ ...current, ...patch }))

  const columns = board?.columns.map((column) => ({
    column,
    tasks: column.tasks.filter((task) => matches(task, filters)),
  }))
  const shown = columns?.reduce((sum, c) => sum + c.tasks.length, 0) ?? 0

  const fillRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  useFillHeight(fillRef)
  const edges = useScrollEdges(scrollRef)

  const [collapsed, setCollapsedState] = useState(readCollapsed)
  const isCollapsed = (column: BoardColumn) =>
    collapsed[column.id] ?? column.tasks.length === 0
  const setCollapsed = (columnId: string, value: boolean) => {
    const next = { ...collapsed, [columnId]: value }
    setCollapsedState(next)
    localStorage.setItem(COLLAPSED_KEY, JSON.stringify(next))
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-60">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            value={filters.text}
            onChange={(event) => update({ text: event.target.value })}
            placeholder="Filter tasks"
            aria-label="Filter tasks"
            className="h-8 pl-8"
          />
        </div>
        <Select value={sprintId ?? ANY} onValueChange={selectSprint}>
          <SelectTrigger size="sm" aria-label="Sprint">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>All tasks</SelectItem>
            {visibleSprints.length > 0 && <SelectSeparator />}
            {visibleSprints.map((sprint) => (
              <SelectItem key={sprint.id} value={sprint.id}>
                {sprint.name}
                {sprint.status === 'ACTIVE' && (
                  <span className="text-muted-foreground text-xs">
                    · active
                  </span>
                )}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.assignee}
          onValueChange={(assignee) => update({ assignee })}
        >
          <SelectTrigger size="sm" aria-label="Assignee">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Any assignee</SelectItem>
            <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
            {!!project?.members.length && <SelectSeparator />}
            {project?.members.map((member) => (
              <SelectItem key={member.id} value={member.id}>
                {displayName(member)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.priority}
          onValueChange={(priority) => update({ priority })}
        >
          <SelectTrigger size="sm" aria-label="Priority">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Any priority</SelectItem>
            <SelectSeparator />
            {PRIORITIES.map((priority) => (
              <SelectItem key={priority} value={priority}>
                {PRIORITY_LABELS[priority]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {filtered && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setFilters({ text: '', assignee: ANY, priority: ANY })
            }
          >
            <X /> Clear
          </Button>
        )}
        {columns && (
          <span className="text-muted-foreground ml-auto text-xs tabular-nums">
            {shown} {shown === 1 ? 'task' : 'tasks'}
          </span>
        )}
      </div>

      <div ref={fillRef} className="-mx-4 min-h-0 sm:-mx-6 lg:-mx-8">
        <div
          ref={scrollRef}
          className="h-full snap-x snap-mandatory scroll-px-4 scrollbar-thin overflow-x-auto px-4 pb-2 sm:scroll-px-6 sm:px-6 md:snap-none lg:px-8"
          style={edgeMask(edges)}
        >
          <div className="flex h-full w-max gap-3">
            {error ? (
              <div className="w-[calc(100vw-2rem)] max-w-xl">
                <ErrorState error={error} onRetry={() => refetch()} />
              </div>
            ) : isPending ? (
              Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className="h-full w-72 shrink-0 rounded-lg" />
              ))
            ) : (
              columns?.map(({ column, tasks }) =>
                isCollapsed(column) ? (
                  <CollapsedColumn
                    key={column.id}
                    column={column}
                    count={
                      filtered
                        ? `${tasks.length}/${column.tasks.length}`
                        : tasks.length
                    }
                    onExpand={() => setCollapsed(column.id, false)}
                  />
                ) : (
                  <Column
                    key={column.id}
                    column={column}
                    tasks={tasks}
                    filtered={filtered}
                    onCollapse={() => setCollapsed(column.id, true)}
                  />
                ),
              )
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

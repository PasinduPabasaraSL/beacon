import {
  BookOpenCheck,
  CalendarRange,
  Clock,
  LayoutDashboard,
  Settings,
  SquareKanban,
  type LucideIcon,
} from 'lucide-react'

export interface ProjectTab {
  /** Path relative to the project, '' for the overview. */
  to: string
  label: string
  icon: LucideIcon
}

export const PROJECT_TABS: ProjectTab[] = [
  { to: '', label: 'Overview', icon: LayoutDashboard },
  { to: 'board', label: 'Board', icon: SquareKanban },
  { to: 'contributions', label: 'Timesheet', icon: Clock },
  { to: 'timeline', label: 'Timeline', icon: CalendarRange },
  { to: 'record-book', label: 'Record book', icon: BookOpenCheck },
]

/** Reached from the project menu rather than a tab; only the team lead can edit it. */
export const PROJECT_SETTINGS: ProjectTab = {
  to: 'settings',
  label: 'Settings',
  icon: Settings,
}

/** The tab a project sub-path belongs to, e.g. 'board' or 'record-book/print'. */
export function projectTabFor(subPath: string): ProjectTab {
  const segment = subPath.split('/')[0] ?? ''
  return (
    [...PROJECT_TABS, PROJECT_SETTINGS].find((tab) => tab.to === segment) ??
    PROJECT_TABS[0]
  )
}

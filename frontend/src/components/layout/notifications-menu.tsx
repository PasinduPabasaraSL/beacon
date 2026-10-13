import {
  Bell,
  BookOpenCheck,
  Clock,
  Flag,
  MessageSquareWarning,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useMe, useMyWeek, useReviewQueue } from '@/hooks/queries'
import {
  displayName,
  formatDate,
  formatHours,
  formatWeekRange,
} from '@/lib/format'

const MAX_ITEMS = 6

interface Notice {
  id: string
  icon: ReactNode
  title: string
  detail: string
  to: string
}

function useNotices(): { notices: Notice[]; total: number; to: string } {
  const { data: me } = useMe()
  const { data: queue } = useReviewQueue({ enabled: !!me?.canReview })
  const { data: week } = useMyWeek({ enabled: !!me?.isStudent })
  const notices: Notice[] = []

  for (const meeting of queue?.meetings ?? []) {
    notices.push({
      id: `meeting-${meeting.id}`,
      icon: <BookOpenCheck />,
      title: `Meeting ${meeting.number} needs your signature`,
      detail: `${meeting.project.key} · ${displayName(meeting.createdBy)} · ${formatDate(meeting.meetingDate)}`,
      to: '/reviews',
    })
  }
  for (const timesheet of queue?.timesheets ?? []) {
    notices.push({
      id: `timesheet-${timesheet.id}`,
      icon: <Clock />,
      title: `${displayName(timesheet.user)} submitted ${formatHours(timesheet.totalHours)}`,
      detail: `${timesheet.project.key} · week of ${formatWeekRange(timesheet.weekStart)}`,
      to: '/reviews',
    })
  }
  if (me?.isStudent) {
    for (const timesheet of week?.changesRequested ?? []) {
      notices.push({
        id: `changes-${timesheet.id}`,
        icon: <MessageSquareWarning />,
        title: 'Changes requested on your timesheet',
        detail: `${timesheet.project.key} · ${timesheet.reviewComment ?? formatWeekRange(timesheet.weekStart)}`,
        to: `/projects/${timesheet.project.id}/contributions?week=${timesheet.weekStart.slice(0, 10)}`,
      })
    }
    for (const milestone of week?.milestones ?? []) {
      if (milestone.status !== 'OVERDUE') continue
      notices.push({
        id: `milestone-${milestone.id}`,
        icon: <Flag />,
        title: `${milestone.title} is overdue`,
        detail: `${milestone.project.key} · due ${formatDate(milestone.dueDate)}`,
        to: `/projects/${milestone.project.id}/timeline`,
      })
    }
  }

  return {
    notices,
    total: notices.length,
    to: me?.canReview ? '/reviews' : '/me',
  }
}

export function NotificationsMenu() {
  const { notices, total, to } = useNotices()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={total ? `Notifications (${total})` : 'Notifications'}
        >
          <Bell />
          {total > 0 && (
            <span className="bg-brand text-brand-foreground ring-background absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold tabular-nums ring-2">
              {total > 9 ? '9+' : total}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          Notifications
          {total > 0 && (
            <span className="text-muted-foreground text-xs font-normal">
              {total} new
            </span>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {total === 0 ? (
          <p className="text-muted-foreground px-2 py-6 text-center text-sm">
            You're all caught up.
          </p>
        ) : (
          <>
            {notices.slice(0, MAX_ITEMS).map((notice) => (
              <DropdownMenuItem key={notice.id} asChild className="items-start">
                <Link to={notice.to}>
                  <span className="bg-muted text-muted-foreground mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md [&_svg]:size-3.5">
                    {notice.icon}
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium">
                      {notice.title}
                    </span>
                    <span className="text-muted-foreground truncate text-xs">
                      {notice.detail}
                    </span>
                  </span>
                </Link>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="justify-center text-sm">
              <Link to={to}>
                {total > MAX_ITEMS ? `View all ${total}` : 'Open'}{' '}
                {to === '/reviews' ? 'reviews' : 'my week'}
              </Link>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

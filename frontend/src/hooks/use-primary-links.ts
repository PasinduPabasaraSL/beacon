import {
  CalendarCheck,
  ClipboardCheck,
  FolderKanban,
  type LucideIcon,
} from 'lucide-react'
import { useMe, useReviewQueue } from '@/hooks/queries'
import { useActingUserId } from '@/lib/acting-user'

export interface PrimaryLink {
  to: string
  label: string
  icon: LucideIcon
  count?: number
}

/** Top-level destinations for the acting user, shared by the sidebar and command menu. */
export function usePrimaryLinks(): PrimaryLink[] {
  const actingUserId = useActingUserId()
  const { data: me } = useMe()
  const canReview = !!me?.canReview
  const { data: queue } = useReviewQueue({ enabled: canReview })

  const links: PrimaryLink[] = []
  if (actingUserId && me?.isStudent !== false) {
    links.push({ to: '/me', label: 'My week', icon: CalendarCheck })
  }
  if (canReview) {
    links.push({
      to: '/reviews',
      label: 'Reviews',
      icon: ClipboardCheck,
      count: queue && queue.timesheets.length + queue.meetings.length,
    })
  }
  links.push({ to: '/projects', label: 'Projects', icon: FolderKanban })
  return links
}

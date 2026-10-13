import { Badge } from '@/components/ui/badge'
import {
  CONTRIBUTION_TYPE_COLORS,
  CONTRIBUTION_TYPE_LABELS,
  MILESTONE_STATUS_LABELS,
  MILESTONE_STATUS_STYLES,
  PRIORITY_LABELS,
  PRIORITY_STYLES,
  REVIEW_LABELS,
  REVIEW_STYLES,
} from '@/lib/format'
import type {
  ContributionReviewStatus,
  ContributionType,
  MilestoneStatus,
  TaskPriority,
} from '@/lib/types'
import { cn } from '@/lib/utils'

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  if (priority === 'NONE') return null
  return (
    <Badge variant="outline" className={PRIORITY_STYLES[priority]}>
      {PRIORITY_LABELS[priority]}
    </Badge>
  )
}

export function ContributionTypeBadge({ type }: { type: ContributionType }) {
  return (
    <Badge variant="outline" className="gap-1.5">
      <span
        className={cn('size-2 rounded-full', CONTRIBUTION_TYPE_COLORS[type])}
      />
      {CONTRIBUTION_TYPE_LABELS[type]}
    </Badge>
  )
}

export function MilestoneStatusBadge({ status }: { status: MilestoneStatus }) {
  return (
    <Badge variant="outline" className={MILESTONE_STATUS_STYLES[status]}>
      {MILESTONE_STATUS_LABELS[status]}
    </Badge>
  )
}

export function ReviewBadge({ status }: { status: ContributionReviewStatus }) {
  return (
    <Badge variant="outline" className={REVIEW_STYLES[status]}>
      {REVIEW_LABELS[status]}
    </Badge>
  )
}

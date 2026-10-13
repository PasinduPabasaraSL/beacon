import { MonitorSmartphone, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  CONTRIBUTION_TYPE_COLORS,
  CONTRIBUTION_TYPE_LABELS,
  MEETING_MODE_LABELS,
  MEETING_STATUS_LABELS,
  MEETING_STATUS_STYLES,
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
  MeetingMode,
  MeetingRecordStatus,
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

export function MeetingStatusBadge({
  status,
}: {
  status: MeetingRecordStatus
}) {
  return (
    <Badge variant="outline" className={MEETING_STATUS_STYLES[status]}>
      {MEETING_STATUS_LABELS[status]}
    </Badge>
  )
}

export function MeetingModeBadge({ mode }: { mode: MeetingMode }) {
  const Icon = mode === 'IN_PERSON' ? Users : MonitorSmartphone
  return (
    <Badge variant="secondary" className="gap-1">
      <Icon className="size-3" />
      {MEETING_MODE_LABELS[mode]}
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

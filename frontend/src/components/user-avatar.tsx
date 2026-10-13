import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from '@/components/ui/avatar'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { displayName, initials } from '@/lib/format'
import type { UserSummary } from '@/lib/types'

interface UserAvatarProps {
  user: UserSummary
  size?: 'sm' | 'default' | 'lg'
  withTooltip?: boolean
}

export function UserAvatar({
  user,
  size = 'default',
  withTooltip = true,
}: UserAvatarProps) {
  const avatar = (
    <Avatar size={size}>
      {user.avatarUrl && (
        <AvatarImage src={user.avatarUrl} alt={displayName(user)} />
      )}
      <AvatarFallback>{initials(user)}</AvatarFallback>
    </Avatar>
  )
  if (!withTooltip) return avatar

  return (
    <Tooltip>
      <TooltipTrigger asChild>{avatar}</TooltipTrigger>
      <TooltipContent>
        {displayName(user)}{' '}
        <span className="opacity-70">@{user.githubLogin}</span>
      </TooltipContent>
    </Tooltip>
  )
}

export function UserAvatarStack({
  users,
  max = 4,
  size = 'sm',
}: {
  users: UserSummary[]
  max?: number
  size?: 'sm' | 'default'
}) {
  if (users.length === 0) return null
  const visible = users.slice(0, max)
  const hidden = users.length - visible.length

  return (
    <AvatarGroup>
      {visible.map((user) => (
        <UserAvatar key={user.id} user={user} size={size} />
      ))}
      {hidden > 0 && <AvatarGroupCount>+{hidden}</AvatarGroupCount>}
    </AvatarGroup>
  )
}

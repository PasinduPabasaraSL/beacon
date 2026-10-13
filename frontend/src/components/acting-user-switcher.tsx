import { UserRound } from 'lucide-react'
import { useEffect } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { UserAvatar } from '@/components/user-avatar'
import { useDevUsers } from '@/hooks/queries'
import { setActingUserId, useActingUserId } from '@/lib/acting-user'
import { displayName } from '@/lib/format'

/** Temporary "Acting as" picker until GitHub sign-in exists. */
export function ActingUserSwitcher() {
  const actingUserId = useActingUserId()
  const { data: users } = useDevUsers()
  const actingUser = users?.find((u) => u.id === actingUserId)

  // Forget a stored user that no longer exists (e.g. after a database reset).
  useEffect(() => {
    if (users && actingUserId && !users.some((u) => u.id === actingUserId)) {
      setActingUserId(null)
    }
  }, [users, actingUserId])

  return (
    <Select
      value={actingUserId ?? ''}
      onValueChange={(value) => setActingUserId(value || null)}
    >
      <SelectTrigger
        aria-label="Acting as user"
        className="hover:bg-sidebar-accent data-[state=open]:bg-sidebar-accent h-12! w-full border-0 bg-transparent px-2 shadow-none group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-0 dark:bg-transparent group-data-[collapsible=icon]:[&>svg]:hidden"
      >
        <SelectValue
          placeholder={
            <span className="flex items-center gap-2">
              <span className="bg-sidebar-accent flex size-8 shrink-0 items-center justify-center rounded-full">
                <UserRound className="size-4" />
              </span>
              <span className="flex flex-col text-left leading-tight group-data-[collapsible=icon]:hidden">
                <span className="text-sidebar-foreground font-medium">
                  Choose a user
                </span>
                <span className="text-muted-foreground text-xs">
                  Acting as · dev only
                </span>
              </span>
            </span>
          }
        >
          {actingUser && (
            <span className="flex min-w-0 items-center gap-2">
              <UserAvatar user={actingUser} withTooltip={false} />
              <span className="flex min-w-0 flex-col text-left leading-tight group-data-[collapsible=icon]:hidden">
                <span className="text-sidebar-foreground truncate font-medium">
                  {displayName(actingUser)}
                </span>
                <span className="text-muted-foreground truncate text-xs">
                  Acting as · dev only
                </span>
              </span>
            </span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent position="popper" side="top" align="start">
        {users?.map((user) => (
          <SelectItem key={user.id} value={user.id}>
            <UserAvatar user={user} size="sm" withTooltip={false} />
            {displayName(user)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

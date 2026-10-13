import { UserRound } from 'lucide-react'
import { useEffect } from 'react'
import { MySignatureButton } from '@/components/signature/signature-dialog'
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

  // Forget a stored user that no longer exists (e.g. after a database reset).
  useEffect(() => {
    if (users && actingUserId && !users.some((u) => u.id === actingUserId)) {
      setActingUserId(null)
    }
  }, [users, actingUserId])

  return (
    <div className="flex flex-col gap-1.5 border-t px-3 py-3">
      <p className="text-muted-foreground px-2 text-xs font-medium">
        Acting as <span className="font-normal">(dev only)</span>
      </p>
      <Select
        value={actingUserId ?? ''}
        onValueChange={(value) => setActingUserId(value || null)}
      >
        <SelectTrigger
          className="bg-background w-full"
          aria-label="Acting as user"
        >
          <SelectValue
            placeholder={
              <span className="flex items-center gap-2">
                <UserRound className="size-4" />
                Choose a user
              </span>
            }
          />
        </SelectTrigger>
        <SelectContent>
          {users?.map((user) => (
            <SelectItem key={user.id} value={user.id}>
              <UserAvatar user={user} size="sm" withTooltip={false} />
              {displayName(user)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {actingUserId && <MySignatureButton />}
    </div>
  )
}

import { CalendarCheck, ClipboardCheck, PenLine, UserRound } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { SignatureDialog } from '@/components/signature/signature-dialog'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { UserAvatar } from '@/components/user-avatar'
import { useMe } from '@/hooks/queries'
import { useActingUserId } from '@/lib/acting-user'
import { displayName } from '@/lib/format'

export function UserMenu() {
  const actingUserId = useActingUserId()
  const { data: me } = useMe()
  const [signatureOpen, setSignatureOpen] = useState(false)
  const user = actingUserId ? me?.user : undefined

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            aria-label="Account menu"
          >
            {user ? (
              <UserAvatar user={user} size="sm" withTooltip={false} />
            ) : (
              <UserRound />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-56">
          {user ? (
            <>
              <DropdownMenuLabel className="flex items-center gap-2.5 font-normal">
                <UserAvatar user={user} withTooltip={false} />
                <span className="flex min-w-0 flex-col leading-tight">
                  <span className="truncate font-medium">
                    {displayName(user)}
                  </span>
                  <span className="text-muted-foreground truncate text-xs">
                    @{user.githubLogin}
                  </span>
                </span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                {me?.isStudent && (
                  <DropdownMenuItem asChild>
                    <Link to="/me">
                      <CalendarCheck /> My week
                    </Link>
                  </DropdownMenuItem>
                )}
                {me?.canReview && (
                  <DropdownMenuItem asChild>
                    <Link to="/reviews">
                      <ClipboardCheck /> Reviews
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onSelect={() => setSignatureOpen(true)}>
                  <PenLine /> My signature
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </>
          ) : (
            <DropdownMenuLabel className="text-muted-foreground max-w-60 text-xs font-normal">
              Pick a user under “Acting as” in the sidebar to see your week,
              reviews and signature.
            </DropdownMenuLabel>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {user && (
        <SignatureDialog open={signatureOpen} onOpenChange={setSignatureOpen} />
      )}
    </>
  )
}

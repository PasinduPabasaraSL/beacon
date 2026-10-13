import { Navigate } from 'react-router'
import { Skeleton } from '@/components/ui/skeleton'
import { useMe } from '@/hooks/queries'
import { useActingUserId } from '@/lib/acting-user'

/** Students land on their week, supervisors on their review queue. */
export function HomePage() {
  const actingUserId = useActingUserId()
  const { data: me, isError } = useMe()

  if (!actingUserId || isError) return <Navigate to="/projects" replace />
  if (!me) {
    return (
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <Skeleton className="h-14 w-72" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }

  const target = me.isStudent ? '/me' : me.canReview ? '/reviews' : '/projects'
  return <Navigate to={target} replace />
}

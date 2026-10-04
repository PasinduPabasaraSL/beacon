import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useHealth, type HealthState } from '@/hooks/use-health'

function statusLabel(health: HealthState): string {
  switch (health.state) {
    case 'loading':
      return 'Checking...'
    case 'offline':
      return 'Offline'
    case 'online':
      return health.health.database === 'up' ? 'Online' : 'Degraded'
  }
}

export function DashboardPage() {
  const health = useHealth()

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm">
          Project and team progress will appear here.
        </p>
      </div>

      <Card className="max-w-sm">
        <CardHeader>
          <CardTitle>API status</CardTitle>
          <CardDescription>Connectivity to the Beacon backend.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <span data-testid="api-status" className="text-sm font-medium">
            {statusLabel(health)}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.reload()}
          >
            Refresh
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

import { LayoutDashboard } from 'lucide-react'
import { NavLink, Outlet } from 'react-router'
import { cn } from '@/lib/utils'

const navItems = [{ to: '/', label: 'Dashboard', icon: LayoutDashboard }]

export function AppLayout() {
  return (
    <div className="bg-background text-foreground flex min-h-svh">
      <aside className="bg-muted/30 hidden w-60 shrink-0 border-r md:flex md:flex-col">
        <div className="flex h-14 items-center border-b px-5 text-lg font-semibold tracking-tight">
          Beacon
        </div>
        <nav className="flex flex-col gap-1 p-3">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end
              className={({ isActive }) =>
                cn(
                  'text-muted-foreground hover:bg-accent hover:text-accent-foreground flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                  isActive && 'bg-accent text-accent-foreground font-medium',
                )
              }
            >
              <Icon className="size-4" />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center border-b px-6">
          <span className="font-semibold md:hidden">Beacon</span>
        </header>
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

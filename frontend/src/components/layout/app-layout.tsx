import { Outlet } from 'react-router'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { TopBar } from '@/components/layout/top-bar'
import { SidebarProvider } from '@/components/ui/sidebar'

function sidebarDefaultOpen(): boolean {
  return !document.cookie.split('; ').includes('sidebar_state=false')
}

export function AppLayout() {
  return (
    <SidebarProvider defaultOpen={sidebarDefaultOpen()}>
      <AppSidebar />
      <div className="bg-background flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </SidebarProvider>
  )
}

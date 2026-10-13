import { createBrowserRouter } from 'react-router'
import { AppLayout } from '@/components/layout/app-layout'
import { ProjectLayout } from '@/components/layout/project-layout'
import { EmptyState } from '@/components/query-state'
import { BoardPage } from '@/pages/board-page'
import { ContributionsPage } from '@/pages/contributions-page'
import { HomePage } from '@/pages/home-page'
import { MyWeekPage } from '@/pages/my-week-page'
import { ProjectOverviewPage } from '@/pages/project-overview-page'
import { ProjectsPage } from '@/pages/projects-page'
import { ReviewsPage } from '@/pages/reviews-page'
import { TimelinePage } from '@/pages/timeline-page'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'me', element: <MyWeekPage /> },
      { path: 'reviews', element: <ReviewsPage /> },
      { path: 'projects', element: <ProjectsPage /> },
      {
        path: 'projects/:projectId',
        element: <ProjectLayout />,
        children: [
          { index: true, element: <ProjectOverviewPage /> },
          { path: 'board', element: <BoardPage /> },
          { path: 'contributions', element: <ContributionsPage /> },
          { path: 'timeline', element: <TimelinePage /> },
        ],
      },
      {
        path: '*',
        element: (
          <EmptyState
            title="Page not found"
            description="Check the address or pick a project from the sidebar."
          />
        ),
      },
    ],
  },
])

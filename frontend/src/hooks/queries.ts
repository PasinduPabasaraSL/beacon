import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useActingUserId } from '@/lib/acting-user'
import { apiFetch } from '@/lib/api'
import type {
  Board,
  ContributionEntry,
  ContributionInput,
  ContributionReviewInput,
  Me,
  MeetingInput,
  MeetingRecord,
  MeetingReviewInput,
  Milestone,
  MilestoneInput,
  MyWeek,
  ProjectDashboard,
  ProjectDetail,
  ProjectListItem,
  RecordBook,
  RecordBookDetails,
  ReviewQueue,
  SemesterInput,
  SignatureMethod,
  UserSignature,
  UserSummary,
  WeeklyContributions,
  WorkspaceSemester,
} from '@/lib/types'

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: ({ signal }) =>
      apiFetch<ProjectListItem[]>('/projects', { signal }),
  })
}

export function useProject(projectId: string) {
  return useQuery({
    queryKey: ['projects', projectId],
    queryFn: ({ signal }) =>
      apiFetch<ProjectDetail>(`/projects/${projectId}`, { signal }),
    enabled: !!projectId,
  })
}

export function useBoard(projectId: string, sprintId?: string) {
  return useQuery({
    queryKey: ['projects', projectId, 'board', sprintId ?? 'all'],
    queryFn: ({ signal }) => {
      const query = sprintId ? `?sprintId=${sprintId}` : ''
      return apiFetch<Board>(`/projects/${projectId}/board${query}`, { signal })
    },
  })
}

export function useDashboard(projectId: string) {
  return useQuery({
    queryKey: ['projects', projectId, 'dashboard'],
    queryFn: ({ signal }) =>
      apiFetch<ProjectDashboard>(`/projects/${projectId}/dashboard`, {
        signal,
      }),
  })
}

export function useContributions(projectId: string, week: string) {
  return useQuery({
    queryKey: ['projects', projectId, 'contributions', week],
    queryFn: ({ signal }) =>
      apiFetch<WeeklyContributions>(
        `/projects/${projectId}/contributions?week=${week}`,
        { signal },
      ),
    placeholderData: (previous) => previous,
  })
}

export function useDevUsers() {
  return useQuery({
    queryKey: ['dev', 'users'],
    queryFn: ({ signal }) => apiFetch<UserSummary[]>('/dev/users', { signal }),
    staleTime: Infinity,
  })
}

// Personal views are keyed by the acting user so switching users never shows stale data.
export function useMe() {
  const actingUserId = useActingUserId()
  return useQuery({
    queryKey: ['me', actingUserId],
    queryFn: ({ signal }) => apiFetch<Me>('/me', { signal }),
    enabled: !!actingUserId,
  })
}

export function useMyWeek({ enabled = true } = {}) {
  const actingUserId = useActingUserId()
  return useQuery({
    queryKey: ['me', actingUserId, 'week'],
    queryFn: ({ signal }) => apiFetch<MyWeek>('/me/week', { signal }),
    enabled: !!actingUserId && enabled,
  })
}

export function useReviewQueue({ enabled = true } = {}) {
  const actingUserId = useActingUserId()
  return useQuery({
    queryKey: ['me', actingUserId, 'reviews'],
    queryFn: ({ signal }) => apiFetch<ReviewQueue>('/me/reviews', { signal }),
    enabled: !!actingUserId && enabled,
  })
}

export function useApproveEntries() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (entryIds: string[]) =>
      apiFetch<{ approved: number }>('/me/reviews/approve', {
        method: 'POST',
        body: JSON.stringify({ entryIds }),
      }),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['me'] }),
        queryClient.invalidateQueries({ queryKey: ['projects'] }),
      ]),
  })
}

export function useMySignature({ enabled = true } = {}) {
  const actingUserId = useActingUserId()
  return useQuery({
    queryKey: ['me', actingUserId, 'signature'],
    queryFn: ({ signal }) =>
      apiFetch<{ signature: UserSignature | null }>('/me/signature', {
        signal,
      }),
    enabled: !!actingUserId && enabled,
  })
}

export function useSaveSignature() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { method: SignatureMethod; image: string }) =>
      apiFetch<{ signature: UserSignature }>('/me/signature', {
        method: 'PUT',
        body: JSON.stringify(input),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['me'] }),
  })
}

export function useDeleteSignature() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => apiFetch<null>('/me/signature', { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['me'] }),
  })
}

export function useRecordBook(projectId: string) {
  return useQuery({
    queryKey: ['projects', projectId, 'record-book'],
    queryFn: ({ signal }) =>
      apiFetch<RecordBook>(`/projects/${projectId}/record-book`, { signal }),
  })
}

export function useUpdateRecordBookDetails(projectId: string) {
  const invalidate = useInvalidateProject(projectId)
  return useMutation({
    mutationFn: (input: RecordBookDetails) =>
      apiFetch<RecordBook>(`/projects/${projectId}/record-book/details`, {
        method: 'PUT',
        body: JSON.stringify(input),
      }),
    onSuccess: invalidate,
  })
}

export function useSignRecordBook(projectId: string) {
  const invalidate = useInvalidateProject(projectId)
  return useMutation({
    mutationFn: (input: { registrationNumber?: string }) =>
      apiFetch<RecordBook>(`/projects/${projectId}/record-book/sign`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: invalidate,
  })
}

export function useSaveMeeting(projectId: string) {
  const invalidate = useInvalidateProject(projectId)
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: MeetingInput }) =>
      apiFetch<MeetingRecord>(
        `/projects/${projectId}/meetings${id ? `/${id}` : ''}`,
        { method: id ? 'PATCH' : 'POST', body: JSON.stringify(input) },
      ),
    onSuccess: invalidate,
  })
}

export function useDeleteMeeting(projectId: string) {
  const invalidate = useInvalidateProject(projectId)
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<null>(`/projects/${projectId}/meetings/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: invalidate,
  })
}

/** Takes the project per call so the Reviews page can review across groups. */
export function useReviewMeeting() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      projectId,
      id,
      input,
    }: {
      projectId: string
      id: string
      input: MeetingReviewInput
    }) =>
      apiFetch<MeetingRecord>(`/projects/${projectId}/meetings/${id}/review`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: (_, { projectId }) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['projects', projectId] }),
        queryClient.invalidateQueries({ queryKey: ['me'] }),
      ]),
  })
}

export function useSemester(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ['workspaces', workspaceId, 'semester'],
    queryFn: ({ signal }) =>
      apiFetch<WorkspaceSemester>(`/workspaces/${workspaceId}/semester`, {
        signal,
      }),
    enabled: !!workspaceId,
  })
}

export function useUpdateSemester(workspaceId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: SemesterInput) =>
      apiFetch<WorkspaceSemester>(`/workspaces/${workspaceId}/semester`, {
        method: 'PUT',
        body: JSON.stringify(input),
      }),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['workspaces', workspaceId],
        }),
        queryClient.invalidateQueries({ queryKey: ['me'] }),
      ]),
  })
}

export function useMilestones(projectId: string) {
  return useQuery({
    queryKey: ['projects', projectId, 'milestones'],
    queryFn: ({ signal }) =>
      apiFetch<Milestone[]>(`/projects/${projectId}/milestones`, { signal }),
  })
}

export function useSaveMilestone(projectId: string) {
  const invalidate = useInvalidateProject(projectId)
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: MilestoneInput }) =>
      apiFetch<Milestone>(
        `/projects/${projectId}/milestones${id ? `/${id}` : ''}`,
        { method: id ? 'PATCH' : 'POST', body: JSON.stringify(input) },
      ),
    onSuccess: invalidate,
  })
}

export function useDeleteMilestone(projectId: string) {
  const invalidate = useInvalidateProject(projectId)
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<null>(`/projects/${projectId}/milestones/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: invalidate,
  })
}

/** Project changes show up in the project views and in personal views. */
function useInvalidateProject(projectId: string) {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['projects', projectId] }),
      queryClient.invalidateQueries({ queryKey: ['me'] }),
    ])
}

export function useCreateContribution(projectId: string) {
  const invalidate = useInvalidateProject(projectId)
  return useMutation({
    mutationFn: (input: ContributionInput) =>
      apiFetch<ContributionEntry>(`/projects/${projectId}/contributions`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: invalidate,
  })
}

export function useUpdateContribution(projectId: string) {
  const invalidate = useInvalidateProject(projectId)
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ContributionInput }) =>
      apiFetch<ContributionEntry>(
        `/projects/${projectId}/contributions/${id}`,
        { method: 'PATCH', body: JSON.stringify(input) },
      ),
    onSuccess: invalidate,
  })
}

export function useDeleteContribution(projectId: string) {
  const invalidate = useInvalidateProject(projectId)
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<null>(`/projects/${projectId}/contributions/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: invalidate,
  })
}

export function useReviewContribution(projectId: string) {
  const invalidate = useInvalidateProject(projectId)
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string
      input: ContributionReviewInput
    }) =>
      apiFetch<ContributionEntry>(
        `/projects/${projectId}/contributions/${id}/review`,
        { method: 'POST', body: JSON.stringify(input) },
      ),
    onSuccess: invalidate,
  })
}

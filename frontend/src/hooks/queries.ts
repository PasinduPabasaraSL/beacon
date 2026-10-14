import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useActingUserId } from '@/lib/acting-user'
import { apiFetch } from '@/lib/api'
import { shiftWeek } from '@/lib/format'
import type {
  Board,
  LogTimeInput,
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
  ProjectProfileInput,
  PublicProjectProfile,
  RecordBook,
  RecordBookDetails,
  ReviewQueue,
  RowInput,
  SemesterInput,
  SignatureMethod,
  Timesheet,
  TimesheetReviewInput,
  TimesheetRow,
  TimesheetWeek,
  UserSignature,
  UserSummary,
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

export function useUpdateProjectProfile(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: ProjectProfileInput) =>
      apiFetch<ProjectDetail>(`/projects/${projectId}/profile`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['projects'] }),
        queryClient.invalidateQueries({ queryKey: ['public-projects'] }),
        queryClient.invalidateQueries({ queryKey: ['me'] }),
      ]),
  })
}

export function usePublicProject(projectId: string) {
  return useQuery({
    queryKey: ['public-projects', projectId],
    queryFn: ({ signal }) =>
      apiFetch<PublicProjectProfile>(`/public/projects/${projectId}`, {
        signal,
      }),
    retry: false,
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

const timesheetsKey = (projectId: string, week: string) => [
  'projects',
  projectId,
  'timesheets',
  week,
]

export function useTimesheets(projectId: string, week: string) {
  return useQuery({
    queryKey: timesheetsKey(projectId, week),
    queryFn: ({ signal }) =>
      apiFetch<TimesheetWeek>(
        `/projects/${projectId}/timesheets?week=${week}`,
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

export function useApproveTimesheets() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (timesheetIds: string[]) =>
      apiFetch<{ approved: number }>('/me/reviews/approve', {
        method: 'POST',
        body: JSON.stringify({ timesheetIds }),
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

export function useAddRow(projectId: string) {
  const invalidate = useInvalidateProject(projectId)
  return useMutation({
    mutationFn: (input: RowInput & { week: string }) =>
      apiFetch<TimesheetRow>(`/projects/${projectId}/timesheets/rows`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: invalidate,
  })
}

/** Adds the rows (not the hours) of the user's previous week to `week`. */
export function useCopyLastWeek(projectId: string) {
  const queryClient = useQueryClient()
  const invalidate = useInvalidateProject(projectId)
  return useMutation({
    mutationFn: async ({ week, userId }: { week: string; userId: string }) => {
      const previous = shiftWeek(week, -1)
      const data = await queryClient.fetchQuery({
        queryKey: timesheetsKey(projectId, previous),
        queryFn: ({ signal }) =>
          apiFetch<TimesheetWeek>(
            `/projects/${projectId}/timesheets?week=${previous}`,
            { signal },
          ),
      })
      const rows =
        data.members.find((m) => m.user.id === userId)?.timesheet.rows ?? []
      for (const row of rows) {
        await apiFetch<TimesheetRow>(`/projects/${projectId}/timesheets/rows`, {
          method: 'POST',
          body: JSON.stringify({
            week,
            type: row.type,
            taskId: row.task?.id ?? null,
            description: row.description,
          }),
        })
      }
      return rows.length
    },
    onSettled: invalidate,
  })
}

export function useUpdateRow(projectId: string) {
  const invalidate = useInvalidateProject(projectId)
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<RowInput> }) =>
      apiFetch<TimesheetRow>(`/projects/${projectId}/timesheets/rows/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    onSuccess: invalidate,
  })
}

export function useDeleteRow(projectId: string) {
  const invalidate = useInvalidateProject(projectId)
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<null>(`/projects/${projectId}/timesheets/rows/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: invalidate,
  })
}

interface DayChange {
  rowId: string
  date: string
  hours: number
  /** Omit to keep the current note; an empty string clears it. */
  note?: string
}

/** Applies a day edit to a cached week so the grid updates before the server answers. */
function withDayChange(week: TimesheetWeek, change: DayChange): TimesheetWeek {
  const dayIndex = week.days.indexOf(change.date)
  return {
    ...week,
    members: week.members.map((member) => {
      const row = member.timesheet.rows.find((r) => r.id === change.rowId)
      if (!row) return member
      const previous = row.days.find((d) => d.date === change.date)
      const note =
        change.note !== undefined
          ? change.note || null
          : (previous?.note ?? null)
      const days = row.days
        .filter((d) => d.date !== change.date)
        .concat(
          change.hours === 0 && !note
            ? []
            : [{ date: change.date, hours: change.hours, note }],
        )
        .sort((a, b) => a.date.localeCompare(b.date))
      const delta = change.hours - (previous?.hours ?? 0)
      const add = (hours: number) => Math.round((hours + delta) * 100) / 100
      return {
        ...member,
        timesheet: {
          ...member.timesheet,
          totalHours: add(member.timesheet.totalHours),
          dailyHours: member.timesheet.dailyHours.map((h, i) =>
            i === dayIndex ? add(h) : h,
          ),
          rows: member.timesheet.rows.map((r) =>
            r.id === row.id ? { ...r, days, hours: add(r.hours) } : r,
          ),
        },
      }
    }),
  }
}

export function useSetDay(projectId: string, week: string) {
  const queryClient = useQueryClient()
  const invalidate = useInvalidateProject(projectId)
  const key = timesheetsKey(projectId, week)
  return useMutation({
    mutationFn: ({ rowId, date, ...body }: DayChange) =>
      apiFetch<TimesheetRow>(
        `/projects/${projectId}/timesheets/rows/${rowId}/days/${date}`,
        { method: 'PUT', body: JSON.stringify(body) },
      ),
    onMutate: async (change) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<TimesheetWeek>(key)
      if (previous) {
        queryClient.setQueryData(key, withDayChange(previous, change))
      }
      return { previous }
    },
    onError: (_error, _change, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous)
    },
    onSettled: invalidate,
  })
}

export function useLogTime(projectId: string) {
  const invalidate = useInvalidateProject(projectId)
  return useMutation({
    mutationFn: (input: LogTimeInput) =>
      apiFetch<{ weekStart: string; row: TimesheetRow }>(
        `/projects/${projectId}/timesheets/log`,
        { method: 'POST', body: JSON.stringify(input) },
      ),
    onSuccess: invalidate,
  })
}

export function useSubmitTimesheet(projectId: string) {
  const invalidate = useInvalidateProject(projectId)
  return useMutation({
    mutationFn: ({
      week,
      action,
    }: {
      week: string
      action: 'submit' | 'recall'
    }) =>
      apiFetch<Timesheet>(`/projects/${projectId}/timesheets/${action}`, {
        method: 'POST',
        body: JSON.stringify({ week }),
      }),
    onSuccess: invalidate,
  })
}

/** Takes the project per call so the Reviews page can review across groups. */
export function useReviewTimesheet() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      projectId,
      id,
      input,
    }: {
      projectId: string
      id: string
      input: TimesheetReviewInput
    }) =>
      apiFetch<Timesheet>(`/projects/${projectId}/timesheets/${id}/review`, {
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

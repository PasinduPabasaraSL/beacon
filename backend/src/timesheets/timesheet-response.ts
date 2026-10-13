import { Prisma, TimesheetStatus } from '@prisma/client';
import { userSummarySelect } from '../common/user-summary';
import { addDays, isoDay } from '../common/week';

export const DAYS_PER_WEEK = 7;

export const rowSelect = {
  id: true,
  type: true,
  description: true,
  hours: true,
  task: { select: { id: true, number: true, title: true } },
  days: {
    orderBy: { date: 'asc' },
    select: { date: true, hours: true, note: true },
  },
} satisfies Prisma.ContributionEntrySelect;

export const timesheetSelect = {
  id: true,
  userId: true,
  weekStart: true,
  status: true,
  submittedAt: true,
  reviewedAt: true,
  reviewComment: true,
  reviewedBy: { select: userSummarySelect },
  entries: { orderBy: { createdAt: 'asc' }, select: rowSelect },
} satisfies Prisma.TimesheetSelect;

type RowRecord = Prisma.ContributionEntryGetPayload<{
  select: typeof rowSelect;
}>;
type TimesheetRecord = Prisma.TimesheetGetPayload<{
  select: typeof timesheetSelect;
}>;

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** `YYYY-MM-DD` for each day of the week starting at `weekStart`. */
export function weekDays(weekStart: Date): string[] {
  return Array.from({ length: DAYS_PER_WEEK }, (_, i) =>
    isoDay(addDays(weekStart, i)),
  );
}

export function toRowResponse(row: RowRecord, projectKey: string) {
  return {
    id: row.id,
    type: row.type,
    description: row.description,
    hours: Number(row.hours),
    task: row.task
      ? {
          id: row.task.id,
          key: `${projectKey}-${row.task.number}`,
          title: row.task.title,
        }
      : null,
    days: row.days.map((day) => ({
      date: isoDay(day.date),
      hours: Number(day.hours),
      note: day.note,
    })),
  };
}

export type RowResponse = ReturnType<typeof toRowResponse>;

export function toTimesheetResponse(
  timesheet: TimesheetRecord,
  projectKey: string,
) {
  const rows = timesheet.entries.map((row) => toRowResponse(row, projectKey));
  const days = weekDays(timesheet.weekStart);
  const dailyHours = days.map((date) =>
    round2(
      rows.reduce(
        (sum, row) => sum + (row.days.find((d) => d.date === date)?.hours ?? 0),
        0,
      ),
    ),
  );
  return {
    id: timesheet.id as string | null,
    weekStart: timesheet.weekStart,
    status: timesheet.status,
    submittedAt: timesheet.submittedAt,
    reviewedAt: timesheet.reviewedAt,
    reviewedBy: timesheet.reviewedBy,
    reviewComment: timesheet.reviewComment,
    totalHours: round2(dailyHours.reduce((sum, h) => sum + h, 0)),
    dailyHours,
    rows,
  };
}

export type TimesheetResponse = ReturnType<typeof toTimesheetResponse>;

/** What a member who hasn't logged anything this week sees. */
export function emptyTimesheet(weekStart: Date): TimesheetResponse {
  return {
    id: null,
    weekStart,
    status: TimesheetStatus.DRAFT,
    submittedAt: null,
    reviewedAt: null,
    reviewedBy: null,
    reviewComment: null,
    totalHours: 0,
    dailyHours: Array.from({ length: DAYS_PER_WEEK }, () => 0),
    rows: [],
  };
}

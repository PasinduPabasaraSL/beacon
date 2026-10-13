import { Prisma } from '@prisma/client';
import { userSummarySelect } from '../common/user-summary';

export const entrySelect = {
  id: true,
  weekStart: true,
  hours: true,
  type: true,
  description: true,
  reviewStatus: true,
  reviewComment: true,
  reviewedAt: true,
  createdAt: true,
  updatedAt: true,
  user: { select: userSummarySelect },
  reviewedBy: { select: userSummarySelect },
  task: { select: { id: true, number: true, title: true } },
} satisfies Prisma.ContributionEntrySelect;

type EntryRow = Prisma.ContributionEntryGetPayload<{
  select: typeof entrySelect;
}>;

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function toEntryResponse(entry: EntryRow, projectKey: string) {
  return {
    ...entry,
    hours: Number(entry.hours),
    task: entry.task
      ? {
          id: entry.task.id,
          key: `${projectKey}-${entry.task.number}`,
          title: entry.task.title,
        }
      : null,
  };
}

export type EntryResponse = ReturnType<typeof toEntryResponse>;

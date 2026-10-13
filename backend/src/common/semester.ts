import { SemesterBreakKind } from '@prisma/client';
import { addWeeks, startOfIsoWeek } from './week';

export type AcademicWeekKind = 'TEACHING' | SemesterBreakKind;

export interface AcademicWeek {
  weekStart: Date;
  kind: AcademicWeekKind;
  /** 1-based count of teaching weeks; null for break and exam weeks. */
  teachingWeek: number | null;
  label: string | null;
}

export interface SemesterBreakRow {
  weekStart: Date;
  kind: SemesterBreakKind;
  label: string | null;
}

export interface SemesterSource {
  semesterName: string | null;
  semesterStart: Date | null;
  semesterWeeks: number | null;
  semesterBreaks: SemesterBreakRow[];
}

export const semesterSelect = {
  semesterName: true,
  semesterStart: true,
  semesterWeeks: true,
  semesterBreaks: {
    select: { weekStart: true, kind: true, label: true },
    orderBy: { weekStart: 'asc' },
  },
} as const;

export function buildCalendar(
  start: Date,
  weeks: number,
  breaks: SemesterBreakRow[],
): AcademicWeek[] {
  const breakByWeek = new Map(breaks.map((b) => [b.weekStart.getTime(), b]));
  let teachingWeek = 0;
  return Array.from({ length: weeks }, (_, index) => {
    const weekStart = addWeeks(start, index);
    const pause = breakByWeek.get(weekStart.getTime());
    if (pause) {
      return {
        weekStart,
        kind: pause.kind,
        teachingWeek: null,
        label: pause.label,
      };
    }
    teachingWeek += 1;
    return { weekStart, kind: 'TEACHING', teachingWeek, label: null };
  });
}

export function toSemesterResponse(source: SemesterSource, now = new Date()) {
  const { semesterStart: start, semesterWeeks: weeks } = source;
  if (!start || !weeks) return null;

  const calendar = buildCalendar(start, weeks, source.semesterBreaks);
  const thisWeek = startOfIsoWeek(now).getTime();
  return {
    name: source.semesterName,
    startDate: start,
    weeks,
    teachingWeeks: calendar.filter((w) => w.kind === 'TEACHING').length,
    currentWeek:
      calendar.find((w) => w.weekStart.getTime() === thisWeek) ?? null,
    calendar,
  };
}

export type SemesterResponse = NonNullable<
  ReturnType<typeof toSemesterResponse>
>;

export function academicWeekOf(
  semester: SemesterResponse | null,
  weekStart: Date,
): AcademicWeek | null {
  return (
    semester?.calendar.find(
      (w) => w.weekStart.getTime() === weekStart.getTime(),
    ) ?? null
  );
}

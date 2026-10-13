import { SemesterBreakKind } from '@prisma/client';
import { buildCalendar, toSemesterResponse } from './semester';
import { addWeeks } from './week';

describe('semester calendar', () => {
  const start = new Date('2026-07-27T00:00:00Z');

  it('numbers teaching weeks and skips break and exam weeks', () => {
    const calendar = buildCalendar(start, 5, [
      {
        weekStart: addWeeks(start, 2),
        kind: SemesterBreakKind.BREAK,
        label: 'Mid-semester break',
      },
      {
        weekStart: addWeeks(start, 4),
        kind: SemesterBreakKind.EXAM,
        label: null,
      },
    ]);

    expect(calendar.map((w) => [w.kind, w.teachingWeek])).toEqual([
      ['TEACHING', 1],
      ['TEACHING', 2],
      ['BREAK', null],
      ['TEACHING', 3],
      ['EXAM', null],
    ]);
    expect(calendar[2].label).toBe('Mid-semester break');
  });

  it('reports the current week and teaching week count', () => {
    const semester = toSemesterResponse(
      {
        semesterName: 'Semester 2',
        semesterStart: start,
        semesterWeeks: 3,
        semesterBreaks: [
          {
            weekStart: addWeeks(start, 1),
            kind: SemesterBreakKind.BREAK,
            label: null,
          },
        ],
      },
      new Date('2026-08-05T15:00:00Z'),
    );

    expect(semester?.teachingWeeks).toBe(2);
    expect(semester?.currentWeek).toMatchObject({ kind: 'BREAK' });
  });

  it('is null until a start date and length are set', () => {
    expect(
      toSemesterResponse({
        semesterName: null,
        semesterStart: null,
        semesterWeeks: null,
        semesterBreaks: [],
      }),
    ).toBeNull();
  });
});

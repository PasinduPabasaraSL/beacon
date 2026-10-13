import { addWeeks, startOfIsoWeek } from './week';

describe('startOfIsoWeek', () => {
  it.each([
    ['2026-10-05T00:00:00Z', '2026-10-05'], // Monday
    ['2026-10-07T15:30:00Z', '2026-10-05'], // Wednesday
    ['2026-10-11T23:59:59Z', '2026-10-05'], // Sunday
    ['2026-01-01T12:00:00Z', '2025-12-29'], // crosses a year boundary
  ])('maps %s to %s', (input, expected) => {
    expect(startOfIsoWeek(new Date(input)).toISOString().slice(0, 10)).toBe(
      expected,
    );
  });
});

describe('addWeeks', () => {
  it('moves by whole weeks in either direction', () => {
    const monday = new Date('2026-10-05T00:00:00Z');
    expect(addWeeks(monday, -1).toISOString().slice(0, 10)).toBe('2026-09-28');
    expect(addWeeks(monday, 2).toISOString().slice(0, 10)).toBe('2026-10-19');
  });
});

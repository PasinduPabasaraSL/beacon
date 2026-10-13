const DAY_MS = 24 * 60 * 60 * 1000;

/** Monday 00:00 UTC of the ISO week containing `date`. */
export function startOfIsoWeek(date: Date): Date {
  const utcMidnight = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  );
  const daysSinceMonday = (date.getUTCDay() + 6) % 7;
  return new Date(utcMidnight - daysSinceMonday * DAY_MS);
}

export function addWeeks(date: Date, weeks: number): Date {
  return new Date(date.getTime() + weeks * 7 * DAY_MS);
}

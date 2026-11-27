/**
 * Time-zone helpers built on Intl (no library). Local dates are "YYYY-MM-DD" strings and
 * times are minutes after local midnight in the garden's IANA zone (Europe/Brussels).
 */

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatter(tz: string): Intl.DateTimeFormat {
  let f = formatters.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    formatters.set(tz, f);
  }
  return f;
}

/** Wall-clock parts of an instant in a zone. */
export function zonedParts(date: Date, tz: string) {
  const parts: Record<string, number> = {};
  for (const p of formatter(tz).formatToParts(date)) {
    if (p.type !== 'literal') parts[p.type] = Number(p.value);
  }
  return { year: parts.year, month: parts.month, day: parts.day, hour: parts.hour % 24, minute: parts.minute, second: parts.second };
}

/** Offset of the zone from UTC at an instant, in minutes (Brussels: +60 winter, +120 summer). */
export function tzOffsetMinutes(date: Date, tz: string): number {
  const p = zonedParts(date, tz);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return Math.round((asUtc - Math.floor(date.getTime() / 1000) * 1000) / 60000);
}

export function parseLocalDate(date: string): { y: number; m: number; d: number } {
  const [y, m, d] = date.split('-').map(Number);
  return { y, m, d };
}

export function formatLocalDate(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** The instant at which the wall clock in `tz` shows `date` + `minutes`. */
export function zonedToUtc(date: string, minutes: number, tz: string): Date {
  const { y, m, d } = parseLocalDate(date);
  const guess = Date.UTC(y, m - 1, d, 0, 0) + minutes * 60000;
  let off = tzOffsetMinutes(new Date(guess), tz);
  let t = guess - off * 60000;
  const off2 = tzOffsetMinutes(new Date(t), tz);
  if (off2 !== off) {
    off = off2;
    t = guess - off * 60000;
  }
  return new Date(t);
}

/** Minutes after local midnight for an instant (may be fractional). */
export function utcToZonedMinutes(date: Date, tz: string): number {
  const p = zonedParts(date, tz);
  return p.hour * 60 + p.minute + p.second / 60;
}

export function formatMinutes(minutes: number): string {
  const m = ((Math.round(minutes) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

/** Add whole days to a local date string. */
export function addDays(date: string, days: number): string {
  const { y, m, d } = parseLocalDate(date);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return formatLocalDate(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
}

/** Inclusive list of local dates from `from` to `to`, every `stepDays`. */
export function dateRange(from: string, to: string, stepDays: number): string[] {
  const out: string[] = [];
  for (let d = from; d <= to; d = addDays(d, stepDays)) out.push(d);
  return out;
}

export const monthOf = (date: string): number => parseLocalDate(date).m;

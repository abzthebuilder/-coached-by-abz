// All "days" are plain YYYY-MM-DD strings in the client's own timezone.
// This keeps logs stable no matter where the server runs.

export const DEFAULT_TZ = process.env.APP_TIMEZONE || "Europe/London";

export function isValidTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function todayIn(tz: string, now: Date = new Date()): string {
  const safe = isValidTimezone(tz) ? tz : DEFAULT_TZ;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: safe,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function isDay(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s + "T00:00:00Z"));
}

function toUTC(day: string): Date {
  return new Date(day + "T00:00:00Z");
}

function fromUTC(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(day: string, n: number): string {
  const d = toUTC(day);
  d.setUTCDate(d.getUTCDate() + n);
  return fromUTC(d);
}

export function addMonths(day: string, n: number): string {
  const d = toUTC(day);
  d.setUTCMonth(d.getUTCMonth() + n);
  return fromUTC(d);
}

/** 0 = Sunday … 6 = Saturday */
export function weekday(day: string): number {
  return toUTC(day).getUTCDay();
}

/** Monday of the week containing `day`. */
export function startOfWeek(day: string): string {
  const wd = weekday(day);
  return addDays(day, -((wd + 6) % 7));
}

export function diffDays(a: string, b: string): number {
  return Math.round((toUTC(a).getTime() - toUTC(b).getTime()) / 86400000);
}

/** Inclusive list of days from start to end. */
export function dayRange(start: string, end: string): string[] {
  const out: string[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) out.push(d);
  return out;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function fmtDay(day: string, opts: { weekday?: boolean; year?: boolean } = {}): string {
  const d = toUTC(day);
  const parts = [
    opts.weekday ? WEEKDAYS[d.getUTCDay()] : null,
    `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`,
    opts.year ? String(d.getUTCFullYear()) : null,
  ].filter(Boolean);
  return parts.join(" ");
}

export function relativeDay(day: string, today: string): string {
  const n = diffDays(day, today);
  if (n === 0) return "Today";
  if (n === 1) return "Tomorrow";
  if (n === -1) return "Yesterday";
  if (n > 1 && n < 7) return `In ${n} days`;
  if (n < -1 && n > -7) return `${-n} days ago`;
  return fmtDay(day, { weekday: true });
}

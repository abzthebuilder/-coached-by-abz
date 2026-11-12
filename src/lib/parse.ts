import { addDays, isDay } from "./dates";

export class InputError extends Error {}

/** Reads an optional number. Blank → null. Out of range → InputError with a friendly message. */
export function num(
  fd: FormData,
  name: string,
  label: string,
  { min = 0, max = 1e7, int = false }: { min?: number; max?: number; int?: boolean } = {},
): number | null {
  const raw = String(fd.get(name) ?? "").trim().replace(/,/g, "");
  if (raw === "") return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) throw new InputError(`${label} must be a number.`);
  if (n < min || n > max) throw new InputError(`${label} must be between ${min} and ${max}.`);
  return int ? Math.round(n) : Math.round(n * 100) / 100;
}

export function reqNum(fd: FormData, name: string, label: string, opts?: Parameters<typeof num>[3]): number {
  const n = num(fd, name, label, opts);
  if (n === null) throw new InputError(`Enter ${label.toLowerCase()}.`);
  return n;
}

export function text(fd: FormData, name: string, max = 4000): string {
  return String(fd.get(name) ?? "").trim().slice(0, max);
}

export function rating(fd: FormData, name: string, label: string): number {
  const n = Number(fd.get(name));
  if (!Number.isInteger(n) || n < 1 || n > 5) throw new InputError(`Choose a rating for ${label.toLowerCase()}.`);
  return n;
}

/** A log day: defaults to today, can't be in the future, can be backfilled up to a year. */
export function logDay(fd: FormData, today: string, name = "day"): string {
  const raw = String(fd.get(name) ?? "").trim();
  const day = raw || today;
  if (!isDay(day)) throw new InputError("Choose a valid date.");
  if (day > today) throw new InputError("You can't log a future date.");
  if (day < addDays(today, -365)) throw new InputError("That date is too far back.");
  return day;
}

export function fail(e: unknown): { error: string } {
  if (e instanceof InputError) return { error: e.message };
  console.error(e);
  return { error: "Something went wrong. Please try again." };
}

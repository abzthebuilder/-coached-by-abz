import { addDays, addMonths, diffDays, weekday } from "./dates";

export type Schedule = {
  frequency: "WEEKLY" | "MONTHLY";
  weekday: number; // 0-6, weekly
  monthDay: number; // 1-28, monthly
  startDay: string;
};

/** Most recent scheduled due date on or before `today`. */
function lastScheduled(s: Schedule, today: string): string {
  if (s.frequency === "WEEKLY") {
    const back = (weekday(today) - s.weekday + 7) % 7;
    return addDays(today, -back);
  }
  const [y, m] = today.split("-").map(Number);
  const md = String(Math.min(Math.max(s.monthDay, 1), 28)).padStart(2, "0");
  const thisMonth = `${y}-${String(m).padStart(2, "0")}-${md}`;
  return thisMonth <= today ? thisMonth : addMonths(thisMonth, -1);
}

function next(s: Schedule, day: string): string {
  return s.frequency === "WEEKLY" ? addDays(day, 7) : addMonths(day, 1);
}

/** Clients may submit a little early: this many days before the due date counts. */
export function earlyWindow(s: Schedule): number {
  return s.frequency === "WEEKLY" ? 2 : 5;
}

export type CheckInStatus = {
  dueDay: string;
  state: "overdue" | "due_today" | "upcoming";
  daysUntil: number; // negative when overdue
};

/**
 * Works out the next check-in date.
 * `lastSubmittedDay` is the day the client's most recent check-in was submitted.
 */
export function checkInStatus(s: Schedule, today: string, lastSubmittedDay: string | null): CheckInStatus {
  let due = lastScheduled(s, today);
  // A due date before the client started, or one already covered by a submission, rolls forward.
  const covered = (d: string) =>
    lastSubmittedDay !== null && lastSubmittedDay >= addDays(d, -earlyWindow(s));
  // The first due date must be at least a couple of days after the start date.
  while (due < addDays(s.startDay, 2) || covered(due)) due = next(s, due);
  const daysUntil = diffDays(due, today);
  return { dueDay: due, daysUntil, state: daysUntil < 0 ? "overdue" : daysUntil === 0 ? "due_today" : "upcoming" };
}

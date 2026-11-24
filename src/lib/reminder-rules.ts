import type { CheckInStatus } from "./checkin-schedule";

export const REMINDER_HOUR = 9; // local time, so nobody gets a reminder in the middle of the night

/** Remind the day before a check-in is due, once per due date, from 9am the client's time. */
export function shouldRemind(status: CheckInStatus, localHour: number, lastReminderDueDay: string | null): boolean {
  return status.daysUntil === 1 && localHour >= REMINDER_HOUR && lastReminderDueDay !== status.dueDay;
}

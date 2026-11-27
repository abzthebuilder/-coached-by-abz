// Check-in reminder emails. Runs hourly inside the app (see src/instrumentation.ts); safe to run more often.
import { db } from "./db";
import { checkInStatus } from "./checkin-schedule";
import { DEFAULT_TZ, isValidTimezone, todayIn } from "./dates";
import { emailEnabled, sendEmail } from "./email";
import { emails } from "./email-templates";
import { shouldRemind } from "./reminder-rules";
import { publicBaseUrl } from "./url";
import { purgeStaleLeads } from "./maintenance";

function localHour(tz: string, now: Date): number {
  const safe = isValidTimezone(tz) ? tz : DEFAULT_TZ;
  return Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: safe }).format(now)) % 24;
}

export async function runCheckInReminders(now: Date = new Date()): Promise<number> {
  const base = publicBaseUrl();
  if (!emailEnabled() || !base) return 0;
  const clients = await db.clientProfile.findMany({
    where: { active: true },
    include: { user: true, checkIns: { orderBy: { createdAt: "desc" }, take: 1, select: { day: true } } },
  });
  let sent = 0;
  for (const c of clients) {
    const status = checkInStatus(
      { frequency: c.checkInFrequency, weekday: c.checkInWeekday, monthDay: c.checkInMonthDay, startDay: c.startDay },
      todayIn(c.user.timezone, now),
      c.checkIns[0]?.day ?? null,
    );
    if (!shouldRemind(status, localHour(c.user.timezone, now), c.lastReminderDueDay)) continue;
    // Claim this reminder first so two runs can never send it twice.
    const claimed = await db.clientProfile.updateMany({
      where: { id: c.id, OR: [{ lastReminderDueDay: null }, { lastReminderDueDay: { not: status.dueDay } }] },
      data: { lastReminderDueDay: status.dueDay },
    });
    if (claimed.count !== 1) continue;
    if (await sendEmail(emails.reminder(c.user.email, c.user.name, `${base}/app/check-ins/new`))) sent++;
  }
  return sent;
}

let started = false;
export function startReminderLoop() {
  if (started) return;
  started = true;
  const run = () => {
    runCheckInReminders().catch((e) => console.error("Reminder run failed", e));
    purgeStaleLeads().catch((e) => console.error("Lead clean-up failed", e));
  };
  setTimeout(run, 60_000);
  setInterval(run, 60 * 60_000);
}

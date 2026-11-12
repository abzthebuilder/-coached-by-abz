import "server-only";
import { db } from "./db";
import { checkInStatus, type CheckInStatus } from "./checkin-schedule";
import { todayIn } from "./dates";

export type RosterRow = {
  id: string;
  name: string;
  email: string;
  active: boolean;
  today: string;
  status: CheckInStatus;
  lastCheckIn: { id: string; day: string; replied: boolean } | null;
  lastLogDay: string | null;
};

/** Every client this coach coaches, with check-in status. Sorted so whoever needs attention is first. */
export async function roster(coachId: string): Promise<RosterRow[]> {
  const clients = await db.clientProfile.findMany({
    where: { coachId },
    include: {
      user: { select: { name: true, email: true, timezone: true } },
      checkIns: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { replies: { where: { author: { role: "COACH" } }, select: { id: true }, take: 1 } },
      },
      dailyLogs: { orderBy: { day: "desc" }, take: 1, select: { day: true } },
      workoutLogs: { orderBy: { day: "desc" }, take: 1, select: { day: true } },
    },
  });
  const rows = clients.map((c) => {
    const today = todayIn(c.user.timezone);
    const last = c.checkIns[0];
    const lastLogDay = [c.dailyLogs[0]?.day, c.workoutLogs[0]?.day].filter(Boolean).sort().pop() ?? null;
    return {
      id: c.id,
      name: c.user.name,
      email: c.user.email,
      active: c.active,
      today,
      status: checkInStatus(
        { frequency: c.checkInFrequency, weekday: c.checkInWeekday, monthDay: c.checkInMonthDay, startDay: c.startDay },
        today,
        last?.day ?? null,
      ),
      lastCheckIn: last ? { id: last.id, day: last.day, replied: last.replies.length > 0 } : null,
      lastLogDay,
    };
  });
  const rank = (r: RosterRow) =>
    !r.active ? 9 : r.lastCheckIn && !r.lastCheckIn.replied ? 0 : r.status.state === "overdue" ? 1 : r.status.state === "due_today" ? 2 : 3;
  return rows.sort((a, b) => rank(a) - rank(b) || a.status.daysUntil - b.status.daysUntil || a.name.localeCompare(b.name));
}

import "server-only";
import { db } from "./db";
import { startOfWeek } from "./dates";

/** Active tasks for today, with whether each is done for its current period. */
export async function tasksForToday(clientId: string, today: string) {
  const tasks = await db.task.findMany({
    where: { clientId, active: true },
    include: { completions: { orderBy: { day: "desc" }, take: 10 } },
    orderBy: { createdAt: "asc" },
  });
  const week = startOfWeek(today);
  return tasks
    .map((t) => {
      const period = t.frequency === "DAILY" ? today : t.frequency === "WEEKLY" ? week : "once";
      return { ...t, done: t.completions.some((c) => c.day === period) };
    });
}

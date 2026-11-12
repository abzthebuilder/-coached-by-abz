import "server-only";
import { db } from "./db";
import { addDays, dayRange } from "./dates";
import { type DayPoint, type TargetRow, targetOn, e1rm } from "./metrics";

export const HISTORY_DAYS = 90;

export async function loadDayPoints(clientId: string, today: string, days = HISTORY_DAYS + 7): Promise<DayPoint[]> {
  const start = addDays(today, -(days - 1));
  const [logs, workouts, targets] = await Promise.all([
    db.dailyLog.findMany({ where: { clientId, day: { gte: start, lte: today } } }),
    db.workoutLog.findMany({ where: { clientId, day: { gte: start, lte: today } }, select: { day: true } }),
    db.nutritionTarget.findMany({ where: { clientId }, orderBy: [{ effectiveDay: "asc" }, { createdAt: "asc" }] }),
  ]);
  const logMap = new Map(logs.map((l) => [l.day, l]));
  const wCount = new Map<string, number>();
  for (const w of workouts) wCount.set(w.day, (wCount.get(w.day) ?? 0) + 1);
  const rows: TargetRow[] = targets;
  return dayRange(start, today).map((day) => {
    const l = logMap.get(day);
    return {
      day,
      weightKg: l?.weightKg ?? null,
      calories: l?.calories ?? null,
      proteinG: l?.proteinG ?? null,
      carbsG: l?.carbsG ?? null,
      fatG: l?.fatG ?? null,
      steps: l?.steps ?? null,
      workouts: wCount.get(day) ?? 0,
      target: targetOn(rows, day),
    };
  });
}

export async function currentTarget(clientId: string, today: string) {
  return db.nutritionTarget.findFirst({
    where: { clientId, effectiveDay: { lte: today } },
    orderBy: [{ effectiveDay: "desc" }, { createdAt: "desc" }],
  }).then(async (t) =>
    t ?? db.nutritionTarget.findFirst({ where: { clientId }, orderBy: [{ effectiveDay: "asc" }] }),
  );
}

export async function activePlan(clientId: string) {
  return db.trainingPlan.findFirst({
    where: { clientId, active: true },
    orderBy: { createdAt: "desc" },
    include: { workouts: { orderBy: { order: "asc" }, include: { exercises: { orderBy: { order: "asc" } } } } },
  });
}

export type LiftSession = { day: string; sets: { weightKg: number; reps: number }[]; top: { weightKg: number; reps: number }; best1rm: number; volume: number };
export type LiftHistory = { key: string; name: string; sessions: LiftSession[] };

export async function liftHistory(clientId: string): Promise<LiftHistory[]> {
  const sets = await db.setLog.findMany({
    where: { workoutLog: { clientId } },
    include: { workoutLog: { select: { day: true, createdAt: true } } },
    orderBy: [{ workoutLog: { day: "asc" } }, { setNumber: "asc" }],
  });
  const byKey = new Map<string, { name: string; days: Map<string, { weightKg: number; reps: number }[]> }>();
  for (const s of sets) {
    const e = byKey.get(s.exerciseKey) ?? { name: s.exerciseName, days: new Map() };
    e.name = s.exerciseName;
    const arr = e.days.get(s.workoutLog.day) ?? [];
    arr.push({ weightKg: s.weightKg, reps: s.reps });
    e.days.set(s.workoutLog.day, arr);
    byKey.set(s.exerciseKey, e);
  }
  return [...byKey.entries()]
    .map(([key, e]) => ({
      key,
      name: e.name,
      sessions: [...e.days.entries()].map(([day, sets]) => {
        const top = sets.reduce((a, b) => (b.weightKg > a.weightKg || (b.weightKg === a.weightKg && b.reps > a.reps) ? b : a));
        return {
          day,
          sets,
          top,
          best1rm: Math.max(...sets.map((x) => e1rm(x.weightKg, x.reps))),
          volume: Math.round(sets.reduce((v, x) => v + x.weightKg * x.reps, 0)),
        };
      }),
    }))
    .sort((a, b) => b.sessions.length - a.sessions.length || a.name.localeCompare(b.name));
}

/** Most recent logged sets for each exercise key, for "last time" hints. */
export async function lastTimeFor(clientId: string, keys: string[]) {
  const out: Record<string, { day: string; sets: { weightKg: number; reps: number }[] }> = {};
  if (keys.length === 0) return out;
  const sets = await db.setLog.findMany({
    where: { exerciseKey: { in: keys }, workoutLog: { clientId } },
    include: { workoutLog: { select: { day: true, createdAt: true, id: true } } },
    orderBy: [{ workoutLog: { day: "desc" } }, { workoutLog: { createdAt: "desc" } }, { setNumber: "asc" }],
  });
  const logFor: Record<string, string> = {};
  for (const s of sets) {
    if (!logFor[s.exerciseKey]) {
      logFor[s.exerciseKey] = s.workoutLog.id;
      out[s.exerciseKey] = { day: s.workoutLog.day, sets: [] };
    }
    if (logFor[s.exerciseKey] === s.workoutLog.id) out[s.exerciseKey].sets.push({ weightKg: s.weightKg, reps: s.reps });
  }
  return out;
}

/** Next workout in the rotation: the one after the most recently logged plan workout. */
export async function nextWorkout(clientId: string, plan: Awaited<ReturnType<typeof activePlan>>) {
  if (!plan || plan.workouts.length === 0) return null;
  const last = await db.workoutLog.findFirst({
    where: { clientId, planWorkoutId: { in: plan.workouts.map((w) => w.id) } },
    orderBy: [{ day: "desc" }, { createdAt: "desc" }],
  });
  if (!last) return plan.workouts[0];
  const idx = plan.workouts.findIndex((w) => w.id === last.planWorkoutId);
  return plan.workouts[(idx + 1) % plan.workouts.length];
}

// Pure helpers shared by the Progress dashboard, the coach view and unit tests.
import { addDays, diffDays, startOfWeek } from "./dates";

export type Target = { calories: number; proteinG: number; carbsG: number; fatG: number; stepGoal: number };
export type TargetRow = Target & { effectiveDay: string };

export type DayPoint = {
  day: string;
  weightKg: number | null;
  calories: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  steps: number | null;
  workouts: number;
  target: Target | null;
};

/** Target that applies on `day` (latest row with effectiveDay <= day). Rows sorted ascending. */
export function targetOn(rows: TargetRow[], day: string): Target | null {
  let found: TargetRow | null = null;
  for (const r of rows) {
    if (r.effectiveDay <= day) found = r;
    else break;
  }
  if (!found) return rows[0] ?? null; // before the first target, show the first one
  const { effectiveDay: _e, ...t } = found;
  return t;
}

export function mean(xs: (number | null | undefined)[]): number | null {
  const v = xs.filter((x): x is number => typeof x === "number");
  if (v.length === 0) return null;
  return v.reduce((a, b) => a + b, 0) / v.length;
}

export const normaliseExercise = (name: string) => name.trim().toLowerCase().replace(/\s+/g, " ");

export type WeekMetric = { thisWeek: number | null; lastWeek: number | null; delta: number | null; loggedDays: number };
export type WeekSummary = {
  days: number; // days elapsed this week, incl. today
  weekStart: string;
  weight: WeekMetric;
  calories: WeekMetric;
  protein: WeekMetric;
  steps: WeekMetric;
  workouts: { done: number; assigned: number; lastWeekDone: number };
};

/** "This week so far" vs the same weekdays last week. Weeks start Monday. */
export function weekSummary(points: DayPoint[], today: string, workoutsPerWeek: number): WeekSummary {
  const ws = startOfWeek(today);
  const n = diffDays(today, ws) + 1;
  const byDay = new Map(points.map((p) => [p.day, p]));
  const pick = (start: string) => Array.from({ length: n }, (_, i) => byDay.get(addDays(start, i)));
  const cur = pick(ws);
  const prev = pick(addDays(ws, -7));

  const metric = (f: (p: DayPoint) => number | null): WeekMetric => {
    const a = mean(cur.map((p) => (p ? f(p) : null)));
    const b = mean(prev.map((p) => (p ? f(p) : null)));
    return {
      thisWeek: a,
      lastWeek: b,
      delta: a !== null && b !== null ? a - b : null,
      loggedDays: cur.filter((p) => p && f(p) !== null).length,
    };
  };
  const sumWorkouts = (xs: (DayPoint | undefined)[]) => xs.reduce((s, p) => s + (p?.workouts ?? 0), 0);
  return {
    days: n,
    weekStart: ws,
    weight: metric((p) => p.weightKg),
    calories: metric((p) => p.calories),
    protein: metric((p) => p.proteinG),
    steps: metric((p) => p.steps),
    workouts: { done: sumWorkouts(cur), assigned: workoutsPerWeek, lastWeekDone: sumWorkouts(prev) },
  };
}

export const onTarget = {
  calories: (v: number, t: number) => Math.abs(v - t) <= t * 0.1,
  proteinG: (v: number, t: number) => v >= t * 0.9,
  carbsG: (v: number, t: number) => Math.abs(v - t) <= t * 0.15,
  fatG: (v: number, t: number) => Math.abs(v - t) <= t * 0.15,
  steps: (v: number, t: number) => v >= t,
};

export type Adherence = {
  days: number;
  loggedDays: number;
  caloriesHit: number | null; // % of logged calorie days within 10% of target
  proteinHit: number | null;
  stepsAvg: number | null;
  stepGoal: number | null;
  stepsHit: number | null;
  workoutsDone: number;
  workoutsAssigned: number;
};

export function adherence(points: DayPoint[], days: number, workoutsPerWeek: number): Adherence {
  const window = points.slice(-days);
  const pct = (xs: boolean[]) => (xs.length ? Math.round((xs.filter(Boolean).length / xs.length) * 100) : null);
  const cal: boolean[] = [];
  const pro: boolean[] = [];
  const st: boolean[] = [];
  for (const p of window) {
    if (p.target && p.calories !== null) cal.push(onTarget.calories(p.calories, p.target.calories));
    if (p.target && p.proteinG !== null) pro.push(onTarget.proteinG(p.proteinG, p.target.proteinG));
    if (p.target && p.steps !== null) st.push(onTarget.steps(p.steps, p.target.stepGoal));
  }
  const last = window[window.length - 1];
  return {
    days,
    loggedDays: window.filter((p) => p.calories !== null || p.steps !== null || p.weightKg !== null).length,
    caloriesHit: pct(cal),
    proteinHit: pct(pro),
    stepsAvg: mean(window.map((p) => p.steps)),
    stepGoal: last?.target?.stepGoal ?? null,
    stepsHit: pct(st),
    workoutsDone: window.reduce((s, p) => s + p.workouts, 0),
    workoutsAssigned: Math.round((workoutsPerWeek * days) / 7),
  };
}

/** Epley estimated one-rep max. */
export const e1rm = (w: number, r: number) => (r <= 1 ? w : Math.round(w * (1 + r / 30) * 10) / 10);

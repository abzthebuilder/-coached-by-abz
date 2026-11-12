import type { WeekSummary as WS } from "@/lib/metrics";
import { cx, fmtNum } from "@/components/ui";

type Tone = "good" | "bad" | "neutral";

function Delta({ delta, digits = 0, unit = "", tone }: { delta: number | null; digits?: number; unit?: string; tone: Tone }) {
  if (delta === null) return <div className="text-xs text-faint">No data last week</div>;
  const r = Math.round(delta * 10 ** digits) / 10 ** digits;
  const sign = r > 0 ? "+" : r < 0 ? "−" : "±";
  return (
    <div className={cx("text-xs font-semibold", tone === "good" ? "text-gold" : tone === "bad" ? "text-warn" : "text-mute")}>
      {sign}
      {fmtNum(Math.abs(r), digits)}
      {unit} vs last week
    </div>
  );
}

const upGood = (d: number | null): Tone => (d === null || d === 0 ? "neutral" : d > 0 ? "good" : "bad");

export function WeekSummary({ w, goal }: { w: WS; goal: "FAT_LOSS" | "MUSCLE_GAIN" | "RECOMP" | "STRENGTH" }) {
  const weightTone: Tone =
    w.weight.delta === null || Math.abs(w.weight.delta) < 0.05
      ? "neutral"
      : goal === "FAT_LOSS"
        ? w.weight.delta < 0 ? "good" : "bad"
        : goal === "MUSCLE_GAIN"
          ? w.weight.delta > 0 ? "good" : "bad"
          : "neutral";
  const dayLabel = w.days === 1 ? "Monday only" : `Mon–${["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][w.days]}`;
  const cards = [
    { label: "Avg weight", value: fmtNum(w.weight.thisWeek, 1), unit: "kg", m: w.weight, digits: 1, dUnit: "kg", tone: weightTone },
    { label: "Avg calories", value: fmtNum(w.calories.thisWeek), unit: "kcal", m: w.calories, digits: 0, dUnit: "", tone: "neutral" as Tone },
    { label: "Avg protein", value: fmtNum(w.protein.thisWeek), unit: "g", m: w.protein, digits: 0, dUnit: "g", tone: upGood(w.protein.delta) },
    { label: "Avg steps", value: fmtNum(w.steps.thisWeek), unit: "", m: w.steps, digits: 0, dUnit: "", tone: upGood(w.steps.delta) },
  ];
  const wDelta = w.workouts.done - w.workouts.lastWeekDone;
  return (
    <section aria-labelledby="week-heading" className="rounded-2xl border border-line/70 bg-char p-4 sm:p-5">
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="week-heading" className="font-display text-2xl uppercase">This week so far</h2>
        <span className="text-xs text-mute">{dayLabel} vs same days last week</span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
        <div className="col-span-2 rounded-xl border-l-4 border-gold bg-char-2 p-3 sm:col-span-1">
          <div className="text-xs text-mute">Workouts</div>
          <div className="font-display tabular text-5xl leading-none">
            {w.workouts.done}
            <span className="text-2xl text-mute">/{w.workouts.assigned}</span>
          </div>
          <div className={cx("mt-1 text-xs font-semibold", wDelta > 0 ? "text-gold" : wDelta < 0 ? "text-warn" : "text-mute")}>
            {wDelta === 0 ? "Same as" : `${wDelta > 0 ? "+" : "−"}${Math.abs(wDelta)} vs`} last week
          </div>
        </div>
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl bg-char-2 p-3">
            <div className="text-xs text-mute">{c.label}</div>
            <div className="font-display tabular text-3xl leading-tight">
              {c.value}
              {c.m.thisWeek !== null && c.unit && <span className="ml-0.5 text-base text-mute">{c.unit}</span>}
            </div>
            {c.m.thisWeek === null ? (
              <div className="text-xs text-faint">Nothing logged yet</div>
            ) : (
              <Delta delta={c.m.delta} digits={c.digits} unit={c.dUnit} tone={c.tone} />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

import Link from "next/link";
import { requireClient } from "@/lib/auth";
import { addDays, fmtDay, isDay, startOfWeek, todayIn } from "@/lib/dates";
import { currentTarget, loadDayPoints } from "@/lib/progress";
import { mean } from "@/lib/metrics";
import { deleteFoodEntryAction, logDailyAction } from "@/app/actions/client";
import { db } from "@/lib/db";
import { MEALS } from "@/lib/food-math";
import { ActionForm, SubmitButton } from "@/components/form";
import { Card, CardTitle, Empty, Field, PageHeader, cx, fmtNum } from "@/components/ui";

export const metadata = { title: "Nutrition & steps" };

const r1 = (n: number) => Math.round(n * 10) / 10;

function MacroBar({ label, value, target, unit = "g" }: { label: string; value: number; target?: number; unit?: string }) {
  const pct = target ? Math.min(100, (value / target) * 100) : 0;
  return (
    <div className="rounded-xl bg-char-2 p-3">
      <div className="text-xs text-mute">{label}</div>
      <div className="tabular">
        <span className="font-display text-2xl">{fmtNum(value)}</span>
        {target ? <span className="text-xs text-mute"> / {fmtNum(target)}{unit}</span> : <span className="text-xs text-mute">{unit}</span>}
      </div>
      {target ? (
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-char-3" aria-hidden>
          <div className="h-full rounded-full bg-gold" style={{ width: `${pct}%` }} />
        </div>
      ) : null}
    </div>
  );
}

export default async function Nutrition({ searchParams }: { searchParams: Promise<{ day?: string; added?: string }> }) {
  const { user, profile } = await requireClient();
  const today = todayIn(user.timezone);
  const sp = await searchParams;
  const day = isDay(sp.day) && sp.day <= today && sp.day >= addDays(today, -365) ? sp.day : today;
  const [target, points] = await Promise.all([currentTarget(profile.id, today), loadDayPoints(profile.id, today, 14)]);
  const byDay = new Map(points.map((p) => [p.day, p]));
  // The selected day may be older than the 14 shown; load it on its own if needed.
  const sel = byDay.get(day) ?? (await loadDayPoints(profile.id, day, 1))[0];
  const ws = startOfWeek(today);
  const thisWeekSteps = mean(points.filter((p) => p.day >= ws).map((p) => p.steps));
  const last7Steps = mean(points.slice(-7).map((p) => p.steps));
  const entries = await db.foodEntry.findMany({ where: { clientId: profile.id, day }, orderBy: { createdAt: "asc" } });
  const sum = (k: "kcal" | "proteinG" | "carbsG" | "fatG") => entries.reduce((t, e) => t + e[k], 0);
  const totals = { kcal: sum("kcal"), proteinG: sum("proteinG"), carbsG: sum("carbsG"), fatG: sum("fatG") };
  const usingDiary = entries.length > 0;
  const remaining = target ? target.calories - Math.round(totals.kcal) : null;

  return (
    <div className="space-y-4">
      <PageHeader eyebrow="Fuel" title="Nutrition & steps" />
      {sp.added && (
        <div role="status" className="rounded-xl bg-gold/10 p-3 text-sm text-gold">
          Added to your food diary.
        </div>
      )}

      {/* Day picker */}
      <div className="flex items-center justify-between gap-2">
        <Link href={`/app/nutrition?day=${addDays(day, -1)}`} className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-line" aria-label="Previous day">
          ‹
        </Link>
        <form method="get" className="flex flex-1 items-center justify-center gap-2">
          <input className="field !w-auto !py-2 text-sm" type="date" name="day" defaultValue={day} max={today} aria-label="Choose a day" />
          <button className="min-h-11 rounded-xl border border-line px-3 text-sm font-semibold">Go</button>
        </form>
        {day < today ? (
          <Link href={`/app/nutrition?day=${addDays(day, 1)}`} className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-line" aria-label="Next day">
            ›
          </Link>
        ) : (
          <span className="min-w-11" />
        )}
      </div>

      {/* Food diary */}
      <Card>
        <CardTitle eyebrow={day === today ? "Today" : fmtDay(day, { weekday: true, year: true })} title="Food diary" />
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="font-display tabular text-5xl leading-none">
              {fmtNum(totals.kcal)}
              {target && <span className="text-xl text-mute"> / {fmtNum(target.calories)}</span>}
            </div>
            <div className="mt-1 text-sm text-mute">kcal eaten</div>
          </div>
          {remaining !== null && (
            <div className="text-right">
              <div className={cx("font-display tabular text-2xl", remaining < 0 ? "text-warn" : "text-gold")}>{fmtNum(Math.abs(remaining))}</div>
              <div className="text-xs text-mute">{remaining < 0 ? "kcal over" : "kcal left"}</div>
            </div>
          )}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <MacroBar label="Protein" value={r1(totals.proteinG)} target={target?.proteinG} />
          <MacroBar label="Carbs" value={r1(totals.carbsG)} target={target?.carbsG} />
          <MacroBar label="Fat" value={r1(totals.fatG)} target={target?.fatG} />
        </div>

        <div className="mt-4 space-y-3">
          {MEALS.map((m) => {
            const items = entries.filter((e) => e.meal === m.key);
            const mealKcal = items.reduce((t, e) => t + e.kcal, 0);
            return (
              <section key={m.key} aria-label={m.label} className="rounded-xl border border-line/70">
                <div className="flex items-center justify-between gap-3 px-3 py-2">
                  <h3 className="font-display text-lg uppercase">
                    {m.label}
                    {items.length > 0 && <span className="ml-2 font-sans text-sm normal-case text-mute">{fmtNum(mealKcal)} kcal</span>}
                  </h3>
                  <Link
                    href={`/app/nutrition/add?day=${day}&meal=${m.key}`}
                    className="flex min-h-10 items-center rounded-lg bg-gold/10 px-3 text-sm font-semibold text-gold"
                    aria-label={`Add food to ${m.label}`}
                  >
                    + Add
                  </Link>
                </div>
                {items.length > 0 && (
                  <ul className="divide-y divide-line/60 border-t border-line/60">
                    {items.map((e) => (
                      <li key={e.id} className="flex items-center gap-2 px-3 py-2">
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold">{e.name}</div>
                          <div className="truncate text-xs text-mute">
                            {[e.brand, e.amount ? `${fmtNum(e.amount, e.amount % 1 ? 1 : 0)} ${e.unit}` : null].filter(Boolean).join(" · ")}
                            {" · "}P {fmtNum(e.proteinG, 1)} · C {fmtNum(e.carbsG, 1)} · F {fmtNum(e.fatG, 1)}
                          </div>
                        </div>
                        <div className="shrink-0 font-display tabular text-lg">{fmtNum(e.kcal)}</div>
                        <form action={deleteFoodEntryAction}>
                          <input type="hidden" name="id" value={e.id} />
                          <button className="min-h-10 min-w-10 text-mute hover:text-warn" aria-label={`Remove ${e.name}`}>
                            ✕
                          </button>
                        </form>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      </Card>

      <Card>
        <CardTitle eyebrow="Your targets" title={target ? `${fmtNum(target.calories)} kcal` : "Targets"} />
        {target ? (
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                ["Protein", target.proteinG, 4],
                ["Carbs", target.carbsG, 4],
                ["Fat", target.fatG, 9],
              ] as const
            ).map(([l, g, k]) => (
              <div key={l} className="rounded-xl bg-char-2 p-3">
                <div className="text-xs text-mute">{l}</div>
                <div className="font-display tabular text-3xl leading-tight">
                  {g}
                  <span className="text-base text-mute">g</span>
                </div>
                <div className="text-xs text-faint">{fmtNum(g * k)} kcal</div>
              </div>
            ))}
          </div>
        ) : (
          <Empty>Your coach hasn&apos;t set your targets yet.</Empty>
        )}
        {profile.nutritionNotes && (
          <div className="mt-4 rounded-xl border border-gold/30 p-3">
            <div className="eyebrow mb-1">Nutrition plan</div>
            <p className="whitespace-pre-line text-sm text-mute">{profile.nutritionNotes}</p>
          </div>
        )}
      </Card>

      <Card>
        <CardTitle eyebrow={day === today ? "Today" : fmtDay(day, { weekday: true, year: true })} title={usingDiary ? "Weight & steps" : "Daily totals, weight & steps"} />
        {usingDiary ? (
          <p className="mb-3 text-sm text-mute">Your calories and macros for this day are added up from your food diary.</p>
        ) : (
          <p className="mb-3 text-sm text-mute">Use the food diary above, or if you track food in another app, type your daily totals here.</p>
        )}
        <ActionForm action={logDailyAction} key={`${day}-${usingDiary}`} className="space-y-3">
          <input type="hidden" name="day" value={day} />
          <input type="hidden" name="allowClear" value="1" />
          <div className="grid grid-cols-2 gap-3">
            {!usingDiary && (<>
            <Field label="Calories (kcal)">
              <input className="field tabular" name="calories" inputMode="numeric" defaultValue={sel?.calories ?? ""} placeholder={target ? String(target.calories) : ""} />
            </Field>
            <Field label="Protein (g)">
              <input className="field tabular" name="proteinG" inputMode="numeric" defaultValue={sel?.proteinG ?? ""} placeholder={target ? String(target.proteinG) : ""} />
            </Field>
            <Field label="Carbs (g)">
              <input className="field tabular" name="carbsG" inputMode="numeric" defaultValue={sel?.carbsG ?? ""} placeholder={target ? String(target.carbsG) : ""} />
            </Field>
            <Field label="Fat (g)">
              <input className="field tabular" name="fatG" inputMode="numeric" defaultValue={sel?.fatG ?? ""} placeholder={target ? String(target.fatG) : ""} />
            </Field>
            </>)}
            <Field label="Steps">
              <input className="field tabular" name="steps" inputMode="numeric" defaultValue={sel?.steps ?? ""} placeholder={target ? String(target.stepGoal) : ""} />
            </Field>
            <Field label="Body weight (kg)">
              <input className="field tabular" name="weightKg" inputMode="decimal" defaultValue={sel?.weightKg ?? ""} placeholder="e.g. 82.4" />
            </Field>
          </div>
          <p className="text-xs text-faint">Leave anything you didn&apos;t track blank. Blank days show as gaps on your charts, not zeros.</p>
          <SubmitButton className="w-full">Save {day === today ? "today" : fmtDay(day)}</SubmitButton>
        </ActionForm>
      </Card>

      <Card>
        <CardTitle eyebrow="Movement" title="Steps" />
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-char-2 p-3">
            <div className="text-xs text-mute">This week avg</div>
            <div className="font-display tabular text-2xl">{fmtNum(thisWeekSteps)}</div>
          </div>
          <div className="rounded-xl bg-char-2 p-3">
            <div className="text-xs text-mute">Last 7 days</div>
            <div className="font-display tabular text-2xl">{fmtNum(last7Steps)}</div>
          </div>
          <div className="rounded-xl bg-char-2 p-3">
            <div className="text-xs text-mute">Daily goal</div>
            <div className="font-display tabular text-2xl text-gold">{fmtNum(target?.stepGoal)}</div>
          </div>
        </div>
      </Card>

      <Card>
        <CardTitle eyebrow="Last 14 days" title="Your log" />
        <div className="-mx-4 overflow-x-auto px-4">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-faint">
                <th className="py-2 font-medium">Day</th>
                <th className="py-2 text-right font-medium">Kcal</th>
                <th className="py-2 text-right font-medium">P</th>
                <th className="py-2 text-right font-medium">C</th>
                <th className="py-2 text-right font-medium">F</th>
                <th className="py-2 text-right font-medium">Steps</th>
                <th className="py-2 text-right font-medium">Kg</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {[...points].reverse().map((p) => (
                <tr key={p.day} className={cx(p.day === day && "bg-gold/5")}>
                  <td className="py-2.5">
                    <Link href={`/app/nutrition?day=${p.day}`} className="font-semibold text-gold underline-offset-2 hover:underline">
                      {fmtDay(p.day, { weekday: true })}
                    </Link>
                  </td>
                  <td className="tabular py-2.5 text-right">{fmtNum(p.calories)}</td>
                  <td className="tabular py-2.5 text-right">{fmtNum(p.proteinG)}</td>
                  <td className="tabular py-2.5 text-right">{fmtNum(p.carbsG)}</td>
                  <td className="tabular py-2.5 text-right">{fmtNum(p.fatG)}</td>
                  <td className="tabular py-2.5 text-right">{fmtNum(p.steps)}</td>
                  <td className="tabular py-2.5 text-right">{fmtNum(p.weightKg, 1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

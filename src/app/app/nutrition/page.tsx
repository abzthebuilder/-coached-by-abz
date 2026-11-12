import Link from "next/link";
import { requireClient } from "@/lib/auth";
import { addDays, fmtDay, isDay, startOfWeek, todayIn } from "@/lib/dates";
import { currentTarget, loadDayPoints } from "@/lib/progress";
import { mean } from "@/lib/metrics";
import { logDailyAction } from "@/app/actions/client";
import { ActionForm, SubmitButton } from "@/components/form";
import { Card, CardTitle, Empty, Field, PageHeader, cx, fmtNum } from "@/components/ui";

export const metadata = { title: "Nutrition & steps" };

export default async function Nutrition({ searchParams }: { searchParams: Promise<{ day?: string }> }) {
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

  return (
    <div className="space-y-4">
      <PageHeader eyebrow="Fuel" title="Nutrition & steps" />

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
        <CardTitle eyebrow={day === today ? "Today" : fmtDay(day, { weekday: true, year: true })} title="Log daily totals" />
        <form method="get" className="mb-4 flex items-end gap-2">
          <Field label="Day">
            <input className="field" type="date" name="day" defaultValue={day} max={today} />
          </Field>
          <button className="min-h-12 shrink-0 rounded-xl border border-line px-4 text-sm font-semibold">Open</button>
        </form>
        <ActionForm action={logDailyAction} key={day} className="space-y-3">
          <input type="hidden" name="day" value={day} />
          <input type="hidden" name="allowClear" value="1" />
          <div className="grid grid-cols-2 gap-3">
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

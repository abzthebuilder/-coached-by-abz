"use client";
import { useActionState, useState } from "react";
import { calculateMacros } from "@/lib/macros";
import { saveTargetsAction } from "@/app/actions/coach";
import { FormMessage, SubmitButton } from "./form";
import { Button, Field, cx } from "./ui";

type T = { calories: number; proteinG: number; carbsG: number; fatG: number; stepGoal: number } | null;

/** Coach-only. Calories, protein and fat in → carbs out. Review, then save to the client. */
export function MacroCalculator({ clientId, current, today }: { clientId: string; current: T; today: string }) {
  const [calories, setCalories] = useState(String(current?.calories ?? ""));
  const [protein, setProtein] = useState(String(current?.proteinG ?? ""));
  const [fat, setFat] = useState(String(current?.fatG ?? ""));
  const [steps, setSteps] = useState(String(current?.stepGoal ?? "8000"));
  const [from, setFrom] = useState(today);
  const [reviewing, setReviewing] = useState(false);
  const [state, action] = useActionState(saveTargetsAction, undefined);

  const r = calculateMacros({ calories: Number(calories), proteinG: Number(protein), fatG: Number(fat) });
  const ready = calories !== "" && protein !== "" && fat !== "" && steps !== "" && r.errors.length === 0;
  const num = (v: string) => v.replace(/[^0-9]/g, "");

  const rows: [string, number | undefined, number, string][] = [
    ["Calories", current?.calories, Number(calories), "kcal"],
    ["Protein", current?.proteinG, Number(protein), "g"],
    ["Carbs", current?.carbsG, r.carbsG, "g"],
    ["Fat", current?.fatG, Number(fat), "g"],
    ["Steps", current?.stepGoal, Number(steps), ""],
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Calorie target (kcal)">
          <input className="field tabular" inputMode="numeric" value={calories} onChange={(e) => { setCalories(num(e.target.value)); setReviewing(false); }} />
        </Field>
        <Field label="Protein (g)">
          <input className="field tabular" inputMode="numeric" value={protein} onChange={(e) => { setProtein(num(e.target.value)); setReviewing(false); }} />
        </Field>
        <Field label="Fat (g)">
          <input className="field tabular" inputMode="numeric" value={fat} onChange={(e) => { setFat(num(e.target.value)); setReviewing(false); }} />
        </Field>
        <Field label="Daily step goal">
          <input className="field tabular" inputMode="numeric" value={steps} onChange={(e) => { setSteps(num(e.target.value)); setReviewing(false); }} />
        </Field>
      </div>

      <div className="rounded-xl border border-gold/40 bg-gold/5 p-4" aria-live="polite">
        <div className="text-sm text-mute">Remaining for carbs</div>
        <div className="font-display tabular text-5xl leading-none text-gold">
          {calories && protein && fat && r.errors.length === 0 ? r.carbsG : "–"}
          <span className="ml-1 text-xl text-mute">g carbs</span>
        </div>
        {r.errors.length === 0 && calories && protein && fat ? (
          <>
            <div className="mt-3 flex h-3 overflow-hidden rounded-full" aria-hidden>
              <div className="bg-gold" style={{ width: `${r.pct.protein}%` }} />
              <div className="bg-bone/70" style={{ width: `${r.pct.carbs}%` }} />
              <div className="bg-gold-dim" style={{ width: `${r.pct.fat}%` }} />
            </div>
            <div className="mt-2 grid grid-cols-3 text-xs text-mute">
              <span>Protein {r.proteinKcal} kcal · {r.pct.protein}%</span>
              <span className="text-center">Carbs {r.carbsKcal} kcal · {r.pct.carbs}%</span>
              <span className="text-right">Fat {r.fatKcal} kcal · {r.pct.fat}%</span>
            </div>
          </>
        ) : null}
        {r.errors.length > 0 && calories && protein && fat && <p className="mt-2 text-sm text-warn">{r.errors[0]}</p>}
        {r.warnings.map((w) => (
          <p key={w} className="mt-2 text-sm text-warn">{w}</p>
        ))}
      </div>

      {!reviewing ? (
        <Button type="button" className="w-full" disabled={!ready} onClick={() => setReviewing(true)}>
          Review targets
        </Button>
      ) : (
        <form action={action} className="space-y-3 rounded-xl border border-line p-4">
          <h3 className="font-display text-xl uppercase">Review before saving</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-faint">
                <th className="py-1 font-medium">Target</th>
                <th className="py-1 text-right font-medium">Current</th>
                <th className="py-1 text-right font-medium">New</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {rows.map(([l, a, b, u]) => (
                <tr key={l}>
                  <td className="py-2">{l}</td>
                  <td className="tabular py-2 text-right text-mute">{a !== undefined ? `${a.toLocaleString("en-GB")}${u}` : "–"}</td>
                  <td className={cx("tabular py-2 text-right font-semibold", a !== b && "text-gold")}>{b.toLocaleString("en-GB")}{u}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <input type="hidden" name="clientId" value={clientId} />
          <input type="hidden" name="calories" value={calories} />
          <input type="hidden" name="proteinG" value={protein} />
          <input type="hidden" name="fatG" value={fat} />
          <input type="hidden" name="stepGoal" value={steps} />
          <Field label="Starts from" hint="Charts use the old targets before this date.">
            <input className="field" type="date" name="effectiveDay" value={from} onChange={(e) => setFrom(e.target.value)} />
          </Field>
          <FormMessage state={state} />
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="ghost" onClick={() => setReviewing(false)}>Edit</Button>
            <SubmitButton>Save to profile</SubmitButton>
          </div>
        </form>
      )}
    </div>
  );
}

"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { logWorkoutAction } from "@/app/actions/client";
import { FormMessage, PendingProvider, SubmitButton, useKeepAction } from "./form";
import { Button, Field } from "./ui";

type Last = { day: string; sets: { weightKg: number; reps: number }[] } | undefined;
export type LoggerExercise = { key: string; name: string; sets: number; reps: string; notes: string; last: Last };
type Row = { weight: string; reps: string };
type Ex = LoggerExercise & { rows: Row[]; custom?: boolean };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const short = (d: string) => `${Number(d.slice(8))} ${MONTHS[Number(d.slice(5, 7)) - 1]}`;
const kg = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1));

export function WorkoutLogger({
  planWorkoutId,
  workoutName,
  exercises,
  today,
}: {
  planWorkoutId: string | null;
  workoutName: string;
  exercises: LoggerExercise[];
  today: string;
}) {
  const router = useRouter();
  const { state, onSubmit, pending } = useKeepAction(logWorkoutAction);
  const [items, setItems] = useState<Ex[]>(() =>
    exercises.map((e) => ({ ...e, rows: Array.from({ length: Math.max(1, e.sets) }, () => ({ weight: "", reps: "" })) })),
  );
  const [newName, setNewName] = useState("");

  useEffect(() => {
    if (state?.ok) {
      const t = setTimeout(() => router.push("/app/training?logged=1"), 900);
      return () => clearTimeout(t);
    }
  }, [state, router]);

  const update = (i: number, j: number, patch: Partial<Row>) =>
    setItems((xs) => xs.map((x, a) => (a !== i ? x : { ...x, rows: x.rows.map((r, b) => (b === j ? { ...r, ...patch } : r)) })));
  const addRow = (i: number) =>
    setItems((xs) => xs.map((x, a) => (a !== i ? x : { ...x, rows: [...x.rows, { ...(x.rows[x.rows.length - 1] ?? { weight: "", reps: "" }) }] })));
  const removeRow = (i: number) => setItems((xs) => xs.map((x, a) => (a !== i || x.rows.length <= 1 ? x : { ...x, rows: x.rows.slice(0, -1) })));
  const copyLast = (i: number) =>
    setItems((xs) =>
      xs.map((x, a) =>
        a !== i || !x.last
          ? x
          : { ...x, rows: x.rows.map((r, b) => { const l = x.last!.sets[Math.min(b, x.last!.sets.length - 1)]; return { weight: kg(l.weightKg), reps: String(l.reps) }; }) },
      ),
    );

  const payload = JSON.stringify(
    items.flatMap((x) =>
      x.rows
        .filter((r) => r.reps.trim() !== "")
        .map((r) => ({ exercise: x.name, weightKg: Number(r.weight || 0), reps: Math.round(Number(r.reps)) })),
    ),
  );

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <PendingProvider pending={pending}>
      <input type="hidden" name="planWorkoutId" value={planWorkoutId ?? ""} />
      <input type="hidden" name="sets" value={payload} />
      {!planWorkoutId && (
        <Field label="Workout name">
          <input className="field" name="name" defaultValue={workoutName} required />
        </Field>
      )}
      <Field label="Date">
        <input className="field" type="date" name="day" defaultValue={today} max={today} />
      </Field>

      {items.map((x, i) => (
        <section key={i} className="rounded-2xl border border-line/70 bg-char p-4" aria-label={x.name}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-xl uppercase leading-tight">{x.name}</h2>
              {!x.custom && (
                <div className="text-sm text-gold">
                  {x.sets} sets × {x.reps}
                </div>
              )}
            </div>
            {x.last && (
              <button type="button" onClick={() => copyLast(i)} className="min-h-10 shrink-0 rounded-lg border border-line px-3 text-xs font-semibold text-mute">
                Copy last
              </button>
            )}
          </div>
          {x.notes && <p className="mt-2 rounded-lg bg-char-2 p-2.5 text-sm text-mute">📝 {x.notes}</p>}
          <p className="mt-2 text-xs text-mute">
            {x.last ? (
              <>
                Last time ({short(x.last.day)}):{" "}
                <span className="tabular text-bone">{x.last.sets.map((s) => `${kg(s.weightKg)}kg × ${s.reps}`).join(", ")}</span>
              </>
            ) : (
              "First time logging this one."
            )}
          </p>
          <div className="mt-3 space-y-2">
            <div className="grid grid-cols-[2rem_1fr_1fr] gap-2 text-xs text-faint">
              <span>Set</span>
              <span>Weight (kg)</span>
              <span>Reps</span>
            </div>
            {x.rows.map((r, j) => {
              const l = x.last?.sets[j];
              return (
                <div key={j} className="grid grid-cols-[2rem_1fr_1fr] items-center gap-2">
                  <span className="font-display text-lg text-mute">{j + 1}</span>
                  <input
                    className="field tabular !py-2.5"
                    inputMode="decimal"
                    aria-label={`${x.name} set ${j + 1} weight in kg`}
                    placeholder={l ? kg(l.weightKg) : "kg"}
                    value={r.weight}
                    onChange={(e) => update(i, j, { weight: e.target.value.replace(/[^0-9.]/g, "") })}
                  />
                  <input
                    className="field tabular !py-2.5"
                    inputMode="numeric"
                    aria-label={`${x.name} set ${j + 1} reps`}
                    placeholder={l ? String(l.reps) : "reps"}
                    value={r.reps}
                    onChange={(e) => update(i, j, { reps: e.target.value.replace(/[^0-9]/g, "") })}
                  />
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={() => addRow(i)} className="min-h-10 rounded-lg px-3 text-sm font-semibold text-gold">
              + Add set
            </button>
            {x.rows.length > 1 && (
              <button type="button" onClick={() => removeRow(i)} className="min-h-10 rounded-lg px-3 text-sm text-mute">
                Remove set
              </button>
            )}
          </div>
        </section>
      ))}

      <div className="flex gap-2">
        <input className="field" placeholder="Add an exercise" value={newName} onChange={(e) => setNewName(e.target.value)} aria-label="New exercise name" />
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            if (!newName.trim()) return;
            setItems((xs) => [...xs, { key: newName.toLowerCase(), name: newName.trim(), sets: 3, reps: "", notes: "", last: undefined, custom: true, rows: [{ weight: "", reps: "" }] }]);
            setNewName("");
          }}
        >
          Add
        </Button>
      </div>

      <Field label="Notes for your coach (optional)">
        <textarea className="field min-h-20" name="notes" placeholder="How did it feel? Any pain or PBs?" />
      </Field>
      <FormMessage state={state} />
      <div className="sticky bottom-20 z-10 md:bottom-4">
        <SubmitButton pendingText="Saving workout…" className="w-full shadow-lg shadow-black/60">
          Finish &amp; save workout
        </SubmitButton>
      </div>
      </PendingProvider>
    </form>
  );
}

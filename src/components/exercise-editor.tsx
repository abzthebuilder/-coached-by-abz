"use client";
import { useState } from "react";
import type { FormState } from "./form";
import { FormMessage, PendingProvider, SubmitButton, useKeepAction } from "./form";
import { Field } from "./ui";

type Ex = { name: string; sets: number; reps: string; notes: string };

/** Edits a workout (template or assigned plan workout): name, notes and an ordered exercise list. */
export function ExerciseEditor({
  action,
  id,
  name,
  notes,
  exercises,
  saveLabel = "Save workout",
}: {
  action: (s: FormState, fd: FormData) => Promise<FormState>;
  id: string;
  name: string;
  notes: string;
  exercises: Ex[];
  saveLabel?: string;
}) {
  const { state, onSubmit, pending } = useKeepAction(action);
  const [items, setItems] = useState<Ex[]>(exercises.length ? exercises : [{ name: "", sets: 3, reps: "8-10", notes: "" }]);
  const set = (i: number, p: Partial<Ex>) => setItems((xs) => xs.map((x, j) => (j === i ? { ...x, ...p } : x)));
  const move = (i: number, d: -1 | 1) =>
    setItems((xs) => {
      const j = i + d;
      if (j < 0 || j >= xs.length) return xs;
      const c = [...xs];
      [c[i], c[j]] = [c[j], c[i]];
      return c;
    });
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <PendingProvider pending={pending}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="exercises" value={JSON.stringify(items.filter((x) => x.name.trim()))} />
      <Field label="Workout name">
        <input className="field" name="name" defaultValue={name} required />
      </Field>
      <Field label="Workout notes (warm-up, rest times, focus)">
        <textarea className="field min-h-20" name="notes" defaultValue={notes} />
      </Field>
      <ol className="space-y-3">
        {items.map((x, i) => (
          <li key={i} className="rounded-xl border border-line/70 bg-char-2 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-display text-lg text-gold">{i + 1}</span>
              <div className="flex gap-1">
                <button type="button" onClick={() => move(i, -1)} className="min-h-9 min-w-9 rounded-lg text-mute" aria-label="Move up">↑</button>
                <button type="button" onClick={() => move(i, 1)} className="min-h-9 min-w-9 rounded-lg text-mute" aria-label="Move down">↓</button>
                <button type="button" onClick={() => setItems((xs) => xs.filter((_, j) => j !== i))} className="min-h-9 rounded-lg px-2 text-sm text-warn">
                  Remove
                </button>
              </div>
            </div>
            <div className="grid grid-cols-[1fr_4.5rem_5.5rem] gap-2">
              <input className="field" placeholder="Exercise" aria-label="Exercise name" value={x.name} onChange={(e) => set(i, { name: e.target.value })} />
              <input className="field tabular" inputMode="numeric" aria-label="Sets" value={x.sets} onChange={(e) => set(i, { sets: Math.max(1, Math.min(20, Number(e.target.value.replace(/\D/g, "")) || 1)) })} />
              <input className="field" placeholder="Reps" aria-label="Reps" value={x.reps} onChange={(e) => set(i, { reps: e.target.value })} />
            </div>
            <textarea className="field mt-2 min-h-12 text-sm" placeholder="Coaching notes (tempo, cues, rest)" aria-label="Coaching notes" value={x.notes} onChange={(e) => set(i, { notes: e.target.value })} />
          </li>
        ))}
      </ol>
      <button type="button" onClick={() => setItems((xs) => [...xs, { name: "", sets: 3, reps: "8-10", notes: "" }])} className="min-h-11 font-semibold text-gold">
        + Add exercise
      </button>
      <FormMessage state={state} />
      <SubmitButton className="w-full">{saveLabel}</SubmitButton>
      </PendingProvider>
    </form>
  );
}

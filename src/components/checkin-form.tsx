"use client";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { submitCheckInAction } from "@/app/actions/client";
import { FormMessage, SubmitButton } from "./form";
import { Rating } from "./rating";
import { Card, Field } from "./ui";

export function CheckInForm() {
  const router = useRouter();
  const [state, action] = useActionState(submitCheckInAction, undefined);
  useEffect(() => {
    if (state?.ok) router.push("/app/check-ins?sent=1");
  }, [state, router]);
  return (
    <form action={action} className="space-y-4">
      <Card className="space-y-4">
        <h2 className="font-display text-xl uppercase">Body &amp; recovery</h2>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Body weight (kg)">
            <input className="field tabular" name="bodyWeightKg" inputMode="decimal" placeholder="e.g. 82.4" />
          </Field>
          <Field label="Avg sleep (hours)">
            <input className="field tabular" name="sleepHours" inputMode="decimal" placeholder="e.g. 7" />
          </Field>
        </div>
        <Rating name="sleepQuality" label="Sleep quality" low="Poor" high="Great" />
        <Rating name="energy" label="Energy" low="Drained" high="Full of it" />
      </Card>
      <Card className="space-y-4">
        <h2 className="font-display text-xl uppercase">Training</h2>
        <Rating name="trainingRating" label="How did training go?" low="Struggled" high="Smashed it" />
        <Field label="Training notes">
          <textarea name="trainingNotes" className="field min-h-20" placeholder="Sessions missed, PBs, anything that hurt…" />
        </Field>
      </Card>
      <Card className="space-y-4">
        <h2 className="font-display text-xl uppercase">Nutrition</h2>
        <Rating name="nutritionRating" label="How did nutrition go?" low="Off track" high="Spot on" />
        <Field label="Nutrition notes">
          <textarea name="nutritionNotes" className="field min-h-20" placeholder="Hunger, cravings, meals out, alcohol…" />
        </Field>
      </Card>
      <Card className="space-y-4">
        <Field label="Wins this period">
          <textarea name="wins" className="field min-h-20" placeholder="Big or small. They all count." />
        </Field>
        <Field label="Struggles">
          <textarea name="struggles" className="field min-h-20" placeholder="What got in the way?" />
        </Field>
        <Field label="Questions for your coach (optional)">
          <textarea name="questions" className="field min-h-16" />
        </Field>
      </Card>
      <FormMessage state={state} />
      <SubmitButton pendingText="Sending…" className="w-full">
        Submit Check-in
      </SubmitButton>
    </form>
  );
}

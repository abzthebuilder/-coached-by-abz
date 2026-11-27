"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sheet } from "./sheet";
import { ActionForm, SubmitButton } from "./form";
import { logDailyAction } from "@/app/actions/client";
import { Field } from "./ui";

const tile =
  "flex min-h-[84px] w-full flex-col items-center justify-center gap-1.5 rounded-2xl border border-line/70 bg-char p-2 text-center text-sm font-semibold active:bg-char-3";

function Icon({ d }: { d: string }) {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#d4af37" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

export function QuickActions({
  workoutHref,
  foodHref,
  today,
  stepsToday,
}: {
  workoutHref: string;
  foodHref: string;
  today: string;
  stepsToday: number | null;
}) {
  const router = useRouter();
  return (
    <div className="grid grid-cols-2 gap-2">
      <Link href={workoutHref} className={tile}>
        <Icon d="M3 10v4M6 7v10M9 12h6M18 7v10M21 10v4M6 12h3M15 12h3" />
        Log Workout
      </Link>
      <Link href={foodHref} className={tile}>
        <Icon d="M7 3v8a2 2 0 0 0 2 2v8M5 3v5M9 3v5M17 21V3c-2 1-3 3.5-3 7 0 2 1 3 3 3" />
        Log Food
      </Link>
      <Sheet
        title="Log steps"
        triggerClassName={tile}
        trigger={
          <>
            <Icon d="M8 20c-1.5 0-2.5-1-2.5-3s1-3.5 2.5-3.5S10.5 15 10.5 17 9.5 20 8 20ZM16 13c-1.5 0-2.5-1-2.5-3s1-3.5 2.5-3.5 2.5 1.5 2.5 3.5-1 3-2.5 3ZM6 11h4M14 4h4" />
            Log Steps
          </>
        }
      >
        {(close) => (
          <ActionForm
            action={logDailyAction}
            onSuccess={() => {
              router.refresh();
              setTimeout(close, 700);
            }}
            className="space-y-4"
          >
            <Field label="Steps today">
              <input
                className="field font-display text-3xl tabular"
                name="steps"
                type="number"
                inputMode="numeric"
                min={0}
                max={150000}
                defaultValue={stepsToday ?? ""}
                placeholder="e.g. 8500"
                autoFocus
                required
              />
            </Field>
            <Field label="Date">
              <input className="field" type="date" name="day" defaultValue={today} max={today} />
            </Field>
            <SubmitButton className="w-full">Save steps</SubmitButton>
          </ActionForm>
        )}
      </Sheet>
      <Link href="/app/check-ins/new" className={tile}>
        <Icon d="M5 4h14v16l-3-2-3 2-3-2-3 2-2-1.3V4ZM9 9h6M9 13h4" />
        Submit Check-in
      </Link>
    </div>
  );
}

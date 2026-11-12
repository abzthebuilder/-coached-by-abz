import { requireClient } from "@/lib/auth";
import { db } from "@/lib/db";
import { fmtDay } from "@/lib/dates";
import { activePlan } from "@/lib/progress";
import { deleteWorkoutLogAction } from "@/app/actions/client";
import { ButtonLink, Card, CardTitle, Empty, PageHeader } from "@/components/ui";

export const metadata = { title: "Training" };

export default async function Training({ searchParams }: { searchParams: Promise<{ logged?: string }> }) {
  const { profile } = await requireClient();
  const sp = await searchParams;
  const [plan, logs] = await Promise.all([
    activePlan(profile.id),
    db.workoutLog.findMany({
      where: { clientId: profile.id },
      orderBy: [{ day: "desc" }, { createdAt: "desc" }],
      take: 15,
      include: { sets: { orderBy: [{ exerciseKey: "asc" }, { setNumber: "asc" }] } },
    }),
  ]);
  return (
    <div className="space-y-4">
      <PageHeader eyebrow="Your plan" title={plan?.name ?? "Training"}>
        {plan ? `${plan.workoutsPerWeek} workouts a week` : "Your coach will assign your plan soon."}
      </PageHeader>
      {sp.logged && <div className="rounded-xl bg-gold/10 p-3 text-sm text-gold" role="status">Workout saved. Nice work.</div>}
      {plan?.notes && (
        <Card>
          <div className="eyebrow mb-1">Coach notes</div>
          <p className="whitespace-pre-line text-sm text-mute">{plan.notes}</p>
        </Card>
      )}
      {plan?.workouts.map((w) => (
        <Card key={w.id}>
          <CardTitle title={w.name} />
          {w.notes && <p className="mb-3 whitespace-pre-line text-sm text-mute">{w.notes}</p>}
          <ol className="divide-y divide-line/60">
            {w.exercises.map((e, i) => (
              <li key={e.id} className="py-3">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-semibold">
                    <span className="mr-2 text-faint">{i + 1}</span>
                    {e.name}
                  </span>
                  <span className="tabular shrink-0 font-display text-lg text-gold">
                    {e.sets} × {e.reps}
                  </span>
                </div>
                {e.notes && <p className="mt-1 text-sm text-mute">{e.notes}</p>}
              </li>
            ))}
          </ol>
          <ButtonLink href={`/app/training/log/${w.id}`} className="mt-3 w-full">
            Log {w.name}
          </ButtonLink>
        </Card>
      ))}
      <ButtonLink href="/app/training/log/custom" variant="ghost" className="w-full">
        Log an extra session
      </ButtonLink>

      <Card>
        <CardTitle eyebrow="History" title="Recent workouts" />
        {logs.length === 0 ? (
          <Empty>No workouts logged yet.</Empty>
        ) : (
          <ul className="divide-y divide-line/60">
            {logs.map((l) => {
              const byEx = new Map<string, string[]>();
              for (const s of l.sets) byEx.set(s.exerciseName, [...(byEx.get(s.exerciseName) ?? []), `${s.weightKg}×${s.reps}`]);
              return (
                <li key={l.id} className="py-3">
                  <details>
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                      <span className="font-semibold">{l.name}</span>
                      <span className="text-sm text-mute">{fmtDay(l.day, { weekday: true })}</span>
                    </summary>
                    <ul className="mt-2 space-y-1 text-sm">
                      {[...byEx.entries()].map(([n, s]) => (
                        <li key={n} className="flex justify-between gap-3">
                          <span className="text-mute">{n}</span>
                          <span className="tabular text-right">{s.join("  ")}</span>
                        </li>
                      ))}
                    </ul>
                    {l.notes && <p className="mt-2 text-sm italic text-mute">“{l.notes}”</p>}
                    <form action={deleteWorkoutLogAction} className="mt-2 text-right">
                      <input type="hidden" name="id" value={l.id} />
                      <button className="min-h-10 text-xs text-warn">Delete this log</button>
                    </form>
                  </details>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}

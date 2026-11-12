import { notFound } from "next/navigation";
import Link from "next/link";
import { requireClient } from "@/lib/auth";
import { db } from "@/lib/db";
import { todayIn } from "@/lib/dates";
import { lastTimeFor } from "@/lib/progress";
import { normaliseExercise } from "@/lib/metrics";
import { WorkoutLogger } from "@/components/workout-logger";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "Log workout" };

export default async function LogWorkout({ params }: { params: Promise<{ id: string }> }) {
  const { user, profile } = await requireClient();
  const { id } = await params;
  const today = todayIn(user.timezone);

  if (id === "custom") {
    return (
      <div>
        <Link href="/app/training" className="text-sm text-mute">← Training</Link>
        <PageHeader eyebrow="Log a session" title="Extra workout" />
        <WorkoutLogger planWorkoutId={null} workoutName="Extra session" exercises={[]} today={today} />
      </div>
    );
  }

  // Only workouts in this client's own plans.
  const pw = await db.planWorkout.findFirst({
    where: { id, plan: { clientId: profile.id } },
    include: { exercises: { orderBy: { order: "asc" } }, plan: true },
  });
  if (!pw) notFound();
  const keys = pw.exercises.map((e) => normaliseExercise(e.name));
  const last = await lastTimeFor(profile.id, keys);
  return (
    <div>
      <Link href="/app/training" className="text-sm text-mute">← Training</Link>
      <PageHeader eyebrow={pw.plan.name} title={pw.name}>
        {pw.notes && <p className="whitespace-pre-line">{pw.notes}</p>}
      </PageHeader>
      <WorkoutLogger
        planWorkoutId={pw.id}
        workoutName={pw.name}
        today={today}
        exercises={pw.exercises.map((e) => {
          const key = normaliseExercise(e.name);
          return { key, name: e.name, sets: e.sets, reps: e.reps, notes: e.notes, last: last[key] };
        })}
      />
    </div>
  );
}

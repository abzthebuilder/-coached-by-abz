import Link from "next/link";
import { requireCoach } from "@/lib/auth";
import { db } from "@/lib/db";
import { createTemplateAction } from "@/app/actions/coach";
import { Card, Empty, PageHeader } from "@/components/ui";
import { SubmitButton } from "@/components/form";

export const metadata = { title: "Workout templates" };

export default async function Templates() {
  const coach = await requireCoach();
  const templates = await db.workoutTemplate.findMany({
    where: { coachId: coach.id },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { exercises: true } } },
  });
  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Reusable workouts" title="Templates">
        Build a workout once, then add it to any client&apos;s plan. Each client gets their own copy that you can tweak.
      </PageHeader>
      <Card>
        <form action={createTemplateAction} className="flex gap-2">
          <input className="field" name="name" placeholder="e.g. Upper A" aria-label="Template name" required />
          <SubmitButton className="shrink-0">Create</SubmitButton>
        </form>
      </Card>
      {templates.length === 0 ? (
        <Empty>No templates yet.</Empty>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => (
            <li key={t.id}>
              <Link href={`/coach/templates/${t.id}`} className="block rounded-2xl border border-line/70 bg-char p-4 hover:border-gold/60">
                <div className="font-display text-xl uppercase">{t.name}</div>
                <div className="text-sm text-mute">{t._count.exercises} exercises</div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

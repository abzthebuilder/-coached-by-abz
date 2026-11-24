import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCoach } from "@/lib/auth";
import { db } from "@/lib/db";
import { deleteTemplateAction, saveTemplateAction } from "@/app/actions/coach";
import { ExerciseEditor } from "@/components/exercise-editor";
import { Card, PageHeader } from "@/components/ui";

export default async function TemplateEdit({ params }: { params: Promise<{ id: string }> }) {
  const coach = await requireCoach();
  const { id } = await params;
  const t = await db.workoutTemplate.findFirst({ where: { id, coachId: coach.id }, include: { exercises: { orderBy: { order: "asc" } } } });
  if (!t) notFound();
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link href="/coach/templates" className="text-sm text-mute">← Templates</Link>
      <PageHeader eyebrow="Template" title={t.name} />
      <Card>
        <ExerciseEditor action={saveTemplateAction} id={t.id} name={t.name} notes={t.notes} exercises={t.exercises.map(({ name, sets, reps, notes }) => ({ name, sets, reps, notes }))} saveLabel="Save template" />
      </Card>
      <form action={deleteTemplateAction} className="text-right">
        <input type="hidden" name="id" value={t.id} />
        <button className="min-h-11 text-sm text-warn">Delete template</button>
      </form>
    </div>
  );
}

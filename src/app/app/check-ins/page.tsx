import Link from "next/link";
import { requireClient } from "@/lib/auth";
import { db } from "@/lib/db";
import { fmtDay, relativeDay, todayIn } from "@/lib/dates";
import { statusForProfile } from "@/lib/checkins";
import { Badge, ButtonLink, Card, Empty, PageHeader } from "@/components/ui";

export const metadata = { title: "Check-ins" };

export default async function CheckIns({ searchParams }: { searchParams: Promise<{ sent?: string }> }) {
  const { user, profile } = await requireClient();
  const sp = await searchParams;
  const today = todayIn(user.timezone);
  const [{ status }, list] = await Promise.all([
    statusForProfile(profile, today),
    db.checkIn.findMany({
      where: { clientId: profile.id },
      orderBy: { createdAt: "desc" },
      include: { replies: { select: { authorId: true }, orderBy: { createdAt: "desc" } } },
    }),
  ]);
  return (
    <div className="space-y-4">
      <PageHeader eyebrow={profile.checkInFrequency === "WEEKLY" ? "Weekly" : "Monthly"} title="Check-ins" />
      {sp.sent && <div role="status" className="rounded-xl bg-gold/10 p-3 text-sm text-gold">Check-in sent. Your coach will reply here.</div>}
      <Card className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm text-mute">Next check-in</div>
          <div className="font-display text-3xl uppercase">{relativeDay(status.dueDay, today)}</div>
          <div className="text-sm text-mute">{fmtDay(status.dueDay, { weekday: true })}</div>
        </div>
        {status.state === "overdue" ? <Badge tone="warn">Overdue</Badge> : status.state === "due_today" ? <Badge tone="good">Due today</Badge> : null}
      </Card>
      <ButtonLink href="/app/check-ins/new" className="w-full">
        Submit Check-in
      </ButtonLink>
      <section>
        <h2 className="mb-2 mt-6 font-display text-2xl uppercase">History</h2>
        {list.length === 0 ? (
          <Empty>Your check-ins and your coach&apos;s replies will appear here.</Empty>
        ) : (
          <ul className="space-y-2">
            {list.map((c) => {
              const coachReplied = c.replies.some((r) => r.authorId !== user.id);
              return (
                <li key={c.id}>
                  <Link href={`/app/check-ins/${c.id}`} className="flex min-h-16 items-center justify-between gap-3 rounded-2xl border border-line/70 bg-char p-4">
                    <div>
                      <div className="font-semibold">{fmtDay(c.day, { weekday: true, year: true })}</div>
                      <div className="text-sm text-mute">
                        {c.type === "WEEKLY" ? "Weekly" : "Monthly"}
                        {c.bodyWeightKg !== null && ` · ${c.bodyWeightKg} kg`}
                      </div>
                    </div>
                    {coachReplied ? <Badge tone="gold">Coach replied</Badge> : <Badge>Awaiting reply</Badge>}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

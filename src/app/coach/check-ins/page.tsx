import Link from "next/link";
import { requireCoach } from "@/lib/auth";
import { db } from "@/lib/db";
import { roster } from "@/lib/coach";
import { fmtDay, relativeDay } from "@/lib/dates";
import { Badge, Card, CardTitle, Empty, PageHeader } from "@/components/ui";

export const metadata = { title: "Check-ins" };

export default async function CoachCheckIns() {
  const coach = await requireCoach();
  const [rows, recent] = await Promise.all([
    roster(coach.id),
    db.checkIn.findMany({
      where: { client: { coachId: coach.id } },
      orderBy: { createdAt: "desc" },
      take: 40,
      include: { client: { include: { user: { select: { name: true } } } }, replies: { where: { author: { role: "COACH" } }, select: { id: true } } },
    }),
  ]);
  const awaiting = recent.filter((c) => c.replies.length === 0);
  const due = rows.filter((r) => r.active && r.status.state !== "upcoming");
  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Inbox" title="Check-ins" />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardTitle eyebrow={`${awaiting.length} waiting`} title="Needs your reply" />
          {awaiting.length === 0 ? (
            <Empty>All caught up.</Empty>
          ) : (
            <ul className="divide-y divide-line/60">
              {awaiting.map((c) => (
                <li key={c.id}>
                  <Link href={`/coach/clients/${c.clientId}?checkin=${c.id}`} className="flex min-h-14 items-center justify-between gap-3 py-2">
                    <div>
                      <div className="font-semibold">{c.client.user.name}</div>
                      <div className="text-xs text-mute">
                        {c.type === "WEEKLY" ? "Weekly" : "Monthly"} · {fmtDay(c.day, { weekday: true })}
                        {c.bodyWeightKg !== null && ` · ${c.bodyWeightKg} kg`}
                      </div>
                    </div>
                    <Badge tone="good">Reply</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <CardTitle eyebrow="Not submitted yet" title="Due or overdue" />
          {due.length === 0 ? (
            <Empty>Nobody is due right now.</Empty>
          ) : (
            <ul className="divide-y divide-line/60">
              {due.map((r) => (
                <li key={r.id}>
                  <Link href={`/coach/clients/${r.id}`} className="flex min-h-14 items-center justify-between gap-3 py-2">
                    <div>
                      <div className="font-semibold">{r.name}</div>
                      <div className="text-xs text-mute">Due {fmtDay(r.status.dueDay, { weekday: true })}</div>
                    </div>
                    <Badge tone={r.status.state === "overdue" ? "warn" : "gold"}>{relativeDay(r.status.dueDay, r.today)}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
      <Card>
        <CardTitle title="Recent check-ins" />
        {recent.length === 0 ? (
          <Empty>No check-ins yet.</Empty>
        ) : (
          <ul className="divide-y divide-line/60">
            {recent.map((c) => (
              <li key={c.id}>
                <Link href={`/coach/clients/${c.clientId}?checkin=${c.id}`} className="flex min-h-12 items-center justify-between gap-3 py-2 text-sm">
                  <span className="font-semibold">{c.client.user.name}</span>
                  <span className="text-mute">{fmtDay(c.day, { weekday: true })} {c.replies.length ? "· replied" : ""}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

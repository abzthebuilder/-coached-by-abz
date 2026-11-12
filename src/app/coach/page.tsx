import Link from "next/link";
import { requireCoach } from "@/lib/auth";
import { db } from "@/lib/db";
import { roster, type RosterRow } from "@/lib/coach";
import { fmtDay, relativeDay } from "@/lib/dates";
import { createInviteAction, revokeInviteAction } from "@/app/actions/coach";
import { InviteForm } from "@/components/invite-form";
import { Badge, Card, CardTitle, Empty, PageHeader } from "@/components/ui";

export const metadata = { title: "Coach" };

function StatusBadge({ r }: { r: RosterRow }) {
  if (!r.active) return <Badge>Paused</Badge>;
  if (r.lastCheckIn && !r.lastCheckIn.replied) return <Badge tone="good">Needs reply</Badge>;
  if (r.status.state === "overdue") return <Badge tone="warn">Check-in overdue</Badge>;
  if (r.status.state === "due_today") return <Badge tone="gold">Due today</Badge>;
  return <Badge>Due {relativeDay(r.status.dueDay, r.today).toLowerCase()}</Badge>;
}

export default async function CoachHome() {
  const coach = await requireCoach();
  const [rows, invites] = await Promise.all([
    roster(coach.id),
    db.authToken.findMany({ where: { coachId: coach.id, kind: "INVITE", usedAt: null, expiresAt: { gt: new Date() } }, orderBy: { createdAt: "desc" } }),
  ]);
  const active = rows.filter((r) => r.active);
  const needsReply = active.filter((r) => r.lastCheckIn && !r.lastCheckIn.replied).length;
  const due = active.filter((r) => r.status.state !== "upcoming").length;

  return (
    <div className="space-y-5">
      <PageHeader eyebrow={`Welcome back, ${coach.name.split(" ")[0]}`} title="Clients" />
      <div className="grid grid-cols-3 gap-2">
        {[
          ["Active clients", active.length, false],
          ["Need a reply", needsReply, needsReply > 0],
          ["Check-ins due", due, due > 0],
        ].map(([l, v, hl]) => (
          <Card key={String(l)} className={hl ? "border-gold/60" : ""}>
            <div className="text-xs text-mute">{l}</div>
            <div className={`font-display tabular text-4xl ${hl ? "text-gold" : ""}`}>{v}</div>
          </Card>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <Card className="p-0 sm:p-0">
          <div className="p-4 pb-2 sm:p-5 sm:pb-2">
            <CardTitle title="Roster" />
          </div>
          {rows.length === 0 ? (
            <div className="p-4"><Empty>No clients yet. Create an invite link to add your first client.</Empty></div>
          ) : (
            <ul className="divide-y divide-line/60">
              {rows.map((r) => (
                <li key={r.id}>
                  <Link href={`/coach/clients/${r.id}`} className="flex min-h-16 items-center justify-between gap-3 px-4 py-3 hover:bg-char-2 sm:px-5">
                    <div className="min-w-0">
                      <div className="truncate font-semibold">{r.name}</div>
                      <div className="truncate text-xs text-mute">
                        {r.lastLogDay ? `Last log ${relativeDay(r.lastLogDay, r.today).toLowerCase()}` : "Nothing logged yet"}
                        {r.lastCheckIn && ` · Check-in ${fmtDay(r.lastCheckIn.day)}`}
                      </div>
                    </div>
                    <StatusBadge r={r} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="space-y-5">
          <Card>
            <CardTitle eyebrow="Add a client" title="Invite" />
            <InviteForm action={createInviteAction} />
          </Card>
          {invites.length > 0 && (
            <Card>
              <CardTitle title="Pending invites" />
              <ul className="divide-y divide-line/60 text-sm">
                {invites.map((i) => (
                  <li key={i.id} className="flex items-center justify-between gap-3 py-2">
                    <div className="min-w-0">
                      <div className="truncate font-semibold">{i.name}</div>
                      <div className="truncate text-xs text-mute">{i.email} · expires {fmtDay(i.expiresAt.toISOString().slice(0, 10))}</div>
                    </div>
                    <form action={revokeInviteAction}>
                      <input type="hidden" name="id" value={i.id} />
                      <button className="min-h-10 text-xs text-warn">Revoke</button>
                    </form>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

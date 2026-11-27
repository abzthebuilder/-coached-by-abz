import Link from "next/link";
import { requireCoach } from "@/lib/auth";
import { db } from "@/lib/db";
import { communityFor, loadMessages, markRead } from "@/lib/community";
import { deleteReportedMessageAction, dismissReportsAction, setMemberRemovedAction } from "@/app/actions/community";
import { COMMUNITY_NAME } from "@/content/community";
import { fmtDay } from "@/lib/dates";
import { ChatRoom } from "@/components/chat-room";
import { Badge, Card, Empty, PageHeader, cx } from "@/components/ui";

export const metadata = { title: "Community" };

export default async function CoachCommunity({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const coach = await requireCoach();
  const tab = (await searchParams).tab;
  const ctx = (await communityFor(coach))!;
  const [members, reported] = await Promise.all([
    db.communityMember.findMany({
      where: { coachId: coach.id, userId: { not: coach.id } },
      orderBy: { joinedAt: "asc" },
      include: { user: { select: { name: true } } },
    }),
    db.communityMessage.findMany({
      where: { coachId: coach.id, reports: { some: {} } },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { reports: true } }, author: { select: { communityMember: { select: { displayName: true } } } } },
    }),
  ]);
  const active = members.filter((m) => !m.removedAt);
  const tabs = [
    ["chat", "Chat"],
    ["members", `Members (${active.length})`],
    ["reports", `Reports${reported.length ? ` (${reported.length})` : ""}`],
  ] as const;
  const current = tabs.some(([k]) => k === tab) ? tab : "chat";
  const initial = current === "chat" ? await loadMessages(ctx, coach.id) : null;
  if (current === "chat") await markRead(ctx.member!.id);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader eyebrow="Your clients" title={COMMUNITY_NAME} />
      <nav aria-label="Community sections" className="-mx-4 mb-4 flex gap-1 overflow-x-auto border-b border-line/60 px-4">
        {tabs.map(([k, label]) => (
          <Link
            key={k}
            href={`/coach/community${k === "chat" ? "" : `?tab=${k}`}`}
            aria-current={current === k ? "page" : undefined}
            className={cx(
              "flex min-h-11 shrink-0 items-center border-b-2 px-3 text-sm font-semibold",
              current === k ? "border-gold text-bone" : "border-transparent text-mute",
              k === "reports" && reported.length > 0 && current !== k && "text-warn",
            )}
          >
            {label}
          </Link>
        ))}
      </nav>

      {current === "chat" && (
        <>
          <p className="mb-4 text-sm text-mute">
            Tap a message to react, pin it to the top, or delete it. Clients join from the Community button in their app.
          </p>
          <ChatRoom initial={initial!} isCoach />
        </>
      )}

      {current === "members" && (
        <Card className="p-0 sm:p-0">
          {members.length === 0 ? (
            <div className="p-4">
              <Empty>No one has joined yet. Clients can join from the Community button in their app.</Empty>
            </div>
          ) : (
            <ul className="divide-y divide-line/60">
              {members.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
                  <div className="min-w-0">
                    <div className="truncate font-semibold">
                      {m.displayName} {m.removedAt && <Badge tone="warn">Removed</Badge>}
                    </div>
                    <div className="truncate text-xs text-mute">
                      {m.user.name} · joined {fmtDay(m.joinedAt.toISOString().slice(0, 10), { year: true })}
                    </div>
                  </div>
                  <form action={setMemberRemovedAction}>
                    <input type="hidden" name="id" value={m.id} />
                    <input type="hidden" name="remove" value={m.removedAt ? "0" : "1"} />
                    <button className={cx("min-h-10 rounded-lg px-3 text-sm font-semibold", m.removedAt ? "text-gold" : "text-warn")}>
                      {m.removedAt ? "Allow back" : "Remove"}
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {current === "reports" &&
        (reported.length === 0 ? (
          <Empty>No reported messages.</Empty>
        ) : (
          <ul className="space-y-3">
            {reported.map((m) => (
              <li key={m.id}>
                <Card>
                  <div className="mb-2 flex items-center justify-between gap-3 text-xs text-mute">
                    <span className="font-semibold">{m.author.communityMember?.displayName ?? "Member"}</span>
                    <Badge tone="warn">
                      Reported {m._count.reports} time{m._count.reports > 1 ? "s" : ""}
                    </Badge>
                  </div>
                  <p className="whitespace-pre-wrap rounded-xl bg-char-2 p-3 text-sm">{m.body}</p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <form action={dismissReportsAction}>
                      <input type="hidden" name="id" value={m.id} />
                      <button className="min-h-11 w-full rounded-xl border border-line text-sm font-semibold">Keep message</button>
                    </form>
                    <form action={deleteReportedMessageAction}>
                      <input type="hidden" name="id" value={m.id} />
                      <button className="min-h-11 w-full rounded-xl border border-warn/50 text-sm font-semibold text-warn">Delete message</button>
                    </form>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        ))}
    </div>
  );
}

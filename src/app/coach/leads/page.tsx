import Link from "next/link";
import { requireCoach } from "@/lib/auth";
import { db } from "@/lib/db";
import { fmtDay } from "@/lib/dates";
import { GOALS, labelFor } from "@/content/apply";
import { getSiteLinks } from "@/lib/settings";
import { healthYeses } from "@/components/lead-answers";
import { Badge, Card, Empty, PageHeader, cx } from "@/components/ui";

export const metadata = { title: "Leads" };

const TABS = [
  { key: "NEW", label: "New" },
  { key: "CONTACTED", label: "Contacted" },
  { key: "ACCEPTED", label: "Accepted" },
  { key: "DECLINED", label: "Declined" },
] as const;
type Tab = (typeof TABS)[number]["key"];

export default async function Leads({ searchParams }: { searchParams: Promise<{ status?: string; deleted?: string }> }) {
  const coach = await requireCoach();
  const sp = await searchParams;
  const status: Tab = TABS.some((t) => t.key === sp.status) ? (sp.status as Tab) : "NEW";
  const [counts, leads, links] = await Promise.all([
    db.lead.groupBy({ by: ["status"], where: { coachId: coach.id }, _count: true }),
    db.lead.findMany({ where: { coachId: coach.id, status }, orderBy: { createdAt: "desc" } }),
    getSiteLinks(),
  ]);
  const count = (s: Tab) => counts.find((c) => c.status === s)?._count ?? 0;
  return (
    <div className="space-y-4">
      <PageHeader eyebrow="Applications" title="Leads">
        People who&apos;ve applied for online coaching on your site.
      </PageHeader>
      {sp.deleted && (
        <div role="status" className="rounded-xl bg-gold/10 p-3 text-sm text-gold">
          Application deleted.
        </div>
      )}
      {links.applyMode === "tally" && (
        <div className="rounded-xl border border-warn/40 bg-warn/10 p-3 text-sm text-warn">
          Your Apply buttons currently go to Tally, so new applications won&apos;t appear here. Change it in{" "}
          <Link href="/coach/settings" className="underline">
            Settings
          </Link>
          .
        </div>
      )}
      <nav aria-label="Lead status" className="-mx-4 flex gap-1 overflow-x-auto border-b border-line/60 px-4">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/coach/leads?status=${t.key}`}
            aria-current={status === t.key ? "page" : undefined}
            className={cx(
              "flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-3 text-sm font-semibold",
              status === t.key ? "border-gold text-bone" : "border-transparent text-mute",
            )}
          >
            {t.label}
            <span className={cx("rounded-full px-2 text-xs", t.key === "NEW" && count("NEW") ? "bg-gold text-ink" : "bg-char-3 text-mute")}>
              {count(t.key)}
            </span>
          </Link>
        ))}
      </nav>
      {leads.length === 0 ? (
        <Empty>
          {status === "NEW" ? "No new applications. They'll appear here as soon as someone applies." : "Nothing here."}
        </Empty>
      ) : (
        <Card className="p-0 sm:p-0">
          <ul className="divide-y divide-line/60">
            {leads.map((l) => {
              const flags = healthYeses(l).length;
              return (
                <li key={l.id}>
                  <Link href={`/coach/leads/${l.id}`} className="flex min-h-16 items-center justify-between gap-3 px-4 py-3 hover:bg-char-2 sm:px-5">
                    <div className="min-w-0">
                      <div className="truncate font-semibold">{l.name}</div>
                      <div className="truncate text-xs text-mute">
                        {labelFor(GOALS, l.goal)} · {l.daysPerWeek} days/week · applied {fmtDay(l.createdAt.toISOString().slice(0, 10))}
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      {flags > 0 && <Badge tone="warn">Health: {flags} yes</Badge>}
                      {l.clientId && <Badge tone="gold">Client</Badge>}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
      <p className="text-xs text-faint">Applications that don&apos;t become clients are deleted automatically after 12 months.</p>
    </div>
  );
}

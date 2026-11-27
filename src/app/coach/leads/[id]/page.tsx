import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCoach } from "@/lib/auth";
import { db } from "@/lib/db";
import { acceptLeadAction, deleteLeadAction, saveLeadNotesAction, setLeadStatusAction } from "@/app/actions/coach";
import { LeadAnswers } from "@/components/lead-answers";
import { LinkActionForm } from "@/components/invite-form";
import { ActionForm, SubmitButton } from "@/components/form";
import { Badge, Card, CardTitle, cx } from "@/components/ui";

/** wa.me needs the number in international format without "+". UK mobiles starting 07 become 447… */
function whatsappNumber(phone: string): string | null {
  const t = phone.trim();
  const digits = t.replace(/\D/g, "");
  if (t.startsWith("+")) return digits.length >= 8 ? digits : null;
  if (digits.startsWith("07") && digits.length === 11) return `44${digits.slice(1)}`;
  if (digits.startsWith("44") && digits.length >= 11) return digits;
  return null;
}

const STATUS = { NEW: "New", CONTACTED: "Contacted", ACCEPTED: "Accepted", DECLINED: "Declined" } as const;

export default async function LeadPage({ params }: { params: Promise<{ id: string }> }) {
  const coach = await requireCoach();
  const { id } = await params;
  const lead = await db.lead.findFirst({ where: { id, coachId: coach.id } });
  if (!lead) notFound();
  const wa = lead.phone ? whatsappNumber(lead.phone) : null;
  const first = lead.name.split(" ")[0];
  const statusButton = (status: "NEW" | "CONTACTED" | "DECLINED", label: string) => (
    <form action={setLeadStatusAction}>
      <input type="hidden" name="id" value={lead.id} />
      <input type="hidden" name="status" value={status} />
      <button
        className={cx(
          "min-h-11 w-full rounded-xl border px-3 text-sm font-semibold",
          lead.status === status ? "border-gold bg-gold/10 text-gold" : "border-line text-mute",
        )}
        aria-pressed={lead.status === status}
      >
        {label}
      </button>
    </form>
  );

  return (
    <div className="space-y-4">
      <Link href={`/coach/leads?status=${lead.status}`} className="text-sm text-mute">
        ← Leads
      </Link>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="eyebrow">Application</div>
          <h1 className="font-display text-4xl uppercase leading-none sm:text-5xl">{lead.name}</h1>
          <div className="mt-1 text-sm text-mute">
            {lead.email}
            {lead.phone && ` · ${lead.phone}`}
          </div>
        </div>
        <Badge tone={lead.status === "NEW" ? "good" : lead.status === "DECLINED" ? "neutral" : "gold"}>{STATUS[lead.status]}</Badge>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Card>
          <CardTitle title="Their answers" />
          <LeadAnswers lead={lead} />
        </Card>

        <div className="space-y-4">
          <Card>
            <CardTitle eyebrow="Get in touch" title={`Contact ${first}`} />
            <div className="grid grid-cols-2 gap-2">
              <a
                href={`mailto:${lead.email}?subject=${encodeURIComponent("Your Coached by ABZ application")}`}
                className="flex min-h-12 items-center justify-center rounded-xl border border-line font-semibold"
              >
                Email
              </a>
              {wa ? (
                <a
                  href={`https://wa.me/${wa}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-h-12 items-center justify-center rounded-xl border border-line font-semibold"
                >
                  WhatsApp
                </a>
              ) : lead.phone ? (
                <a href={`tel:${lead.phone.replace(/[^\d+]/g, "")}`} className="flex min-h-12 items-center justify-center rounded-xl border border-line font-semibold">
                  Call
                </a>
              ) : (
                <span className="flex min-h-12 items-center justify-center rounded-xl border border-line/50 text-sm text-faint">No phone given</span>
              )}
            </div>
          </Card>

          <Card>
            <CardTitle eyebrow="Decision" title="Status" />
            {lead.clientId ? (
              <p className="text-sm text-mute">
                {first} has set up their account.{" "}
                <Link href={`/coach/clients/${lead.clientId}`} className="font-semibold text-gold underline underline-offset-4">
                  Open their profile
                </Link>
              </p>
            ) : (
              <>
                {lead.status !== "ACCEPTED" && (
                  <div className="mb-4 grid grid-cols-3 gap-2">
                    {statusButton("NEW", "New")}
                    {statusButton("CONTACTED", "Contacted")}
                    {statusButton("DECLINED", "Declined")}
                  </div>
                )}
                {lead.status === "ACCEPTED" && lead.invitedAt && (
                  <p className="mb-3 text-sm text-mute">Invite sent. You can create a fresh link below if the old one expired or got lost.</p>
                )}
                <LinkActionForm action={acceptLeadAction} submitLabel={lead.status === "ACCEPTED" ? "Create a new invite link" : `Accept ${first} & create invite`} name={lead.name}>
                  <input type="hidden" name="id" value={lead.id} />
                </LinkActionForm>
              </>
            )}
          </Card>

          <Card>
            <CardTitle eyebrow="Only you can see these" title="Notes" />
            <ActionForm action={saveLeadNotesAction} className="space-y-2">
              <input type="hidden" name="id" value={lead.id} />
              <textarea
                className="field min-h-24"
                name="coachNotes"
                defaultValue={lead.coachNotes}
                placeholder="e.g. Called Tues, starts 1st of the month"
                aria-label="Notes"
              />
              <SubmitButton variant="ghost" className="w-full">
                Save notes
              </SubmitButton>
            </ActionForm>
          </Card>

          {!lead.clientId && (
            <details className="rounded-2xl border border-warn/40 p-4">
              <summary className="cursor-pointer font-semibold text-warn">Delete application</summary>
              <p className="mt-2 text-sm text-mute">Use this for spam, or if {first} asks you to delete their details. It can&apos;t be undone.</p>
              <form action={deleteLeadAction} className="mt-3">
                <input type="hidden" name="id" value={lead.id} />
                <button className="min-h-12 w-full rounded-xl border border-warn/50 font-semibold text-warn hover:bg-warn hover:text-ink">
                  Delete permanently
                </button>
              </form>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}

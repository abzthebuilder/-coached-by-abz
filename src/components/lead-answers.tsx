import type { Lead } from "@prisma/client";
import { EXPERIENCE, GOALS, HEALTH_QUESTIONS, TRAINS_AT, labelFor } from "@/content/apply";
import { fmtDay } from "@/lib/dates";
import { cx } from "./ui";

export function healthYeses(lead: Pick<Lead, "health">) {
  const h = (lead.health ?? {}) as Record<string, boolean>;
  return HEALTH_QUESTIONS.filter((q) => h[q.key]);
}

/** Everything an applicant told you. Used on the lead page and on the client's Profile tab. */
export function LeadAnswers({ lead }: { lead: Lead }) {
  const health = (lead.health ?? {}) as Record<string, boolean>;
  const yeses = healthYeses(lead);
  const row = (label: string, value: React.ReactNode) => (
    <div className="flex justify-between gap-3 py-2">
      <span className="text-sm text-mute">{label}</span>
      <span className="text-right text-sm font-semibold">{value || "–"}</span>
    </div>
  );
  const block = (label: string, text: string) =>
    text ? (
      <div className="rounded-xl bg-char-2 p-3">
        <div className="eyebrow mb-1">{label}</div>
        <p className="whitespace-pre-line text-sm">{text}</p>
      </div>
    ) : null;
  return (
    <div className="space-y-4">
      <div className="divide-y divide-line/60">
        {row("Main goal", labelFor(GOALS, lead.goal))}
        {row("Experience", labelFor(EXPERIENCE, lead.experience))}
        {row("Days a week", lead.daysPerWeek)}
        {row("Trains at", labelFor(TRAINS_AT, lead.trainsAt))}
        {row("Heard about you", lead.heardFrom)}
        {row("Applied", fmtDay(lead.createdAt.toISOString().slice(0, 10), { year: true }))}
      </div>
      {block("Their goals", lead.about)}
      {block("Injuries / anything else", lead.injuries)}
      {Object.keys(health).length > 0 && (
      <div>
          <div className={cx("rounded-xl p-3", yeses.length ? "border border-warn/50 bg-warn/10" : "bg-char-2")}>
            <div className="eyebrow mb-1">Health check</div>
            {yeses.length ? (
              <p className="text-sm text-warn">
                Answered yes to {yeses.length} question{yeses.length > 1 ? "s" : ""}. Ask them to check with their GP before you write their
                plan, and keep a note that you asked.
              </p>
            ) : (
              <p className="text-sm text-mute">Answered no to every question.</p>
            )}
          </div>
          <ol className="mt-2 space-y-1.5 text-sm">
            {HEALTH_QUESTIONS.map((q, i) => (
              <li key={q.key} className="flex justify-between gap-3">
                <span className="text-mute">
                  {i + 1}. {q.q}
                </span>
                <span className={cx("shrink-0 font-semibold", health[q.key] ? "text-warn" : "text-faint")}>{health[q.key] ? "Yes" : "No"}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
      {block("Health details", lead.healthDetails)}
      <p className="text-xs text-faint">
        Agreed to the terms and to their answers being used, {fmtDay(lead.consentAt.toISOString().slice(0, 10), { year: true })}.
      </p>
    </div>
  );
}

import type { CheckIn, CheckInReply, User } from "@prisma/client";
import { fmtDay } from "@/lib/dates";
import { cx } from "./ui";

type Full = CheckIn & { replies: (CheckInReply & { author: Pick<User, "name" | "role"> })[] };

function Dots({ n }: { n: number }) {
  return (
    <span className="inline-flex gap-1" aria-label={`${n} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={cx("h-2.5 w-2.5 rounded-full", i <= n ? "bg-gold" : "bg-char-3")} />
      ))}
    </span>
  );
}

export function CheckInSummary({ c }: { c: CheckIn }) {
  const row = (label: string, value: React.ReactNode) => (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-sm text-mute">{label}</span>
      <span className="text-right text-sm font-semibold">{value}</span>
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
    <div className="space-y-3">
      <div className="divide-y divide-line/60">
        {row("Body weight", c.bodyWeightKg !== null ? `${c.bodyWeightKg} kg` : "–")}
        {row("Sleep", <>{c.sleepHours !== null ? `${c.sleepHours} h · ` : ""}<Dots n={c.sleepQuality} /></>)}
        {row("Energy", <Dots n={c.energy} />)}
        {row("Training", <Dots n={c.trainingRating} />)}
        {row("Nutrition", <Dots n={c.nutritionRating} />)}
      </div>
      {block("Training", c.trainingNotes)}
      {block("Nutrition", c.nutritionNotes)}
      {block("Wins", c.wins)}
      {block("Struggles", c.struggles)}
      {block("Questions", c.questions)}
    </div>
  );
}

export function ReplyThread({ c, viewerRole }: { c: Full; viewerRole: "COACH" | "CLIENT" }) {
  if (c.replies.length === 0)
    return <p className="text-sm text-mute">{viewerRole === "CLIENT" ? "Your coach hasn't replied yet." : "No reply yet."}</p>;
  return (
    <ul className="space-y-3">
      {c.replies.map((r) => {
        const fromCoach = r.author.role === "COACH";
        return (
          <li key={r.id} className={cx("rounded-2xl p-3", fromCoach ? "border border-gold/40 bg-gold/5" : "ml-6 bg-char-2")}>
            <div className="mb-1 flex justify-between text-xs">
              <span className={fromCoach ? "font-semibold text-gold" : "font-semibold text-mute"}>{fromCoach ? "Coach ABZ" : r.author.name}</span>
              <span className="text-faint">{fmtDay(r.createdAt.toISOString().slice(0, 10))}</span>
            </div>
            <p className="whitespace-pre-line text-sm">{r.body}</p>
          </li>
        );
      })}
    </ul>
  );
}

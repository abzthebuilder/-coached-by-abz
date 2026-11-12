import Link from "next/link";
import { requireClient } from "@/lib/auth";
import { db } from "@/lib/db";
import { fmtDay, relativeDay, todayIn, WEEKDAY_NAMES } from "@/lib/dates";
import { activePlan, currentTarget, loadDayPoints, nextWorkout } from "@/lib/progress";
import { statusForProfile } from "@/lib/checkins";
import { tasksForToday } from "@/lib/tasks";
import { mean } from "@/lib/metrics";
import { toggleTaskAction } from "@/app/actions/client";
import { QuickActions } from "@/components/quick-actions";
import { Badge, ButtonLink, Card, CardTitle, Empty, cx, fmtNum } from "@/components/ui";

function Bar({ value, target }: { value: number | null; target: number }) {
  const pct = value === null ? 0 : Math.min(100, (value / target) * 100);
  return (
    <div className="h-2 overflow-hidden rounded-full bg-char-3" aria-hidden>
      <div className="h-full rounded-full bg-gold" style={{ width: `${pct}%` }} />
    </div>
  );
}

export default async function Today({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const { user, profile } = await requireClient();
  const sp = await searchParams;
  const today = todayIn(user.timezone);
  const [plan, target, { status, last }, tasks, points] = await Promise.all([
    activePlan(profile.id),
    currentTarget(profile.id, today),
    statusForProfile(profile, today),
    tasksForToday(profile.id, today),
    loadDayPoints(profile.id, today, 7),
  ]);
  const next = await nextWorkout(profile.id, plan);
  const todayLog = points[points.length - 1];
  const doneToday = await db.workoutLog.findFirst({ where: { clientId: profile.id, day: today } });
  const stepAvg = mean(points.map((p) => p.steps));
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: user.timezone }).format(new Date()));
  const greeting = hour < 12 ? "Morning" : hour < 18 ? "Afternoon" : "Evening";
  const awaitingReply = last && (await db.checkInReply.count({ where: { checkInId: last.id } })) === 0;

  return (
    <div className="space-y-4">
      {sp.welcome && (
        <div className="rounded-2xl border border-gold/50 bg-gold/10 p-4 text-sm">
          <strong className="text-gold">You&apos;re in.</strong> This is your Today screen. Your coach will add your plan and targets
          here. Log your steps and workouts as you go.
        </div>
      )}
      <header>
        <div className="eyebrow">{fmtDay(today, { weekday: true })}</div>
        <h1 className="font-display text-4xl uppercase leading-tight">
          {greeting}, {user.name.split(" ")[0]}
        </h1>
      </header>

      <QuickActions workoutHref={next ? `/app/training/log/${next.id}` : "/app/training/log/custom"} today={today} stepsToday={todayLog?.steps ?? null} />

      {/* Next workout */}
      <Card>
        <CardTitle eyebrow={doneToday ? "Done today ✓" : "Next workout"} title={next ? next.name : "No plan yet"} />
        {next ? (
          <>
            <ul className="space-y-1 text-sm text-mute">
              {next.exercises.slice(0, 5).map((e) => (
                <li key={e.id} className="flex justify-between gap-3">
                  <span className="text-bone">{e.name}</span>
                  <span className="tabular shrink-0">
                    {e.sets} × {e.reps}
                  </span>
                </li>
              ))}
              {next.exercises.length > 5 && <li>+{next.exercises.length - 5} more</li>}
            </ul>
            <ButtonLink href={`/app/training/log/${next.id}`} className="mt-4 w-full">
              Start {next.name}
            </ButtonLink>
          </>
        ) : (
          <p className="text-sm text-mute">Your coach is putting your training plan together. You can still log a session.</p>
        )}
      </Card>

      {/* Targets */}
      <Card>
        <CardTitle
          eyebrow="Today's targets"
          title="Nutrition"
          action={
            <Link href="/app/nutrition" className="min-h-11 text-sm font-semibold text-gold">
              Log food
            </Link>
          }
        />
        {target ? (
          <div className="space-y-3">
            <div>
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-mute">Calories</span>
                <span className="tabular">
                  <span className="font-display text-3xl">{fmtNum(todayLog?.calories)}</span>
                  <span className="text-mute"> / {fmtNum(target.calories)} kcal</span>
                </span>
              </div>
              <Bar value={todayLog?.calories ?? null} target={target.calories} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  ["Protein", todayLog?.proteinG, target.proteinG],
                  ["Carbs", todayLog?.carbsG, target.carbsG],
                  ["Fat", todayLog?.fatG, target.fatG],
                ] as const
              ).map(([l, v, t]) => (
                <div key={l} className="rounded-xl bg-char-2 p-3">
                  <div className="text-xs text-mute">{l}</div>
                  <div className="tabular">
                    <span className="font-display text-2xl">{fmtNum(v)}</span>
                    <span className="text-xs text-mute"> / {t}g</span>
                  </div>
                  <Bar value={v ?? null} target={t} />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <Empty>Your coach hasn&apos;t set your targets yet.</Empty>
        )}
      </Card>

      {/* Steps */}
      <Card>
        <CardTitle eyebrow="Daily goal" title="Steps" />
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="font-display tabular text-5xl leading-none">{fmtNum(todayLog?.steps)}</div>
            <div className="mt-1 text-sm text-mute">{target ? `of ${fmtNum(target.stepGoal)} goal` : "today"}</div>
          </div>
          <div className="text-right">
            <div className="font-display tabular text-2xl">{fmtNum(stepAvg)}</div>
            <div className="text-xs text-mute">7-day average</div>
          </div>
        </div>
        {target && (
          <div className="mt-3">
            <Bar value={todayLog?.steps ?? null} target={target.stepGoal} />
          </div>
        )}
      </Card>

      {/* Tasks */}
      <Card>
        <CardTitle eyebrow="From your coach" title="Tasks" />
        {tasks.length === 0 ? (
          <Empty>No tasks right now.</Empty>
        ) : (
          <ul className="space-y-2">
            {tasks.map((t) => (
              <li key={t.id}>
                <form action={toggleTaskAction}>
                  <input type="hidden" name="taskId" value={t.id} />
                  <button
                    className={cx(
                      "flex min-h-14 w-full items-center gap-3 rounded-xl border px-3 text-left",
                      t.done ? "border-gold/40 bg-gold/5" : "border-line bg-char-2",
                    )}
                    aria-pressed={t.done}
                  >
                    <span
                      className={cx(
                        "flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2",
                        t.done ? "border-gold bg-gold text-ink" : "border-faint",
                      )}
                      aria-hidden
                    >
                      {t.done && "✓"}
                    </span>
                    <span className="flex-1">
                      <span className={cx("block font-semibold", t.done && "text-mute line-through")}>{t.title}</span>
                      {t.notes && <span className="block text-xs text-mute">{t.notes}</span>}
                    </span>
                    <span className="text-xs text-faint">
                      {t.frequency === "DAILY" ? "Daily" : t.frequency === "WEEKLY" ? "This week" : t.dueDay ? `By ${fmtDay(t.dueDay)}` : ""}
                    </span>
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Check-in */}
      <Card>
        <CardTitle eyebrow={profile.checkInFrequency === "WEEKLY" ? "Weekly check-in" : "Monthly check-in"} title="Next check-in" />
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="font-display text-3xl uppercase">{relativeDay(status.dueDay, today)}</div>
            <div className="text-sm text-mute">
              {fmtDay(status.dueDay, { weekday: true })}
              {profile.checkInFrequency === "WEEKLY" ? ` · every ${WEEKDAY_NAMES[profile.checkInWeekday]}` : ""}
            </div>
          </div>
          {status.state === "overdue" ? <Badge tone="warn">Overdue</Badge> : status.state === "due_today" ? <Badge tone="good">Due today</Badge> : null}
        </div>
        {awaitingReply && <p className="mt-3 text-sm text-mute">Your last check-in is with your coach.</p>}
        <ButtonLink href="/app/check-ins/new" variant={status.state === "upcoming" ? "ghost" : "gold"} className="mt-4 w-full">
          Submit Check-in
        </ButtonLink>
      </Card>
    </div>
  );
}

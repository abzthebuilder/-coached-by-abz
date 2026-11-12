import Link from "next/link";
import { requireCoachedClient } from "@/lib/auth";
import { db } from "@/lib/db";
import { fmtDay, relativeDay, todayIn, WEEKDAY_NAMES } from "@/lib/dates";
import { activePlan, currentTarget, loadDayPoints } from "@/lib/progress";
import { adherence, type Adherence } from "@/lib/metrics";
import { statusForProfile } from "@/lib/checkins";
import {
  addTaskAction,
  addWorkoutToPlanAction,
  archiveTaskAction,
  coachReplyAction,
  createPlanAction,
  createResetLinkAction,
  removePlanWorkoutAction,
  saveNutritionNotesAction,
  savePlanWorkoutAction,
  saveProfileAction,
  updatePlanAction,
} from "@/app/actions/coach";
import { ProgressDashboard, asTab } from "@/components/progress/dashboard";
import { CheckInSummary, ReplyThread } from "@/components/checkin-view";
import { MacroCalculator } from "@/components/macro-calculator";
import { ExerciseEditor } from "@/components/exercise-editor";
import { LinkActionForm } from "@/components/invite-form";
import { ActionForm, SubmitButton } from "@/components/form";
import { Badge, Card, CardTitle, Empty, Field, cx, fmtNum } from "@/components/ui";

const VIEWS = ["overview", "plan", "nutrition", "tasks", "logs", "check-ins", "profile"] as const;
type View = (typeof VIEWS)[number];
const GOAL_LABEL = { FAT_LOSS: "Fat loss", MUSCLE_GAIN: "Muscle gain", RECOMP: "Recomp", STRENGTH: "Strength" } as const;

export default async function ClientDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ view?: string; tab?: string; checkin?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const { profile } = await requireCoachedClient(id);
  const view: View = VIEWS.includes(sp.view as View) ? (sp.view as View) : "overview";
  const today = todayIn(profile.user.timezone);
  const base = `/coach/clients/${profile.id}`;
  const { status } = await statusForProfile(profile, today);

  return (
    <div className="space-y-4">
      <Link href="/coach" className="text-sm text-mute">← Clients</Link>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="eyebrow">{GOAL_LABEL[profile.goal]} · since {fmtDay(profile.startDay, { year: true })}</div>
          <h1 className="font-display text-4xl uppercase leading-none sm:text-5xl">{profile.user.name}</h1>
          <div className="mt-1 text-sm text-mute">{profile.user.email}</div>
        </div>
        <div className="text-right text-sm">
          <div className="text-mute">Next check-in</div>
          <div className="font-semibold">
            {relativeDay(status.dueDay, today)}{" "}
            {status.state === "overdue" && <Badge tone="warn">Overdue</Badge>}
          </div>
        </div>
      </header>
      <nav aria-label="Client sections" className="-mx-4 flex gap-1 overflow-x-auto border-b border-line/60 px-4">
        {VIEWS.map((v) => (
          <Link
            key={v}
            href={`${base}?view=${v}`}
            aria-current={view === v ? "page" : undefined}
            className={cx("flex min-h-11 shrink-0 items-center border-b-2 px-3 text-sm font-semibold capitalize", view === v ? "border-gold text-bone" : "border-transparent text-mute")}
          >
            {v.replace("-", " ")}
          </Link>
        ))}
      </nav>

      {view === "overview" && <Overview profileId={profile.id} goal={profile.goal} today={today} base={base} tab={sp.tab} checkinId={sp.checkin} />}
      {view === "plan" && <PlanView clientId={profile.id} coachId={profile.coachId} />}
      {view === "nutrition" && <NutritionView clientId={profile.id} notes={profile.nutritionNotes} today={today} />}
      {view === "tasks" && <TasksView clientId={profile.id} />}
      {view === "logs" && <LogsView clientId={profile.id} today={today} />}
      {view === "check-ins" && <CheckInsView clientId={profile.id} base={base} />}
      {view === "profile" && <ProfileView profile={profile} />}
    </div>
  );
}

function AdherenceCard({ a7, a30 }: { a7: Adherence; a30: Adherence }) {
  const row = (label: string, f: (a: Adherence) => string) => (
    <tr>
      <td className="py-2 text-mute">{label}</td>
      <td className="tabular py-2 text-right font-semibold">{f(a7)}</td>
      <td className="tabular py-2 text-right font-semibold">{f(a30)}</td>
    </tr>
  );
  const pct = (v: number | null) => (v === null ? "–" : `${v}%`);
  return (
    <Card>
      <CardTitle eyebrow="How closely they're following the plan" title="Adherence" />
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase text-faint">
            <th className="py-1 font-medium" />
            <th className="py-1 text-right font-medium">7 days</th>
            <th className="py-1 text-right font-medium">30 days</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line/60">
          {row("Workouts done", (a) => `${a.workoutsDone}/${a.workoutsAssigned}`)}
          {row("Days logged", (a) => `${a.loggedDays}/${a.days}`)}
          {row("Calories within 10%", (a) => pct(a.caloriesHit))}
          {row("Protein hit", (a) => pct(a.proteinHit))}
          {row("Avg steps", (a) => (a.stepsAvg === null ? "–" : `${fmtNum(a.stepsAvg)}`))}
          {row("Step goal hit", (a) => pct(a.stepsHit))}
        </tbody>
      </table>
    </Card>
  );
}

async function Overview({
  profileId,
  goal,
  today,
  base,
  tab,
  checkinId,
}: {
  profileId: string;
  goal: "FAT_LOSS" | "MUSCLE_GAIN" | "RECOMP" | "STRENGTH";
  today: string;
  base: string;
  tab?: string;
  checkinId?: string;
}) {
  const [points, plan, target] = await Promise.all([loadDayPoints(profileId, today, 30), activePlan(profileId), currentTarget(profileId, today)]);
  const wpw = plan?.workoutsPerWeek ?? 0;
  const include = { replies: { orderBy: { createdAt: "asc" as const }, include: { author: { select: { name: true, role: true } } } } };
  const checkIn =
    (checkinId && (await db.checkIn.findFirst({ where: { id: checkinId, clientId: profileId }, include }))) ||
    (await db.checkIn.findFirst({ where: { clientId: profileId }, orderBy: { createdAt: "desc" }, include }));

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
      <div className="min-w-0">
        <ProgressDashboard
          clientId={profileId}
          today={today}
          goal={goal}
          tab={asTab(tab)}
          hrefFor={(t) => `${base}?view=overview&tab=${t}${checkinId ? `&checkin=${checkinId}` : ""}`}
        />
      </div>
      <div className="min-w-0 space-y-4">
        <Card>
          <CardTitle
            eyebrow={checkIn ? `${checkIn.type === "WEEKLY" ? "Weekly" : "Monthly"} · ${fmtDay(checkIn.day, { weekday: true })}` : "Check-in"}
            title={checkIn ? "Latest check-in" : "No check-ins yet"}
            action={checkIn && <Link href={`${base}?view=check-ins`} className="min-h-11 text-sm text-gold">All</Link>}
          />
          {checkIn ? (
            <div className="space-y-4">
              <CheckInSummary c={checkIn} />
              <div className="border-t border-line/60 pt-4">
                <h3 className="mb-2 font-display text-lg uppercase">Replies</h3>
                <ReplyThread c={checkIn} viewerRole="COACH" />
                <ActionForm action={coachReplyAction} resetOnSuccess className="mt-3 space-y-2">
                  <input type="hidden" name="checkInId" value={checkIn.id} />
                  <textarea name="body" className="field min-h-28" placeholder="Your reply: what went well, what to change this week…" aria-label="Reply" required />
                  <SubmitButton className="w-full" pendingText="Sending…">Send reply</SubmitButton>
                </ActionForm>
              </div>
            </div>
          ) : (
            <Empty>Their check-ins will show here next to their progress.</Empty>
          )}
        </Card>
        <AdherenceCard a7={adherence(points, 7, wpw)} a30={adherence(points, 30, wpw)} />
        <Card>
          <CardTitle
            eyebrow="Current targets"
            title={target ? `${fmtNum(target.calories)} kcal` : "Not set"}
            action={<Link href={`${base}?view=nutrition`} className="min-h-11 text-sm font-semibold text-gold">Adjust</Link>}
          />
          {target && (
            <div className="grid grid-cols-4 gap-2 text-center text-sm">
              {[["P", target.proteinG, "g"], ["C", target.carbsG, "g"], ["F", target.fatG, "g"], ["Steps", target.stepGoal, ""]].map(([l, v, u]) => (
                <div key={String(l)} className="rounded-xl bg-char-2 p-2">
                  <div className="text-xs text-mute">{l}</div>
                  <div className="font-display tabular text-xl">{fmtNum(Number(v))}{u}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

async function PlanView({ clientId, coachId }: { clientId: string; coachId: string }) {
  const [plan, templates] = await Promise.all([
    activePlan(clientId),
    db.workoutTemplate.findMany({ where: { coachId }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <div className="space-y-4">
        {plan ? (
          <>
            <Card>
              <CardTitle eyebrow="Active plan" title={plan.name} />
              <ActionForm action={updatePlanAction} className="space-y-3">
                <input type="hidden" name="planId" value={plan.id} />
                <div className="grid grid-cols-[1fr_8rem] gap-3">
                  <Field label="Plan name"><input className="field" name="name" defaultValue={plan.name} /></Field>
                  <Field label="Workouts / week"><input className="field tabular" name="workoutsPerWeek" inputMode="numeric" defaultValue={plan.workoutsPerWeek} /></Field>
                </div>
                <Field label="Plan notes (shown to client)"><textarea className="field min-h-20" name="notes" defaultValue={plan.notes} /></Field>
                <SubmitButton variant="ghost" className="w-full">Save plan details</SubmitButton>
              </ActionForm>
            </Card>
            {plan.workouts.map((w) => (
              <Card key={w.id}>
                <details>
                  <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3">
                    <span className="font-display text-xl uppercase">{w.name}</span>
                    <span className="text-sm text-mute">{w.exercises.length} exercises · Edit</span>
                  </summary>
                  <div className="mt-3">
                    <ExerciseEditor action={savePlanWorkoutAction} id={w.id} name={w.name} notes={w.notes} exercises={w.exercises.map(({ name, sets, reps, notes }) => ({ name, sets, reps, notes }))} />
                    <form action={removePlanWorkoutAction} className="mt-2 text-right">
                      <input type="hidden" name="id" value={w.id} />
                      <button className="min-h-10 text-sm text-warn">Remove from plan</button>
                    </form>
                  </div>
                </details>
              </Card>
            ))}
            <Card>
              <CardTitle title="Add a workout" />
              <form action={addWorkoutToPlanAction} className="flex gap-2">
                <input type="hidden" name="planId" value={plan.id} />
                <select name="templateId" className="field" aria-label="Template">
                  <option value="">Blank workout</option>
                  {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <SubmitButton className="shrink-0">Add</SubmitButton>
              </form>
              {templates.length === 0 && <p className="mt-2 text-xs text-faint">Tip: build reusable workouts in <Link href="/coach/templates" className="text-gold">Templates</Link>.</p>}
            </Card>
          </>
        ) : (
          <Empty>No training plan assigned yet. Create one to get started.</Empty>
        )}
      </div>
      <Card className="h-fit">
        <CardTitle eyebrow={plan ? "Replaces the active plan" : "Start here"} title="New plan" />
        <ActionForm action={createPlanAction} className="space-y-3">
          <input type="hidden" name="clientId" value={clientId} />
          <Field label="Plan name"><input className="field" name="name" placeholder="e.g. 12-week strength block" required /></Field>
          <Field label="Workouts per week"><input className="field tabular" name="workoutsPerWeek" inputMode="numeric" defaultValue={3} /></Field>
          <Field label="Notes"><textarea className="field min-h-16" name="notes" /></Field>
          <SubmitButton className="w-full">Create plan</SubmitButton>
        </ActionForm>
        <p className="mt-2 text-xs text-faint">Old plans and their logs are kept. Lift history carries over.</p>
      </Card>
    </div>
  );
}

async function NutritionView({ clientId, notes, today }: { clientId: string; notes: string; today: string }) {
  const [target, history] = await Promise.all([
    currentTarget(clientId, today),
    db.nutritionTarget.findMany({ where: { clientId }, orderBy: [{ effectiveDay: "desc" }, { createdAt: "desc" }], take: 20 }),
  ]);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardTitle eyebrow="Coach only" title="Macro calculator" />
        <MacroCalculator clientId={clientId} current={target} today={today} />
      </Card>
      <div className="space-y-4">
        <Card>
          <CardTitle eyebrow="Shown on their Nutrition page" title="Nutrition plan" />
          <ActionForm action={saveNutritionNotesAction} className="space-y-3">
            <input type="hidden" name="clientId" value={clientId} />
            <textarea className="field min-h-40" name="nutritionNotes" defaultValue={notes} placeholder="Meal structure, food swaps, hydration, alcohol guidance…" aria-label="Nutrition plan" />
            <SubmitButton variant="ghost" className="w-full">Save nutrition plan</SubmitButton>
          </ActionForm>
        </Card>
        <Card>
          <CardTitle title="Target history" />
          {history.length === 0 ? (
            <Empty>No targets set yet.</Empty>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-faint">
                  <th className="py-1 font-medium">From</th><th className="py-1 text-right font-medium">Kcal</th><th className="py-1 text-right font-medium">P/C/F</th><th className="py-1 text-right font-medium">Steps</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {history.map((h) => (
                  <tr key={h.id}>
                    <td className="py-2">{fmtDay(h.effectiveDay, { year: true })}</td>
                    <td className="tabular py-2 text-right">{fmtNum(h.calories)}</td>
                    <td className="tabular py-2 text-right">{h.proteinG}/{h.carbsG}/{h.fatG}</td>
                    <td className="tabular py-2 text-right">{fmtNum(h.stepGoal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </div>
  );
}

async function TasksView({ clientId }: { clientId: string }) {
  const tasks = await db.task.findMany({ where: { clientId, active: true }, orderBy: { createdAt: "desc" }, include: { completions: { orderBy: { day: "desc" }, take: 7 } } });
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardTitle title="Assign a task" />
        <ActionForm action={addTaskAction} resetOnSuccess className="space-y-3">
          <input type="hidden" name="clientId" value={clientId} />
          <Field label="Task"><input className="field" name="title" placeholder="e.g. Drink 3L of water" required /></Field>
          <Field label="Details (optional)"><input className="field" name="notes" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Repeats">
              <select className="field" name="frequency" defaultValue="ONCE">
                <option value="ONCE">Once</option><option value="DAILY">Every day</option><option value="WEEKLY">Every week</option>
              </select>
            </Field>
            <Field label="Due (one-off)"><input className="field" type="date" name="dueDay" /></Field>
          </div>
          <SubmitButton className="w-full">Assign task</SubmitButton>
        </ActionForm>
      </Card>
      <Card>
        <CardTitle title="Active tasks" />
        {tasks.length === 0 ? <Empty>No active tasks.</Empty> : (
          <ul className="divide-y divide-line/60">
            {tasks.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <div className="font-semibold">{t.title}</div>
                  <div className="text-xs text-mute">
                    {t.frequency === "ONCE" ? (t.completions.length ? "Done ✓" : t.dueDay ? `Due ${fmtDay(t.dueDay)}` : "One-off") : `${t.frequency === "DAILY" ? "Daily" : "Weekly"} · done ${t.completions.length} of last 7 periods`}
                  </div>
                </div>
                <form action={archiveTaskAction}>
                  <input type="hidden" name="id" value={t.id} />
                  <button className="min-h-10 text-xs text-mute hover:text-warn">Remove</button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

async function LogsView({ clientId, today }: { clientId: string; today: string }) {
  const [points, workouts] = await Promise.all([
    loadDayPoints(clientId, today, 30),
    db.workoutLog.findMany({ where: { clientId }, orderBy: [{ day: "desc" }, { createdAt: "desc" }], take: 20, include: { sets: { orderBy: { setNumber: "asc" } } } }),
  ]);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardTitle eyebrow="Last 30 days" title="Daily logs" />
        <div className="-mx-4 overflow-x-auto px-4">
          <table className="w-full min-w-[460px] text-sm">
            <thead><tr className="text-left text-xs uppercase text-faint"><th className="py-1 font-medium">Day</th><th className="py-1 text-right font-medium">Kcal</th><th className="py-1 text-right font-medium">P/C/F</th><th className="py-1 text-right font-medium">Steps</th><th className="py-1 text-right font-medium">Kg</th></tr></thead>
            <tbody className="divide-y divide-line/60">
              {[...points].reverse().map((p) => {
                const t = p.target;
                const off = t && p.calories !== null && Math.abs(p.calories - t.calories) > t.calories * 0.1;
                return (
                  <tr key={p.day}>
                    <td className="py-2">{fmtDay(p.day, { weekday: true })}</td>
                    <td className={cx("tabular py-2 text-right", off && "text-warn")}>{fmtNum(p.calories)}</td>
                    <td className="tabular py-2 text-right">{p.proteinG === null && p.carbsG === null && p.fatG === null ? "–" : `${p.proteinG ?? "–"}/${p.carbsG ?? "–"}/${p.fatG ?? "–"}`}</td>
                    <td className="tabular py-2 text-right">{fmtNum(p.steps)}</td>
                    <td className="tabular py-2 text-right">{fmtNum(p.weightKg, 1)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
      <Card>
        <CardTitle eyebrow="Most recent 20" title="Workout logs" />
        {workouts.length === 0 ? <Empty>No workouts logged yet.</Empty> : (
          <ul className="divide-y divide-line/60">
            {workouts.map((w) => {
              const byEx = new Map<string, string[]>();
              for (const s of w.sets) byEx.set(s.exerciseName, [...(byEx.get(s.exerciseName) ?? []), `${s.weightKg}×${s.reps}`]);
              return (
                <li key={w.id} className="py-3">
                  <div className="flex justify-between gap-3"><span className="font-semibold">{w.name}</span><span className="text-sm text-mute">{fmtDay(w.day, { weekday: true })}</span></div>
                  <ul className="mt-1 space-y-0.5 text-xs">
                    {[...byEx.entries()].map(([n, s]) => <li key={n} className="flex justify-between gap-3"><span className="text-mute">{n}</span><span className="tabular">{s.join("  ")}</span></li>)}
                  </ul>
                  {w.notes && <p className="mt-1 text-xs italic text-mute">“{w.notes}”</p>}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}

async function CheckInsView({ clientId, base }: { clientId: string; base: string }) {
  const list = await db.checkIn.findMany({ where: { clientId }, orderBy: { createdAt: "desc" }, include: { replies: { where: { author: { role: "COACH" } }, select: { id: true } } } });
  return (
    <Card>
      <CardTitle title="All check-ins" />
      {list.length === 0 ? <Empty>No check-ins yet.</Empty> : (
        <ul className="divide-y divide-line/60">
          {list.map((c) => (
            <li key={c.id}>
              <Link href={`${base}?view=overview&checkin=${c.id}`} className="flex min-h-14 items-center justify-between gap-3 py-2">
                <div>
                  <div className="font-semibold">{fmtDay(c.day, { weekday: true, year: true })}</div>
                  <div className="text-xs text-mute">{c.type === "WEEKLY" ? "Weekly" : "Monthly"}{c.bodyWeightKg !== null && ` · ${c.bodyWeightKg} kg`} · energy {c.energy}/5</div>
                </div>
                {c.replies.length ? <Badge tone="gold">Replied</Badge> : <Badge tone="good">Needs reply</Badge>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function ProfileView({ profile }: { profile: Awaited<ReturnType<typeof requireCoachedClient>>["profile"] }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardTitle title="Coaching setup" />
        <ActionForm action={saveProfileAction} className="space-y-3">
          <input type="hidden" name="clientId" value={profile.id} />
          <Field label="Goal">
            <select className="field" name="goal" defaultValue={profile.goal}>
              {Object.entries(GOAL_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Check-ins">
              <select className="field" name="checkInFrequency" defaultValue={profile.checkInFrequency}>
                <option value="WEEKLY">Weekly</option><option value="MONTHLY">Monthly</option>
              </select>
            </Field>
            <Field label="Weekly on">
              <select className="field" name="checkInWeekday" defaultValue={profile.checkInWeekday}>
                {WEEKDAY_NAMES.map((d, i) => <option key={d} value={i}>{d.slice(0, 3)}</option>)}
              </select>
            </Field>
            <Field label="Monthly on day">
              <input className="field tabular" name="checkInMonthDay" inputMode="numeric" defaultValue={profile.checkInMonthDay} />
            </Field>
          </div>
          <Field label="Private coach notes (client can't see these)">
            <textarea className="field min-h-28" name="coachNotes" defaultValue={profile.coachNotes} placeholder="Injuries, preferences, context…" />
          </Field>
          <label className="flex min-h-11 items-center gap-3">
            <input type="checkbox" name="active" defaultChecked={profile.active} className="h-5 w-5 accent-[#d4af37]" />
            <span>Active client</span>
          </label>
          <SubmitButton className="w-full">Save</SubmitButton>
        </ActionForm>
      </Card>
      <Card className="h-fit">
        <CardTitle eyebrow="Account" title="Password reset" />
        <p className="mb-3 text-sm text-mute">Forgot their password? Create a one-time reset link and send it to them.</p>
        <LinkActionForm action={createResetLinkAction} submitLabel="Create reset link" name={profile.user.name}>
          <input type="hidden" name="clientId" value={profile.id} />
        </LinkActionForm>
      </Card>
    </div>
  );
}

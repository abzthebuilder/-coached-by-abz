"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/db";
import { randomToken, requireCoach, requireCoachedClient, sha256 } from "@/lib/auth";
import { isDay, todayIn } from "@/lib/dates";
import { fail, InputError, reqNum, text } from "@/lib/parse";
import { calculateMacros } from "@/lib/macros";
import { isSafeHttpUrl } from "@/lib/settings";
import type { FormState } from "@/components/form";

async function baseUrl() {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

// ---------- Invites & accounts ----------

export async function createInviteAction(_: FormState, fd: FormData): Promise<FormState> {
  const coach = await requireCoach();
  const name = text(fd, "name", 120);
  const email = text(fd, "email", 200).toLowerCase();
  if (!name) return { error: "Enter the client's name." };
  if (!z.string().email().safeParse(email).success) return { error: "Enter a valid email address." };
  if (await db.user.findUnique({ where: { email } })) return { error: "Someone already has an account with that email." };
  const token = randomToken();
  await db.authToken.updateMany({
    where: { email, kind: "INVITE", usedAt: null },
    data: { expiresAt: new Date() }, // older links for the same email stop working
  });
  await db.authToken.create({
    data: { tokenHash: sha256(token), kind: "INVITE", email, name, coachId: coach.id, expiresAt: new Date(Date.now() + 14 * 86400000) },
  });
  revalidatePath("/coach");
  return { ok: true, message: `Invite created for ${name}. It works once and expires in 14 days.`, link: `${await baseUrl()}/invite/${token}` };
}

export async function revokeInviteAction(fd: FormData) {
  const coach = await requireCoach();
  await db.authToken.updateMany({ where: { id: text(fd, "id", 64), coachId: coach.id, usedAt: null }, data: { expiresAt: new Date() } });
  revalidatePath("/coach");
}

export async function createResetLinkAction(_: FormState, fd: FormData): Promise<FormState> {
  const { coach, profile } = await requireCoachedClient(text(fd, "clientId", 64));
  const token = randomToken();
  await db.authToken.create({
    data: {
      tokenHash: sha256(token),
      kind: "RESET",
      email: profile.user.email,
      name: profile.user.name,
      coachId: coach.id,
      userId: profile.userId,
      expiresAt: new Date(Date.now() + 2 * 86400000),
    },
  });
  return { ok: true, message: "Reset link created. It works once and expires in 48 hours.", link: `${await baseUrl()}/reset/${token}` };
}

export async function saveSiteLinksAction(_: FormState, fd: FormData): Promise<FormState> {
  await requireCoach();
  const tallyUrl = text(fd, "tallyUrl", 500);
  const calendlyUrl = text(fd, "calendlyUrl", 500);
  if (!isSafeHttpUrl(tallyUrl) || !isSafeHttpUrl(calendlyUrl)) return { error: "Both links must start with https://" };
  await db.$transaction([
    db.siteSetting.upsert({ where: { key: "tallyUrl" }, create: { key: "tallyUrl", value: tallyUrl }, update: { value: tallyUrl } }),
    db.siteSetting.upsert({ where: { key: "calendlyUrl" }, create: { key: "calendlyUrl", value: calendlyUrl }, update: { value: calendlyUrl } }),
  ]);
  revalidatePath("/", "layout");
  return { ok: true, message: "Links updated on the public site." };
}

// ---------- Templates ----------

const exercisesSchema = z
  .array(
    z.object({
      name: z.string().trim().min(1, "Every exercise needs a name").max(120),
      sets: z.number().int().min(1).max(20),
      reps: z.string().trim().min(1, "Every exercise needs reps").max(30),
      notes: z.string().max(1000).default(""),
    }),
  )
  .max(40);

function parseExercises(fd: FormData) {
  try {
    const r = exercisesSchema.safeParse(JSON.parse(String(fd.get("exercises") ?? "[]")));
    if (!r.success) throw new InputError(r.error.issues[0]?.message ?? "Check the exercises.");
    return r.data;
  } catch (e) {
    if (e instanceof InputError) throw e;
    throw new InputError("Check the exercises.");
  }
}

export async function createTemplateAction(fd: FormData) {
  const coach = await requireCoach();
  const t = await db.workoutTemplate.create({ data: { coachId: coach.id, name: text(fd, "name", 120) || "New workout" } });
  redirect(`/coach/templates/${t.id}`);
}

export async function saveTemplateAction(_: FormState, fd: FormData): Promise<FormState> {
  const coach = await requireCoach();
  try {
    const id = text(fd, "id", 64);
    const t = await db.workoutTemplate.findFirst({ where: { id, coachId: coach.id } });
    if (!t) throw new InputError("Template not found.");
    const name = text(fd, "name", 120);
    if (!name) throw new InputError("Name the workout.");
    const ex = parseExercises(fd);
    await db.$transaction([
      db.templateExercise.deleteMany({ where: { templateId: id } }),
      db.workoutTemplate.update({
        where: { id },
        data: { name, notes: text(fd, "notes", 2000), exercises: { create: ex.map((e, i) => ({ ...e, order: i })) } },
      }),
    ]);
  } catch (e) {
    return fail(e);
  }
  revalidatePath("/coach/templates", "layout");
  return { ok: true, message: "Template saved." };
}

export async function deleteTemplateAction(fd: FormData) {
  const coach = await requireCoach();
  await db.workoutTemplate.deleteMany({ where: { id: text(fd, "id", 64), coachId: coach.id } });
  redirect("/coach/templates");
}

// ---------- Training plans ----------

async function ownedPlan(planId: string, coachId: string) {
  const plan = await db.trainingPlan.findFirst({ where: { id: planId, client: { coachId } } });
  if (!plan) throw new InputError("Plan not found.");
  return plan;
}

export async function createPlanAction(_: FormState, fd: FormData): Promise<FormState> {
  const { profile } = await requireCoachedClient(text(fd, "clientId", 64));
  try {
    const name = text(fd, "name", 120);
    if (!name) throw new InputError("Name the plan.");
    const workoutsPerWeek = reqNum(fd, "workoutsPerWeek", "Workouts per week", { min: 1, max: 14, int: true });
    await db.$transaction([
      db.trainingPlan.updateMany({ where: { clientId: profile.id, active: true }, data: { active: false } }),
      db.trainingPlan.create({ data: { clientId: profile.id, name, workoutsPerWeek, notes: text(fd, "notes", 2000) } }),
    ]);
  } catch (e) {
    return fail(e);
  }
  revalidatePath(`/coach/clients/${profile.id}`, "layout");
  return { ok: true, message: "New plan created and set as active." };
}

export async function updatePlanAction(_: FormState, fd: FormData): Promise<FormState> {
  const coach = await requireCoach();
  try {
    const plan = await ownedPlan(text(fd, "planId", 64), coach.id);
    await db.trainingPlan.update({
      where: { id: plan.id },
      data: {
        name: text(fd, "name", 120) || plan.name,
        notes: text(fd, "notes", 2000),
        workoutsPerWeek: reqNum(fd, "workoutsPerWeek", "Workouts per week", { min: 1, max: 14, int: true }),
      },
    });
    revalidatePath(`/coach/clients/${plan.clientId}`, "layout");
  } catch (e) {
    return fail(e);
  }
  return { ok: true, message: "Plan updated." };
}

export async function addWorkoutToPlanAction(fd: FormData) {
  const coach = await requireCoach();
  const plan = await ownedPlan(text(fd, "planId", 64), coach.id);
  const templateId = text(fd, "templateId", 64);
  const order = await db.planWorkout.count({ where: { planId: plan.id } });
  if (templateId) {
    const t = await db.workoutTemplate.findFirst({
      where: { id: templateId, coachId: coach.id },
      include: { exercises: { orderBy: { order: "asc" } } },
    });
    if (!t) return;
    // Templates are copied, so editing a template later doesn't change plans already assigned.
    await db.planWorkout.create({
      data: {
        planId: plan.id,
        order,
        name: t.name,
        notes: t.notes,
        exercises: { create: t.exercises.map(({ name, sets, reps, notes, order }) => ({ name, sets, reps, notes, order })) },
      },
    });
  } else {
    await db.planWorkout.create({ data: { planId: plan.id, order, name: `Workout ${order + 1}` } });
  }
  revalidatePath(`/coach/clients/${plan.clientId}`, "layout");
}

export async function savePlanWorkoutAction(_: FormState, fd: FormData): Promise<FormState> {
  const coach = await requireCoach();
  try {
    const id = text(fd, "id", 64);
    const pw = await db.planWorkout.findFirst({ where: { id, plan: { client: { coachId: coach.id } } }, include: { plan: true } });
    if (!pw) throw new InputError("Workout not found.");
    const name = text(fd, "name", 120);
    if (!name) throw new InputError("Name the workout.");
    const ex = parseExercises(fd);
    await db.$transaction([
      db.planExercise.deleteMany({ where: { planWorkoutId: id } }),
      db.planWorkout.update({
        where: { id },
        data: { name, notes: text(fd, "notes", 2000), exercises: { create: ex.map((e, i) => ({ ...e, order: i })) } },
      }),
    ]);
    revalidatePath(`/coach/clients/${pw.plan.clientId}`, "layout");
  } catch (e) {
    return fail(e);
  }
  return { ok: true, message: "Workout saved." };
}

export async function removePlanWorkoutAction(fd: FormData) {
  const coach = await requireCoach();
  const pw = await db.planWorkout.findFirst({
    where: { id: text(fd, "id", 64), plan: { client: { coachId: coach.id } } },
    include: { plan: true },
  });
  if (!pw) return;
  await db.planWorkout.delete({ where: { id: pw.id } });
  revalidatePath(`/coach/clients/${pw.plan.clientId}`, "layout");
}

// ---------- Nutrition targets ----------

export async function saveTargetsAction(_: FormState, fd: FormData): Promise<FormState> {
  const { coach, profile } = await requireCoachedClient(text(fd, "clientId", 64));
  try {
    const calories = reqNum(fd, "calories", "Calories", { min: 800, max: 8000, int: true });
    const proteinG = reqNum(fd, "proteinG", "Protein", { min: 0, max: 600, int: true });
    const fatG = reqNum(fd, "fatG", "Fat", { min: 0, max: 400, int: true });
    const stepGoal = reqNum(fd, "stepGoal", "Step goal", { min: 0, max: 50000, int: true });
    // Carbs are always recalculated here; the browser's number is only a preview.
    const m = calculateMacros({ calories, proteinG, fatG });
    if (m.errors.length) throw new InputError(m.errors[0]);
    const today = todayIn(profile.user.timezone || coach.timezone);
    const effectiveDay = text(fd, "effectiveDay", 10) || today;
    if (!isDay(effectiveDay)) throw new InputError("Choose a valid start date.");
    await db.nutritionTarget.create({
      data: { clientId: profile.id, calories, proteinG, fatG, carbsG: m.carbsG, stepGoal, effectiveDay },
    });
  } catch (e) {
    return fail(e);
  }
  revalidatePath(`/coach/clients/${profile.id}`, "layout");
  return { ok: true, message: "Targets saved to the client's profile." };
}

export async function saveNutritionNotesAction(_: FormState, fd: FormData): Promise<FormState> {
  const { profile } = await requireCoachedClient(text(fd, "clientId", 64));
  await db.clientProfile.update({ where: { id: profile.id }, data: { nutritionNotes: text(fd, "nutritionNotes", 8000) } });
  revalidatePath(`/coach/clients/${profile.id}`, "layout");
  return { ok: true, message: "Nutrition plan saved." };
}

// ---------- Profile, schedule & tasks ----------

const GOALS = ["FAT_LOSS", "MUSCLE_GAIN", "RECOMP", "STRENGTH"] as const;

export async function saveProfileAction(_: FormState, fd: FormData): Promise<FormState> {
  const { profile } = await requireCoachedClient(text(fd, "clientId", 64));
  try {
    const frequency = text(fd, "checkInFrequency") === "MONTHLY" ? "MONTHLY" : "WEEKLY";
    const goal = text(fd, "goal") as (typeof GOALS)[number];
    if (!GOALS.includes(goal)) throw new InputError("Choose a goal.");
    await db.clientProfile.update({
      where: { id: profile.id },
      data: {
        goal,
        checkInFrequency: frequency,
        checkInWeekday: reqNum(fd, "checkInWeekday", "Check-in day", { min: 0, max: 6, int: true }),
        checkInMonthDay: reqNum(fd, "checkInMonthDay", "Day of month", { min: 1, max: 28, int: true }),
        coachNotes: text(fd, "coachNotes", 8000),
        active: fd.get("active") === "on",
      },
    });
  } catch (e) {
    return fail(e);
  }
  revalidatePath("/coach", "layout");
  return { ok: true, message: "Profile saved." };
}

export async function addTaskAction(_: FormState, fd: FormData): Promise<FormState> {
  const { profile } = await requireCoachedClient(text(fd, "clientId", 64));
  const title = text(fd, "title", 200);
  if (!title) return { error: "Write the task." };
  const freq = text(fd, "frequency");
  const frequency = freq === "DAILY" || freq === "WEEKLY" ? freq : "ONCE";
  const dueDay = text(fd, "dueDay", 10);
  await db.task.create({
    data: { clientId: profile.id, title, notes: text(fd, "notes", 1000), frequency, dueDay: isDay(dueDay) ? dueDay : null },
  });
  revalidatePath(`/coach/clients/${profile.id}`, "layout");
  return { ok: true, message: "Task assigned." };
}

export async function archiveTaskAction(fd: FormData) {
  const coach = await requireCoach();
  const task = await db.task.findFirst({ where: { id: text(fd, "id", 64), client: { coachId: coach.id } } });
  if (!task) return;
  await db.task.update({ where: { id: task.id }, data: { active: false } });
  revalidatePath(`/coach/clients/${task.clientId}`, "layout");
}

// ---------- Check-in replies ----------

export async function coachReplyAction(_: FormState, fd: FormData): Promise<FormState> {
  const coach = await requireCoach();
  const checkInId = text(fd, "checkInId", 64);
  const body = text(fd, "body", 8000);
  if (!body) return { error: "Write a reply first." };
  const ci = await db.checkIn.findFirst({ where: { id: checkInId, client: { coachId: coach.id } } });
  if (!ci) return { error: "Check-in not found." };
  await db.checkInReply.create({ data: { checkInId, authorId: coach.id, body } });
  revalidatePath("/coach", "layout");
  return { ok: true, message: "Reply sent." };
}

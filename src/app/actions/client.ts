"use server";
import { revalidatePath } from "next/cache";
import crypto from "node:crypto";
import { db } from "@/lib/db";
import { requireClient } from "@/lib/auth";
import { todayIn, startOfWeek } from "@/lib/dates";
import { fail, InputError, logDay, num, rating, text } from "@/lib/parse";
import { normaliseExercise } from "@/lib/metrics";
import { deleteObject, putObject, sniffImage } from "@/lib/storage";
import type { FormState } from "@/components/form";
import { z } from "zod";

// Every action here derives the client from the session. None of them accept a client id,
// so one client can never write to another client's records.

const DAILY_FIELDS = {
  weightKg: { label: "Body weight", min: 20, max: 400, int: false },
  calories: { label: "Calories", min: 0, max: 15000, int: true },
  proteinG: { label: "Protein", min: 0, max: 1000, int: true },
  carbsG: { label: "Carbs", min: 0, max: 2000, int: true },
  fatG: { label: "Fat", min: 0, max: 1000, int: true },
  steps: { label: "Steps", min: 0, max: 150000, int: true },
} as const;

/** Upserts the day's totals. Only fields present in the form are touched; a blank field clears it. */
export async function logDailyAction(_: FormState, fd: FormData): Promise<FormState> {
  const { user, profile } = await requireClient();
  try {
    const today = todayIn(user.timezone);
    const day = logDay(fd, today);
    const data: Record<string, number | null> = {};
    for (const [key, o] of Object.entries(DAILY_FIELDS)) {
      if (fd.has(key)) data[key] = num(fd, key, o.label, o);
    }
    if (Object.keys(data).length === 0) throw new InputError("Nothing to save.");
    if (Object.values(data).every((v) => v === null) && fd.get("allowClear") !== "1")
      throw new InputError("Enter at least one number.");
    await db.dailyLog.upsert({
      where: { clientId_day: { clientId: profile.id, day } },
      create: { clientId: profile.id, day, ...data },
      update: data,
    });
    revalidatePath("/app", "layout");
    const what = Object.keys(data).length === 1 && "steps" in data ? "Steps" : "Log";
    return { ok: true, message: `${what} saved for ${day === today ? "today" : day}.` };
  } catch (e) {
    return fail(e);
  }
}

const setsSchema = z
  .array(
    z.object({
      exercise: z.string().trim().min(1).max(120),
      weightKg: z.number().min(0).max(1000),
      reps: z.number().int().min(0).max(200),
    }),
  )
  .max(300);

export async function logWorkoutAction(_: FormState, fd: FormData): Promise<FormState> {
  const { user, profile } = await requireClient();
  try {
    const today = todayIn(user.timezone);
    const day = logDay(fd, today);
    const planWorkoutId = text(fd, "planWorkoutId", 64) || null;
    let name = text(fd, "name", 120);
    if (planWorkoutId) {
      // Must be a workout in one of *this* client's plans.
      const pw = await db.planWorkout.findFirst({ where: { id: planWorkoutId, plan: { clientId: profile.id } } });
      if (!pw) throw new InputError("That workout isn't in your plan.");
      name = pw.name;
    }
    if (!name) throw new InputError("Give the workout a name.");
    let parsed: z.infer<typeof setsSchema>;
    try {
      parsed = setsSchema.parse(JSON.parse(String(fd.get("sets") ?? "[]")));
    } catch {
      throw new InputError("Some sets have invalid numbers. Check the weights and reps.");
    }
    const sets = parsed.filter((s) => s.reps > 0);
    if (sets.length === 0) throw new InputError("Log at least one set with reps.");
    const counters = new Map<string, number>();
    await db.workoutLog.create({
      data: {
        clientId: profile.id,
        planWorkoutId,
        name,
        day,
        notes: text(fd, "notes", 2000),
        sets: {
          create: sets.map((s) => {
            const key = normaliseExercise(s.exercise);
            const n = (counters.get(key) ?? 0) + 1;
            counters.set(key, n);
            return { exerciseName: s.exercise, exerciseKey: key, setNumber: n, weightKg: s.weightKg, reps: s.reps };
          }),
        },
      },
    });
  } catch (e) {
    return fail(e);
  }
  revalidatePath("/app", "layout");
  return { ok: true, message: "Workout saved. Nice work." };
}

export async function deleteWorkoutLogAction(fd: FormData) {
  const { profile } = await requireClient();
  const id = text(fd, "id", 64);
  await db.workoutLog.deleteMany({ where: { id, clientId: profile.id } });
  revalidatePath("/app", "layout");
}

export async function submitCheckInAction(_: FormState, fd: FormData): Promise<FormState> {
  const { user, profile } = await requireClient();
  try {
    const today = todayIn(user.timezone);
    const bodyWeightKg = num(fd, "bodyWeightKg", "Body weight", { min: 20, max: 400 });
    await db.checkIn.create({
      data: {
        clientId: profile.id,
        type: profile.checkInFrequency,
        day: today,
        bodyWeightKg,
        sleepHours: num(fd, "sleepHours", "Sleep hours", { min: 0, max: 24 }),
        sleepQuality: rating(fd, "sleepQuality", "Sleep quality"),
        energy: rating(fd, "energy", "Energy"),
        trainingRating: rating(fd, "trainingRating", "Training"),
        trainingNotes: text(fd, "trainingNotes"),
        nutritionRating: rating(fd, "nutritionRating", "Nutrition"),
        nutritionNotes: text(fd, "nutritionNotes"),
        wins: text(fd, "wins"),
        struggles: text(fd, "struggles"),
        questions: text(fd, "questions"),
      },
    });
    // The check-in weight also counts as today's weigh-in if they haven't logged one.
    if (bodyWeightKg !== null) {
      const existing = await db.dailyLog.findUnique({ where: { clientId_day: { clientId: profile.id, day: today } } });
      if (!existing?.weightKg)
        await db.dailyLog.upsert({
          where: { clientId_day: { clientId: profile.id, day: today } },
          create: { clientId: profile.id, day: today, weightKg: bodyWeightKg },
          update: { weightKg: bodyWeightKg },
        });
    }
  } catch (e) {
    return fail(e);
  }
  revalidatePath("/app", "layout");
  revalidatePath("/coach", "layout");
  return { ok: true, message: "Check-in sent. Your coach will reply here." };
}

export async function clientReplyAction(_: FormState, fd: FormData): Promise<FormState> {
  const { user, profile } = await requireClient();
  const checkInId = text(fd, "checkInId", 64);
  const body = text(fd, "body", 4000);
  if (!body) return { error: "Write a message first." };
  const ci = await db.checkIn.findFirst({ where: { id: checkInId, clientId: profile.id } });
  if (!ci) return { error: "Check-in not found." };
  await db.checkInReply.create({ data: { checkInId, authorId: user.id, body } });
  revalidatePath("/app/check-ins", "layout");
  return { ok: true, message: "Sent." };
}

export async function addMeasurementAction(_: FormState, fd: FormData): Promise<FormState> {
  const { user, profile } = await requireClient();
  try {
    const day = logDay(fd, todayIn(user.timezone));
    const o = { min: 10, max: 300 };
    const data = {
      chestCm: num(fd, "chestCm", "Chest", o),
      waistCm: num(fd, "waistCm", "Waist", o),
      hipsCm: num(fd, "hipsCm", "Hips", o),
      armCm: num(fd, "armCm", "Arm", { min: 5, max: 100 }),
      thighCm: num(fd, "thighCm", "Thigh", { min: 5, max: 150 }),
      neckCm: num(fd, "neckCm", "Neck", { min: 5, max: 100 }),
    };
    if (Object.values(data).every((v) => v === null)) throw new InputError("Enter at least one measurement.");
    await db.measurement.create({ data: { clientId: profile.id, day, ...data, notes: text(fd, "notes", 500) } });
  } catch (e) {
    return fail(e);
  }
  revalidatePath("/app/progress");
  return { ok: true, message: "Measurements saved." };
}

const POSES = ["FRONT", "SIDE", "BACK", "OTHER"] as const;
const MAX_PHOTO = 10 * 1024 * 1024;

export async function uploadPhotoAction(_: FormState, fd: FormData): Promise<FormState> {
  const { user, profile } = await requireClient();
  try {
    const day = logDay(fd, todayIn(user.timezone));
    const pose = String(fd.get("pose") ?? "FRONT");
    if (!POSES.includes(pose as (typeof POSES)[number])) throw new InputError("Choose a pose.");
    const files = fd.getAll("photo").filter((f): f is File => f instanceof File && f.size > 0);
    if (files.length === 0) throw new InputError("Choose a photo to upload.");
    if (files.length > 1) throw new InputError("Upload one photo at a time.");
    const file = files[0];
    if (file.size > MAX_PHOTO) throw new InputError("Photos must be under 10 MB.");
    const buf = Buffer.from(await file.arrayBuffer());
    const kind = sniffImage(buf);
    if (!kind) throw new InputError("Upload a JPG, PNG or WebP photo.");
    const key = `clients/${profile.id}/${crypto.randomUUID()}.${kind.ext}`;
    await putObject(key, buf, kind.mime);
    await db.progressPhoto.create({
      data: { clientId: profile.id, day, pose: pose as (typeof POSES)[number], storageKey: key, mimeType: kind.mime },
    });
  } catch (e) {
    return fail(e);
  }
  revalidatePath("/app/progress");
  return { ok: true, message: "Photo uploaded. Only you and your coach can see it." };
}

export async function deletePhotoAction(fd: FormData) {
  const { profile } = await requireClient();
  const id = text(fd, "id", 64);
  const photo = await db.progressPhoto.findFirst({ where: { id, clientId: profile.id } });
  if (!photo) return;
  await db.progressPhoto.delete({ where: { id: photo.id } });
  await deleteObject(photo.storageKey);
  revalidatePath("/app/progress");
}

export async function toggleTaskAction(fd: FormData) {
  const { user, profile } = await requireClient();
  const taskId = text(fd, "taskId", 64);
  const task = await db.task.findFirst({ where: { id: taskId, clientId: profile.id } });
  if (!task) return;
  const today = todayIn(user.timezone);
  const day = task.frequency === "WEEKLY" ? startOfWeek(today) : task.frequency === "DAILY" ? today : "once";
  const existing = await db.taskCompletion.findUnique({ where: { taskId_day: { taskId, day } } });
  if (existing) await db.taskCompletion.delete({ where: { id: existing.id } });
  else await db.taskCompletion.create({ data: { taskId, day } });
  revalidatePath("/app");
}

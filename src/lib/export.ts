import "server-only";
import { zipSync, strToU8 } from "fflate";
import { db } from "./db";
import { getObject } from "./storage";

// A complete copy of one client's information (UK GDPR right of access / portability).
// Includes the coach's notes about the client, because those are the client's personal data too.

function csv(rows: (string | number | null | undefined)[][]): string {
  const cell = (v: string | number | null | undefined) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    // Quote when needed, and stop spreadsheet apps treating a cell as a formula.
    const safe = /^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s) ? `'${s}` : s;
    return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  return rows.map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n";
}

export async function buildClientExport(clientId: string): Promise<{ zip: Uint8Array; filename: string }> {
  const p = await db.clientProfile.findUniqueOrThrow({
    where: { id: clientId },
    include: {
      user: { select: { name: true, email: true, timezone: true, createdAt: true } },
      targets: { orderBy: { effectiveDay: "asc" } },
      plans: { orderBy: { createdAt: "asc" }, include: { workouts: { orderBy: { order: "asc" }, include: { exercises: { orderBy: { order: "asc" } } } } } },
      workoutLogs: { orderBy: [{ day: "asc" }, { createdAt: "asc" }], include: { sets: { orderBy: [{ exerciseKey: "asc" }, { setNumber: "asc" }] } } },
      dailyLogs: { orderBy: { day: "asc" } },
      checkIns: { orderBy: { createdAt: "asc" }, include: { replies: { orderBy: { createdAt: "asc" }, include: { author: { select: { name: true, role: true } } } } } },
      measurements: { orderBy: { day: "asc" } },
      photos: { orderBy: { day: "asc" } },
      tasks: { orderBy: { createdAt: "asc" }, include: { completions: { orderBy: { day: "asc" } } } },
      foodEntries: { orderBy: [{ day: "asc" }, { createdAt: "asc" }] },
      foods: { orderBy: { createdAt: "asc" } },
      lead: true,
    },
  });

  const exportedAt = new Date().toISOString();
  const photoFiles: Record<string, Uint8Array> = {};
  const photos = [];
  for (const ph of p.photos) {
    const ext = ph.mimeType === "image/png" ? "png" : ph.mimeType === "image/webp" ? "webp" : "jpg";
    const name = `photos/${ph.day}-${ph.pose.toLowerCase()}-${ph.id.slice(-6)}.${ext}`;
    const bytes = await getObject(ph.storageKey);
    if (bytes) photoFiles[name] = new Uint8Array(bytes);
    photos.push({ day: ph.day, pose: ph.pose, file: bytes ? name : null, uploadedAt: ph.createdAt });
  }

  const data = {
    exportedAt,
    account: { name: p.user.name, email: p.user.email, timezone: p.user.timezone, createdAt: p.user.createdAt },
    coaching: {
      goal: p.goal,
      startDay: p.startDay,
      checkInFrequency: p.checkInFrequency,
      checkInWeekday: p.checkInWeekday,
      checkInMonthDay: p.checkInMonthDay,
      active: p.active,
      healthConsentAt: p.healthConsentAt,
      termsAcceptedAt: p.termsAcceptedAt,
      nutritionPlan: p.nutritionNotes,
      coachNotes: p.coachNotes,
    },
    nutritionTargets: p.targets.map(({ calories, proteinG, carbsG, fatG, stepGoal, effectiveDay }) => ({ effectiveDay, calories, proteinG, carbsG, fatG, stepGoal })),
    trainingPlans: p.plans.map((pl) => ({
      name: pl.name,
      notes: pl.notes,
      workoutsPerWeek: pl.workoutsPerWeek,
      active: pl.active,
      createdAt: pl.createdAt,
      workouts: pl.workouts.map((w) => ({ name: w.name, notes: w.notes, exercises: w.exercises.map(({ name, sets, reps, notes }) => ({ name, sets, reps, notes })) })),
    })),
    workoutLogs: p.workoutLogs.map((w) => ({ day: w.day, name: w.name, notes: w.notes, sets: w.sets.map(({ exerciseName, setNumber, weightKg, reps }) => ({ exercise: exerciseName, set: setNumber, weightKg, reps })) })),
    dailyLogs: p.dailyLogs.map(({ day, weightKg, calories, proteinG, carbsG, fatG, steps }) => ({ day, weightKg, calories, proteinG, carbsG, fatG, steps })),
    checkIns: p.checkIns.map((c) => ({
      day: c.day,
      type: c.type,
      bodyWeightKg: c.bodyWeightKg,
      sleepHours: c.sleepHours,
      sleepQuality: c.sleepQuality,
      energy: c.energy,
      trainingRating: c.trainingRating,
      trainingNotes: c.trainingNotes,
      nutritionRating: c.nutritionRating,
      nutritionNotes: c.nutritionNotes,
      wins: c.wins,
      struggles: c.struggles,
      questions: c.questions,
      replies: c.replies.map((r) => ({ from: r.author.role === "COACH" ? "Coach" : r.author.name, at: r.createdAt, message: r.body })),
    })),
    measurements: p.measurements.map(({ day, chestCm, waistCm, hipsCm, armCm, thighCm, neckCm, notes }) => ({ day, chestCm, waistCm, hipsCm, armCm, thighCm, neckCm, notes })),
    progressPhotos: photos,
    application: p.lead
      ? (({ name, email, phone, instagram, goal, experience, daysPerWeek, trainsAt, about, injuries, health, healthDetails, heardFrom, consentAt, createdAt }) => ({
          appliedAt: createdAt,
          name,
          email,
          phone,
          instagram,
          goal,
          experience,
          daysPerWeek,
          trainsAt,
          about,
          injuries,
          healthAnswers: health,
          healthDetails,
          heardFrom,
          consentAt,
        }))(p.lead)
      : null,
    foodDiary: p.foodEntries.map(({ day, meal, name, brand, amount, unit, kcal, proteinG, carbsG, fatG }) => ({ day, meal, name, brand, amount, unit, kcal, proteinG, carbsG, fatG })),
    myFoods: p.foods.map(({ name, brand, barcode, unit, kcal, proteinG, carbsG, fatG, servingG, servingLabel }) => ({ name, brand, barcode, per100: unit, kcal, proteinG, carbsG, fatG, servingG, servingLabel })),
    tasks: p.tasks.map((t) => ({ title: t.title, notes: t.notes, frequency: t.frequency, dueDay: t.dueDay, active: t.active, completedOn: t.completions.map((c) => c.day) })),
  };

  const files: Record<string, Uint8Array> = {
    "README.txt": strToU8(
      [
        `Coached by ABZ: a copy of your information`,
        `Exported ${exportedAt}`,
        ``,
        `data.json          Everything, in one file`,
        `daily-log.csv      Weight, calories, macros and steps by day (opens in Excel, Numbers or Google Sheets)`,
        `workouts.csv       Every logged set`,
        `check-ins.csv      Your check-ins`,
        `measurements.csv   Body measurements`,
        `food-diary.csv     Every food you logged`,
        `photos/            Your progress photos`,
        ``,
        `Questions? Email ablofe1@gmail.com`,
      ].join("\r\n"),
    ),
    "data.json": strToU8(JSON.stringify(data, null, 2)),
    "daily-log.csv": strToU8(csv([["day", "weight_kg", "calories", "protein_g", "carbs_g", "fat_g", "steps"], ...data.dailyLogs.map((d) => [d.day, d.weightKg, d.calories, d.proteinG, d.carbsG, d.fatG, d.steps])])),
    "workouts.csv": strToU8(csv([["day", "workout", "exercise", "set", "weight_kg", "reps"], ...data.workoutLogs.flatMap((w) => w.sets.map((s) => [w.day, w.name, s.exercise, s.set, s.weightKg, s.reps]))])),
    "check-ins.csv": strToU8(
      csv([
        ["day", "type", "weight_kg", "sleep_hours", "sleep_quality", "energy", "training", "training_notes", "nutrition", "nutrition_notes", "wins", "struggles", "questions"],
        ...data.checkIns.map((c) => [c.day, c.type, c.bodyWeightKg, c.sleepHours, c.sleepQuality, c.energy, c.trainingRating, c.trainingNotes, c.nutritionRating, c.nutritionNotes, c.wins, c.struggles, c.questions]),
      ]),
    ),
    "food-diary.csv": strToU8(
      csv([["day", "meal", "food", "brand", "amount", "unit", "kcal", "protein_g", "carbs_g", "fat_g"], ...data.foodDiary.map((e) => [e.day, e.meal, e.name, e.brand, e.amount, e.unit, e.kcal, e.proteinG, e.carbsG, e.fatG])]),
    ),
    "measurements.csv": strToU8(csv([["day", "chest_cm", "waist_cm", "hips_cm", "arm_cm", "thigh_cm", "neck_cm", "notes"], ...data.measurements.map((m) => [m.day, m.chestCm, m.waistCm, m.hipsCm, m.armCm, m.thighCm, m.neckCm, m.notes])])),
    ...photoFiles,
  };
  // Photos are already compressed, so store them as-is; compress the text files.
  const zip = zipSync(
    Object.fromEntries(Object.entries(files).map(([k, v]) => [k, [v, { level: k.startsWith("photos/") ? 0 : 6 }]])) as Parameters<typeof zipSync>[0],
  );
  const slug = p.user.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "client";
  return { zip, filename: `coached-by-abz-${slug}-${exportedAt.slice(0, 10)}.zip` };
}

export function zipResponse({ zip, filename }: { zip: Uint8Array; filename: string }) {
  return new Response(zip as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

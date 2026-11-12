// Demo/test data: one coach, two clients with ~95 days of realistic logs.
// Never run this against production. It wipes the demo accounts it creates.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();
const TZ = "Europe/London";
const today = new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
const add = (d: string, n: number) => {
  const x = new Date(d + "T00:00:00Z");
  x.setUTCDate(x.getUTCDate() + n);
  return x.toISOString().slice(0, 10);
};
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

export const DEMO = {
  coach: { email: "coach@demo.coachedbyabz.com", password: "coach-demo-pass-1" },
  alex: { email: "alex@demo.coachedbyabz.com", password: "alex-demo-pass-1" },
  sam: { email: "sam@demo.coachedbyabz.com", password: "sam-demo-pass-1" },
};

async function main() {
  await db.user.deleteMany({ where: { email: { in: [DEMO.alex.email, DEMO.sam.email] } } });
  await db.user.deleteMany({ where: { email: DEMO.coach.email } });
  const coach = await db.user.create({
    data: { email: DEMO.coach.email, name: "ABZ", role: "COACH", timezone: TZ, passwordHash: await bcrypt.hash(DEMO.coach.password, 10) },
  });

  const upper = await db.workoutTemplate.create({
    data: {
      coachId: coach.id,
      name: "Upper A",
      notes: "Warm up 5 min. Rest 2-3 min on compounds, 90s on accessories.",
      exercises: {
        create: [
          { order: 0, name: "Bench Press", sets: 3, reps: "6-8", notes: "Shoulder blades pinned, feet planted. Last set 1-2 reps in reserve." },
          { order: 1, name: "Chest-Supported Row", sets: 3, reps: "8-10", notes: "Pause at the top." },
          { order: 2, name: "Seated DB Shoulder Press", sets: 3, reps: "8-12", notes: "" },
          { order: 3, name: "Lat Pulldown", sets: 3, reps: "10-12", notes: "Drive elbows to hips." },
        ],
      },
    },
  });
  const lower = await db.workoutTemplate.create({
    data: {
      coachId: coach.id,
      name: "Lower A",
      notes: "Brace before every rep.",
      exercises: {
        create: [
          { order: 0, name: "Back Squat", sets: 3, reps: "5-6", notes: "Hit depth, control the descent." },
          { order: 1, name: "Romanian Deadlift", sets: 3, reps: "8-10", notes: "Soft knees, push hips back." },
          { order: 2, name: "Leg Press", sets: 3, reps: "10-12", notes: "" },
          { order: 3, name: "Standing Calf Raise", sets: 3, reps: "12-15", notes: "Full stretch at the bottom." },
        ],
      },
    },
  });

  for (const [key, who] of [["alex", { name: "Alex Turner", goal: "FAT_LOSS" as const, startW: 92.4, trend: -0.045, cal: 2410 }], ["sam", { name: "Sam Patel", goal: "MUSCLE_GAIN" as const, startW: 68.1, trend: 0.02, cal: 2900 }]] as const) {
    const creds = DEMO[key];
    const start = add(today, -95);
    const user = await db.user.create({
      data: {
        email: creds.email,
        name: who.name,
        role: "CLIENT",
        timezone: TZ,
        passwordHash: await bcrypt.hash(creds.password, 10),
        clientProfile: { create: { coachId: coach.id, startDay: start, goal: who.goal, checkInWeekday: 0, nutritionNotes: "3-4 meals a day, protein in every meal. 2-3L water. Plan weekends ahead." } },
      },
      include: { clientProfile: true },
    });
    const cp = user.clientProfile!;
    await db.nutritionTarget.create({ data: { clientId: cp.id, calories: who.cal + 150, proteinG: 180, fatG: 75, carbsG: Math.floor((who.cal + 150 - 720 - 675) / 4), stepGoal: 8000, effectiveDay: start } });
    await db.nutritionTarget.create({ data: { clientId: cp.id, calories: who.cal, proteinG: 185, fatG: 70, carbsG: Math.floor((who.cal - 740 - 630) / 4), stepGoal: 9000, effectiveDay: add(today, -40) } });

    const plan = await db.trainingPlan.create({ data: { clientId: cp.id, name: "Upper / Lower", workoutsPerWeek: 4, notes: "Add weight when you hit the top of the rep range on every set." } });
    const pws = [];
    for (const [i, t] of [upper, lower].entries()) {
      const ex = await db.templateExercise.findMany({ where: { templateId: t.id }, orderBy: { order: "asc" } });
      pws.push(await db.planWorkout.create({ data: { planId: plan.id, order: i, name: t.name, notes: t.notes, exercises: { create: ex.map(({ name, sets, reps, notes, order }) => ({ name, sets, reps, notes, order })) } }, include: { exercises: true } }));
    }

    const base: Record<string, number> = { "Bench Press": 70, "Chest-Supported Row": 50, "Seated DB Shoulder Press": 22, "Lat Pulldown": 55, "Back Squat": 90, "Romanian Deadlift": 80, "Leg Press": 160, "Standing Calf Raise": 60 };
    let w = who.startW;
    let rot = 0;
    for (let i = 95; i >= 0; i--) {
      const day = add(today, -i);
      w += who.trend + (rnd() - 0.5) * 0.35;
      const skip = rnd() < 0.18; // unlogged days → gaps
      if (!skip) {
        const cal = Math.round(who.cal + (rnd() - 0.45) * 600);
        await db.dailyLog.create({
          data: {
            clientId: cp.id,
            day,
            weightKg: rnd() < 0.75 ? Math.round(w * 10) / 10 : null,
            calories: cal,
            proteinG: Math.round(170 + (rnd() - 0.4) * 50),
            carbsG: Math.round((cal * 0.45) / 4),
            fatG: Math.round((cal * 0.27) / 9),
            steps: rnd() < 0.9 ? Math.round(9000 + (rnd() - 0.5) * 6000) : null,
          },
        });
      }
      const wd = new Date(day + "T00:00:00Z").getUTCDay();
      if ([1, 2, 4, 5].includes(wd) && rnd() < 0.85 && i > 0) {
        const pw = pws[rot++ % 2];
        const prog = (95 - i) / 95;
        await db.workoutLog.create({
          data: {
            clientId: cp.id,
            planWorkoutId: pw.id,
            name: pw.name,
            day,
            sets: {
              create: pw.exercises.flatMap((e) =>
                [1, 2, 3].map((n) => ({
                  exerciseName: e.name,
                  exerciseKey: e.name.toLowerCase(),
                  setNumber: n,
                  weightKg: Math.round((base[e.name] * (1 + prog * 0.15)) / 2.5) * 2.5,
                  reps: 8 - (n === 3 ? 1 : 0),
                })),
              ),
            },
          },
        });
      }
    }
    for (const [i, d] of [28, 21, 14, 7].entries()) {
      const ci = await db.checkIn.create({
        data: {
          clientId: cp.id,
          type: "WEEKLY",
          day: add(today, -d),
          bodyWeightKg: Math.round((who.startW + who.trend * (95 - d)) * 10) / 10,
          sleepHours: 7,
          sleepQuality: 3 + (i % 2),
          energy: 4,
          trainingRating: 4,
          trainingNotes: "Hit all sessions. Squat felt strong.",
          nutritionRating: 3 + (i % 2),
          nutritionNotes: "Weekend was harder, ate out Saturday.",
          wins: "New PB on bench!",
          struggles: "Late shifts made steps hard midweek.",
          createdAt: new Date(Date.now() - d * 86400000),
        },
      });
      if (i < 3) await db.checkInReply.create({ data: { checkInId: ci.id, authorId: coach.id, body: "Great week. Keep protein high on the weekend and try a 15-minute walk after dinner on shift days." } });
    }
    await db.measurement.create({ data: { clientId: cp.id, day: add(today, -90), chestCm: 104, waistCm: 96, hipsCm: 104, armCm: 36, thighCm: 60, neckCm: 40 } });
    await db.measurement.create({ data: { clientId: cp.id, day: add(today, -45), chestCm: 103, waistCm: 93, hipsCm: 102.5, armCm: 36.5, thighCm: 59.5, neckCm: 39.5 } });
    await db.measurement.create({ data: { clientId: cp.id, day: add(today, -3), chestCm: 102.5, waistCm: 90.5, hipsCm: 101, armCm: 37, thighCm: 59, neckCm: 39 } });
    await db.task.create({ data: { clientId: cp.id, title: "Drink 3L of water", frequency: "DAILY" } });
    await db.task.create({ data: { clientId: cp.id, title: "Take progress photos", frequency: "ONCE", dueDay: add(today, 3) } });
  }
  console.log("Seeded demo coach + 2 clients.");
  console.log(DEMO);
}

main().finally(() => db.$disconnect());

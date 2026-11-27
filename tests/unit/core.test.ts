import { describe, expect, it } from "vitest";
import { calculateMacros } from "@/lib/macros";
import { checkInStatus } from "@/lib/checkin-schedule";
import { weekSummary, adherence, targetOn, type DayPoint } from "@/lib/metrics";
import { addDays, startOfWeek } from "@/lib/dates";

describe("macro calculator", () => {
  it("fills remaining calories with carbs", () => {
    const r = calculateMacros({ calories: 2410, proteinG: 185, fatG: 70 });
    // 2410 - 740 - 630 = 1040 kcal → 260 g
    expect(r.carbsG).toBe(260);
    expect(r.errors).toEqual([]);
  });
  it("rejects protein + fat over the calorie target", () => {
    const r = calculateMacros({ calories: 1500, proteinG: 250, fatG: 80 });
    expect(r.errors[0]).toMatch(/over the target/);
    expect(r.carbsG).toBe(0);
  });
});

describe("check-in schedule", () => {
  const s = { frequency: "WEEKLY" as const, weekday: 0, monthDay: 1, startDay: "2026-10-01" };
  it("is overdue when the last Sunday was missed", () => {
    // 2026-11-12 is a Thursday; last Sunday was 8 Nov
    expect(checkInStatus(s, "2026-11-12", "2026-11-01")).toMatchObject({ dueDay: "2026-11-08", state: "overdue" });
  });
  it("rolls forward once submitted (including up to 2 days early)", () => {
    expect(checkInStatus(s, "2026-11-12", "2026-11-06").dueDay).toBe("2026-11-15");
  });
  it("doesn't make a brand-new client overdue", () => {
    expect(checkInStatus({ ...s, startDay: "2026-11-10" }, "2026-11-12", null).dueDay).toBe("2026-11-15");
  });
  it("supports monthly schedules", () => {
    const m = { ...s, frequency: "MONTHLY" as const, monthDay: 1 };
    expect(checkInStatus(m, "2026-11-12", "2026-10-31").dueDay).toBe("2026-12-01");
  });
});

const pt = (day: string, p: Partial<DayPoint> = {}): DayPoint => ({
  day, weightKg: null, calories: null, proteinG: null, carbsG: null, fatG: null, steps: null, workouts: 0,
  target: { calories: 2000, proteinG: 150, carbsG: 200, fatG: 60, stepGoal: 8000 }, ...p,
});

describe("this week so far", () => {
  const today = "2026-11-12"; // Thursday
  const mon = startOfWeek(today);
  it("compares the same weekdays and ignores unlogged days", () => {
    const pts = [
      pt(addDays(mon, -7), { calories: 1800, steps: 5000 }), // last Mon
      pt(addDays(mon, -6), { calories: 2200 }),
      pt(addDays(mon, -4), { calories: 9999 }), // last Thu (included)
      pt(addDays(mon, -3), { calories: 5000 }), // last Fri (excluded)
      pt(mon, { calories: 2100, steps: 9000, workouts: 1 }),
      pt(addDays(mon, 1)), // unlogged → not a zero
      pt(addDays(mon, 3), { calories: 1900, workouts: 1 }),
    ];
    const w = weekSummary(pts, today, 4);
    expect(w.days).toBe(4);
    expect(w.calories.thisWeek).toBe(2000);
    expect(w.calories.lastWeek).toBeCloseTo((1800 + 2200 + 9999) / 3);
    expect(w.steps.thisWeek).toBe(9000);
    expect(w.workouts).toEqual({ done: 2, assigned: 4, lastWeekDone: 0 });
  });
  it("adherence only counts logged days", () => {
    const a = adherence([pt("2026-11-10", { calories: 2050 }), pt("2026-11-11"), pt("2026-11-12", { calories: 2600 })], 3, 3);
    expect(a.caloriesHit).toBe(50);
  });
  it("uses the target in force on each day", () => {
    const rows = [
      { effectiveDay: "2026-10-01", calories: 2500, proteinG: 1, carbsG: 1, fatG: 1, stepGoal: 1 },
      { effectiveDay: "2026-11-01", calories: 2200, proteinG: 1, carbsG: 1, fatG: 1, stepGoal: 1 },
    ];
    expect(targetOn(rows, "2026-10-15")?.calories).toBe(2500);
    expect(targetOn(rows, "2026-11-05")?.calories).toBe(2200);
  });
});

import { shouldRemind } from "@/lib/reminder-rules";

describe("check-in reminders", () => {
  const due = (daysUntil: number) => ({ dueDay: "2026-11-29", daysUntil, state: "upcoming" as const });
  it("reminds the day before, from 9am, once per due date", () => {
    expect(shouldRemind(due(1), 9, null)).toBe(true);
    expect(shouldRemind(due(1), 8, null)).toBe(false); // too early in the morning
    expect(shouldRemind(due(1), 14, "2026-11-29")).toBe(false); // already reminded
    expect(shouldRemind(due(1), 14, "2026-11-22")).toBe(true); // last week's doesn't count
  });
  it("doesn't remind on other days", () => {
    expect(shouldRemind(due(0), 12, null)).toBe(false);
    expect(shouldRemind(due(3), 12, null)).toBe(false);
  });
});

import crypto from "node:crypto";
import webpush from "web-push";

describe("phone notifications", () => {
  it("builds a real encrypted Web Push request with our keys", () => {
    const ecdh = crypto.createECDH("prime256v1");
    ecdh.generateKeys();
    const sub = {
      endpoint: "https://fcm.googleapis.com/fcm/send/abc123",
      keys: { p256dh: ecdh.getPublicKey().toString("base64url"), auth: crypto.randomBytes(16).toString("base64url") },
    };
    const vapid = webpush.generateVAPIDKeys();
    const req = webpush.generateRequestDetails(sub, JSON.stringify({ title: "Test", body: "Hi", url: "/app" }), {
      vapidDetails: { subject: "https://coachedbyabz.com", publicKey: vapid.publicKey, privateKey: vapid.privateKey },
      TTL: 60,
    });
    expect(req.method).toBe("POST");
    expect(String(req.headers.Authorization)).toMatch(/^vapid t=.+, k=/);
    expect(req.headers["Content-Encoding"]).toBe("aes128gcm");
    expect((req.body as Buffer).length).toBeGreaterThan(40);
  });
});

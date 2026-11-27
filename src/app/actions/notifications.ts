"use server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { pushService, sendPush } from "@/lib/push";

const subSchema = z.object({
  endpoint: z.string().url().max(1000).refine((u) => u.startsWith("https://"), "Push address must be https"),
  keys: z.object({ p256dh: z.string().min(20).max(200), auth: z.string().min(8).max(100) }),
});

type Result = { ok: true } | { ok: false; error: string };

/** Saves this device's notification address for the signed-in person. */
export async function savePushSubscriptionAction(sub: unknown): Promise<Result> {
  const user = await requireUser();
  const parsed = subSchema.safeParse(sub);
  if (!parsed.success) return { ok: false, error: "This device's notification details weren't valid." };
  const { endpoint, keys } = parsed.data;
  // A device belongs to whoever turned notifications on last.
  await db.pushSubscription.upsert({
    where: { endpoint },
    create: { userId: user.id, endpoint, p256dh: keys.p256dh, auth: keys.auth },
    update: { userId: user.id, p256dh: keys.p256dh, auth: keys.auth },
  });
  return { ok: true };
}

export async function removePushSubscriptionAction(endpoint: string): Promise<Result> {
  const user = await requireUser();
  await db.pushSubscription.deleteMany({ where: { endpoint: String(endpoint), userId: user.id } });
  return { ok: true };
}

type TestResult = { ok: true; message: string } | { ok: false; error: string; expired?: boolean };

/** Sends a test to this device (or all of this person's devices) and reports what the push service said. */
export async function sendTestPushAction(endpoint?: string): Promise<TestResult> {
  const user = await requireUser();
  const where = { userId: user.id, ...(typeof endpoint === "string" && endpoint ? { endpoint } : {}) };
  if (!(await db.pushSubscription.count({ where })))
    return { ok: false, error: "Notifications aren't on for this device yet. Tap Turn off, then turn them on again." };
  const out = await sendPush(
    [{ userId: user.id, url: user.role === "COACH" ? "/coach" : "/app" }],
    { title: "Coached by ABZ", body: "Notifications are working. 💪", tag: "test" },
    { endpoint: where.endpoint },
  );
  if (out.sent > 0) {
    const service = endpoint ? pushService(endpoint) : "the push service";
    return { ok: true, message: `Sent, and ${service} accepted it. It should arrive in a few seconds.` };
  }
  if (out.removed > 0)
    return { ok: false, expired: true, error: "This device's notification address had expired. Tap Turn on notifications to set it up again." };
  const f = out.failed[0];
  return {
    ok: false,
    error: f ? `Not delivered: ${f.service} said “${f.reason}”${f.status ? ` (${f.status})` : ""}.` : "Not delivered. Try again in a minute.",
  };
}

export async function setCommunityNotifyAction(value: string): Promise<Result> {
  const user = await requireUser();
  if (!["all", "coach", "off"].includes(value)) return { ok: false, error: "Unknown setting." };
  await db.communityMember.updateMany({ where: { userId: user.id }, data: { notify: value } });
  return { ok: true };
}

import "server-only";
import fs from "node:fs/promises";
import webpush from "web-push";
import { db } from "./db";
import { vapidPairMatches, vapidSubject } from "./vapid";
import { PRIVACY_CONTACT } from "@/content/privacy";

// Phone notifications (Web Push). Keys are made automatically the first time and kept in the database,
// unless VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY are set. A stored pair that doesn't belong together is
// replaced (and the devices signed up with it are cleared, so they can turn notifications on again). PUSH_DEV_LOG=<file> writes notifications to a file
// instead of sending them (used by the automated tests).

export type PushPayload = { title: string; body: string; url: string; tag?: string };

let keys: Promise<{ publicKey: string; privateKey: string }> | null = null;

async function loadKeys() {
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    const env = { publicKey: process.env.VAPID_PUBLIC_KEY.trim(), privateKey: process.env.VAPID_PRIVATE_KEY.trim() };
    if (!vapidPairMatches(env)) console.error("Push: VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY don't belong together; notifications will be refused.");
    return env;
  }
  const read = async () => {
    const rows = await db.siteSetting.findMany({ where: { key: { in: ["vapidPublic", "vapidPrivate"] } } });
    const m = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    return m.vapidPublic && m.vapidPrivate ? { publicKey: m.vapidPublic, privateKey: m.vapidPrivate } : null;
  };
  const existing = await read();
  if (existing && vapidPairMatches(existing)) return { publicKey: existing.publicKey.trim(), privateKey: existing.privateKey.trim() };
  const fresh = webpush.generateVAPIDKeys();
  if (existing) {
    // The saved keys don't belong together, so every notification would be refused. Replace them,
    // unless another server got there first, and clear the devices that signed up with the old key.
    console.error("Push: saved notification keys didn't match; replacing them. Devices need to turn notifications on again.");
    const replaced = await db.$transaction(async (tx) => {
      const r = await tx.siteSetting.updateMany({ where: { key: "vapidPublic", value: existing.publicKey }, data: { value: fresh.publicKey } });
      if (r.count === 0) return false;
      await tx.siteSetting.update({ where: { key: "vapidPrivate" }, data: { value: fresh.privateKey } });
      await tx.pushSubscription.deleteMany({});
      return true;
    });
    if (replaced) return fresh;
  } else {
    try {
      await db.$transaction([
        db.siteSetting.create({ data: { key: "vapidPublic", value: fresh.publicKey } }),
        db.siteSetting.create({ data: { key: "vapidPrivate", value: fresh.privateKey } }),
      ]);
      return fresh;
    } catch {
      /* another request made them at the same moment: use those */
    }
  }
  const again = await read();
  if (again && vapidPairMatches(again)) return again;
  throw new Error("Couldn't set up notification keys");
}

export function vapidKeys() {
  if (!keys) keys = loadKeys().catch((e) => {
    keys = null;
    throw e;
  });
  return keys;
}

export async function vapidPublicKey() {
  return (await vapidKeys()).publicKey;
}

// Who the notifications are from, as Apple and Google see it: VAPID_SUBJECT if set, otherwise the
// business contact email. Apple rejects anything that isn't a clean https: URL or mailto: address.
const SUBJECT = vapidSubject(process.env.VAPID_SUBJECT, PRIVACY_CONTACT);

export type PushOutcome = { sent: number; removed: number; failed: { service: string; status?: number; reason: string }[] };

/** Which company runs a device's push address, in words a person would recognise. */
export function pushService(endpoint: string) {
  const host = (() => {
    try {
      return new URL(endpoint).hostname;
    } catch {
      return "";
    }
  })();
  if (host.endsWith("push.apple.com")) return "Apple";
  if (host.endsWith("googleapis.com")) return "Google";
  if (host.endsWith("mozilla.com")) return "Mozilla";
  if (host.endsWith("notify.windows.com")) return "Microsoft";
  return host || "the push service";
}

function reasonOf(e: unknown) {
  const err = e as { body?: string; message?: string };
  const body = typeof err.body === "string" ? err.body.trim() : "";
  if (body) {
    try {
      const j = JSON.parse(body) as { reason?: string; error?: { message?: string } };
      if (j.reason) return j.reason;
      if (j.error?.message) return j.error.message;
    } catch {
      /* not JSON */
    }
    return body.slice(0, 160);
  }
  return (err.message || "no answer").slice(0, 160);
}

/**
 * Sends one notification to every device of each person (or just `only.endpoint`). Never throws.
 * Devices that have turned notifications off (or uninstalled the app) are removed.
 * Returns what the push services said, so a test can report it.
 */
export async function sendPush(
  recipients: { userId: string; url: string }[],
  payload: Omit<PushPayload, "url">,
  only?: { endpoint?: string },
): Promise<PushOutcome> {
  const outcome: PushOutcome = { sent: 0, removed: 0, failed: [] };
  if (recipients.length === 0) return outcome;
  try {
    const subs = await db.pushSubscription.findMany({
      where: { userId: { in: recipients.map((r) => r.userId) }, ...(only?.endpoint ? { endpoint: only.endpoint } : {}) },
    });
    if (subs.length === 0) return outcome;
    const urlFor = new Map(recipients.map((r) => [r.userId, r.url]));
    const { publicKey, privateKey } = await vapidKeys();
    await Promise.all(
      subs.map(async (s) => {
        const body: PushPayload = { ...payload, url: urlFor.get(s.userId) ?? "/" };
        try {
          if (process.env.PUSH_DEV_LOG) {
            if (s.endpoint.includes("/expired/")) throw Object.assign(new Error("gone"), { statusCode: 410 });
            if (s.endpoint.includes("/refused/")) throw Object.assign(new Error("Received unexpected response code"), { statusCode: 403, body: '{"reason":"BadJwtToken"}' });
            await fs.appendFile(process.env.PUSH_DEV_LOG, JSON.stringify({ userId: s.userId, endpoint: s.endpoint, ...body }) + "\n");
          } else {
            await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(body), {
              vapidDetails: { subject: SUBJECT, publicKey, privateKey },
              TTL: 24 * 3600,
              // "high" asks Apple/Google to deliver straight away; lower urgencies can be held back to save battery.
              urgency: "high",
              timeout: 10_000,
            });
          }
          outcome.sent++;
        } catch (e) {
          const status = (e as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) {
            await db.pushSubscription.deleteMany({ where: { id: s.id } });
            outcome.removed++;
          } else {
            const failure = { service: pushService(s.endpoint), status, reason: reasonOf(e) };
            outcome.failed.push(failure);
            console.error("Push failed", failure);
          }
        }
      }),
    );
  } catch (e) {
    console.error("Push failed", e);
    outcome.failed.push({ service: "this server", reason: reasonOf(e) });
  }
  return outcome;
}

/** Where a notification should open for this person. */
export function portalUrl(isCoach: boolean, clientPath: string, coachPath: string) {
  return isCoach ? coachPath : clientPath;
}

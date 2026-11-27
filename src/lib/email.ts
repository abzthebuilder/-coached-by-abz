// Sends email through Resend (https://resend.com) when RESEND_API_KEY and EMAIL_FROM are set.
// With neither set, emails are switched off and the app works exactly as before (links are copied by hand).
// EMAIL_DEV_LOG=<file> writes emails to a file instead of sending them; used by the automated tests.
import fs from "node:fs/promises";

export type Email = { to: string; subject: string; text: string; html: string };

/** A Railway value with any stray spaces, line breaks or wrapping quotes removed. */
function setting(name: string) {
  return (process.env[name] ?? "").trim().replace(/^(["'])(.*)\1$/, "$2").trim();
}

const ADDRESS = /^[^\s<>@"]+@[^\s<>@"]+\.[a-z]{2,}$/i;

/** What's set up for email, in plain words, for the coach's Settings page. */
export function emailSetup(): { on: boolean; from: string; replyTo: string; problems: string[] } {
  const key = setting("RESEND_API_KEY");
  const from = setting("EMAIL_FROM");
  const replyTo = setting("EMAIL_REPLY_TO");
  const problems: string[] = [];
  if (!key) problems.push("RESEND_API_KEY isn't set in Railway.");
  else if (!key.startsWith("re_")) problems.push("RESEND_API_KEY doesn't look like a Resend key (they start with re_).");
  if (!from) problems.push("EMAIL_FROM isn't set in Railway.");
  else {
    const addr = from.match(/<([^>]+)>\s*$/)?.[1] ?? from;
    if (!ADDRESS.test(addr.trim())) problems.push("EMAIL_FROM should look like: Coached by ABZ <coach@coachedbyabz.com>");
  }
  if (replyTo && !ADDRESS.test(replyTo)) problems.push("EMAIL_REPLY_TO should be just an email address.");
  return { on: Boolean(key && from), from, replyTo, problems };
}

export function emailEnabled(): boolean {
  return Boolean((setting("RESEND_API_KEY") && setting("EMAIL_FROM")) || process.env.EMAIL_DEV_LOG);
}

/** Sends an email and says what happened. Never throws. */
export async function deliverEmail(email: Email): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    if (process.env.EMAIL_DEV_LOG) {
      if (email.to.includes("@refused.test")) return { ok: false, error: "The coachedbyabz.com domain is not verified." };
      await fs.appendFile(process.env.EMAIL_DEV_LOG, JSON.stringify({ ...email, at: new Date().toISOString() }) + "\n");
      return { ok: true };
    }
    const key = setting("RESEND_API_KEY");
    const from = setting("EMAIL_FROM");
    if (!key || !from) return { ok: false, error: "Emails aren't set up yet." };
    const replyTo = setting("EMAIL_REPLY_TO");
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [email.to],
        subject: email.subject,
        text: email.text,
        html: email.html,
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      const body = (await res.text()).slice(0, 300);
      console.error("Email failed", res.status, body);
      let message = body;
      try {
        message = (JSON.parse(body) as { message?: string }).message || body;
      } catch {
        /* not JSON */
      }
      return { ok: false, error: `${message || "No reason given"} (${res.status})` };
    }
    return { ok: true };
  } catch (e) {
    console.error("Email failed", e);
    return { ok: false, error: e instanceof Error ? e.message : "Couldn't reach Resend" };
  }
}

/** Returns true if the email was sent (or logged). Never throws: an email problem must not break the action. */
export async function sendEmail(email: Email): Promise<boolean> {
  return (await deliverEmail(email)).ok;
}

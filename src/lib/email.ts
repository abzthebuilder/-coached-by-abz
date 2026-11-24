// Sends email through Resend (https://resend.com) when RESEND_API_KEY and EMAIL_FROM are set.
// With neither set, emails are switched off and the app works exactly as before (links are copied by hand).
// EMAIL_DEV_LOG=<file> writes emails to a file instead of sending them; used by the automated tests.
import fs from "node:fs/promises";

export type Email = { to: string; subject: string; text: string; html: string };

export function emailEnabled(): boolean {
  return Boolean((process.env.RESEND_API_KEY && process.env.EMAIL_FROM) || process.env.EMAIL_DEV_LOG);
}

/** Returns true if the email was sent (or logged). Never throws: an email problem must not break the action. */
export async function sendEmail(email: Email): Promise<boolean> {
  try {
    if (process.env.EMAIL_DEV_LOG) {
      await fs.appendFile(process.env.EMAIL_DEV_LOG, JSON.stringify({ ...email, at: new Date().toISOString() }) + "\n");
      return true;
    }
    if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) return false;
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to: [email.to],
        subject: email.subject,
        text: email.text,
        html: email.html,
        ...(process.env.EMAIL_REPLY_TO ? { reply_to: process.env.EMAIL_REPLY_TO } : {}),
      }),
    });
    if (!res.ok) {
      console.error("Email failed", res.status, (await res.text()).slice(0, 300));
      return false;
    }
    return true;
  } catch (e) {
    console.error("Email failed", e);
    return false;
  }
}

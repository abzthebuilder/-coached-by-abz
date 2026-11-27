"use server";
import { requireCoach } from "@/lib/auth";
import { deliverEmail, emailSetup } from "@/lib/email";
import { emails } from "@/lib/email-templates";
import { siteUrl } from "@/lib/request-url";

/** Sends the coach a test email and reports what Resend said. */
export async function sendTestEmailAction(): Promise<{ ok: true; message: string } | { ok: false; error: string }> {
  const coach = await requireCoach();
  const setup = emailSetup();
  if (!setup.on && !process.env.EMAIL_DEV_LOG) return { ok: false, error: setup.problems[0] ?? "Emails aren't set up yet." };
  const res = await deliverEmail(emails.test(coach.email, `${await siteUrl()}/coach`));
  if (res.ok) return { ok: true, message: `Sent to ${coach.email}. Check your inbox (and spam) in a minute.` };
  return { ok: false, error: `Not sent: Resend said “${res.error}”` };
}

"use server";
import { headers } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/db";
import { loginThrottled, recordLoginFailure } from "@/lib/auth";
import { fail, InputError, text } from "@/lib/parse";
import { emailEnabled, sendEmail } from "@/lib/email";
import { emails } from "@/lib/email-templates";
import { siteUrl } from "@/lib/request-url";
import { after } from "next/server";
import { sendPush } from "@/lib/push";
import { EXPERIENCE, GOALS, HEARD_FROM, TRAINS_AT } from "@/content/apply";
import type { FormState } from "@/components/form";

const oneOf = (fd: FormData, name: string, list: readonly { key: string }[], message: string) => {
  const v = text(fd, name, 40);
  if (!list.some((x) => x.key === v)) throw new InputError(message);
  return v;
};

/** Public application form. Rate-limited and protected by a hidden "honeypot" field against spam bots. */
export async function submitApplicationAction(_: FormState, fd: FormData): Promise<FormState> {
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const key = `apply|${ip}`;
  if (loginThrottled(key)) return { error: "Too many applications from this connection. Try again in 15 minutes." };
  recordLoginFailure(key); // counts every submission
  if (text(fd, "company", 200)) return { ok: true }; // bots fill in the hidden field: pretend it worked
  try {
    const name = text(fd, "name", 120);
    if (!name) throw new InputError("Enter your name.");
    const email = text(fd, "email", 200).toLowerCase();
    if (!z.string().email().safeParse(email).success) throw new InputError("Enter a valid email address.");
    // Accepts "@name", "name" or a profile link; stores just the username.
    const igRaw = text(fd, "instagram", 80)
      .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
      .replace(/[/?#].*$/, "")
      .replace(/^@/, "")
      .trim();
    if (igRaw && !/^(?!.*\.\.)[A-Za-z0-9._]{1,30}$/.test(igRaw)) throw new InputError("Check your Instagram username.");
    const instagram = igRaw.toLowerCase();
    const goal = oneOf(fd, "goal", GOALS, "Choose your main goal.");
    const experience = oneOf(fd, "experience", EXPERIENCE, "Choose your training experience.");
    const trainsAt = oneOf(fd, "trainsAt", TRAINS_AT, "Choose where you'll train.");
    const daysRaw = Number(fd.get("daysPerWeek"));
    const daysPerWeek = Number.isInteger(daysRaw) && daysRaw >= 1 && daysRaw <= 7 ? daysRaw : null;
    if (daysPerWeek === null) throw new InputError("Choose how many days a week you can train.");
    const about = text(fd, "about", 3000);
    if (about.length < 10) throw new InputError("Tell me a little about your goals.");
    if (fd.get("terms") !== "on") throw new InputError("Please confirm you're 18 or over and agree to the terms.");
    if (fd.get("consent") !== "on") throw new InputError("Please agree to me using your answers to review your application.");
    const heardRaw = text(fd, "heardFrom", 40);
    const heardFrom = (HEARD_FROM as readonly string[]).includes(heardRaw) ? heardRaw : "";

    // One coach runs this site: applications go to the original coach account.
    const coach = await db.user.findFirst({ where: { role: "COACH" }, orderBy: { createdAt: "asc" } });
    if (!coach) throw new InputError("Applications aren't open yet. Please try again soon.");
    const lead = await db.lead.create({
      data: {
        coachId: coach.id,
        name,
        email,
        instagram,
        goal,
        experience,
        daysPerWeek,
        trainsAt,
        about,
        injuries: text(fd, "injuries", 3000),
        health: {}, // the form no longer asks health-screening questions
        heardFrom,
        consentAt: new Date(),
      },
    });
    if (emailEnabled()) await sendEmail(emails.newLead(coach.email, name, `${await siteUrl()}/coach/leads/${lead.id}`));
    after(() => sendPush([{ userId: coach.id, url: `/coach/leads/${lead.id}` }], { title: "New application", body: `${name} applied for online coaching.`, tag: `lead-${lead.id}` }));
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

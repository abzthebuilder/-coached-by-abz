"use server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import {
  clearLoginFailures,
  createSession,
  destroySession,
  hashPassword,
  loginThrottled,
  passwordProblem,
  recordLoginFailure,
  sha256,
  verifyPassword,
} from "@/lib/auth";
import { DEFAULT_TZ, isValidTimezone, todayIn } from "@/lib/dates";
import type { FormState } from "@/components/form";
import { randomToken, requireUser, SESSION_COOKIE } from "@/lib/auth";
import { cookies } from "next/headers";
import { emailEnabled, sendEmail } from "@/lib/email";
import { emails } from "@/lib/email-templates";
import { siteUrl } from "@/lib/request-url";
import { z } from "zod";
import { GOALS } from "@/content/apply";

// Compared against when the email is unknown, so response time doesn't reveal which emails exist.
let dummyHash: Promise<string> | null = null;
const getDummyHash = () => (dummyHash ??= hashPassword("not-a-real-password"));

export async function loginAction(_: FormState, fd: FormData): Promise<FormState> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "");
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const key = `${email}|${ip}`;
  if (loginThrottled(key)) return { error: "Too many attempts. Try again in 15 minutes." };
  const user = await db.user.findUnique({ where: { email } });
  const ok = await verifyPassword(password, user?.passwordHash ?? (await getDummyHash()));
  if (!user || !ok) {
    recordLoginFailure(key);
    return { error: "That email and password don't match." };
  }
  clearLoginFailures(key);
  await createSession(user.id);
  redirect(user.role === "COACH" ? "/coach" : "/app");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}

async function validToken(raw: string, kind: "INVITE" | "RESET") {
  const t = await db.authToken.findUnique({ where: { tokenHash: sha256(raw) } });
  if (!t || t.kind !== kind || t.usedAt || t.expiresAt < new Date()) return null;
  return t;
}

export async function acceptInviteAction(_: FormState, fd: FormData): Promise<FormState> {
  const raw = String(fd.get("token") ?? "");
  const name = String(fd.get("name") ?? "").trim();
  const password = String(fd.get("password") ?? "");
  const confirm = String(fd.get("confirm") ?? "");
  const tzIn = String(fd.get("timezone") ?? "");
  const tz = isValidTimezone(tzIn) ? tzIn : DEFAULT_TZ;

  const invite = await validToken(raw, "INVITE");
  if (!invite) return { error: "This invite link has expired or has already been used. Ask your coach for a new one." };
  if (!name) return { error: "Enter your name." };
  const pwErr = passwordProblem(password);
  if (pwErr) return { error: pwErr };
  if (password !== confirm) return { error: "The passwords don't match." };
  if (fd.get("terms") !== "on") return { error: "Please tick the box to confirm you're 18 or over and agree to the terms." };
  if (fd.get("consent") !== "on")
    return { error: "Please tick the box to agree to the privacy policy. I can't coach you without storing your progress." };
  if (await db.user.findUnique({ where: { email: invite.email } }))
    return { error: "An account with this email already exists. Try logging in." };

  const passwordHash = await hashPassword(password);
  const user = await db.$transaction(async (tx) => {
    const claimed = await tx.authToken.updateMany({ where: { id: invite.id, usedAt: null }, data: { usedAt: new Date() } });
    if (claimed.count !== 1) throw new Error("Invite already used");
    // If they applied on the site, start from the goal they chose and keep their application with their profile.
    const lead = await tx.lead.findFirst({
      where: { email: invite.email, coachId: invite.coachId, clientId: null },
      orderBy: { createdAt: "desc" },
    });
    const goal = GOALS.find((g) => g.key === lead?.goal)?.profileGoal;
    const created = await tx.user.create({
      data: {
        email: invite.email,
        name,
        passwordHash,
        role: "CLIENT",
        timezone: tz,
        clientProfile: {
          create: { coachId: invite.coachId, startDay: todayIn(tz), healthConsentAt: new Date(), termsAcceptedAt: new Date(), ...(goal ? { goal } : {}) },
        },
      },
      include: { clientProfile: true },
    });
    if (lead && created.clientProfile)
      await tx.lead.update({ where: { id: lead.id }, data: { clientId: created.clientProfile.id, status: "ACCEPTED" } });
    return created;
  });
  await createSession(user.id);
  redirect("/app?welcome=1");
}

export async function resetPasswordAction(_: FormState, fd: FormData): Promise<FormState> {
  const raw = String(fd.get("token") ?? "");
  const password = String(fd.get("password") ?? "");
  const confirm = String(fd.get("confirm") ?? "");
  const t = await validToken(raw, "RESET");
  if (!t || !t.userId) return { error: "This reset link has expired or has already been used." };
  const pwErr = passwordProblem(password);
  if (pwErr) return { error: pwErr };
  if (password !== confirm) return { error: "The passwords don't match." };
  const passwordHash = await hashPassword(password);
  await db.$transaction([
    db.authToken.update({ where: { id: t.id }, data: { usedAt: new Date() } }),
    db.user.update({ where: { id: t.userId }, data: { passwordHash } }),
    db.session.deleteMany({ where: { userId: t.userId } }),
  ]);
  await createSession(t.userId);
  redirect("/app");
}

const RESET_HOURS = 2;

/**
 * Self-service password reset. Always gives the same answer, whether or not the email has an account,
 * so the form can't be used to find out who's a client.
 */
export async function forgotPasswordAction(_: FormState, fd: FormData): Promise<FormState> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  if (!z.string().email().safeParse(email).success) return { error: "Enter a valid email address." };
  if (!emailEnabled()) return { error: "Password reset emails aren't switched on yet. Ask your coach for a reset link." };
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const key = `forgot|${ip}`;
  const done = { ok: true, message: `If ${email} has an account, a reset link is on its way. Check your inbox (and spam folder).` };
  if (loginThrottled(key)) return { error: "Too many requests. Try again in 15 minutes." };
  recordLoginFailure(key); // counts every request, so the form can't be used to send lots of emails
  const user = await db.user.findUnique({ where: { email }, include: { clientProfile: true } });
  if (!user) return done;
  const coachId = user.role === "COACH" ? user.id : user.clientProfile?.coachId;
  if (!coachId) return done;
  const token = randomToken();
  await db.authToken.create({
    data: {
      tokenHash: sha256(token),
      kind: "RESET",
      email: user.email,
      name: user.name,
      coachId,
      userId: user.id,
      expiresAt: new Date(Date.now() + RESET_HOURS * 3600000),
    },
  });
  await sendEmail(emails.reset(user.email, user.name, `${await siteUrl()}/reset/${token}`, RESET_HOURS));
  return done;
}

/** Change your own password (client or coach). Logs out every other device. */
export async function changePasswordAction(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const current = String(fd.get("current") ?? "");
  const password = String(fd.get("password") ?? "");
  const confirm = String(fd.get("confirm") ?? "");
  const key = `change|${user.id}`;
  if (loginThrottled(key)) return { error: "Too many attempts. Try again in 15 minutes." };
  if (!(await verifyPassword(current, user.passwordHash))) {
    recordLoginFailure(key);
    return { error: "Your current password isn't right." };
  }
  const minLength = user.role === "COACH" ? 12 : 10;
  if (password.length < minLength) return { error: `Use at least ${minLength} characters.` };
  const pwErr = passwordProblem(password);
  if (pwErr) return { error: pwErr };
  if (password !== confirm) return { error: "The new passwords don't match." };
  if (password === current) return { error: "Choose a password you haven't used here before." };
  clearLoginFailures(key);
  const thisSession = sha256((await cookies()).get(SESSION_COOKIE)?.value ?? "");
  await db.$transaction([
    db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(password) } }),
    db.session.deleteMany({ where: { userId: user.id, id: { not: thisSession } } }),
  ]);
  return { ok: true, message: "Password changed. You've been logged out on any other devices." };
}
